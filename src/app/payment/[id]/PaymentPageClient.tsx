// src/app/payment/[id]/PaymentPageClient.tsx
//
// Payment Page with Sandbox QRIS simulation, 7-minute payment timer,
// polling / "Cek Status" button, separate order & payment statuses,
// and handling for SUCCESS, FAILED, EXPIRED states.

"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Suspense, use, useEffect, useState, useMemo } from "react";
import QRCode from "react-qr-code";
import { cacheLiveEvent, getEventById } from "@/lib/data/events";
import { fetchEvent, fetchMyOrders, payOrder } from "@/services/customerApi";
import type { TicketEvent } from "@/types/event";
import { useBookingStore } from "@/lib/store/useBookingStore";
import { formatRupiah, formatSeatDisplayName } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRemainingTime } from "@/lib/time-utils";

const PAYMENT_TIMEOUT_SECONDS = 7 * 60; // 7 minutes per business rule

interface PaymentPageProps {
  params: Promise<{ id: string }>;
}

export default function PaymentPageClient({ params }: PaymentPageProps) {
  return (
    <Suspense
      fallback={
        <div className="page-container route-loading text-center py-16">
          <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-medium text-stone-600">Menyiapkan pembayaran...</p>
        </div>
      }
    >
      <PaymentPageContent params={params} />
    </Suspense>
  );
}

