// src/app/account/profile/page.tsx
//
// Customer Profile Page.
// Displays current session user details from fetchMe(),
// allows logging out via logoutCustomer(), and links to orders.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchMe, logoutCustomer } from "@/services/customerApi";
import type { CustomerProfile } from "@/types/customer";

export default function AccountProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<(CustomerProfile & { user_id?: string; name?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetchMe()
      .then((res) => {
        setUser(res.data as (CustomerProfile & { user_id?: string; name?: string }));
      })
      .catch(() => {
        router.push("/login?returnUrl=/account/profile");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutCustomer();
    } catch {
      // Continue
    }
    if (typeof window !== "undefined") {
      sessionStorage.clear();
    }
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="page-container max-w-xl mx-auto py-16 text-center">
        <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-semibold text-stone-700">Memuat profil akun...</p>
      </div>
    );
  }

  return (
    <div className="page-container max-w-xl mx-auto py-8 px-4">
      <Link href="/account/orders" className="text-xs font-semibold text-stone-600 hover:text-stone-900 mb-4 inline-flex items-center gap-1 transition">
        ← Kembali ke Riwayat Pesanan
      </Link>

      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-stone-100">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#D93A2F] to-[#F4A23B] text-white flex items-center justify-center font-black text-xl shadow-sm">
            {user?.name?.charAt(0) || user?.full_name?.charAt(0) || "U"}
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D93A2F] bg-rose-50 px-2 py-0.5 rounded-full">
              {user?.role || "CUSTOMER"}
            </span>
            <h1 className="text-xl font-black text-stone-900 mt-1">
              {user?.name || user?.full_name || "Nadia Putri"}
            </h1>
            <p className="text-xs text-stone-500">{user?.email}</p>
          </div>
        </div>

        {/* Profile Info Fields */}
        <div className="space-y-4 mb-8 text-xs">
          <div className="p-3 bg-stone-50 rounded-xl flex justify-between items-center">
            <span className="text-stone-500 font-medium">User ID</span>
            <span className="font-mono font-bold text-stone-800">
              {user?.user_id || "USR-CUS-001"}
            </span>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl flex justify-between items-center">
            <span className="text-stone-500 font-medium">Alamat Email</span>
            <span className="font-bold text-stone-800">{user?.email}</span>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl flex justify-between items-center">
            <span className="text-stone-500 font-medium">Nomor Telepon</span>
            <span className="font-bold text-stone-800">
              {user?.phone_number || "+628110000101"}
            </span>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl flex justify-between items-center">
            <span className="text-stone-500 font-medium">Status Akun</span>
            <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              ● Aktif
            </span>
          </div>
        </div>

        {/* Action Links */}
        <div className="flex flex-col gap-3">
          <Link
            href="/account/orders"
            className="w-full py-3 px-4 rounded-xl border border-stone-200 text-stone-800 font-bold text-xs text-center hover:bg-stone-50 transition"
          >
            Lihat Riwayat Pesanan Tiket →
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full py-3 px-4 rounded-xl bg-stone-100 text-rose-700 hover:bg-rose-50 font-bold text-xs text-center transition disabled:opacity-50"
          >
            {isLoggingOut ? "Keluar..." : "Keluar dari Akun (Logout)"}
          </button>
        </div>
      </div>
    </div>
  );
}
