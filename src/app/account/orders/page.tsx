// src/app/account/orders/page.tsx
//
// Customer Order History Page.
// Fetches authenticated customer's orders from fetchMyOrders().
// Displays order status, event info, ticket count, and links to e-ticket / refund.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchMyOrders, fetchMe } from "@/services/customerApi";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRupiah } from "@/lib/utils";
import { formatIndonesianDateTime } from "@/lib/time-utils";

interface OrderHistoryItem {
  order_id?: string;
  id?: string | number;
  order_code?: string;
  order_status?: string;
  status?: string;
  created_at?: string;
  event_status?: string;
  total_amount?: number;
  ticket_count?: number;
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

export default function AccountOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Verify user is logged in
    fetchMe()
      .then(() => {
        // 2. Fetch orders
        return fetchMyOrders();
      })
      .then((res) => {
        const list = Array.isArray(res.data)
          ? (res.data as unknown as OrderHistoryItem[])
          : (res.data as unknown as { items?: OrderHistoryItem[] })?.items || [];
        setOrders(list);
      })
      .catch((err: unknown) => {
        const errObj = err as { status?: number; message?: string };
        if (errObj?.status === 401 || errObj?.message?.includes("401")) {
          router.push("/login?returnUrl=/account/orders");
          return;
        }
        setError(errObj?.message || "Gagal memuat daftar pesanan.");
      })
      .finally(() => setLoading(false));
  }, [router]);

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

      {loading ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-16 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-stone-700">Memuat pesananmu...</p>
        </div>
      ) : error ? (
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
          {orders.map((order) => {
            const orderId = order.order_id || order.id;
            const eventId = order.event?.id || "EVT-ATR-001";
            const isCancelled =
              order.event_status === "CANCELLED" || order.event?.status === "CANCELLED";
            const ticketCount = order.ticket_count || order.items?.length || 1;

            return (
              <div
                key={orderId}
                className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:border-stone-300 transition"
              >
                {/* Header Card */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-md">
                      {order.order_code || orderId}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {order.created_at ? formatIndonesianDateTime(order.created_at) : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.order_status || order.status} size="sm" />
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

                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/account/orders/${orderId}`}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 transition"
                    >
                      Detail Pesanan
                    </Link>

                    {order.order_status === "PAID" && (
                      <Link
                        href={`/ticket/${eventId}`}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#D93A2F] text-white hover:bg-[#c23329] transition shadow-xs"
                      >
                        Lihat E-Ticket QR →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
