"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/store/useAuthStore";

export function Header() {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="site-header">
      <div className="header-inner">
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
          <span className="brand-name">Summarecon<span className="brand-light">Tiket</span></span>
        </Link>
        <nav className="main-nav" aria-label="Navigasi utama">
          <Link href="/#events">Acara</Link>
          <Link href="/#how-it-works">Cara pesan</Link>
        </nav>
        <Link className="header-tickets" href="/#events">Tiket saya</Link>
        <Link className="header-login" href={user ? "/#events" : "/login"}>
          {user ? `Hai, ${user.name.split(" ")[0]}` : "Masuk"}
        </Link>
      </div>
    </header>
  );
}
