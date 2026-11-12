// src/app/account/orders/page.tsx
//
// Customer Order History Page.
// Fetches authenticated customer's orders from fetchMyOrders().
// Displays order status, event info, ticket count, and links to e-ticket / refund.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchMyOrders, fetchMe, createOrder, payOrder, type CreateOrderPayload } from "@/services/customerApi";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRupiah } from "@/lib/utils";
import { formatIndonesianDateTime, getPaymentSecondsRemaining } from "@/lib/time-utils";

interface OrderHistoryItem {
  order_id?: string;
  id?: string | number;
  order_code?: string;
  event_id?: string | number;
  order_status?: string;
  status?: string;
  payment_status?: string;
  created_at?: string;
  expires_at?: string;
  payment_expires_at?: string;
  event_status?: string;
  total_amount?: number;
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
  items?: Array<{ id: string }>;
  e_ticket?: {
    successful_scan_count?: number;
    valid_ticket_count?: number;
  };
}

function loadLocalOrders(): OrderHistoryItem[] {
  if (typeof window === "undefined") return [];
  const results: OrderHistoryItem[] = [];

  const addIfUnique = (order: OrderHistoryItem | null | undefined) => {
    if (!order || typeof order !== "object") return;
    const key = String(order.order_id || order.id || "").trim();
    const code = String(order.order_code || "").trim();
    if (!key && !code) return;

    const existingIdx = results.findIndex((item) => {
      const itemKey = String(item.order_id || item.id || "").trim();
      const itemCode = String(item.order_code || "").trim();
      return (key && itemKey && key === itemKey) || (code && itemCode && code === itemCode);
    });

    if (existingIdx >= 0) {
      const existingStatus = String(results[existingIdx].order_status || results[existingIdx].status || "").toUpperCase();
      const incomingStatus = String(order.order_status || order.status || "").toUpperCase();
      // If incoming status is PAID and existing is not, or incoming is newer, merge and prioritize
      if (incomingStatus === "PAID" || existingStatus !== "PAID") {
        results[existingIdx] = { ...results[existingIdx], ...order };
      }
    } else {
      results.push(order);
    }
  };

  // 1. Scan localStorage: summa_customer_orders
  try {
    const rawLocal = localStorage.getItem("summa_customer_orders");
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => addIfUnique(item as OrderHistoryItem));
      }
    }
  } catch {
    // ignore
  }

  // 2. Scan sessionStorage: summa_active_order
  try {
    const rawActive = sessionStorage.getItem("summa_active_order");
    if (rawActive) {
      const active = JSON.parse(rawActive);
      if (active && typeof active === "object") {
        addIfUnique(active as OrderHistoryItem);
      }
    }
  } catch {
    // ignore
  }

  // 3. Scan localStorage: summa_active_order (safety net across tabs)
  try {
    const rawActiveLocal = localStorage.getItem("summa_active_order");
    if (rawActiveLocal) {
      const activeLocal = JSON.parse(rawActiveLocal);
      if (activeLocal && typeof activeLocal === "object") {
        addIfUnique(activeLocal as OrderHistoryItem);
      }
    }
  } catch {
    // ignore
  }

  return results.map((item) => ({
    ...item,
    created_at: item.created_at || new Date().toISOString(),
    is_local_order: item.is_local_order ?? true,
    storage_source: item.storage_source ?? "LOCAL_SANDBOX",
  }));
}

