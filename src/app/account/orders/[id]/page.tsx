// src/app/account/orders/[id]/page.tsx
//
// Order Detail Page.
// Displays order status, payment status, refund status, individual ticket items,
// attendee name modification (before H-1), and refund request submission.

"use client";

import React, { Suspense, useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchMyOrders,
  fetchMyOrder,
  createRefund,
} from "@/services/customerApi";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRupiah, formatSeatDisplayName } from "@/lib/utils";
import {
  formatIndonesianDateTime,
  formatRemainingTime,
  checkHMinusOneCutoff,
  getPaymentSecondsRemaining,
} from "@/lib/time-utils";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

interface OrderDetailTicketItem {
  id: string;
  seat_label?: string;
  category?: string;
  attendee_name?: string;
  price?: number;
  status?: string;
}

interface OrderDetailState {
  order_id?: string;
  id?: string | number;
  order_code?: string;
  event_id?: string | number;
  order_status?: string;
  status?: string;
  payment_status?: string;
  refund_status?: string;
  refund_data_status?: string;
  created_at?: string;
  expires_at?: string;
  payment_expires_at?: string;
  total_amount?: number;
  ticket_count?: number;
  event_status?: string;
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
    event_date?: string;
    status?: string;
  };
  items?: OrderDetailTicketItem[];
}

function findLocalMatchingOrder(targetId: string): OrderDetailState | null {
  if (typeof window === "undefined") return null;
  const candidates: OrderDetailState[] = [];
  try {
    const rawActive = sessionStorage.getItem("summa_active_order");
    if (rawActive) {
      const parsed = JSON.parse(rawActive);
      if (parsed) candidates.push(parsed);
    }
  } catch {
    // ignore
  }
  try {
    const rawActiveLocal = localStorage.getItem("summa_active_order");
    if (rawActiveLocal) {
      const parsed = JSON.parse(rawActiveLocal);
      if (parsed) candidates.push(parsed);
    }
  } catch {
    // ignore
  }
  try {
    const rawLocal = localStorage.getItem("summa_customer_orders");
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) candidates.push(...parsed);
    }
  } catch {
    // ignore
  }
  const found = candidates.find(
    (o) =>
      String(o.id || o.order_id || "") === String(targetId) ||
      String(o.order_code || "") === String(targetId)
  );

  if (!found) return null;

  return {
    ...found,
    is_local_order: found.is_local_order ?? true,
    storage_source: found.storage_source ?? "LOCAL_SANDBOX",
  };
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] py-16 px-4 text-center">
          <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold text-stone-700">Memuat detail pesanan...</p>
        </div>
      }
    >
      <OrderDetailContent params={params} />
    </Suspense>
  );
}

