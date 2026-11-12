// src/app/order/[id]/OrderPageClient.tsx
//
// Order & Participant Details Page.
// Displays active 10-minute hold countdown, buyer info prefilled from fetchMe(),
// individual attendee names for all tickets (seats & quota), order summary,
// and submits to createOrder / payment.

"use client";

import { useState, useEffect, Suspense, use } from "react";
import { useRouter, usePathname, notFound } from "next/navigation";
import { useBookingStore } from "@/lib/store/useBookingStore";
import CountdownTimer from "@/components/shared/CountdownTimer";
import { BookingProgressBar } from "@/components/shared/BookingProgressBar";
import { cacheLiveEvent, getEventById } from "@/lib/data/events";
import { fetchEvent, fetchMe, createOrder, type CreateOrderPayload } from "@/services/customerApi";
import type { TicketEvent } from "@/types/event";
import { formatRupiah, formatSeatDisplayName } from "@/lib/utils";
import { getPaymentSecondsRemaining } from "@/lib/time-utils";

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
  const pathname = usePathname();

  const [event, setEvent] = useState<TicketEvent | null>(() => getEventById(id) || null);
  const [isLoading, setIsLoading] = useState(!event);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const {
    selectedSeats,
    quotaItems,
    holdId,
    holdIds,
    timeLeft,
    releaseHold,
    setBuyerInfo: saveBuyerToStore,
    setParticipantName: saveParticipantToStore,
    buyerInfo: storedBuyerInfo,
    participantNames: storedParticipants,
    hydrateFromStorage,
  } = useBookingStore();

  // Restore store state from session storage on mount and reset stuck loading state on Back navigation
  useEffect(() => {
    hydrateFromStorage();

    const handlePageRestore = () => {
      setIsSubmitting(false);
    };

    window.addEventListener("pageshow", handlePageRestore);
    window.addEventListener("popstate", handlePageRestore);
    document.addEventListener("visibilitychange", handlePageRestore);

    return () => {
      window.removeEventListener("pageshow", handlePageRestore);
      window.removeEventListener("popstate", handlePageRestore);
      document.removeEventListener("visibilitychange", handlePageRestore);
    };
  }, [hydrateFromStorage, pathname]);

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

  // Flat list of ticket participant entries with full seat metadata
  const allTicketEntries = [
    ...selectedSeats.map((s, idx) => ({
      key: s.id,
      row: s.row,
      number: s.number,
      block: s.block || (s.number <= 5 ? "Blok A" : "Blok B"),
      label: formatSeatDisplayName(s),
      category: s.category,
      price: s.price,
      sequence: idx + 1,
    })),
    ...quotaList.flatMap((q) =>
      Array.from({ length: q.count }, (_, i) => ({
        key: `${q.sectionId}-${i + 1}`,
        row: undefined,
        number: undefined,
        block: q.sectionName,
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
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);

    // Save buyer info to store
    saveBuyerToStore({
      fullName: buyer.name,
      email: buyer.email,
      phoneNumber: buyer.phone,
    });

    const normalizedItems = allTicketEntries.map((t) => {
      const attendeeName = participants[t.key] || buyer.name || "Peserta";
      return {
        id: t.key,
        seat_id: t.key,
        event_seat_id: t.key,
        seat_label: t.label,
        row_label: t.row,
        seat_number: t.number,
        block: t.block,
        attendee_name: attendeeName,
        participant_name: attendeeName,
        price: t.price,
        category: t.category,
        seat: {
          id: t.key,
          seat_id: t.key,
          event_seat_id: t.key,
          seat_label: t.label,
          row: t.row,
          row_label: t.row,
          number: t.number,
          seat_number: t.number,
          block: t.block,
          category: t.category,
        },
      };
    });

    try {
      // Smart check: if an active UNPAID/PENDING order already exists in sessionStorage for this event/hold,
      // update its buyer & items and navigate directly to /payment/:orderId instead of recreating the order.
      if (typeof window !== "undefined") {
        try {
          const rawExisting = sessionStorage.getItem("summa_active_order");
          if (rawExisting) {
            const existingOrder = JSON.parse(rawExisting) as Record<string, unknown>;
            const existingStatus = String(
              existingOrder.order_status || existingOrder.status || ""
            ).toUpperCase();
            const existingEventId = String(
              existingOrder.event_id ||
                (existingOrder.event as { id?: string | number } | undefined)?.id ||
                ""
            );
            const isSameEvent =
              existingEventId === String(event?.id || id) || existingEventId === String(id);
            const isSameHold =
              !holdId || !existingOrder.hold_id || String(existingOrder.hold_id) === String(holdId);
            const isStillUnpaid =
              (existingStatus === "UNPAID" || existingStatus === "PENDING") &&
              getPaymentSecondsRemaining(existingOrder as { expires_at?: string; created_at?: string }) > 0;

            if (isSameEvent && isSameHold && isStillUnpaid) {
              const updatedExistingOrder: Record<string, unknown> = {
                ...existingOrder,
                buyer: {
                  full_name: buyer.name || "Nadia Putri",
                  email: buyer.email || "nadia.demo@example.test",
                  phone_number: buyer.phone || "+628110000101",
                },
                seat_ids: selectedSeats.map((s) => s.id),
                items: normalizedItems,
                total_amount: totalPrice,
                ticket_count: allTicketEntries.length,
              };

              sessionStorage.setItem("summa_active_order", JSON.stringify(updatedExistingOrder));
              try {
                const rawLocal = localStorage.getItem("summa_customer_orders");
                const localList: Array<{ id?: string; order_id?: string; order_code?: string }> =
                  rawLocal ? JSON.parse(rawLocal) : [];
                const filtered = localList.filter(
                  (o) =>
                    String(o.id || o.order_id) !==
                      String(updatedExistingOrder.id || updatedExistingOrder.order_id) &&
                    (!updatedExistingOrder.order_code ||
                      o.order_code !== updatedExistingOrder.order_code)
                );
                localStorage.setItem(
                  "summa_customer_orders",
                  JSON.stringify([updatedExistingOrder, ...filtered])
                );
              } catch {
                // Ignore storage quota errors
              }

              const targetOrderKey = String(
                updatedExistingOrder.id || updatedExistingOrder.order_id || ""
              );
              const orderQuery = targetOrderKey ? `?orderId=${encodeURIComponent(targetOrderKey)}` : "";
              router.push(`/payment/${event?.id || id}${orderQuery}`);
              return;
            }
          }
        } catch {
          // Ignore parse errors and proceed to create order
        }
      }

      const orderPayload: CreateOrderPayload = {
        event_id: id,
        hold_id: holdId,
        seat_ids: selectedSeats.map((s) => s.id),
        event_seat_ids: selectedSeats.map((s) => s.id),
        buyer: {
          full_name: buyer.name || "Nadia Putri",
          email: buyer.email || "nadia.demo@example.test",
          phone_number: buyer.phone || "+628110000101",
        },
        items: allTicketEntries.map((t) => ({
          seat_id: t.key,
          event_seat_id: t.key,
          attendee_name: participants[t.key] || buyer.name || "Peserta",
          participant_name: participants[t.key] || buyer.name || "Peserta",
        })),
      };

      const nowMs = Date.now();
      const defaultCreatedAt = new Date(nowMs).toISOString();
      const defaultExpiresAt = new Date(nowMs + 7 * 60 * 1000).toISOString();

      let createdOrder: Record<string, unknown> | null = null;
      try {
        const orderRes = await createOrder(orderPayload);
        const resData = (orderRes.data || {}) as unknown as Record<string, unknown>;
        const resolvedId = String(resData.id || resData.order_id || `ORD-${nowMs}`);
        const resolvedCode = String(resData.order_code || `ORD-${nowMs.toString().slice(-6)}`);
        const resolvedStatus = String(resData.order_status || resData.status || "UNPAID");
        const resolvedPaymentStatus = String(
          resData.payment_status ||
            (resData.payment as { status?: string } | undefined)?.status ||
            "UNPAID"
        );
        const resolvedCreatedAt = String(resData.created_at || defaultCreatedAt);
        const resolvedExpiresAt = String(
          resData.payment_expires_at ||
            resData.expires_at ||
            (resData.payment as { expires_at?: string } | undefined)?.expires_at ||
            defaultExpiresAt
        );

        const apiItems = Array.isArray(resData.items)
          ? (resData.items as Array<Record<string, unknown>>)
          : [];
        const mergedItems =
          apiItems.length > 0
            ? apiItems.map((apiItem, idx) => ({
                ...normalizedItems[idx],
                ...apiItem,
                seat_label:
                  (apiItem.seat_label as string | undefined) || normalizedItems[idx]?.seat_label,
                attendee_name:
                  (apiItem.attendee_name as string | undefined) ||
                  (apiItem.participant_name as string | undefined) ||
                  normalizedItems[idx]?.attendee_name,
                category:
                  (apiItem.category as string | undefined) || normalizedItems[idx]?.category,
                seat: {
                  ...(normalizedItems[idx]?.seat || {}),
                  ...((apiItem.seat as Record<string, unknown> | undefined) || {}),
                },
              }))
            : normalizedItems;

        createdOrder = {
          ...resData,
          id: resolvedId,
          order_id: resolvedId,
          order_code: resolvedCode,
          event_id: event?.id || id,
          hold_id: holdId,
          hold_ids: holdIds,
          status: resolvedStatus,
          order_status: resolvedStatus,
          payment_status: resolvedPaymentStatus,
          total_amount: Number(resData.total_amount ?? totalPrice),
          ticket_count: Number(resData.ticket_count ?? allTicketEntries.length),
          created_at: resolvedCreatedAt,
          expires_at: resolvedExpiresAt,
          payment_expires_at: resolvedExpiresAt,
          buyer: orderPayload.buyer,
          event: (resData.event as Record<string, unknown> | undefined) || {
            id: event?.id || id,
            name: event?.title || "Bandung Tech & Creative Expo",
            title: event?.title || "Bandung Tech & Creative Expo",
            start_at: event?.dateISO || defaultCreatedAt,
            status: event?.badge || "SALES_OPEN",
          },
          seat_ids: Array.isArray(resData.seat_ids) && resData.seat_ids.length > 0
            ? resData.seat_ids
            : selectedSeats.map((s) => s.id),
          items: mergedItems,
        };
      } catch {
        // Fallback (ACR-03): Create local simulated order for seamless testing
        const simId = `ORD-SIM-${nowMs}`;
        createdOrder = {
          id: simId,
          order_id: simId,
          order_code: `ORD-${nowMs.toString().slice(-6)}`,
          event_id: event?.id || id,
          hold_id: holdId,
          hold_ids: holdIds,
          status: "UNPAID",
          order_status: "UNPAID",
          payment_status: "UNPAID",
          is_local_order: true,
          storage_source: "LOCAL_SANDBOX",
          total_amount: totalPrice,
          ticket_count: allTicketEntries.length,
          created_at: defaultCreatedAt,
          expires_at: defaultExpiresAt,
          payment_expires_at: defaultExpiresAt,
          buyer: orderPayload.buyer,
          event: {
            id: event?.id || id,
            name: event?.title || "Bandung Tech & Creative Expo",
            title: event?.title || "Bandung Tech & Creative Expo",
            start_at: event?.dateISO || defaultCreatedAt,
            status: event?.badge || "SALES_OPEN",
          },
          seat_ids: selectedSeats.map((s) => s.id),
          items: normalizedItems,
        };
      }

      // Save active order details to sessionStorage and localStorage order history
      if (typeof window !== "undefined" && createdOrder) {
        try {
          const serializedOrder = JSON.stringify(createdOrder);
          sessionStorage.setItem("summa_active_order", serializedOrder);
          localStorage.setItem("summa_active_order", serializedOrder);
        } catch {
          // ignore
        }
        try {
          const rawLocal = localStorage.getItem("summa_customer_orders");
          const localList: Array<{ id?: string; order_id?: string; order_code?: string }> = rawLocal
            ? JSON.parse(rawLocal)
            : [];
          const filtered = localList.filter(
            (o) =>
              String(o.id || o.order_id) !== String(createdOrder?.id || createdOrder?.order_id) &&
              (!createdOrder?.order_code || o.order_code !== createdOrder.order_code)
          );
          localStorage.setItem(
            "summa_customer_orders",
            JSON.stringify([createdOrder, ...filtered])
          );
        } catch {
          // Ignore storage quota errors
        }
      }

      const orderKey = createdOrder?.id || createdOrder?.order_id;
      const orderQuery = orderKey ? `?orderId=${encodeURIComponent(String(orderKey))}` : "";
      router.push(`/payment/${id}${orderQuery}`);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setSubmitError(errObj?.message || "Gagal membuat pesanan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBack = async () => {
    setShowBackConfirm(false);
    await releaseHold(event?.id || id);
    router.push(`/event/${id}/book`);
  };

  if (totalCount === 0) return null;

  return (
    <div className="page-container checkout-page max-w-6xl mx-auto py-8 px-4">
      <BookingProgressBar
        currentStep={2}
        eventId={event?.id || id}
        onStepClick={(step) => {
          if (step === 1) {
            setShowBackConfirm(true);
          }
        }}
      />

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

      {/* Sticky Hold Timer (mobile/tablet < lg) — hanya kapsul timer yang melayang (tanpa blok background putih)
          tepat di bawah floating progress line navbar dengan offset aman 20px. */}
      <div className="lg:hidden sticky top-[calc(var(--header-h)+20px)] z-40 bg-transparent pointer-events-none py-1 mb-5">
        <CountdownTimer variant="compact" />
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
          <div className="lg:sticky lg:top-[calc(var(--header-h)+16px)] space-y-4">
            {/* 10-Minute Hold Timer (desktop sidebar; mobile memakai bar sticky di atas form) */}
            <div className="hidden lg:block bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm text-center">
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