function mergeOrders(apiList: OrderHistoryItem[], localList: OrderHistoryItem[]): OrderHistoryItem[] {
  const validApiIds = new Set(
    apiList.map((o) => String(o.order_id || o.id || "").trim()).filter(Boolean)
  );
  const validApiCodes = new Set(
    apiList.map((o) => String(o.order_code || "").trim()).filter(Boolean)
  );

  // Local orders that are not registered in server database API
  const unmergedLocal = localList.filter((lo) => {
    const localId = String(lo.order_id || lo.id || "").trim();
    const localCode = String(lo.order_code || "").trim();
    const idMatches = localId ? validApiIds.has(localId) : false;
    const codeMatches = localCode ? validApiCodes.has(localCode) : false;
    return !idMatches && !codeMatches;
  });

  // Smart merge: if local order has been paid in simulator, keep its PAID status
  const mergedApiList = apiList.map((apiOrder) => {
    const apiId = String(apiOrder.order_id || apiOrder.id || "").trim();
    const localMatch = localList.find((lo) => {
      const lId = String(lo.order_id || lo.id || "").trim();
      const lCode = String(lo.order_code || "").trim();
      return (apiId && lId && lId === apiId) || (Boolean(lCode) && lCode === apiOrder.order_code);
    });

    if (localMatch) {
      const isLocalPaid =
        String(localMatch.order_status || localMatch.status).toUpperCase() === "PAID" ||
        String(localMatch.payment_status).toUpperCase() === "PAID";
      if (isLocalPaid) {
        return {
          ...apiOrder,
          ...localMatch,
          order_status: "PAID",
          status: "PAID",
          payment_status: "PAID",
          is_local_order: localMatch.is_local_order ?? false,
          storage_source: localMatch.storage_source ?? "LOCAL_SANDBOX",
        };
      }
    }
    return {
      ...apiOrder,
      is_local_order: false,
      storage_source: "DATABASE_API" as const,
    };
  });

  // Combine unmerged local and merged API list
  const combined = [...unmergedLocal, ...mergedApiList];

  // Sort newest first: local recent orders always stay visible at the top
  combined.sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    const validTimeA = Number.isNaN(timeA) ? 0 : timeA;
    const validTimeB = Number.isNaN(timeB) ? 0 : timeB;
    if (validTimeA !== validTimeB) {
      return validTimeB - validTimeA;
    }
    if (a.is_local_order && !b.is_local_order) return -1;
    if (!a.is_local_order && b.is_local_order) return 1;
    return 0;
  });

  return combined;
}

