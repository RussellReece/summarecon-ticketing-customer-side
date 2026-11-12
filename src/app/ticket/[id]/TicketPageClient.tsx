// src/app/ticket/[id]/TicketPageClient.tsx
//
// E-Ticket Display Page.
// Retrieves official QR code from fetchMyQR() (one QR per order),
// displays "Scan x/y" counter, attendee list with seat numbers,
// order details, and link to order history.

"use client";

import Link from "next/link";
import Image from "next/image";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { cacheLiveEvent, getEventById } from "@/lib/data/events";
import { fetchEvent, fetchMyQR, fetchMyOrders } from "@/services/customerApi";
import type { TicketEvent } from "@/types/event";
import { useBookingStore } from "@/lib/store/useBookingStore";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatSeatDisplayName } from "@/lib/utils";

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default function TicketPageClient({ params }: TicketPageProps) {
  return (
    <Suspense
      fallback={
        <div className="page-container route-loading text-center py-16">
          <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-medium text-stone-600">Menyiapkan e-ticket...</p>
        </div>
      }
    >
      <TicketPageContent params={params} />
    </Suspense>
  );
}

interface TicketQRState {
  token?: string;
  qr_image?: string;
  order_code?: string;
  valid?: boolean;
  valid_ticket_count?: number;
  successful_scan_count?: number;
  remaining?: number;
  status_summary?: string;
}

interface TicketOrderItem {
  id?: string | number;
  seat_id?: string | number;
  event_seat_id?: string | number;
  seat_label?: string;
  label?: string;
  row?: string;
  row_label?: string;
  number?: number | string;
  seat_number?: number | string;
  block?: string;
  block_code?: string;
  category?: string;
  category_name?: string;
  attendee_name?: string;
  participant_name?: string;
  price?: number;
  seat?: {
    id?: string | number;
    seat_id?: string | number;
    event_seat_id?: string | number;
    seat_label?: string;
    label?: string;
    row?: string;
    row_label?: string;
    number?: number | string;
    seat_number?: number | string;
    block?: string;
    block_code?: string;
    category?: string;
  } | null;
  ticket_category?: {
    name?: string;
    price?: number;
  } | null;
}

interface TicketOrderState {
  id?: string;
  order_id?: string;
  order_code?: string;
  event_id?: string | number;
  status?: string;
  order_status?: string;
  event_status?: string;
  ticket_count?: number;
  event?: {
    id?: string | number;
    name?: string;
    title?: string;
  };
  buyer?: {
    full_name?: string;
    email?: string;
    phone_number?: string;
  };
  buyer_phone?: string;
  seat_ids?: Array<string | number>;
  items?: TicketOrderItem[];
}

function findInitialTicketOrder(
  routeId: string,
  queryOrderId: string | null
): TicketOrderState | null {
  if (typeof window === "undefined") return null;

  const targetOrderKey = queryOrderId || routeId;
  let sessionOrder: TicketOrderState | null = null;

  try {
    const raw = sessionStorage.getItem("summa_active_order");
    if (raw) {
      sessionOrder = JSON.parse(raw) as TicketOrderState;
    }
  } catch {
    // ignore
  }

  let localOrders: TicketOrderState[] = [];
  try {
    const rawLocal = localStorage.getItem("summa_customer_orders");
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        localOrders = parsed as TicketOrderState[];
      }
    }
  } catch {
    // ignore
  }

  const allCandidates = sessionOrder ? [sessionOrder, ...localOrders] : localOrders;

  // 1. Exact match by orderId / order_code
  const exactMatch = allCandidates.find(
    (o) =>
      String(o.id || "") === String(targetOrderKey) ||
      String(o.order_id || "") === String(targetOrderKey) ||
      String(o.order_code || "") === String(targetOrderKey)
  );
  if (exactMatch) return exactMatch;

  // 2. If sessionOrder belongs to this event, prefer it
  if (
    sessionOrder &&
    (String(sessionOrder.event?.id || "") === String(routeId) ||
      String(sessionOrder.event_id || "") === String(routeId))
  ) {
    return sessionOrder;
  }

  // 3. Look in localOrders for the latest order for this event
  const eventMatch = localOrders.find(
    (o) =>
      String(o.event?.id || "") === String(routeId) ||
      String(o.event_id || "") === String(routeId)
  );
  if (eventMatch) return eventMatch;

  return sessionOrder;
}

