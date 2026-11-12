// src/app/payment/[id]/PaymentPageClient.tsx
//
// Payment Page with Sandbox QRIS simulation, 7-minute payment timer,
// polling / "Cek Status" button, separate order & payment statuses,
// and handling for SUCCESS, FAILED, EXPIRED states.

"use client";

import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useState, useMemo } from "react";
import QRCode from "react-qr-code";
import { cacheLiveEvent, getEventById } from "@/lib/data/events";
import { fetchEvent, fetchMyOrder, fetchMyOrders, payOrder } from "@/services/customerApi";
import type { TicketEvent } from "@/types/event";
import { useBookingStore } from "@/lib/store/useBookingStore";
import { formatRupiah, formatSeatDisplayName } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BookingProgressBar } from "@/components/shared/BookingProgressBar";
import {
  formatRemainingTime,
  getEstimatedServerTime,
  getPaymentExpiryTimestampMs,
} from "@/lib/time-utils";

const PAYMENT_TIMEOUT_SECONDS = 7 * 60; // 7 minutes per business rule

interface ActiveOrderRecord {
  id?: string;
  order_id?: string;
  order_code?: string;
  event_id?: string | number;
  hold_id?: string;
  hold_ids?: string[];
  total_amount?: number;
  status?: string;
  order_status?: string;
  payment_status?: string;
  created_at?: string;
  expires_at?: string;
  payment_expires_at?: string;
  paid_at?: string;
  ticket_count?: number;
  is_local_order?: boolean;
  storage_source?: "LOCAL_SANDBOX" | "DATABASE_API";
  payment?: {
    status?: string;
    expires_at?: string;
    created_at?: string;
  };
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
    seat_id?: string | number;
    event_seat_id?: string | number;
    seat_label?: string;
    row_label?: string;
    seat_number?: number | string;
    block?: string;
    block_code?: string;
    price?: number;
    category?: string;
    category_name?: string;
    attendee_name?: string;
    participant_name?: string;
    seat?: {
      id?: string | number;
      seat_label?: string;
      row_label?: string;
      seat_number?: number | string;
      block?: string;
      block_code?: string;
      category?: string;
    } | null;
    ticket_category?: {
      name?: string;
      price?: number;
    } | null;
  }>;
}

function findInitialActiveOrder(routeId: string, queryOrderId: string | null): ActiveOrderRecord | null {
  if (typeof window === "undefined") return null;

  const targetOrderKey = queryOrderId || routeId;
  let sessionOrder: ActiveOrderRecord | null = null;

  try {
    const raw = sessionStorage.getItem("summa_active_order");
    if (raw) {
      sessionOrder = JSON.parse(raw) as ActiveOrderRecord;
    }
  } catch {
    // ignore
  }

  let localOrders: ActiveOrderRecord[] = [];
  try {
    const rawLocal = localStorage.getItem("summa_customer_orders");
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        localOrders = parsed as ActiveOrderRecord[];
      }
    }
  } catch {
    // ignore
  }

  const allCandidates = sessionOrder ? [sessionOrder, ...localOrders] : localOrders;

  // 1. Exact match by order ID or order code
  const exactOrderMatch = allCandidates.find(
    (o) =>
      String(o.id || "") === String(targetOrderKey) ||
      String(o.order_id || "") === String(targetOrderKey) ||
      String(o.order_code || "") === String(targetOrderKey)
  );
  if (exactOrderMatch) return exactOrderMatch;

  // 2. If sessionOrder matches the event ID, prefer it
  if (
    sessionOrder &&
    (String(sessionOrder.event?.id || "") === String(routeId) ||
      String(sessionOrder.event_id || "") === String(routeId))
  ) {
    return sessionOrder;
  }

  // 3. Look in localOrders for an active UNPAID/PENDING order for this event
  const pendingEventMatch = localOrders.find((o) => {
    const evId = String(o.event?.id || o.event_id || "");
    const st = String(o.order_status || o.status || "UNPAID").toUpperCase();
    return evId === String(routeId) && (st === "UNPAID" || st === "PENDING");
  });
  if (pendingEventMatch) return pendingEventMatch;

  return sessionOrder;
}

