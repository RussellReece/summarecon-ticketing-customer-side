"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TicketEvent } from "@/types/event";
import { formatRupiah } from "@/lib/utils";

interface EventExplorerProps {
  events: TicketEvent[];
}

export function EventExplorer({ events }: EventExplorerProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("Semua lokasi");
  const [date, setDate] = useState("Semua tanggal");
  const [category, setCategory] = useState("Semua");
  const locations = useMemo(
    () => [...new Set(events.map((event) => event.venue))],
    [events],
  );
  const categories = useMemo(
    () => [...new Set(events.map((event) => event.category))],
    [events],
  );
  const filteredEvents = events.filter((event) => {
    const searchText = `${event.title} ${event.category} ${event.city} ${event.venue}`.toLocaleLowerCase("id");
    return (
      searchText.includes(query.trim().toLocaleLowerCase("id")) &&
      (location === "Semua lokasi" || event.venue === location) &&
      (date === "Semua tanggal" || event.dateISO === date) &&
      (category === "Semua" || event.category === category)
    );
  });

  return (
    <>
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

      <section aria-label="Cari acara" className="search-section page-container">
        <div className="event-search">
          <label className="search-field search-keyword">
            <span aria-hidden="true">⌕</span>
            <span className="search-field-copy">
              <span className="search-label">Cari acara</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Konser, seminar..."
                type="search"
                value={query}
              />
            </span>
          </label>
          <label className="search-field">
            <span aria-hidden="true">⌖</span>
            <span className="search-field-copy">
              <span className="search-label">Lokasi</span>
              <select onChange={(event) => setLocation(event.target.value)} value={location}>
                <option>Semua lokasi</option>
                {locations.map((venue) => <option key={venue}>{venue}</option>)}
              </select>
            </span>
          </label>
          <label className="search-field">
            <span aria-hidden="true">▦</span>
            <span className="search-field-copy">
              <span className="search-label">Tanggal</span>
              <select onChange={(event) => setDate(event.target.value)} value={date}>
                <option value="Semua tanggal">Semua tanggal</option>
                {events.map((event) => (
                  <option key={event.id} value={event.dateISO}>{event.dateLabel}</option>
                ))}
              </select>
            </span>
          </label>
          <a className="search-submit" href="#events">Cari acara</a>
        </div>
      </section>

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

      <section className="event-section page-container" id="events">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow-dark">PILIHAN UNTUKMU</span>
            <h2>Temukan acaramu.</h2>
          </div>
          <span className="event-count">{filteredEvents.length} acara ditemukan</span>
        </div>
        {filteredEvents.length > 0 ? (
          <div className="event-grid">
            {filteredEvents.map((event) => (
              <article className="event-card" key={event.id}>
                <Link
                  aria-label={`Lihat ${event.title}`}
                  className={`event-art art-${event.theme}`}
                  href={`/event/${event.id}`}
                >
                  <span className="event-art-word">
                    {event.theme === "violet" ? "SOUND" : event.theme === "amber" ? "JAZZ" : "CREATE"}
                  </span>
                  <span className="event-badge">{event.badge}</span>
                  <span className="date-tile">
                    <strong>{event.dateISO.slice(8, 10)}</strong>
                    <span>{new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(`${event.dateISO}T12:00:00`)).toLocaleUpperCase("id")}</span>
                  </span>
                  <span aria-hidden="true" className="art-shape art-shape-one" />
                  <span aria-hidden="true" className="art-shape art-shape-two" />
                </Link>
                <div className="event-card-body">
                  <span className="event-category">{event.category} <i /> {event.city}</span>
                  <Link className="event-title" href={`/event/${event.id}`}>{event.title}</Link>
                  <p className="event-meta"><span aria-hidden="true">◷</span> {event.dateLabel} · {event.time}</p>
                  <p className="event-meta"><span aria-hidden="true">⌖</span> {event.venue}</p>
                  <div className="event-card-bottom">
                    <span><small>Mulai dari</small><strong>{formatRupiah(event.priceFrom)}</strong></span>
                    <Link className="round-link" href={`/event/${event.id}`} aria-label={`Pesan ${event.title}`}>↗</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
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
      </section>

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
