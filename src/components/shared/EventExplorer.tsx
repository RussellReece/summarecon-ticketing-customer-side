"use client";

// src/components/shared/EventExplorer.tsx
//
// Client Component — directly executes the live fetch request in `useEffect`
// via `getAvailableEvents()` from `@/data/customer`.
// This guarantees that a real HTTP request to GET /api/events is visible
// in the browser's Network tab.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAvailableEvents } from "@/data/customer";
import type { CustomerEvent } from "@/types/customer";
import { formatRupiah } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/status-mapper";

type UnknownRecord = Record<string, unknown>;

// ─── Data Normalizers ─────────────────────────────────────────────────────────

function getEventId(event: UnknownRecord): string | number {
  return (event.slug as string) || (event.id as string | number) || (event.event_id as string | number) || "event";
}

function getEventTitle(event: UnknownRecord): string {
  return (event.title as string) || (event.event_name as string) || "Acara Tanpa Judul";
}

function getEventCategory(event: UnknownRecord): string {
  return (event.category as string) || (event.event_category as string) || "MUSIK";
}

function getEventVenue(event: UnknownRecord): { name: string; city: string } {
  if (typeof event.venue === "object" && event.venue !== null) {
    const v = event.venue as UnknownRecord;
    return {
      name: (v.name as string) || "Summarecon Mall Bandung",
      city: (v.city as string) || "Bandung",
    };
  }
  return {
    name: (event.venue_name as string) || (typeof event.venue === "string" ? event.venue : "Summarecon Mall Bandung"),
    city: (event.city as string) || "Bandung",
  };
}

function getEventDateInfo(event: UnknownRecord): { iso: string; label: string; day: string; month: string } {
  const rawDate = event.event_date || event.start_at || event.dateISO || "2026-11-21";
  const iso = String(rawDate).split("T")[0];
  try {
    const d = new Date(`${iso}T12:00:00`);
    const label = new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
    const day = iso.slice(8, 10);
    const month = new Intl.DateTimeFormat("id-ID", { month: "short" }).format(d).toUpperCase();
    return { iso, label, day, month };
  } catch {
    return { iso, label: iso, day: "01", month: "DES" };
  }
}

function getEventTime(event: UnknownRecord): string {
  if (event.start_time) {
    const [h, m] = String(event.start_time).split(":");
    return `${h}.${m} WIB`;
  }
  if (event.start_at && String(event.start_at).includes("T")) {
    const timePart = String(event.start_at).split("T")[1];
    const [h, m] = timePart.split(":");
    return `${h}.${m} WIB`;
  }
  return "19.00 WIB";
}

function getEventPrice(event: UnknownRecord): number {
  if (event.price_from || event.priceFrom) return Number(event.price_from || event.priceFrom);
  if (Array.isArray(event.categories) && event.categories.length > 0) {
    const prices = (event.categories as Array<{ price?: number }>).map((c) => Number(c.price || 0)).filter((p) => p > 0);
    if (prices.length > 0) return Math.min(...prices);
  }
  return 0;
}

function getEventStatus(event: UnknownRecord): string {
  return String(event.event_status || event.status || "SALES_OPEN");
}

function deriveTheme(event: UnknownRecord): "violet" | "amber" | "blue" {
  const cat = String(getEventCategory(event)).toUpperCase();
  if (cat.includes("MUSIK") || cat.includes("INDIE")) return "violet";
  if (cat.includes("JAZZ") || cat.includes("EXPO")) return "amber";
  return "blue";
}