function TicketPageContent({ params }: TicketPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryOrderId = searchParams.get("orderId");

  const [orderDetails, setOrderDetails] = useState<TicketOrderState | null>(() =>
    findInitialTicketOrder(id, queryOrderId)
  );

  const resolvedEventId = String(
    orderDetails?.event?.id || orderDetails?.event_id || id
  );

  const [fetchedEvent, setFetchedEvent] = useState<TicketEvent | null>(null);
  const event = fetchedEvent || getEventById(resolvedEventId) || getEventById(id) || null;
  const [isLoading, setIsLoading] = useState(() => !event);
  const [justGeneratedFromStorage] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("summa_ticket_just_generated") === "1";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("summa_ticket_just_generated");
    }
  }, []);

  const [qrData, setQrData] = useState<TicketQRState | null>(null);
  const [qrLoading, setQrLoading] = useState(true);

  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const quotaItems = useBookingStore((s) => s.quotaItems);
  const participantNames = useBookingStore((s) => s.participantNames);
  const buyerInfo = useBookingStore((s) => s.buyerInfo);
  const resetBooking = useBookingStore((s) => s.resetBooking);
  const hydrateFromStorage = useBookingStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Ensure ticket order is persistently recorded in local storage history as PAID
  useEffect(() => {
    if (typeof window === "undefined" || !orderDetails) return;
    try {
      const orderKey = String(orderDetails.order_id || orderDetails.id || "");
      const orderCode = String(orderDetails.order_code || "");
      if (!orderKey && !orderCode) return;

      const raw = localStorage.getItem("summa_customer_orders");
      const list: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
      const filtered = list.filter(
        (o) =>
          String(o.id || o.order_id || "") !== orderKey &&
          (!orderCode || String(o.order_code || "") !== orderCode)
      );

      const recordToSave = {
        ...orderDetails,
        status: "PAID",
        order_status: "PAID",
        payment_status: "PAID",
        is_local_order: true,
        storage_source: "LOCAL_SANDBOX",
        created_at: (orderDetails as Record<string, unknown>).created_at || new Date().toISOString(),
        paid_at: (orderDetails as Record<string, unknown>).paid_at || new Date().toISOString(),
      };

      localStorage.setItem("summa_customer_orders", JSON.stringify([recordToSave, ...filtered]));
      localStorage.setItem("summa_active_order", JSON.stringify(recordToSave));
      sessionStorage.setItem("summa_active_order", JSON.stringify(recordToSave));
    } catch {
      // Ignore storage errors
    }
  }, [orderDetails]);

  // Load event details
  useEffect(() => {
    if (getEventById(resolvedEventId) || getEventById(id)) {
      return;
    }

    fetchEvent(resolvedEventId)
      .then((res) => {
        if (res.data) setFetchedEvent(cacheLiveEvent(res.data));
      })
      .catch((err) => {
        console.error("Failed to load event for ticket:", err);
      })
      .finally(() => setIsLoading(false));
  }, [id, resolvedEventId]);

  // Load active order details and official QR from API
  useEffect(() => {
    const initialOrder = findInitialTicketOrder(id, queryOrderId);
    let orderIdToFetch =
      queryOrderId || initialOrder?.order_id || initialOrder?.id || "ORD-QRREAL-1";

    // Try fetching from API
    fetchMyOrders()
      .then((res) => {
        const raw = res.data as unknown;
        const list = Array.isArray(raw)
          ? (raw as TicketOrderState[])
          : (raw as { items?: TicketOrderState[] })?.items || [];

        let found: TicketOrderState | undefined;

        // If we already know the specific order ID or order code, ONLY match that exact order
        if (queryOrderId || initialOrder?.id || initialOrder?.order_id || initialOrder?.order_code) {
          const targetId = String(queryOrderId || initialOrder?.order_id || initialOrder?.id || "");
          const targetCode = String(initialOrder?.order_code || "");
          found = list.find(
            (o) =>
              (targetId && String(o.order_id || o.id || "") === targetId) ||
              (targetCode && String(o.order_code || "") === targetCode)
          );
        } else {
          // Only fallback to matching by event ID if no specific order was in storage/query
          found = list.find(
            (o) =>
              String(o.order_id || o.id || "") === String(id) ||
              String(o.order_code || "") === String(id) ||
              String(o.event?.id || o.event_id || "") === String(id)
          );
        }

        if (found) {
          const mergedOrder: TicketOrderState = {
            ...initialOrder,
            ...found,
            items:
              found.items && found.items.length > 0
                ? found.items.map((apiItem, idx) => ({
                    ...(initialOrder?.items?.[idx] || {}),
                    ...apiItem,
                    seat: {
                      ...(initialOrder?.items?.[idx]?.seat || {}),
                      ...(apiItem.seat || {}),
                    },
                  }))
                : initialOrder?.items,
          };
          setOrderDetails(mergedOrder);
          orderIdToFetch =
            mergedOrder.order_id || String(mergedOrder.id || "") || orderIdToFetch;
        }
      })
      .catch(() => {
        // Continue with initialOrder from storage
      })
      .finally(() => {
        const fallbackTicketCount =
          initialOrder?.items?.length ||
          initialOrder?.ticket_count ||
          selectedSeats.length ||
          1;

        // Fetch official QR token
        fetchMyQR(orderIdToFetch)
          .then((qrRes) => {
            const data = ((qrRes as unknown as { data?: TicketQRState }).data || qrRes) as TicketQRState;
            setQrData(data);
          })
          .catch(() => {
            // Fallback QR simulation
            setQrData({
              token: `TKT.${orderIdToFetch}.${Date.now()}`,
              order_code: initialOrder?.order_code || "ORD-2026-ATR",
              valid: true,
              valid_ticket_count: fallbackTicketCount,
              successful_scan_count: 0,
              remaining: fallbackTicketCount,
              status_summary: "ISSUED",
            });
          })
          .finally(() => setQrLoading(false));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Run on mount / route change to resolve order and QR
  }, [id, queryOrderId]);

  if (isLoading && !event) {
    return (
      <div className="page-container route-loading text-center py-16">
        <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-medium text-stone-600">Menyiapkan tiket...</p>
      </div>
    );
  }

  if (!event) notFound();

  const isCancelled = event.badge === "CANCELLED" || orderDetails?.event_status === "CANCELLED";
  const whatsappNumber =
    orderDetails?.buyer?.phone_number?.trim() ||
    orderDetails?.buyer_phone?.trim() ||
    buyerInfo.phoneNumber?.trim() ||
    "+628110000101";

  // Dynamic Attendees & Seats list bound directly to orderDetails.items with formatSeatDisplayName
  const quotaList = Object.values(quotaItems);
  const attendeeItems = (() => {
    if (orderDetails?.items && orderDetails.items.length > 0) {
      return orderDetails.items.map((item, i) => {
        const seatPayload = item.seat ? { ...item, ...item.seat } : item;
        const rawKey = String(
          item.seat?.id || item.seat_id || item.event_seat_id || item.id || ""
        );
        return {
          label: formatSeatDisplayName(seatPayload),
          category:
            item.category ||
            item.category_name ||
            item.ticket_category?.name ||
            item.seat?.category ||
            "Reguler",
          name:
            item.attendee_name ||
            item.participant_name ||
            participantNames[rawKey] ||
            orderDetails.buyer?.full_name ||
            buyerInfo.fullName ||
            `Peserta #${i + 1}`,
        };
      });
    }

    if (orderDetails?.seat_ids && orderDetails.seat_ids.length > 0) {
      return orderDetails.seat_ids.map((seatId, i) => {
        const key = String(seatId);
        return {
          label: formatSeatDisplayName({ id: key }),
          category: "Reguler",
          name:
            participantNames[key] ||
            orderDetails.buyer?.full_name ||
            buyerInfo.fullName ||
            `Peserta #${i + 1}`,
        };
      });
    }

    const fromStore = [
      ...selectedSeats.map((s, i) => ({
        label: formatSeatDisplayName(s),
        category: s.category,
        name:
          participantNames[s.id] ||
          orderDetails?.buyer?.full_name ||
          buyerInfo.fullName ||
          `Peserta #${i + 1}`,
      })),
      ...quotaList.flatMap((q) =>
        Array.from({ length: q.count }, (_, i) => {
          const key = `${q.sectionId}-${i + 1}`;
          return {
            label: formatSeatDisplayName({ id: key, seat_label: `${q.sectionName} (#${i + 1})` }),
            category: q.categoryName,
            name:
              participantNames[key] ||
              orderDetails?.buyer?.full_name ||
              buyerInfo.fullName ||
              `Peserta #${selectedSeats.length + i + 1}`,
          };
        })
      ),
    ];

    return fromStore;
  })();

  const validCount = qrData?.valid_ticket_count ?? (attendeeItems.length || orderDetails?.ticket_count || 1);
  const scanCount = qrData?.successful_scan_count ?? 0;
  const qrTokenValue = qrData?.token || qrData?.qr_image || JSON.stringify({ orderId: id });

  const isNewlyGenerated = searchParams.get("generated") === "1" || justGeneratedFromStorage;

  return (
    <div className="page-container ticket-page max-w-2xl mx-auto py-8 px-4">
      {/* Top navigation — kedua link berada dalam satu baris flex dengan tinggi seragam (min-h-10)
          dan tanpa class `.back-link` (yang menambahkan margin-bottom 23px) agar sejajar vertikal. */}
      <div className="flex flex-row justify-between items-center w-full gap-3 mb-6">
        <Link
          className="inline-flex items-center gap-1.5 min-h-10 text-xs font-semibold leading-none text-stone-600 hover:text-[#D93A2F] whitespace-nowrap transition"
          href="/"
        >
          <span aria-hidden="true">←</span>
          <span>Kembali ke Beranda</span>
        </Link>
        <Link
          className="inline-flex items-center gap-1.5 min-h-10 text-xs font-bold leading-none text-[#D93A2F] hover:underline whitespace-nowrap text-right"
          href="/account/orders"
        >
          <span>
            <span className="hidden sm:inline">Lihat Semua </span>Pesanan Saya
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* WhatsApp E-Ticket & Reminder Notification Alert — ONLY shown right after generating ticket */}
      {!isCancelled && isNewlyGenerated && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 p-4 sm:p-5 rounded-2xl bg-[#E3F4F1] border border-[#1F8F7E]/30 text-[#14665A] shadow-2xs flex items-start gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1F8F7E] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <div className="flex-1 text-xs sm:text-sm leading-relaxed">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <strong className="font-extrabold text-[#0F4D44] text-sm">
                E-Ticket Telah Dikirim Melalui WhatsApp
              </strong>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1F8F7E]/15 text-[#0F4D44] border border-[#1F8F7E]/30">
                Notifikasi Aktif
              </span>
            </div>
            <p className="text-[#14665A]">
              E-ticket resmi beserta kode QR telah dikirimkan ke nomor WhatsApp{" "}
              <strong className="font-extrabold text-[#0F4D44] underline decoration-[#1F8F7E]/50">
                {whatsappNumber}
              </strong>
              . Anda juga akan diingatkan secara otomatis pada <strong>H-3</strong> dan{" "}
              <strong>H-1</strong> sebelum acara berlangsung melalui WhatsApp.
            </p>
          </div>
        </div>
      )}

      {/* Cancelled Banner if event is cancelled */}
      {isCancelled && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <strong className="block font-bold mb-0.5">⚠️ Event Dibatalkan Penyelenggara</strong>
            <span>Tiket ini tidak dapat digunakan. Silakan ajukan pengembalian dana penuh.</span>
          </div>
          <Link
            href={`/account/orders`}
            className="px-4 py-2 bg-[#D93A2F] text-white font-bold text-xs rounded-xl hover:bg-[#c23329] transition text-center shrink-0"
          >
            Isi Rekening Refund →
          </Link>
        </div>
      )}

      {/* Main E-Ticket Card */}
      <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-lg">
        {/* Ticket Header Gradient */}
        <div
          className="text-white p-6 sm:p-8"
          style={{
            background: "linear-gradient(135deg, #D93A2F 0%, #EE6A35 50%, #F4A23B 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="tracking-[0.25em] text-[11px] font-black uppercase bg-black/20 px-2.5 py-1 rounded-full">
              E-TICKET RESMI
            </span>
            <span className="text-xs font-mono font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs">
              {orderDetails?.order_code || qrData?.order_code || "ORD-2026-ATR"}
            </span>
          </div>

          <h2 className="font-extrabold text-2xl sm:text-3xl leading-tight mb-2">
            {event.title}
          </h2>

          <div className="text-xs sm:text-sm opacity-95 flex flex-wrap gap-x-4 gap-y-1">
            <span>📅 {event.dateLabel}</span>
            <span>⏰ {event.time}</span>
            <span>📍 {event.venue}</span>
          </div>
        </div>

        {/* Scan Status & Counter Bar */}
        <div className="p-4 bg-stone-50 border-b border-dashed border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-600">Status Masuk:</span>
            <StatusBadge status={scanCount >= validCount ? "USED" : "ISSUED"} size="sm" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-500">Penggunaan Tiket:</span>
            <span className="font-bold text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-full">
              Scan {scanCount}/{validCount} tiket
            </span>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="p-8 flex flex-col items-center text-center bg-white">
          <p className="text-xs text-stone-500 max-w-sm mb-6 leading-relaxed">
            Tunjukkan QR Code ini kepada petugas di pintu masuk gate venue.
            <br />
            <strong>Satu QR berlaku untuk seluruh {validCount} peserta</strong> dalam pesanan ini.
          </p>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl shadow-inner inline-block">
            {qrLoading ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : qrData?.qr_image ? (
              <Image
                src={qrData.qr_image}
                alt="E-ticket QR Code"
                width={192}
                height={192}
                unoptimized
                className="w-48 h-48 object-contain"
              />
            ) : (
              <div className="bg-white p-3 rounded-xl shadow-xs">
                <QRCode
                  value={qrTokenValue}
                  size={190}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>
            )}
          </div>

          <span className="mt-4 font-mono text-[10px] text-stone-400 break-all max-w-xs">
            {qrTokenValue.slice(0, 32)}...
          </span>
        </div>

        {/* Attendee & Seats List */}
        <div className="p-6 bg-stone-50/70 border-t border-stone-200">
          <h4 className="font-bold text-xs text-stone-500 uppercase tracking-wider mb-3">
            Daftar Peserta & Tempat Duduk
          </h4>

          <div className="space-y-2.5">
            {attendeeItems.map((att, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-xl bg-white border border-stone-200 text-xs shadow-2xs"
              >
                <div className="min-w-0 flex flex-col gap-0.5">
                  <span className="font-bold text-stone-900 break-words">{att.name}</span>
                  <span className="text-[11px] text-stone-500">{att.category}</span>
                </div>
                <span className="self-start sm:self-auto shrink-0 font-bold text-xs bg-stone-100 text-stone-800 px-2.5 py-1 rounded-lg leading-snug">
                  {att.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-semibold">
        <Link
          href="/account/orders"
          className="w-full sm:w-auto px-6 py-3 bg-[#D93A2F] text-white rounded-xl hover:bg-[#c23329] transition text-center shadow-sm"
        >
          Riwayat Pesanan Saya
        </Link>
        <button
          type="button"
          onClick={() => {
            resetBooking();
            router.push("/");
          }}
          className="w-full sm:w-auto px-6 py-3 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition text-center"
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}