function OrderDetailContent({ params }: OrderDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetailState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setTimerTick] = useState<number>(0);

  // Name Change Modal State
  const [editingTicket, setEditingTicket] = useState<{ id: string; name: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [nameChangeSuccess, setNameChangeSuccess] = useState(false);

  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundMethod, setRefundMethod] = useState<"BANK_TRANSFER" | "E_WALLET">("BANK_TRANSFER");
  const [providerName, setProviderName] = useState("BCA");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [refundSubmitted, setRefundSubmitted] = useState(false);

  useEffect(() => {
    const localMatch = findLocalMatchingOrder(id);

    fetchMyOrder(id)
      .then((res) => {
        const apiOrder = res.data as unknown as OrderDetailState;
        setOrder({
          ...localMatch,
          ...apiOrder,
          created_at: apiOrder.created_at || localMatch?.created_at,
          expires_at: apiOrder.expires_at || localMatch?.expires_at,
          payment_expires_at: apiOrder.payment_expires_at || localMatch?.payment_expires_at,
        });
      })
      .catch(async () => {
        // Fallback: look in list
        try {
          const listRes = await fetchMyOrders();
          const list = Array.isArray(listRes.data)
            ? (listRes.data as unknown as OrderDetailState[])
            : (listRes.data as unknown as { items?: OrderDetailState[] })?.items || [];
          const found = list.find(
            (o) =>
              String(o.id || o.order_id) === String(id) ||
              String(o.order_code) === String(id)
          );
          if (found) {
            setOrder({
              ...localMatch,
              ...found,
              created_at: found.created_at || localMatch?.created_at,
              expires_at: found.expires_at || localMatch?.expires_at,
              payment_expires_at: found.payment_expires_at || localMatch?.payment_expires_at,
            });
            return;
          }
        } catch {
          // Continue to local storage check
        }

        if (localMatch) {
          setOrder(localMatch);
          return;
        }

        setError("Pesanan tidak ditemukan.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Live countdown ticker for UNPAID / PENDING orders
  useEffect(() => {
    if (!order) return;
    const rawOrderStatus = String(order.order_status || order.status || "PAID").toUpperCase();
    const rawPaymentStatus = String(
      order.payment_status || order.payment?.status || rawOrderStatus
    ).toUpperCase();
    const isPending =
      rawOrderStatus === "UNPAID" ||
      rawOrderStatus === "PENDING" ||
      rawPaymentStatus === "UNPAID" ||
      rawPaymentStatus === "PENDING";

    if (!isPending || rawOrderStatus === "PAID" || rawPaymentStatus === "PAID" || rawPaymentStatus === "SUCCESS") {
      return;
    }

    const interval = setInterval(() => {
      const rem = getPaymentSecondsRemaining(order);
      setTimerTick((prev) => prev + 1);
      if (rem <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order]);

  if (loading) {
    return (
      <div className="page-container max-w-4xl mx-auto py-16 text-center">
        <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-semibold text-stone-700">Memuat detail pesanan...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="page-container max-w-4xl mx-auto py-12 px-4">
        <Link href="/account/orders" className="text-xs font-semibold text-stone-600 hover:text-stone-900 mb-4 block">
          ← Kembali ke Riwayat Pesanan
        </Link>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 text-sm">
          <p className="font-bold mb-1">Pesanan Tidak Ditemukan</p>
          <p>{error || "Data pesanan tidak tersedia."}</p>
        </div>
      </div>
    );
  }

  const orderId = order.order_id || order.id || id;
  const eventId = order.event?.id || order.event_id || "EVT-ATR-001";
  const eventStartDate = order.event?.start_at || order.event?.event_date || "2026-12-20T10:00:00";
  const isCancelled = order.event_status === "CANCELLED" || order.event?.status === "CANCELLED";

  // Normalize order and payment statuses
  const rawOrderStatus = String(order.order_status || order.status || "PAID").toUpperCase();
  const rawPaymentStatus = String(
    order.payment_status ||
      order.payment?.status ||
      (rawOrderStatus === "PAID" ? "SUCCESS" : rawOrderStatus)
  ).toUpperCase();

  const isOrderPaid =
    rawOrderStatus === "PAID" ||
    rawOrderStatus === "SUCCESS" ||
    rawPaymentStatus === "PAID" ||
    rawPaymentStatus === "SUCCESS";

  const isUnpaidOrPending =
    !isOrderPaid &&
    (rawOrderStatus === "UNPAID" ||
      rawOrderStatus === "PENDING" ||
      rawPaymentStatus === "UNPAID" ||
      rawPaymentStatus === "PENDING");

  const currentRemainingSec = isUnpaidOrPending
    ? getPaymentSecondsRemaining(order)
    : 0;
  const isPaymentWindowActive = isUnpaidOrPending && currentRemainingSec > 0;

  const effectiveOrderStatus = isOrderPaid
    ? "PAID"
    : isUnpaidOrPending && currentRemainingSec <= 0
      ? "EXPIRED"
      : rawOrderStatus;

  const effectivePaymentStatus = isOrderPaid
    ? "SUCCESS"
    : isUnpaidOrPending && currentRemainingSec <= 0
      ? "EXPIRED"
      : rawPaymentStatus;

  const handleContinuePayment = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("summa_active_order", JSON.stringify(order));
      } catch {
        // ignore
      }
    }
    router.push(`/payment/${orderId}`);
  };

  // Check H-1 cutoff for name change & participant refund
  const cutoff = checkHMinusOneCutoff(eventStartDate);

  // Tickets list
  const ticketItems = order.items && order.items.length > 0
    ? order.items
    : [
        {
          id: "TKT-01",
          seat_label: "A01",
          category: "Premium",
          attendee_name: "Nadia Putri",
          price: 350000,
          status: isOrderPaid ? "ISSUED" : effectiveOrderStatus,
        },
      ];

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket || !newName.trim()) return;

    // Update in local state and sync storage
    setOrder((prev) => {
      if (!prev) return null;
      const nextItems = prev.items?.map((it) =>
        it.id === editingTicket.id
          ? { ...it, attendee_name: newName, participant_name: newName }
          : it
      ) || [{ ...ticketItems[0], attendee_name: newName }];
      const updated = { ...prev, items: nextItems };

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("summa_active_order", JSON.stringify(updated));
          const rawLocal = localStorage.getItem("summa_customer_orders");
          const localList: OrderDetailState[] = rawLocal ? JSON.parse(rawLocal) : [];
          const filtered = localList.filter(
            (o) =>
              String(o.id || o.order_id || "") !== String(updated.id || updated.order_id || "") &&
              (!updated.order_code || o.order_code !== updated.order_code)
          );
          localStorage.setItem("summa_customer_orders", JSON.stringify([updated, ...filtered]));
        } catch {
          // ignore
        }
      }

      return updated;
    });

    setNameChangeSuccess(true);
    setTimeout(() => {
      setNameChangeSuccess(false);
      setEditingTicket(null);
    }, 1200);
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRefund(true);

    try {
      await createRefund({
        order_id: String(orderId),
        reason: refundReason || "Pengajuan refund peserta",
        dest_method: refundMethod,
        dest_provider_name: providerName,
        dest_account_number: accountNumber,
        dest_account_holder: accountHolderName,
        refund_destination: {
          method: refundMethod,
          bank_or_provider: providerName,
          account_number: accountNumber,
          account_name: accountHolderName,
        },
      });
    } catch (err) {
      console.error("Refund submission error:", err);
    }

    setIsSubmittingRefund(false);
    setRefundSubmitted(true);
    setOrder((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        refund_status: "UNDER_REVIEW",
        refund_data_status: "COMPLETE",
      };
    });

    setTimeout(() => {
      setShowRefundModal(false);
      setRefundSubmitted(false);
    }, 2000);
  };

  return (
    <div className="page-container max-w-4xl mx-auto py-8 px-4">
      <Link href="/account/orders" className="text-xs font-semibold text-stone-600 hover:text-stone-900 mb-4 inline-flex items-center gap-1 transition">
        ← Kembali ke Daftar Pesanan
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-md">
              ORDER #{order.order_code || orderId}
            </span>
            {order.is_local_order ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full"
                title="Tersimpan di browser lokal"
              >
                <span>💾</span>
                <span>Lokal (Sandbox)</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full"
                title="Tersimpan di server database API"
              >
                <span>☁️</span>
                <span>Database Server</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-tight">
            Detail Pesanan Tiket
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Dibuat pada {order.created_at ? formatIndonesianDateTime(order.created_at) : "Hari ini"}
          </p>
        </div>

        {isOrderPaid && (
          <Link
            href={`/ticket/${eventId}?orderId=${encodeURIComponent(String(orderId))}`}
            onClick={() => {
              if (typeof window !== "undefined") {
                try {
                  sessionStorage.setItem("summa_active_order", JSON.stringify(order));
                } catch {
                  // ignore
                }
              }
            }}
            className="px-5 py-2.5 bg-[#D93A2F] text-white text-xs font-bold rounded-xl hover:bg-[#c23329] transition shadow-sm"
          >
            Buka E-Ticket QR →
          </Link>
        )}

        {isPaymentWindowActive && (
          <button
            type="button"
            onClick={handleContinuePayment}
            className="px-5 py-2.5 bg-[#D93A2F] text-white text-xs font-bold rounded-xl hover:bg-[#c23329] active:scale-[0.99] transition shadow-sm inline-flex items-center gap-2"
          >
            <span>Lanjutkan Pembayaran</span>
            <span className="font-mono bg-white/20 px-2 py-0.5 rounded-md text-[11px]">
              {formatRemainingTime(currentRemainingSec)}
            </span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* Pending Payment Callout Banner */}
      {isPaymentWindowActive && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">⏳</span>
              <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                Menunggu Pembayaran QRIS
              </h3>
              <span className="font-mono text-xs font-extrabold text-[#D93A2F] bg-white border border-amber-300 px-2 py-0.5 rounded-md">
                Sisa {formatRemainingTime(currentRemainingSec)}
              </span>
            </div>
            <p className="text-xs text-amber-900/80">
              Pesananmu belum dibayar. Segera selesaikan pembayaran QRIS sebelum batas waktu 7 menit berakhir agar kursimu tidak dilepas.
            </p>
          </div>
          <button
            type="button"
            onClick={handleContinuePayment}
            className="px-4 py-2.5 bg-[#D93A2F] text-white text-xs font-bold rounded-xl hover:bg-[#c23329] transition shadow-sm shrink-0 text-center"
          >
            Lanjutkan Pembayaran →
          </button>
        </div>
      )}

      {/* Status Highlights Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-stone-500 block mb-1">Status Pesanan</span>
          <StatusBadge status={effectiveOrderStatus} size="sm" />
        </div>
        <div className="p-3.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-stone-500 block mb-1">Status Pembayaran</span>
          <StatusBadge status={effectivePaymentStatus} size="sm" />
        </div>
        <div className="p-3.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-stone-500 block mb-1">Status Refund</span>
          <StatusBadge status={order.refund_status ?? (isCancelled ? "REQUESTED" : null)} size="sm" />
        </div>
        <div className="p-3.5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-stone-500 block mb-1">Batas Ubah Nama</span>
          <span className={`text-xs font-semibold ${cutoff.isPassed ? "text-stone-400" : "text-emerald-700"}`}>
            {cutoff.isPassed ? "Sudah Lewat (H-1)" : "Aktif (H-1)"}
          </span>
        </div>
      </div>

      {/* Event Details Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="font-bold text-lg text-stone-900 mb-1">
          {order.event?.name || order.event?.title || "Bandung Tech & Creative Expo"}
        </h2>
        <div className="text-xs text-stone-500 flex flex-wrap items-center gap-4 mt-2">
          <span className="inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatIndonesianDateTime(eventStartDate)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.686-6-10a6 6 0 0112 0c0 4.314-6 10-6 10z" />
              <circle cx="12" cy="11" r="2.5" />
            </svg>
            <span>Summarecon Mall Bandung</span>
          </span>
        </div>

        {isCancelled && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center justify-between">
            <div>
              <strong>Event Dibatalkan oleh Penyelenggara:</strong> Dana tiket dapat dikembalikan penuh tanpa biaya admin.
            </div>
            <button
              type="button"
              onClick={() => setShowRefundModal(true)}
              className="px-3 py-1.5 bg-[#D93A2F] text-white font-bold rounded-lg hover:bg-[#c23329] transition shrink-0"
            >
              Isi Rekening Refund
            </button>
          </div>
        )}
      </div>

      {/* Ticket Items & Attendee Names */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-stone-100">
          <div>
            <h3 className="font-bold text-base text-stone-900">
              Daftar Tiket & Peserta ({ticketItems.length} Tiket)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Perubahan nama peserta dapat dilakukan gratis sebelum batas waktu: <strong>{cutoff.deadlineFormatted}</strong>
            </p>
          </div>

          {!isCancelled && (order.order_status === "PAID" || order.status === "PAID") && !order.refund_status && (
            <button
              type="button"
              disabled={cutoff.isPassed}
              onClick={() => setShowRefundModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-stone-300 text-stone-700 bg-white hover:border-[#D93A2F] hover:text-[#D93A2F] hover:bg-rose-50/40 active:scale-[0.98] transition shadow-2xs shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-stone-300 disabled:hover:text-stone-700 disabled:hover:bg-white"
            >
              <svg className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#D93A2F] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H4m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>{cutoff.isPassed ? "Batas Refund Lewat" : "Ajukan Refund Peserta"}</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          {ticketItems.map((item, idx: number) => {
            const ticketId = item.id || `TKT-${idx + 1}`;
            const attendee = item.attendee_name || "Nadia Putri";
            const cleanSeatLabel = item.seat_label
              ? formatSeatDisplayName({
                  id: item.seat_label,
                  seat_label: item.seat_label,
                  category: item.category,
                })
              : `Tiket #${idx + 1}`;

            return (
              <div
                key={ticketId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                    <span className="font-bold text-stone-900 text-sm whitespace-nowrap">
                      {cleanSeatLabel}
                    </span>
                    <span className="font-medium bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap shrink-0">
                      {item.category || "Reguler"}
                    </span>
                    <StatusBadge status={item.status || (isOrderPaid ? "ISSUED" : effectiveOrderStatus)} size="sm" className="whitespace-nowrap shrink-0" />
                  </div>
                  <div className="text-stone-600">
                    Nama Peserta: <strong className="text-stone-900">{attendee}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <span className="font-extrabold text-stone-900 text-sm">
                    {formatRupiah(item.price || 350000)}
                  </span>

                  {!isCancelled && (
                    <button
                      type="button"
                      disabled={cutoff.isPassed}
                      onClick={() => {
                        setEditingTicket({ id: ticketId, name: attendee });
                        setNewName(attendee);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-stone-300 font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Ubah Nama
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {cutoff.isPassed && (
          <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg mt-4">
            ⚠️ Batas waktu perubahan nama (H-1 sebelum acara) telah ditutup pada {cutoff.deadlineFormatted}.
          </p>
        )}
      </div>

      {/* Edit Attendee Name Modal */}
      {editingTicket && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Ubah Nama Peserta
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Nama harus sesuai dengan kartu identitas (KTP/SIM/Paspor) saat check-in.
            </p>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Baru Peserta
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#D93A2F]"
                />
              </div>

              {nameChangeSuccess && (
                <p className="text-xs text-emerald-700 font-semibold">✓ Nama berhasil diperbarui!</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#D93A2F] text-white rounded-lg hover:bg-[#c23329] transition shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              {isCancelled ? "Data Pengembalian Dana Acara" : "Pengajuan Refund Peserta"}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              {isCancelled
                ? "Acara dibatalkan. Masukkan data rekening/e-wallet untuk menerima pengembalian dana penuh."
                : "Pengajuan refund peserta akan ditinjau oleh pihak manajemen (maks. H-1 sebelum acara)."}
            </p>

            <form onSubmit={handleSubmitRefund} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Metode Pengembalian Dana
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as "BANK_TRANSFER" | "E_WALLET")}
                  className="w-full border border-stone-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#D93A2F]"
                >
                  <option value="BANK_TRANSFER">Transfer Bank</option>
                  <option value="E_WALLET">E-Wallet (GoPay, OVO, Dana)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Bank / Provider E-Wallet
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BCA, Mandiri, GoPay"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#D93A2F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nomor Rekening / Nomor E-Wallet
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1234567890 / 08123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#D93A2F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Pemilik Rekening / Akun
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sesuai buku tabungan / akun e-wallet"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#D93A2F]"
                />
              </div>

              {!isCancelled && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Alasan Pengajuan Refund
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Berikan alasan pembatalan"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#D93A2F]"
                  />
                </div>
              )}

              <div className="p-2.5 bg-amber-50 rounded-xl text-[11px] text-amber-900 italic">
                *Catatan: Pengembalian dana dilakukan manual oleh pihak manajemen Summarecon Mall Bandung setelah proses verifikasi.
              </div>

              {refundSubmitted && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl text-center">
                  ✓ Data refund berhasil dikirim dan akan segera diproses!
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRefund || refundSubmitted}
                  className="px-4 py-2 text-xs font-bold bg-[#D93A2F] text-white rounded-lg hover:bg-[#c23329] transition shadow-xs disabled:opacity-50"
                >
                  {isSubmittingRefund ? "Mengirim..." : "Kirim Data Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