function deriveArtWord(theme: "violet" | "amber" | "blue"): string {
  if (theme === "violet") return "MUSIC";
  if (theme === "amber") return "EXPO";
  return "EVENT";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EventExplorer() {
  const [events, setEvents] = useState<CustomerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Client-side search and filters
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("Semua lokasi");
  const [date, setDate] = useState("Semua tanggal");
  const [category, setCategory] = useState("Semua");
  const [reloadCount, setReloadCount] = useState(0);

  // Run on mount and when reloaded -> performs GET /api/events visible in Network tab
  useEffect(() => {
    let active = true;

    getAvailableEvents()
      .then((data) => {
        if (active) {
          setEvents(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat data event dari server API.",
          );
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [reloadCount]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setReloadCount((c) => c + 1);
  };

  const locations = useMemo(() => {
    return [...new Set(events.map((e) => getEventVenue(e as unknown as UnknownRecord).name))];
  }, [events]);

  const categories = useMemo(() => {
    return [...new Set(events.map((e) => getEventCategory(e as unknown as UnknownRecord)))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const rec = event as unknown as UnknownRecord;
      const title = getEventTitle(rec);
      const cat = getEventCategory(rec);
      const ven = getEventVenue(rec);
      const dt = getEventDateInfo(rec);

      const searchText = `${title} ${cat} ${ven.city} ${ven.name}`.toLocaleLowerCase("id");
      const matchesQuery = searchText.includes(query.trim().toLocaleLowerCase("id"));
      const matchesLocation = location === "Semua lokasi" || ven.name === location;
      const matchesDate = date === "Semua tanggal" || dt.iso === date;
      const matchesCat = category === "Semua" || cat === category;

      return matchesQuery && matchesLocation && matchesDate && matchesCat;
    });
  }, [events, query, location, date, category]);

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content page-container">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-line" /> MOMEN SERU DI SUMMARECON MALL BANDUNG</span>
            <h1>Acara seru,<br />cerita <span>baru.</span></h1>
            <p>Pilih acara favorit, temukan kursi terbaikmu, dan nikmati momen bersama.</p>
            <a className="button button-primary hero-cta" href="#events">
              Temukan acaramu <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="hero-bloom" aria-hidden="true">
            <span className="bloom-petal bloom-petal-top" />
            <span className="bloom-petal bloom-petal-left" />
            <span className="bloom-petal bloom-petal-right" />
            <span className="bloom-petal bloom-petal-bottom-left" />
            <span className="bloom-petal bloom-petal-bottom-right" />
            <span className="bloom-center" />
          </div>
          <div className="hero-location"><span aria-hidden="true">⌖</span> SUMMARECON MALL BANDUNG · BANDUNG</div>
        </div>
      </section>

      {/* Search and Filters */}
      <section aria-label="Cari acara" className="search-section page-container">
        <div className="event-search">
          <label className="search-field search-keyword">
            <span aria-hidden="true">⌕</span>
            <span className="search-field-copy">
              <span className="search-label">Cari acara</span>
              <input
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Konser, seminar, pameran..."
                type="search"
                value={query}
              />
            </span>
          </label>
          <label className="search-field">
            <span aria-hidden="true">⌖</span>
            <span className="search-field-copy">
              <span className="search-label">Lokasi</span>
              <select onChange={(e) => setLocation(e.target.value)} value={location}>
                <option>Semua lokasi</option>
                {locations.map((venueName) => (
                  <option key={venueName} value={venueName}>
                    {venueName}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="search-field">
            <span aria-hidden="true">▦</span>
            <span className="search-field-copy">
              <span className="search-label">Tanggal</span>
              <select onChange={(e) => setDate(e.target.value)} value={date}>
                <option value="Semua tanggal">Semua tanggal</option>
                {events.map((event, idx) => {
                  const rec = event as unknown as UnknownRecord;
                  const dInfo = getEventDateInfo(rec);
                  return (
                    <option key={`${getEventId(rec)}-${idx}`} value={dInfo.iso}>
                      {dInfo.label}
                    </option>
                  );
                })}
              </select>
            </span>
          </label>
          <a className="search-submit" href="#events">Cari acara</a>
        </div>
      </section>

      {/* Categories */}
      <div aria-label="Kategori acara" className="category-wrap page-container">
        <div className="category-list">
          <button
            aria-pressed={category === "Semua"}
            className={`category-chip ${category === "Semua" ? "category-chip-active" : ""}`}
            onClick={() => setCategory("Semua")}
            type="button"
          >
            ✿ <span>Semua</span>
          </button>
          {categories.map((item) => (
            <button
              aria-pressed={category === item}
              className={`category-chip ${category === item ? "category-chip-active" : ""}`}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              <span>{item.charAt(0) + item.slice(1).toLocaleLowerCase("id")}</span>
            </button>
          ))}
        </div>
      </div>

      <div aria-hidden="true" className="category-marquee">
        <div className="marquee-track">
          {[0, 1].map((repeat) => (
            <span className="marquee-group" key={repeat}>
              {["Konser", "Seminar", "Pameran", "Workshop", "Festival"].map((item) => (
                <span key={item}>{item}<i>✿</i></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Live Event Cards Grid */}
      <section className="event-section page-container" id="events">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow-dark">PILIHAN UNTUKMU (LIVE API)</span>
            <h2>Temukan acaramu.</h2>
          </div>
          {!isLoading && !error && (
            <span className="event-count">{filteredEvents.length} acara ditemukan</span>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="event-grid" aria-busy="true">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="event-card"
                style={{ opacity: 0.6, pointerEvents: "none" }}
              >
                <div
                  className="event-art"
                  style={{
                    background: "linear-gradient(135deg, #e9e7e3, #dcd9d2)",
                    height: "210px",
                  }}
                />
                <div className="event-card-body" style={{ padding: "19px 18px 16px" }}>
                  <div style={{ height: "14px", width: "40%", background: "#e9e7e3", borderRadius: "4px", marginBottom: "8px" }} />
                  <div style={{ height: "22px", width: "80%", background: "#dcd9d2", borderRadius: "4px", marginBottom: "12px" }} />
                  <div style={{ height: "12px", width: "60%", background: "#e9e7e3", borderRadius: "4px", marginBottom: "8px" }} />
                  <div style={{ height: "12px", width: "50%", background: "#e9e7e3", borderRadius: "4px", marginBottom: "16px" }} />
                  <div style={{ height: "20px", width: "35%", background: "#dcd9d2", borderRadius: "4px" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State with Retry Button */}
        {!isLoading && error && (
          <div className="empty-events" role="alert">
            <span aria-hidden="true" style={{ fontSize: "32px", color: "#e11d48" }}>✕</span>
            <h3>Gagal Memuat Acara</h3>
            <p>{error}</p>
            <button
              className="button button-primary"
              onClick={handleRetry}
              type="button"
              style={{ marginTop: "12px" }}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="empty-events">
            <span aria-hidden="true">✿</span>
            <h3>Belum ada acara yang cocok.</h3>
            <p>Coba ubah kata pencarian atau pilih kategori lain.</p>
            <button
              className="button button-secondary"
              onClick={() => {
                setQuery("");
                setLocation("Semua lokasi");
                setDate("Semua tanggal");
                setCategory("Semua");
              }}
              type="button"
            >
              Hapus filter
            </button>
          </div>
        )}

        {/* Loaded Event Cards */}
        {!isLoading && !error && filteredEvents.length > 0 && (
          <div className="event-grid">
            {filteredEvents.map((event) => {
              const rec = event as unknown as UnknownRecord;
              const id = getEventId(rec);
              const title = getEventTitle(rec);
              const cat = getEventCategory(rec);
              const ven = getEventVenue(rec);
              const dt = getEventDateInfo(rec);
              const tm = getEventTime(rec);
              const price = getEventPrice(rec);
              const eventStatus = getEventStatus(rec);
              const theme = deriveTheme(rec);
              const artWord = deriveArtWord(theme);
              const href = `/event/${id}`;
              const badgeLabel = STATUS_LABELS[eventStatus]
                ? STATUS_LABELS[eventStatus].toUpperCase()
                : "TIKET TERSEDIA";

              return (
                <article className="event-card" key={id}>
                  <Link
                    aria-label={`Lihat ${title}`}
                    className={`event-art art-${theme}`}
                    href={href}
                  >
                    <span className="event-art-word">{artWord}</span>
                    <span
                      className="event-badge"
                      style={
                        eventStatus === "CANCELLED"
                          ? { background: "rgba(217, 58, 47, 0.9)", borderColor: "rgba(255, 255, 255, 0.6)" }
                          : eventStatus === "COMPLETED"
                          ? { background: "rgba(107, 90, 110, 0.9)", borderColor: "rgba(255, 255, 255, 0.6)" }
                          : undefined
                      }
                    >
                      {badgeLabel}
                    </span>
                    <span className="date-tile">
                      <strong>{dt.day}</strong>
                      <span>{dt.month}</span>
                    </span>
                    <span aria-hidden="true" className="art-shape art-shape-one" />
                    <span aria-hidden="true" className="art-shape art-shape-two" />
                  </Link>
                  <div className="event-card-body">
                    <span className="event-category">
                      {cat} <i /> {ven.city}
                    </span>
                    <Link className="event-title" href={href}>{title}</Link>
                    <p className="event-meta">
                      <span aria-hidden="true">◷</span> {dt.label} · {tm}
                    </p>
                    <p className="event-meta">
                      <span aria-hidden="true">⌖</span> {ven.name}
                    </p>
                    <div className="event-card-bottom">
                      <span>
                        <small>Mulai dari</small>
                        <strong>{price > 0 ? formatRupiah(price) : "Gratis / Registrasi"}</strong>
                      </span>
                      <Link
                        className="round-link"
                        href={href}
                        aria-label={`Pesan ${title}`}
                      >↗</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="how-section" id="how-it-works">
        <div className="page-container how-inner">
          <div>
            <span className="eyebrow eyebrow-dark">GAMPANG BANGET</span>
            <h2>Tiga langkah menuju<br />momen serumu.</h2>
          </div>
          <div className="steps">
            <div className="step"><span>01</span><div><h3>Pilih acara</h3><p>Temukan acara yang paling kamu tunggu.</p></div></div>
            <div className="step"><span>02</span><div><h3>Pilih tempat</h3><p>Amankan kursi favoritmu sebelum kehabisan.</p></div></div>
            <div className="step"><span>03</span><div><h3>Siap menikmati</h3><p>Tiket digitalmu siap dibawa ke acara.</p></div></div>
          </div>
        </div>
      </section>
    </>
  );
}
