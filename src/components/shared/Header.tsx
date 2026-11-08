// src/components/shared/Header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { fetchMe } from "@/services/customerApi";
import type { CustomerProfile } from "@/types/customer";

export function Header() {
  return (
    <Suspense fallback={<HeaderView pathname="" />}>
      <HeaderWithPathname />
    </Suspense>
  );
}

function HeaderWithPathname() {
  const pathname = usePathname() || "";
  return <HeaderView pathname={pathname} />;
}

function HeaderView({ pathname }: { pathname: string }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOrdersActive = pathname.startsWith("/account/orders");
  const isHomeActive = pathname === "/";

  // Sync auth state with backend session on load
  useEffect(() => {
    if (!user) {
      fetchMe()
        .then((res) => {
          const u = res.data as CustomerProfile & { name?: string };
          if (u) {
            setUser({
              name: u.full_name || u.name || "Customer",
              email: u.email || "",
            });
          }
        })
        .catch(() => {
          // Not logged in
        });
    }
  }, [user, setUser]);

  return (
    <header className="site-header relative z-40">
      <div className="header-inner flex items-center justify-between">
        {/* Brand */}
        <Link className="brand" href="/" aria-label="SummareconTicket, beranda">
          <span className="brand-mark petal-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" focusable="false">
              <path d="M20 22C13 16 15 7 20 3c5 4 7 13 0 19Z" />
              <path d="M19 22C10 22 5 15 5 9c7-1 14 3 14 13Z" />
              <path d="M21 22c9 0 14-7 14-13-7-1-14 3-14 13Z" />
              <path d="M19 23C12 28 12 35 17 38c4-3 6-9 2-15Z" />
              <path d="M21 23c7 5 7 12 2 15-4-3-6-9-2-15Z" />
            </svg>
          </span>
          <span className="brand-name">
            Summarecon<span className="brand-light">Tiket</span>
          </span>
        </Link>

        {/* Desktop Navigation Links (Hidden on mobile) */}
        <nav className="main-nav hidden md:flex items-center gap-7" aria-label="Navigasi utama">
          <Link
            href="/#events"
            className={`transition py-1 border-b-2 ${
              isHomeActive
                ? "text-[#D93A2F] font-bold border-[#D93A2F]"
                : "text-stone-700 hover:text-[#D93A2F] border-transparent"
            }`}
          >
            Acara
          </Link>
          <Link
            href="/#how-it-works"
            className="text-stone-700 hover:text-[#D93A2F] transition py-1 border-b-2 border-transparent"
          >
            Cara pesan
          </Link>
          <Link
            href="/account/orders"
            className={`transition py-1 border-b-2 ${
              isOrdersActive
                ? "text-[#D93A2F] font-bold border-[#D93A2F]"
                : "text-stone-700 hover:text-[#D93A2F] border-transparent"
            }`}
          >
            Tiket saya
          </Link>
        </nav>

        {/* Right Actions: User Account + Burger Button (Strictly inside header-inner pill) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* User Account / Login button */}
          <Link
            className="header-login px-2.5 sm:px-4 py-1.5 rounded-full font-bold text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 transition shrink-0"
            href={user ? "/account/profile" : "/login"}
          >
            {user ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate max-w-[70px] sm:max-w-none">Hai, {user.name.split(" ")[0]}</span>
              </span>
            ) : (
              "Masuk"
            )}
          </Link>

          {/* Mobile Hamburger Burger Button (strictly inside navbar pill) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-full text-stone-700 hover:text-stone-900 hover:bg-stone-200/60 active:scale-95 transition shrink-0"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu navigasi"}
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="absolute top-full left-0 right-0 bg-white border-b border-stone-200 shadow-xl z-40 md:hidden p-4 space-y-2"
            aria-label="Navigasi mobile"
          >
            <Link
              href="/#events"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between p-3 rounded-xl text-sm transition ${
                isHomeActive
                  ? "font-bold text-[#D93A2F] bg-rose-50/70 border-l-4 border-[#D93A2F]"
                  : "font-semibold text-stone-800 hover:bg-stone-50 hover:text-[#D93A2F]"
              }`}
            >
              <span>Acara</span>
              <span className="text-stone-400 text-xs">→</span>
            </Link>

            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl text-sm font-semibold text-stone-800 hover:bg-stone-50 hover:text-[#D93A2F] transition"
            >
              <span>Cara pesan</span>
              <span className="text-stone-400 text-xs">→</span>
            </Link>

            <Link
              href="/account/orders"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between p-3 rounded-xl text-sm transition ${
                isOrdersActive
                  ? "font-bold text-[#D93A2F] bg-rose-50 border-l-4 border-[#D93A2F]"
                  : "font-semibold text-stone-800 hover:bg-stone-50 hover:text-[#D93A2F]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🎟️</span>
                <span>Tiket saya</span>
              </span>
              <span className="text-[#D93A2F] text-xs font-bold">→</span>
            </Link>

            <div className="pt-2 mt-2 border-t border-stone-100">
              <Link
                href={user ? "/account/profile" : "/login"}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-50 transition"
              >
                <span>{user ? `Profil Akun (${user.name})` : "Masuk ke Akun"}</span>
                <span className="text-stone-400">👤</span>
              </Link>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