function syncOrderStorage(updatedOrder: ActiveOrderRecord) {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(updatedOrder);
    sessionStorage.setItem("summa_active_order", serialized);
    localStorage.setItem("summa_active_order", serialized);
  } catch {
    // ignore
  }
  try {
    const rawLocal = localStorage.getItem("summa_customer_orders");
    const localList: ActiveOrderRecord[] = rawLocal ? JSON.parse(rawLocal) : [];
    const targetId = String(updatedOrder.id || updatedOrder.order_id || "");
    const targetCode = updatedOrder.order_code;
    const filtered = localList.filter(
      (o) =>
        String(o.id || o.order_id || "") !== targetId &&
        (!targetCode || o.order_code !== targetCode)
    );
    localStorage.setItem(
      "summa_customer_orders",
      JSON.stringify([updatedOrder, ...filtered])
    );
  } catch {
    // ignore
  }
}

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
  const searchParams = useSearchParams();
  const queryOrderId = searchParams.get("orderId");

  // Active order retrieved from sessionStorage / localStorage if available
  const [activeOrder, setActiveOrder] = useState<ActiveOrderRecord | null>(() =>
    findInitialActiveOrder(id, queryOrderId)
  );

  const resolvedEventId = useMemo(() => {
    const fromOrder = activeOrder?.event?.id || activeOrder?.event_id;
    if (fromOrder) return String(fromOrder);
    return id;
  }, [activeOrder, id]);

  const [fetchedEvent, setFetchedEvent] = useState<TicketEvent | null>(null);
  const event = useMemo(
    () => fetchedEvent || getEventById(resolvedEventId) || null,
    [fetchedEvent, resolvedEventId]
  );
  const [isLoading, setIsLoading] = useState(() => !getEventById(resolvedEventId));

  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const quotaItems = useBookingStore((s) => s.quotaItems);
  const clearLockTimer = useBookingStore((s) => s.clearLockTimer);
  const releaseHold = useBookingStore((s) => s.releaseHold);
  const hydrateFromStorage = useBookingStore((s) => s.hydrateFromStorage);

  // Restore booking store state on mount so heldSeatIds & selectedSeats are available
  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Resolve deterministic expiration timestamp (persisted across page navigation)
  const expiryTimestampMs = useMemo(() => {
    const fromOrder = getPaymentExpiryTimestampMs(activeOrder);
    if (fromOrder !== null) return fromOrder;

    if (typeof window !== "undefined") {
      const storageKey = `summa_payment_expiry_${activeOrder?.id || activeOrder?.order_id || queryOrderId || id}`;
      const existingRaw = sessionStorage.getItem(storageKey);
      if (existingRaw) {
        const parsed = Number(existingRaw);
        if (!Number.isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
      const fallbackExpiry = getEstimatedServerTime() + PAYMENT_TIMEOUT_SECONDS * 1000;
      sessionStorage.setItem(storageKey, String(fallbackExpiry));
      return fallbackExpiry;
    }

    return getEstimatedServerTime() + PAYMENT_TIMEOUT_SECONDS * 1000;
  }, [activeOrder, id, queryOrderId]);

  // Payment state initialized from activeOrder and persistent timestamp
  const [orderStatus, setOrderStatus] = useState<string>(() => {
    const raw = String(activeOrder?.order_status || activeOrder?.status || "PENDING").toUpperCase();
    if (raw === "PAID" || raw === "SUCCESS") return "PAID";
    if (raw === "EXPIRED" || raw === "CANCELLED" || raw === "FAILED") return raw;
    const initialRemaining = Math.max(0, Math.floor((expiryTimestampMs - getEstimatedServerTime()) / 1000));
    return initialRemaining <= 0 ? "EXPIRED" : "PENDING";
  });

  const [paymentStatus, setPaymentStatus] = useState<string>(() => {
    const rawOrder = String(activeOrder?.order_status || activeOrder?.status || "PENDING").toUpperCase();
    const rawPay = String(
      activeOrder?.payment?.status || activeOrder?.payment_status || "PENDING"
    ).toUpperCase();
    if (rawOrder === "PAID" || rawPay === "PAID" || rawPay === "SUCCESS") return "SUCCESS";
    if (rawPay === "FAILED" || rawOrder === "CANCELLED") return "FAILED";
    if (rawPay === "EXPIRED" || rawOrder === "EXPIRED") return "EXPIRED";
    const initialRemaining = Math.max(0, Math.floor((expiryTimestampMs - getEstimatedServerTime()) / 1000));
    return initialRemaining <= 0 ? "EXPIRED" : "PENDING";
  });

  const [paymentSecondsLeft, setPaymentSecondsLeft] = useState<number>(() => {
    const diffSec = Math.floor((expiryTimestampMs - getEstimatedServerTime()) / 1000);
    return Math.max(0, diffSec);
  });

  const [isChecking, setIsChecking] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync activeOrder timestamps to storage on mount,
  // or fetch order from API if user navigated directly via /payment/[orderId]
  useEffect(() => {
    if (activeOrder) {
      const expIso = new Date(expiryTimestampMs).toISOString();
      const createdIso =
        activeOrder.created_at ||
        new Date(expiryTimestampMs - PAYMENT_TIMEOUT_SECONDS * 1000).toISOString();
      syncOrderStorage({
        ...activeOrder,
        created_at: createdIso,
        expires_at: activeOrder.expires_at || expIso,
        payment_expires_at: activeOrder.payment_expires_at || expIso,
      });
      return;
    }

    // If activeOrder wasn't in local/session storage, try fetching from API (e.g. /payment/ORD-...)
    const targetId = queryOrderId || id;
    if (!targetId) return;

    fetchMyOrder(targetId)
      .then((res) => {
        if (res.data) {
          const fetched = res.data as unknown as ActiveOrderRecord;
          setActiveOrder(fetched);
          syncOrderStorage(fetched);
        }
      })
      .catch(async () => {
        try {
          const listRes = await fetchMyOrders();
          const rawData = listRes.data as unknown;
          const list: ActiveOrderRecord[] = Array.isArray(rawData)
            ? (rawData as ActiveOrderRecord[])
            : ((rawData as { items?: ActiveOrderRecord[] })?.items || []);
          const found = list.find(
            (o) =>
              String(o.id || o.order_id || "") === String(targetId) ||
              String(o.order_code || "") === String(targetId) ||
              (String(o.event?.id || o.event_id || "") === String(id) &&
                ["UNPAID", "PENDING"].includes(String(o.order_status || o.status || "").toUpperCase()))
          );
          if (found) {
            setActiveOrder(found);
            syncOrderStorage(found);
          }
        } catch {
          // Ignore
        }
      });
  }, [activeOrder, expiryTimestampMs, id, queryOrderId]);

  // Load event using resolvedEventId
  useEffect(() => {
    if (getEventById(resolvedEventId)) {
      return;
    }

    fetchEvent(resolvedEventId)
      .then((res) => {
        if (res.data) setFetchedEvent(cacheLiveEvent(res.data));
      })
      .catch((err) => {
        console.error("Failed to load event for payment:", err);
      })
      .finally(() => setIsLoading(false));
  }, [resolvedEventId]);

  // Persistent 7-minute payment countdown calculated from absolute expiryTimestampMs
  useEffect(() => {
    if (paymentStatus === "SUCCESS" || paymentStatus === "FAILED" || paymentStatus === "EXPIRED") {
      return;
    }

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiryTimestampMs - getEstimatedServerTime()) / 1000));
      setPaymentSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        setPaymentStatus("EXPIRED");
        setOrderStatus("EXPIRED");
        clearLockTimer();
        if (activeOrder) {
          syncOrderStorage({
            ...activeOrder,
            status: "EXPIRED",
            order_status: "EXPIRED",
            payment_status: "EXPIRED",
          });
        }
        void releaseHold(event?.id || resolvedEventId);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentStatus, expiryTimestampMs, clearLockTimer, releaseHold, event?.id, resolvedEventId, activeOrder]);

  const quotaList = Object.values(quotaItems);
  const allTickets = useMemo(() => {
    if (activeOrder?.items && activeOrder.items.length > 0) {
      return activeOrder.items.map((item) => ({
        label: formatSeatDisplayName(item.seat || item),
        category:
          item.category ||
          item.category_name ||
          item.ticket_category?.name ||
          item.seat?.category ||
          "Reguler",
        price: item.price ?? item.ticket_category?.price ?? 0,
      }));
    }
    const fromStore = [
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
    return fromStore;
  }, [selectedSeats, quotaList, activeOrder]);

  const totalPrice = useMemo(() => {
    if (activeOrder?.total_amount) return activeOrder.total_amount;
    return allTickets.reduce((sum, item) => sum + item.price, 0);
  }, [activeOrder, allTickets]);

  // "Cek Status" manual button — ONLY navigates to /ticket/:id if API strictly confirms PAID / SUCCESS
  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);

    try {
      const targetOrderId = String(
        activeOrder?.id || activeOrder?.order_id || queryOrderId || ""
      ).trim();
      const targetOrderCode = String(activeOrder?.order_code || "").trim();

      let found: ActiveOrderRecord | null = null;

      // 1. If we have a specific non-simulated order ID, query fetchMyOrder(targetOrderId) first
      if (targetOrderId && !targetOrderId.startsWith("ORD-SIM")) {
        try {
          const singleRes = await fetchMyOrder(targetOrderId);
          if (singleRes.data) {
            found = singleRes.data as unknown as ActiveOrderRecord;
          }
        } catch {
          // Fallback to fetchMyOrders list below
        }
      }

      // 2. Fallback: look in fetchMyOrders() strictly by the current order's ID or order_code
      if (!found) {
        const ordersRes = await fetchMyOrders();
        const rawData = ordersRes.data as unknown;
        const list: ActiveOrderRecord[] = Array.isArray(rawData)
          ? (rawData as ActiveOrderRecord[])
          : ((rawData as { items?: ActiveOrderRecord[] })?.items || []);

        found =
          list.find((o) => {
            const oId = String(o.order_id || o.id || "").trim();
            const oCode = String(o.order_code || "").trim();
            if (targetOrderId && oId === targetOrderId) return true;
            if (targetOrderCode && oCode === targetOrderCode) return true;
            // If route param `id` itself is an order ID / order code
            if (oId === String(id) || oCode === String(id)) return true;
            return false;
          }) || null;
      }

      // 3. Fallback to activeOrder in local/session state if simulated
      const orderToEvaluate = found || activeOrder;

      if (orderToEvaluate) {
        const rawOrderStatus = String(
          orderToEvaluate.order_status || orderToEvaluate.status || "UNPAID"
        ).toUpperCase();
        const rawPaymentStatus = String(
          orderToEvaluate.payment?.status ||
            orderToEvaluate.payment_status ||
            (rawOrderStatus === "PAID" || rawOrderStatus === "SUCCESS" ? "SUCCESS" : "PENDING")
        ).toUpperCase();

        const isPaid =
          rawOrderStatus === "PAID" ||
          rawOrderStatus === "SUCCESS" ||
          rawPaymentStatus === "PAID" ||
          rawPaymentStatus === "SUCCESS";

        if (isPaid) {
          setOrderStatus("PAID");
          setPaymentStatus("SUCCESS");
          clearLockTimer();

          const updatedPaidOrder: ActiveOrderRecord = {
            ...activeOrder,
            ...orderToEvaluate,
            status: "PAID",
            order_status: "PAID",
            payment_status: "PAID",
            is_local_order: true,
            storage_source: "LOCAL_SANDBOX",
            paid_at: orderToEvaluate.paid_at || new Date().toISOString(),
          };
          setActiveOrder(updatedPaidOrder);
          syncOrderStorage(updatedPaidOrder);

          if (typeof window !== "undefined") {
            sessionStorage.setItem("summa_ticket_just_generated", "1");
          }
          const paidOrderId = String(
            updatedPaidOrder.id || updatedPaidOrder.order_id || targetOrderId || ""
          );
          const orderQuery = paidOrderId ? `orderId=${encodeURIComponent(paidOrderId)}&` : "";
          router.push(`/ticket/${event?.id || resolvedEventId}?${orderQuery}generated=1`);
          return;
        }

        if (rawOrderStatus === "EXPIRED" || rawPaymentStatus === "EXPIRED") {
          setOrderStatus("EXPIRED");
          setPaymentStatus("EXPIRED");
          clearLockTimer();
          void releaseHold(event?.id || resolvedEventId);
          return;
        }

        if (rawOrderStatus === "CANCELLED" || rawPaymentStatus === "FAILED") {
          setOrderStatus("CANCELLED");
          setPaymentStatus("FAILED");
          clearLockTimer();
          void releaseHold(event?.id || resolvedEventId);
          return;
        }

        // Still UNPAID or PENDING — keep on payment page and show alert
        setOrderStatus("PENDING");
        setPaymentStatus("PENDING");
      }

      setStatusMessage(
        "Pembayaran belum terdeteksi dari gateway. Karena berada di lingkungan sandbox demo, gunakan tombol '✓ Bayar Sukses' pada panel Simulator Callback di samping untuk mengonfirmasi pembayaran."
      );
    } catch {
      setStatusMessage(
        "Pembayaran belum terdeteksi. Silakan gunakan tombol simulator sandbox '✓ Bayar Sukses' untuk menguji alur tiket berhasil."
      );
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

    setTimeout(async () => {
      setPaymentStatus(mode);
      setIsChecking(false);

      if (mode === "SUCCESS") {
        setOrderStatus("PAID");
        clearLockTimer();

        // Update stored order status
        const finalOrderId = resolvedOrderId || `ORD-SIM-${Date.now()}`;
        if (typeof window !== "undefined") {
          const resolvedCode = activeOrder?.order_code || `ORD-${Date.now().toString().slice(-6)}`;
          const nowIso = new Date().toISOString();
          const updated: ActiveOrderRecord = {
            ...activeOrder,
            id: finalOrderId,
            order_id: finalOrderId,
            order_code: resolvedCode,
            status: "PAID",
            order_status: "PAID",
            payment_status: "PAID",
            is_local_order: true,
            storage_source: "LOCAL_SANDBOX",
            created_at: activeOrder?.created_at || nowIso,
            paid_at: nowIso,
            total_amount: totalPrice,
            ticket_count: allTickets.length,
            event: activeOrder?.event || {
              id: event?.id || resolvedEventId,
              name: event?.title || "Bandung Tech & Creative Expo",
              title: event?.title || "Bandung Tech & Creative Expo",
              start_at: event?.dateISO || nowIso,
              status: event?.badge || "SALES_OPEN",
            },
            seat_ids: activeOrder?.seat_ids || selectedSeats.map((s) => s.id),
            items:
              activeOrder?.items && activeOrder.items.length > 0
                ? activeOrder.items
                : allTickets.map((t, idx) => ({
                    id: `item-${idx + 1}`,
                    seat_label: t.label,
                    price: t.price,
                    category: t.category,
                    attendee_name: "Peserta",
                  })),
          };
          setActiveOrder(updated);
          syncOrderStorage(updated);
          sessionStorage.setItem("summa_ticket_just_generated", "1");
        }

        // Navigate to E-Ticket with generated flag so WhatsApp alert only shows after generation
        router.push(
          `/ticket/${event?.id || resolvedEventId}?orderId=${encodeURIComponent(String(finalOrderId))}&generated=1`
        );
      } else if (mode === "FAILED") {
        setOrderStatus("CANCELLED");
        clearLockTimer();
        if (activeOrder) {
          syncOrderStorage({
            ...activeOrder,
            status: "CANCELLED",
            order_status: "CANCELLED",
            payment_status: "FAILED",
          });
        }
        await releaseHold(event?.id || resolvedEventId);
      } else if (mode === "EXPIRED") {
        setOrderStatus("EXPIRED");
        clearLockTimer();
        if (activeOrder) {
          syncOrderStorage({
            ...activeOrder,
            status: "EXPIRED",
            order_status: "EXPIRED",
            payment_status: "EXPIRED",
          });
        }
        await releaseHold(event?.id || resolvedEventId);
      }
    }, 600);
  };

  // Release held seats (awaiting DELETE /api/events/:id/holds) BEFORE clearing active order and navigating
  const handleRetryBooking = async () => {
    if (isReleasing) return;
    setIsReleasing(true);
    try {
      await releaseHold(event?.id || resolvedEventId);
    } finally {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("summa_active_order");
      }
      setIsReleasing(false);
      router.push(`/event/${event?.id || resolvedEventId}/book`);
    }
  };

  if (isLoading && !event) {
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
      <BookingProgressBar
        currentStep={3}
        eventId={event?.id || resolvedEventId}
        onStepClick={(step) => {
          if (step === 2) {
            router.push(`/order/${event?.id || resolvedEventId}`);
          } else if (step === 1) {
            void handleRetryBooking();
          }
        }}
      />

      <Link className="back-link inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 mb-6 transition" href={`/order/${event?.id || resolvedEventId}`}>
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

      {/* Sticky Payment Timer (7 minutes) — hanya kapsul timer yang melayang (tanpa blok background putih)
          di bawah floating progress line navbar dengan offset aman 20px sehingga sisa waktu tetap terlihat saat pengguna scroll ke bawah. */}
      {paymentStatus === "PENDING" && (
        <div
          role="timer"
          aria-live="polite"
          className="sticky top-[calc(var(--header-h)+20px)] z-40 bg-transparent pointer-events-none py-1 mb-5"
        >
          <div className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-amber-50/95 backdrop-blur-xs border border-amber-300/90 shadow-md text-xs text-amber-900">
            <span className="inline-flex items-center gap-2 font-semibold min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#E9A12B] animate-pulse shrink-0" aria-hidden="true" />
              <span className="truncate">Batas waktu bayar</span>
            </span>
            <span className="font-mono font-bold text-sm sm:text-base text-[#D93A2F] tabular-nums shrink-0">
              {formatRemainingTime(paymentSecondsLeft)}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Kolom Kiri: QRIS Card */}
        <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm text-center">
          {/* Status Bar: Clean stacked key-value rows ensuring zero overflow on both desktop 2-column cards & mobile */}
          <div className="w-full flex flex-col gap-2 mb-5 pb-3.5 border-b border-stone-100 text-xs">
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200/60 text-left">
              <span className="text-stone-600 font-semibold text-xs">Status Pesanan:</span>
              <StatusBadge status={orderStatus} size="sm" className="whitespace-nowrap shrink-0" />
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200/60 text-left">
              <span className="text-stone-600 font-semibold text-xs">Status Pembayaran:</span>
              <StatusBadge status={paymentStatus} size="sm" className="whitespace-nowrap shrink-0" />
            </div>
          </div>

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
                onClick={handleRetryBooking}
                disabled={isReleasing}
                className="px-4 py-2 bg-[#D93A2F] text-white rounded-lg text-xs font-bold hover:bg-[#c23329] disabled:opacity-50 transition"
              >
                {isReleasing ? "Melepaskan kursi..." : "Pesan Ulang Tiket"}
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
                onClick={handleRetryBooking}
                disabled={isReleasing}
                className="px-4 py-2 bg-[#D93A2F] text-white rounded-lg text-xs font-bold hover:bg-[#c23329] disabled:opacity-50 transition"
              >
                {isReleasing ? "Melepaskan kursi..." : "Kembali ke Denah"}
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
                <div
                  role="status"
                  className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center justify-center gap-2"
                >
                  <span>⏳</span>
                  <span>{statusMessage}</span>
                </div>
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
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs">
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
                className="min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-0.5 py-2 px-1 sm:px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs leading-tight tracking-tight sm:tracking-normal whitespace-normal break-words transition shadow-sm text-center disabled:opacity-50"
              >
                <span>✓</span>
                <span className="block w-full">Bayar Sukses</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulatePayment("FAILED")}
                disabled={isChecking || paymentStatus === "SUCCESS"}
                className="min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-0.5 py-2 px-1 sm:px-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] sm:text-xs leading-tight tracking-tight sm:tracking-normal whitespace-normal break-words transition shadow-sm text-center disabled:opacity-50"
              >
                <span>✕</span>
                <span className="block w-full">Bayar Gagal</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulatePayment("EXPIRED")}
                disabled={isChecking || paymentStatus === "SUCCESS"}
                className="min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-0.5 py-2 px-1 sm:px-2 rounded-xl bg-stone-600 hover:bg-stone-700 text-white font-bold text-[10px] sm:text-xs leading-tight tracking-tight sm:tracking-normal whitespace-normal break-words transition shadow-sm text-center disabled:opacity-50"
              >
                <span>◷</span>
                <span className="block w-full">Kedaluwarsa</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