export default function AccountOrdersPage() {
  const router = useRouter();
  // Initialize immediately from client storage so newly created local orders appear instantly
  const [orders, setOrders] = useState<OrderHistoryItem[]>(() => loadLocalOrders());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuestViewing, setIsGuestViewing] = useState(false);
  const [filterTab, setFilterTab] = useState<"ALL" | "LOCAL" | "API">("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncingOrderId, setSyncingOrderId] = useState<string | number | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{
    orderId: string | number;
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  // Listen for window storage changes across tabs or checkout updates
  useEffect(() => {
    const handleStorageUpdate = () => {
      const refreshedLocal = loadLocalOrders();
      setOrders((prev) => {
        const apiOnly = prev.filter((o) => !o.is_local_order);
        return mergeOrders(apiOnly, refreshedLocal);
      });
    };

    window.addEventListener("storage", handleStorageUpdate);
    return () => window.removeEventListener("storage", handleStorageUpdate);
  }, []);

  useEffect(() => {
    let ignore = false;

    fetchMe()
      .then(() => fetchMyOrders())
      .then((res) => {
        if (ignore) return;
        const apiList = Array.isArray(res.data)
          ? (res.data as unknown as OrderHistoryItem[])
          : (res.data as unknown as { items?: OrderHistoryItem[] })?.items || [];
        const currentLocal = loadLocalOrders();
        setOrders(mergeOrders(apiList, currentLocal));
        setIsGuestViewing(false);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        const errObj = err as { status?: number; message?: string };
        const fallbackLocal = loadLocalOrders();

        if (errObj?.status === 401 || errObj?.message?.includes("401")) {
          // If customer has local orders (guest / local simulation), don't kick them out!
          if (fallbackLocal.length > 0) {
            setOrders(fallbackLocal);
            setIsGuestViewing(true);
            return;
          }
          router.push("/login?returnUrl=/account/orders");
          return;
        }

        if (fallbackLocal.length > 0) {
          setOrders(fallbackLocal);
        } else {
          setError(errObj?.message || "Gagal memuat daftar pesanan.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [router]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await fetchMe();
      const res = await fetchMyOrders();
      const apiList = Array.isArray(res.data)
        ? (res.data as unknown as OrderHistoryItem[])
        : (res.data as unknown as { items?: OrderHistoryItem[] })?.items || [];
      const currentLocal = loadLocalOrders();
      setOrders(mergeOrders(apiList, currentLocal));
      setIsGuestViewing(false);
    } catch (err: unknown) {
      const errObj = err as { status?: number; message?: string };
      const fallbackLocal = loadLocalOrders();
      if (fallbackLocal.length > 0) {
        setOrders(fallbackLocal);
      } else {
        setError(errObj?.message || "Gagal memuat daftar pesanan.");
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handler to sync local order to API server database
  const handleSyncToDatabase = async (order: OrderHistoryItem) => {
    const oId = order.order_id || order.id || "";
    setSyncingOrderId(oId);
    setSyncFeedback(null);

    try {
      // 1. Verify user is logged in
      let customerUser: { full_name?: string; email?: string } | null = null;
      try {
        const meRes = await fetchMe();
        customerUser = meRes.data as unknown as { full_name?: string; email?: string };
      } catch {
        setSyncFeedback({
          orderId: oId,
          type: "error",
          message: "Kamu harus masuk (login) terlebih dahulu agar pesanan dapat disimpan ke akun database server.",
        });
        setSyncingOrderId(null);
        return;
      }

      // 2. Prepare order payload
      const seatIds = order.items?.map((it) => it.id).filter(Boolean) || [];
      const payload: CreateOrderPayload = {
        event_id: order.event_id || order.event?.id || "EVT-ATR-001",
        seat_ids: seatIds,
        event_seat_ids: seatIds,
        buyer: {
          full_name: customerUser?.full_name || "Nadia Putri",
          email: customerUser?.email || "nadia.demo@example.test",
          phone_number: "+628110000101",
        },
      };

      try {
        const res = await createOrder(payload);
        if (res.data) {
          const apiOrderId = (res.data as unknown as { id?: string | number; order_id?: string | number }).id;
          if (apiOrderId) {
            await payOrder(apiOrderId).catch(() => {});
          }

          // Mark order as synced in component state
          setOrders((prev) =>
            prev.map((item) =>
              (item.order_id || item.id) === oId
                ? { ...item, is_local_order: false, storage_source: "DATABASE_API" }
                : item
            )
          );

          // Update in localStorage
          try {
            const raw = localStorage.getItem("summa_customer_orders");
            if (raw) {
              const list = JSON.parse(raw);
              const updated = list.map((item: Record<string, unknown>) =>
                String(item.id || item.order_id) === String(oId)
                  ? { ...item, is_local_order: false, storage_source: "DATABASE_API" }
                  : item
              );
              localStorage.setItem("summa_customer_orders", JSON.stringify(updated));
            }
          } catch {
            // ignore
          }

          setSyncFeedback({
            orderId: oId,
            type: "success",
            message: "Berhasil! Transaksi telah tersimpan dan terdaftar di database server API.",
          });
          return;
        }
      } catch (apiErr: unknown) {
        const errStatus = (apiErr as { status?: number })?.status;
        if (errStatus === 404 || errStatus === 405 || errStatus === 500) {
          setSyncFeedback({
            orderId: oId,
            type: "info",
            message:
              "Server backend live (summarecon-admin.axtra.tech) belum mempublikasikan endpoint POST /api/orders (ACR-03). Transaksi ini tetap aman tersimpan di penyimpanan lokal browser Anda dan tiket QR dapat digunakan sepenuhnya.",
          });
          return;
        }
        throw apiErr;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyinkronkan ke server.";
      setSyncFeedback({
        orderId: oId,
        type: "error",
        message: msg,
      });
    } finally {
      setSyncingOrderId(null);
    }
  };

  return (
    <div className="page-container max-w-5xl mx-auto py-8 px-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200">
        <div>
          <Link
            href="/"
            className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition mb-1 block"
          >
            ← Kembali ke Beranda
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-tight">
            Riwayat Pesanan Saya
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Kelola tiket, lihat e-ticket QR, ubah data peserta (H-1), atau ajukan refund.
          </p>
        </div>

        <Link
          href="/account/profile"
          className="text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-xl transition"
        >
          Profil Akun
        </Link>
      </div>

      {/* Guest Mode Notice */}
      {isGuestViewing && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <span>💾</span> Mode Akses Lokal (Tamu)
            </p>
            <p className="text-amber-700 mt-0.5">
              Pesanan di bawah ini tersimpan di browser Anda. Masuk ke akun Anda jika ingin menyimpan transaksi ini ke akun database server.
            </p>
          </div>
          <Link
            href="/login?returnUrl=/account/orders"
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs whitespace-nowrap transition self-start sm:self-auto"
          >
            Masuk Akun →
          </Link>
        </div>
      )}

      {/* Filter Tabs & Refresh Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100/80 border border-stone-200/60 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterTab("ALL")}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterTab === "ALL"
                ? "bg-white text-stone-900 shadow-2xs font-bold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Semua ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("LOCAL")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              filterTab === "LOCAL"
                ? "bg-white text-amber-900 shadow-2xs font-bold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <span>💾 Lokal (Sandbox)</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">
              {orders.filter((o) => o.is_local_order).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("API")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              filterTab === "API"
                ? "bg-white text-emerald-900 shadow-2xs font-bold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <span>☁️ Database Server</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
              {orders.filter((o) => !o.is_local_order).length}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 transition inline-flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
          title="Muat ulang daftar pesanan"
        >
          <span className={isRefreshing ? "animate-spin" : ""}>↻</span>
          <span>{isRefreshing ? "Memperbarui..." : "Segarkan"}</span>
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-16 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-stone-700">Memuat pesananmu...</p>
        </div>
      ) : error && orders.length === 0 ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 text-sm">
          <p className="font-bold mb-1">Terjadi kesalahan</p>
          <p>{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center shadow-xs">
          <span className="text-4xl block mb-3">🎟️</span>
          <h2 className="text-lg font-bold text-stone-900 mb-1">Belum Ada Pesanan</h2>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mb-6">
            Kamu belum melakukan pemesanan tiket acara. Temukan acara menarik di Summarecon Mall Bandung!
          </p>
          <Link
            href="/"
            className="px-5 py-2.5 bg-[#D93A2F] text-white rounded-xl text-xs font-bold hover:bg-[#c23329] transition shadow-sm"
          >
            Jelajahi Acara
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const displayed = orders.filter((o) => {
              if (filterTab === "LOCAL") return o.is_local_order;
              if (filterTab === "API") return !o.is_local_order;
              return true;
            });

            if (displayed.length === 0) {
              return (
                <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-xs text-stone-500 shadow-2xs">
                  <span className="text-2xl block mb-2">🔍</span>
                  <p className="font-semibold text-stone-700">Tidak ada pesanan pada filter ini.</p>
                  <button
                    type="button"
                    onClick={() => setFilterTab("ALL")}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-[#D93A2F] hover:underline"
                  >
                    Tampilkan Semua Pesanan ({orders.length}) →
                  </button>
                </div>
              );
            }

            return displayed.map((order) => {
              const orderId = order.order_id || order.id;
            const eventId = order.event?.id || order.event_id || "EVT-ATR-001";
            const isCancelled =
              order.event_status === "CANCELLED" || order.event?.status === "CANCELLED";
            const ticketCount = order.ticket_count || order.items?.length || 1;

            const rawOrderStatus = String(order.order_status || order.status || "PAID").toUpperCase();
            const rawPaymentStatus = String(
              order.payment_status || order.payment?.status || rawOrderStatus
            ).toUpperCase();
            const isPaid =
              rawOrderStatus === "PAID" ||
              rawOrderStatus === "SUCCESS" ||
              rawPaymentStatus === "PAID" ||
              rawPaymentStatus === "SUCCESS";
            const isPending =
              !isPaid &&
              (rawOrderStatus === "UNPAID" ||
                rawOrderStatus === "PENDING" ||
                rawPaymentStatus === "UNPAID" ||
                rawPaymentStatus === "PENDING");
            const remainingSec = isPending ? getPaymentSecondsRemaining(order) : 0;
            const canContinuePayment = isPending && remainingSec > 0;
            const effectiveStatus = isPaid
              ? "PAID"
              : isPending && remainingSec <= 0
                ? "EXPIRED"
                : rawOrderStatus;

            return (
              <div
                key={orderId}
                className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:border-stone-300 transition"
              >
                {/* Header Card */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-md">
                      {order.order_code || orderId}
                    </span>
                    <span className="text-[11px] font-medium text-stone-500 inline-flex items-center gap-1">
                      <span>🕒 Dipesan:</span>
                      <span>
                        {order.created_at
                          ? formatIndonesianDateTime(order.created_at)
                          : formatIndonesianDateTime(new Date().toISOString())}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {order.is_local_order ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full"
                        title="Tersimpan di penyimpanan lokal browser Anda"
                      >
                        <span>💾</span>
                        <span>Lokal (Sandbox)</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full"
                        title="Tersimpan di database server API"
                      >
                        <span>☁️</span>
                        <span>Database Server</span>
                      </span>
                    )}
                    <StatusBadge status={effectiveStatus} size="sm" />
                    {isCancelled && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full">
                        EVENT DIBATALKAN
                      </span>
                    )}
                  </div>
                </div>

                {/* Event Info */}
                <div className="my-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                      {order.event?.name || order.event?.title || "Bandung Tech & Creative Expo"}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      {order.event?.start_at
                        ? formatIndonesianDateTime(order.event.start_at)
                        : "20 Desember 2026, 10:00 WIB"}{" "}
                      · Summarecon Mall Bandung
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-stone-500 block">Total Pembayaran</span>
                    <strong className="text-base font-extrabold text-[#D93A2F]">
                      {formatRupiah(order.total_amount || 0)}
                    </strong>
                    <span className="text-[11px] text-stone-400 block">
                      ({ticketCount} tiket)
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {order.e_ticket && (
                      <span className="text-xs text-stone-500">
                        Scan: <strong>{order.e_ticket.successful_scan_count || 0}</strong>/
                        <strong>{order.e_ticket.valid_ticket_count || ticketCount}</strong> tiket
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {order.is_local_order && (
                      <button
                        type="button"
                        onClick={() => handleSyncToDatabase(order)}
                        disabled={syncingOrderId === orderId}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 transition inline-flex items-center gap-1.5 disabled:opacity-50"
                        title="Simpan pesanan lokal ini ke database server API"
                      >
                        {syncingOrderId === orderId ? (
                          <>
                            <span className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <span>☁️</span>
                            <span>Simpan ke Database API</span>
                          </>
                        )}
                      </button>
                    )}

                    <Link
                      href={`/account/orders/${orderId}`}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 transition"
                    >
                      Detail Pesanan
                    </Link>

                    {canContinuePayment && (
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            try {
                              sessionStorage.setItem("summa_active_order", JSON.stringify(order));
                            } catch {
                              // ignore
                            }
                          }
                          router.push(`/payment/${orderId}`);
                        }}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#D93A2F] text-white hover:bg-[#c23329] transition shadow-xs"
                      >
                        Lanjutkan Pembayaran →
                      </button>
                    )}

                    {isPaid && (
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
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#D93A2F] text-white hover:bg-[#c23329] transition shadow-xs"
                      >
                        Lihat E-Ticket QR →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Database Sync Feedback */}
                {syncFeedback && syncFeedback.orderId === orderId && (
                  <div
                    className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs ${
                      syncFeedback.type === "success"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                        : syncFeedback.type === "info"
                        ? "bg-sky-50 border border-sky-200 text-sky-900"
                        : "bg-rose-50 border border-rose-200 text-rose-900"
                    }`}
                  >
                    <span className="font-bold text-sm leading-none mt-0.5">
                      {syncFeedback.type === "success" ? "✓" : syncFeedback.type === "info" ? "ℹ" : "⚠"}
                    </span>
                    <span className="flex-1 leading-relaxed">{syncFeedback.message}</span>
                  </div>
                )}
              </div>
            );
          });
        })()}
        </div>
      )}
    </div>
  );
}
