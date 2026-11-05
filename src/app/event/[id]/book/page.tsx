"use client";

import Link from "next/link";
import { Suspense, use } from "react";
import { SeatMap } from "@/components/seat-map/SeatMap";
import CountdownTimer from "@/components/shared/CountdownTimer";
import { SelectionSummaryClient } from "@/components/seat-map/SelectionSummaryClient";
import { formatRupiah } from "@/lib/utils";
import { getEventById } from "@/lib/data/events";
import { notFound } from "next/navigation";

interface BookingPageProps {
  params: Promise<{ id: string }>;
}

export default function BookingPage({ params }: BookingPageProps) {
  return (
    <Suspense fallback={<div className="page-container route-loading">Menyiapkan denah kursi...</div>}>
      <BookingPageContent params={params} />
    </Suspense>
  );
}

function BookingPageContent({ params }: BookingPageProps) {
  const { id } = use(params);
  const event = getEventById(id);

  if (!event) notFound();

  return (
    <div className="page-container booking-page">
      <Link className="back-link" href={`/event/${event.id}`}>
        ← Detail acara
      </Link>

      <div className="booking-title-row">
        <div>
          <span className="eyebrow eyebrow-dark">
            PILIH TEMPAT DUDUK
          </span>
          <h1>
            Temukan tempat
            <br />
            terbaikmu.
          </h1>
          <p>
            {event.title} <span>·</span> {event.dateLabel}
          </p>
        </div>

        <CountdownTimer />
      </div>

      <div className="booking-layout">
        <section className="seat-panel">
          <SeatMap event={event} />
        </section>

        <aside className="selection-panel">
          <span className="booking-card-label">
            RINGKASAN PILIHAN
          </span>

          <h2>Tiketmu</h2>

          <div className="selection-event">
            {event.title}
            <small>
              {event.dateLabel} · {event.time}
            </small>
          </div>

          <SelectionSummaryClient />

          <div className="selection-prices">
            <span>
              Platinum
              <strong>{formatRupiah(event.premiumPrice)}</strong>
            </span>
            <span>
              Regular
              <strong>{formatRupiah(event.priceFrom)}</strong>
            </span>
          </div>

          <p className="selection-limit">
            Pilih maksimal 4 kursi. Kursi akan ditahan otomatis.
          </p>

        </aside>
      </div>
    </div>
  );
}