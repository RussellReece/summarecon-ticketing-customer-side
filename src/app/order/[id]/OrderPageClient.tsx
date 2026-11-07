// src/app/order/[id]/OrderPageClient.tsx
//
// Order & Participant Details Page.
// Displays active 10-minute hold countdown, buyer info prefilled from fetchMe(),
// individual attendee names for all tickets (seats & quota), order summary,
// and submits to createOrder / payment.

"use client";

import { useState, useEffect, Suspense, use } from "react";
import { useRouter, notFound } from "next/navigation";
import { useBookingStore } from "@/lib/store/useBookingStore";
import CountdownTimer from "@/components/shared/CountdownTimer";
import { cacheLiveEvent, getEventById } from "@/lib/data/events";
import { fetchEvent, fetchMe, createOrder } from "@/services/customerApi";
import type { TicketEvent } from "@/types/event";
import { formatRupiah } from "@/lib/utils";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderPageClient({ params }: OrderPageProps) {
  return (
    <Suspense
      fallback={
        <div className="page-container route-loading text-center py-16">
          <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-medium text-stone-600">Memuat data pesanan...</p>
        </div>
      }
    >
      <OrderForm params={params} />
    </Suspense>
  );
}

function OrderForm({ params }: OrderPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<TicketEvent | null>(() => getEventById(id) || null);
  const [isLoading, setIsLoading] = useState(!event);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const {
    selectedSeats,
    quotaItems,
    timeLeft,
    releaseHold,
    setBuyerInfo: saveBuyerToStore,
    setParticipantName: saveParticipantToStore,
    buyerInfo: storedBuyerInfo,
    participantNames: storedParticipants,
    hydrateFromStorage,
  } = useBookingStore();

  // Restore store state from session storage on mount
  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Load event details if needed
  useEffect(() => {
    if (!event) {
      fetchEvent(id)
        .then((res) => {
          if (res.data) {
            setEvent(cacheLiveEvent(res.data));
          }
        })
        .catch((err) => {
          console.error("Failed to load event for order:", err);
        })
        .finally(() => setIsLoading(false));
    }
  }, [id, event]);

  // Buyer form state prefilled from profile or stored
  const [buyer, setBuyer] = useState({
    name: storedBuyerInfo.fullName || "",
    email: storedBuyerInfo.email || "",
    phone: storedBuyerInfo.phoneNumber || "",
  });

  // Prefill buyer profile from fetchMe()
  useEffect(() => {
    fetchMe()
      .then((res) => {
        const u = res.data as { full_name?: string; name?: string; email?: string; phone_number?: string };
        if (u) {
          setBuyer((prev) => ({
            name: prev.name || u.full_name || u.name || "",
            email: prev.email || u.email || "",
            phone: prev.phone || u.phone_number || "+628110000101",
          }));
        }
      })
      .catch(() => {
        // Fallback default demo buyer if unauthenticated
        setBuyer((prev) => ({
          name: prev.name || "Nadia Putri",
          email: prev.email || "nadia.demo@example.test",
          phone: prev.phone || "+628110000101",
        }));
      });
  }, []);

  // Compute all ticket items (seats + quota)
  const quotaList = Object.values(quotaItems);
  const totalCount =
    selectedSeats.length + quotaList.reduce((acc, q) => acc + q.count, 0);

  // Flat list of ticket participant entries
  const allTicketEntries = [
    ...selectedSeats.map((s, idx) => ({
      key: s.id,
      label: `Kursi ${s.id}`,
      category: s.category,
      price: s.price,
      sequence: idx + 1,
    })),
    ...quotaList.flatMap((q) =>
      Array.from({ length: q.count }, (_, i) => ({
        key: `${q.sectionId}-${i + 1}`,
        label: `${q.sectionName} (#${i + 1})`,
        category: q.categoryName,
        price: q.price,
        sequence: selectedSeats.length + i + 1,
      }))
    ),
  ];

  const [participants, setParticipants] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = { ...storedParticipants };
    allTicketEntries.forEach((t, i) => {
      if (!initial[t.key]) {
        // Prefill first ticket with buyer's name
        initial[t.key] = i === 0 && buyer.name ? buyer.name : "";
      }
    });
    return initial;
  });

  // Redirect to booking if no tickets selected
  useEffect(() => {
    if (!isLoading && totalCount === 0) {
      router.push(`/event/${id}/book`);
    }
  }, [isLoading, totalCount, id, router]);

  if (isLoading) {
    return (
      <div className="page-container route-loading text-center py-16">
        <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-medium text-stone-600">Memuat data pesanan...</p>
      </div>
    );
  }

  if (!event) notFound();

  const totalPrice = allTicketEntries.reduce((sum, item) => sum + item.price, 0);

  const handleParticipantChange = (key: string, name: string) => {
    setParticipants((prev) => ({ ...prev, [key]: name }));
    saveParticipantToStore(key, name);
  };

  // Submit Order & Proceed to Payment
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    // Save buyer info to store
    saveBuyerToStore({
      fullName: buyer.name,
      email: buyer.email,
      phoneNumber: buyer.phone,
    });

    try {
      const orderPayload = {
        event_id: Number(id) || 1,
        seat_ids: selectedSeats.map((s) => Number(s.number) || 1),
        items: allTicketEntries.map((t) => ({
          seat_id: Number(t.key.replace(/\D/g, "")) || 1,
          attendee_name: participants[t.key] || buyer.name || "Peserta",
        })),
      };

      let createdOrder: unknown = null;
      try {
        const orderRes = await createOrder(orderPayload);
        createdOrder = orderRes.data;
      } catch {
        // Fallback (ACR-03): Create local simulated order for seamless testing
        createdOrder = {
          id: `ORD-SIM-${Date.now()}`,
          order_code: `ORD-${Date.now().toString().slice(-6)}`,
          status: "PENDING",
          total_amount: totalPrice,
          created_at: new Date().toISOString(),
          items: allTicketEntries.map((t) => ({
            id: t.key,
            seat_label: t.label,
            attendee_name: participants[t.key] || buyer.name,
            price: t.price,
          })),
        };
      }

      // Save active order details to sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.setItem("summa_active_order", JSON.stringify(createdOrder));
      }

      router.push(`/payment/${id}`);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setSubmitError(errObj?.message || "Gagal membuat pesanan. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  };

  const handleConfirmBack = async () => {
    await releaseHold(id);
    router.push(`/event/${id}/book`);
  };

  if (totalCount === 0) return null;

  return (
    <div className="page-container checkout-page max-w-6xl mx-auto py-8 px-4">
      {/* Back Button with Confirmation */}
      <button
        type="button"
        onClick={() => setShowBackConfirm(true)}
        className="back-link inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 mb-6 transition"
      >
        ← Kembali ke Denah
      </button>

      {/* Confirmation Modal when clicking Back */}
      {showBackConfirm && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-2">
              Lepaskan Kursi?
            </h3>
            <p className="text-xs text-stone-600 mb-6 leading-relaxed">
              Kembali ke denah akan membatalkan penahanan 10 menit untuk tiketmu. Apakah kamu yakin ingin kembali?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBackConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
              >
                Tetap di Sini
              </button>
              <button
                type="button"
                onClick={handleConfirmBack}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#D93A2F] text-white hover:bg-[#c23329] transition shadow-sm"
              >
                Ya, Kembali ke Denah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Heading */}
      <div className="checkout-heading mb-6 pb-4 border-b border-stone-200">
        <span className="eyebrow eyebrow-dark text-xs font-bold uppercase tracking-widest text-stone-400 block mb-1">
          LANGKAH 2 DARI 3 · DATA PESERTA
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-tight">
          Periksa pesanan & lengkapi data.
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Tiketmu sedang ditahan. Lengkapi nama peserta sebelum batas waktu berakhir.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Kolom Kiri: Formulir Data Pemesan & Peserta */}
        <div className="lg:col-span-2 space-y-6">
          <form id="order-form" onSubmit={handleSubmitOrder} className="space-y-6">
            {/* 1. Informasi Pemesan */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-stone-900">
                  1. Informasi Pemesan (Pembeli)
                </h3>
                <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  ✓ Akun Terhubung
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nama Lengkap Pemesan
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full border border-stone-300 rounded-xl p-3 text-sm outline-none focus:border-[#D93A2F] focus:ring-1 focus:ring-[#D93A2F] bg-stone-50/50"
                    value={buyer.name}
                    onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Alamat Email (Pengiriman E-Ticket)
                  </label>
                  <input
                    required
                    type="email"
                    className="w-full border border-stone-300 rounded-xl p-3 text-sm outline-none focus:border-[#D93A2F] focus:ring-1 focus:ring-[#D93A2F] bg-stone-50/50"
                    value={buyer.email}
                    onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    No. WhatsApp / Telepon
                  </label>
                  <input
                    required
                    type="tel"
                    className="w-full border border-stone-300 rounded-xl p-3 text-sm outline-none focus:border-[#D93A2F] focus:ring-1 focus:ring-[#D93A2F] bg-stone-50/50"
                    value={buyer.phone}
                    onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* 2. Detail Peserta Per Tiket */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-base text-stone-900 mb-1">
                2. Data Peserta (Satu Nama Per Tiket)
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                Sesuai kebijakan acara, setiap tiket wajib mencantumkan nama peserta yang sah (dapat diubah paling lambat H-1).
              </p>

              <div className="space-y-4">
                {allTicketEntries.map((item) => (
                  <div
                    key={item.key}
                    className="p-4 bg-stone-50/70 border border-stone-200 rounded-xl"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-xs text-stone-800">
                        Tiket #{item.sequence} · {item.label}
                      </span>
                      <span className="text-[11px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-semibold">
                        {item.category}
                      </span>
                    </div>

                    <label className="block text-xs text-stone-600 mb-1 font-medium">
                      Nama Peserta Tiket
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Nama lengkap sesuai KTP / identitas"
                      className="w-full border border-stone-300 rounded-lg p-2.5 text-xs sm:text-sm outline-none focus:border-[#D93A2F] bg-white"
                      value={participants[item.key] || ""}
                      onChange={(e) => handleParticipantChange(item.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {submitError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                {submitError}
              </div>
            )}
          </form>
        </div>

        {/* Kolom Kanan: Timer & Ringkasan */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* 10-Minute Hold Timer */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm text-center">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
                Sisa Waktu Penahanan Kursi
              </span>
              <CountdownTimer />
              <p className="text-[11px] text-amber-800/80 mt-1.5 italic">
                Tiket akan otomatis dilepas jika waktu berakhir.
              </p>
            </div>

            {/* Ringkasan Biaya */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
              <h4 className="font-bold text-base text-stone-900 mb-4 pb-2 border-b border-stone-100">
                Ringkasan Pesanan
              </h4>

              <div className="space-y-2.5 mb-5 text-xs">
                {allTicketEntries.map((item) => (
                  <div
                    key={item.key}
                    className="flex justify-between pb-2 border-b border-dashed border-stone-100"
                  >
                    <span className="text-stone-700 font-medium">
                      {item.label} <small className="text-stone-400">({item.category})</small>
                    </span>
                    <span className="font-bold text-stone-900">{formatRupiah(item.price)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-baseline mb-6 pt-2 border-t border-stone-200">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Total Bayar
                </span>
                <span className="text-xl font-black text-[#D93A2F]">
                  {formatRupiah(totalPrice)}
                </span>
              </div>

              <button
                type="submit"
                form="order-form"
                disabled={isSubmitting || timeLeft <= 0}
                className="w-full bg-[#D93A2F] text-white font-bold py-3.5 px-4 rounded-xl hover:bg-[#c23329] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? "Menyiapkan Pembayaran..." : "Lanjut ke Pembayaran QRIS →"}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowBackConfirm(true)}
                  className="text-xs text-stone-500 hover:text-[#D93A2F] underline transition"
                >
                  Batalkan Penahanan Kursi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