function PaymentPageContent({ params }: PaymentPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<TicketEvent | null>(() => getEventById(id) || null);
  const [isLoading, setIsLoading] = useState(!event);

  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const quotaItems = useBookingStore((s) => s.quotaItems);
  const clearLockTimer = useBookingStore((s) => s.clearLockTimer);
  const resetBooking = useBookingStore((s) => s.resetBooking);

  // Active order retrieved from sessionStorage if available
  const [activeOrder] = useState<{
    id?: string;
    order_id?: string;
    order_code?: string;
    total_amount?: number;
    status?: string;
    order_status?: string;
    payment_status?: string;
    paid_at?: string;
    ticket_count?: number;
    event?: {
      id?: string | number;
      name?: string;
      title?: string;
      start_at?: string;
      status?: string;
    };
    seat_ids?: string[];
    items?: Array<{
      id: string;
      seat_label?: string;
      price?: number;
      category?: string;
      attendee_name?: string;
    }>;
  } | null>(() => {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem("summa_active_order");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {
          // ignore
        }
      }
    }
    return null;
  });

  // Payment state
  const [orderStatus, setOrderStatus] = useState<string>("PENDING");
  const [paymentStatus, setPaymentStatus] = useState<string>("PENDING");
  const [paymentSecondsLeft, setPaymentSecondsLeft] = useState(PAYMENT_TIMEOUT_SECONDS);
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load event
  useEffect(() => {
    if (!event) {
      fetchEvent(id)
        .then((res) => {
          if (res.data) setEvent(cacheLiveEvent(res.data));
        })
        .catch((err) => {
          console.error("Failed to load event for payment:", err);
        })
        .finally(() => setIsLoading(false));
    }
  }, [id, event]);

  // 7-minute payment countdown
  useEffect(() => {
    if (paymentStatus === "SUCCESS" || paymentStatus === "FAILED" || paymentStatus === "EXPIRED") {
      return;
    }

    const timer = setInterval(() => {
      setPaymentSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPaymentStatus("EXPIRED");
          setOrderStatus("EXPIRED");
          clearLockTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentStatus, clearLockTimer]);

  const quotaList = Object.values(quotaItems);
  const allTickets = useMemo(() => {
    return [
      ...selectedSeats.map((s) => ({
        label: formatSeatDisplayName(s),
        category: s.category,
        price: s.price,
      })),
      ...quotaList.flatMap((q) =>
        Array.from({ length: q.count }, (_, i) => ({
          label: `${q.sectionName} (#${i + 1})`,
          category: q.categoryName,
          price: q.price,
        }))
      ),
    ];
  }, [selectedSeats, quotaList]);

  const totalPrice = useMemo(() => {
    if (activeOrder?.total_amount) return activeOrder.total_amount;
    return allTickets.reduce((sum, item) => sum + item.price, 0);
  }, [activeOrder, allTickets]);

  // "Cek Status" manual button
  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);

    try {
      const ordersRes = await fetchMyOrders();
      const rawData = ordersRes.data as unknown;
      const list: Array<{
        event?: { id?: string | number };
        order_id?: string;
        id?: string | number;
        order_code?: string;
        order_status?: string;
        status?: string;
        payment?: { status?: string };
      }> = Array.isArray(rawData)
        ? (rawData as Array<{ event?: { id?: string | number }; order_id?: string; id?: string | number; order_code?: string; order_status?: string; status?: string; payment?: { status?: string } }>)
        : ((rawData as { items?: Array<{ event?: { id?: string | number }; order_id?: string; id?: string | number; order_code?: string; order_status?: string; status?: string; payment?: { status?: string } }> })?.items || []);

      const found = list.find(
        (o) =>
          String(o.event?.id) === String(id) ||
          o.order_id === activeOrder?.id ||
          o.order_code === activeOrder?.order_code
      );

      if (found) {
        const resolvedOrderStatus = found.order_status || found.status || "PENDING";
        setOrderStatus(resolvedOrderStatus);
        setPaymentStatus(found.payment?.status || resolvedOrderStatus === "PAID" ? "SUCCESS" : "PENDING");

        if (resolvedOrderStatus === "PAID") {
          clearLockTimer();
          if (typeof window !== "undefined") {
            sessionStorage.setItem("summa_ticket_just_generated", "1");
          }
          router.push(`/ticket/${id}?generated=1`);
          return;
        }
      }

      setStatusMessage("Status pembayaran belum berubah. Silakan scan QRIS di bawah ini.");
    } catch {
      setStatusMessage("Menunggu verifikasi pembayaran sandbox.");
    } finally {
      setIsChecking(false);
    }
  };

  // Sandbox simulation handler
  const handleSimulatePayment = async (mode: "SUCCESS" | "FAILED" | "EXPIRED") => {
    setIsChecking(true);

    const resolvedOrderId = activeOrder?.id || activeOrder?.order_id;
    if (mode === "SUCCESS" && resolvedOrderId && !resolvedOrderId.startsWith("ORD-SIM")) {
      try {
        await payOrder(resolvedOrderId);
      } catch (err) {
        console.warn("payOrder API notification:", err);
      }
    }

    setTimeout(() => {
      setPaymentStatus(mode);
      setIsChecking(false);

      if (mode === "SUCCESS") {
        setOrderStatus("PAID");
        clearLockTimer();

        // Update stored order status
        if (typeof window !== "undefined") {
          const finalOrderId = resolvedOrderId || `ORD-SIM-${Date.now()}`;
          const resolvedCode = activeOrder?.order_code || `ORD-${Date.now().toString().slice(-6)}`;
          const updated = {
            ...activeOrder,
            id: finalOrderId,
            order_id: finalOrderId,
            order_code: resolvedCode,
            status: "PAID",
            order_status: "PAID",
            payment_status: "PAID",
            paid_at: new Date().toISOString(),
            total_amount: totalPrice,
            ticket_count: allTickets.length,
            event: activeOrder?.event || {
              id: event?.id || id,
              name: event?.title || "Bandung Tech & Creative Expo",
              title: event?.title || "Bandung Tech & Creative Expo",
              start_at: event?.dateISO || new Date().toISOString(),
              status: event?.badge || "SALES_OPEN",
            },
            seat_ids: activeOrder?.seat_ids || selectedSeats.map((s) => s.id),
            items:
              activeOrder?.items ||
              allTickets.map((t, idx) => ({
                id: `item-${idx + 1}`,
                seat_label: t.label,
                price: t.price,
                category: t.category,
                attendee_name: "Peserta",
              })),
            e_ticket: {
              successful_scan_count: 0,
              valid_ticket_count: allTickets.length || 1,
            },
          };
          sessionStorage.setItem("summa_active_order", JSON.stringify(updated));

          try {
            const rawLocal = localStorage.getItem("summa_customer_orders");
            const localList: Array<{ id?: string; order_code?: string }> = rawLocal
              ? JSON.parse(rawLocal)
              : [];
            const filtered = localList.filter(
              (o) => o.id !== updated.id && o.order_code !== updated.order_code
            );
            localStorage.setItem("summa_customer_orders", JSON.stringify([updated, ...filtered]));
          } catch {
            // Ignore storage quota
          }
          sessionStorage.setItem("summa_ticket_just_generated", "1");
        }

        // Navigate to E-Ticket with generated flag so WhatsApp alert only shows after generation
        router.push(`/ticket/${event?.id || id}?generated=1`);
      } else if (mode === "FAILED") {
        setOrderStatus("CANCELLED");
        clearLockTimer();
      } else if (mode === "EXPIRED") {
        setOrderStatus("EXPIRED");
        clearLockTimer();
      }
    }, 600);
  };

  if (isLoading) {
    return (
      <div className="page-container route-loading text-center py-16">
        <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-medium text-stone-600">Menyiapkan pembayaran...</p>
      </div>
    );
  }

  if (!event) notFound();

  // Simulated QRIS payload
  const qrisPayload = `00020101021226670014ID.SUMMARECON01189360099900000000010215${
    activeOrder?.order_code || "ORD-2026-ATR"
  }5303360540${totalPrice}5802ID5919SUMMARECON TICKETING6007BANDUNG6304`;

  return (
    <div className="page-container checkout-page max-w-4xl mx-auto py-8 px-4">
      <Link className="back-link inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 mb-6 transition" href={`/order/${event.id}`}>
        ← Kembali ke data peserta
      </Link>

      <div className="checkout-heading mb-6 pb-4 border-b border-stone-200">
        <span className="eyebrow eyebrow-dark text-xs font-bold uppercase tracking-widest text-stone-400 block mb-1">
          LANGKAH 3 DARI 3 · PEMBAYARAN QRIS
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-tight">
          Selesaikan pembayaran QRIS.
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Buka aplikasi e-wallet atau mobile banking favoritmu dan pindai kode QRIS di bawah ini.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Kolom Kiri: QRIS Card */}
        <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm text-center">
          {/* Status Bar: Responsive grid ensuring zero overflow on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 pb-3 border-b border-stone-100 text-xs">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-stone-500 font-medium">Status Pesanan:</span>
              <StatusBadge status={orderStatus} size="sm" className="whitespace-nowrap shrink-0" />
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-stone-500 font-medium">Status Pembayaran:</span>
              <StatusBadge status={paymentStatus} size="sm" className="whitespace-nowrap shrink-0" />
            </div>
          </div>

          {/* Payment Timer (7 minutes) */}
          {paymentStatus === "PENDING" && (
            <div className="mb-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
              <span className="font-semibold">Batas waktu bayar:</span>
              <span className="font-mono font-bold text-sm text-[#D93A2F]">
                {formatRemainingTime(paymentSecondsLeft)}
              </span>
            </div>
          )}

          {/* QRIS Code or Fallback */}
          {paymentStatus === "PENDING" ? (
            <div className="my-4 p-4 bg-stone-50 border border-stone-200 rounded-2xl inline-block shadow-inner">
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <QRCode
                  value={qrisPayload}
                  size={210}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest mt-3">
                QRIS NASIONAL · SANDBOX
              </p>
            </div>
          ) : paymentStatus === "FAILED" ? (
            <div className="my-8 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
              <span className="text-3xl block mb-2">✕</span>
              <h3 className="font-bold text-base mb-1">Pembayaran Dibatalkan / Gagal</h3>
              <p className="text-xs text-rose-700 mb-4">
                Transaksi tidak dapat dilanjutkan. Kursi telah dilepaskan kembali ke sistem.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetBooking();
                  router.push(`/event/${event.id}/book`);
                }}
                className="px-4 py-2 bg-[#D93A2F] text-white rounded-lg text-xs font-bold hover:bg-[#c23329] transition"
              >
                Pesan Ulang Tiket
              </button>
            </div>
          ) : (
            <div className="my-8 p-6 bg-stone-100 border border-stone-200 rounded-2xl text-stone-700">
              <span className="text-3xl block mb-2">◷</span>
              <h3 className="font-bold text-base mb-1">Waktu Pembayaran Kedaluwarsa</h3>
              <p className="text-xs text-stone-600 mb-4">
                Batas waktu pembayaran (7 menit) telah habis. Silakan pilih kembali tiketmu di denah.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetBooking();
                  router.push(`/event/${event.id}/book`);
                }}
                className="px-4 py-2 bg-[#D93A2F] text-white rounded-lg text-xs font-bold hover:bg-[#c23329] transition"
              >
                Kembali ke Denah
              </button>
            </div>
          )}

          {/* Action Cek Status */}
          {paymentStatus === "PENDING" && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="w-full py-3 px-4 rounded-xl border border-stone-300 font-bold text-xs text-stone-700 hover:bg-stone-50 active:scale-[0.99] transition shadow-xs"
              >
                {isChecking ? "Memeriksa status..." : "Cek Status Pembayaran ↻"}
              </button>
              {statusMessage && (
                <p className="text-[11px] text-stone-500 mt-2 italic">{statusMessage}</p>
              )}
            </div>
          )}
        </section>

        {/* Kolom Kanan: Detail Pesanan & Sandbox Simulator */}
        <section className="space-y-6">
          {/* Ringkasan Acara & Tiket */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-base text-stone-900 mb-2">
              {event.title}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              {event.dateLabel} · {event.time} · {event.venue}
            </p>

            <div className="space-y-2.5 my-4 pt-4 border-t border-stone-100 text-xs">
              {allTickets.map((t, idx) => (
                <div key={idx} className="flex justify-between pb-2 border-b border-dashed border-stone-100">
                  <span className="text-stone-700">
                    {t.label} <small className="text-stone-400">({t.category})</small>
                  </span>
                  <span className="font-bold text-stone-900">{formatRupiah(t.price)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-baseline pt-3 border-t border-stone-200">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Total Tagihan
              </span>
              <span className="text-xl font-black text-[#D93A2F]">
                {formatRupiah(totalPrice)}
              </span>
            </div>
          </div>

          {/* Sandbox Simulator Box */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🧪</span>
              <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wider">
                Simulator Callback Sandbox
              </h4>
            </div>
            <p className="text-xs text-amber-900/80 mb-4 leading-relaxed">
              Karena berada di lingkungan sandbox demo, kamu dapat meniru callback gateway untuk menguji seluruh skenario alur tiket.
            </p>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => handleSimulatePayment("SUCCESS")}
                disabled={isChecking || paymentStatus === "SUCCESS"}
                className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2.5 px-1.5 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs leading-tight transition shadow-sm text-center disabled:opacity-50"
              >
                <span>✓</span>
                <span>Bayar Sukses</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulatePayment("FAILED")}
                disabled={isChecking || paymentStatus === "SUCCESS"}
                className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2.5 px-1.5 sm:px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] sm:text-xs leading-tight transition shadow-sm text-center disabled:opacity-50"
              >
                <span>✕</span>
                <span>Bayar Gagal</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulatePayment("EXPIRED")}
                disabled={isChecking || paymentStatus === "SUCCESS"}
                className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2.5 px-1.5 sm:px-3 rounded-xl bg-stone-600 hover:bg-stone-700 text-white font-bold text-[10px] sm:text-xs leading-tight transition shadow-sm text-center disabled:opacity-50"
              >
                <span>◷</span>
                <span>Kedaluwarsa</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
