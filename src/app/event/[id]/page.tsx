import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { events, getEventById } from "@/lib/data/events";
import { formatRupiah } from "@/lib/utils";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return events.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = getEventById(id);
  return { title: event?.title ?? "Acara tidak ditemukan" };
}

export default function EventPage({ params }: EventPageProps) {
  return (
    <Suspense fallback={<div className="page-container route-loading">Memuat detail acara...</div>}>
      <EventPageContent params={params} />
    </Suspense>
  );
}

async function EventPageContent({ params }: EventPageProps) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();

  return (
    <div className="page-container detail-page">
      <Link className="back-link" href="/#events">← Kembali ke acara</Link>
      <section className={`detail-hero art-${event.theme}`}>
        <span className="detail-eyebrow">{event.category} <i /> {event.city}</span>
        <span className="detail-art-word">{event.theme === "violet" ? "SOUND" : event.theme === "amber" ? "JAZZ" : "CREATE"}</span>
        <h1>{event.title}</h1>
        <span className="event-badge">{event.badge}</span>
      </section>
      <div className="detail-columns">
        <div className="detail-copy">
          <span className="eyebrow eyebrow-dark">TENTANG ACARA</span>
          <h2>Sebuah pengalaman<br />yang layak dinantikan.</h2>
          <p>{event.description}</p>
          <div className="detail-facts">
            <div><span>TANGGAL</span><strong>{event.dateLabel}</strong></div>
            <div><span>WAKTU</span><strong>{event.time}</strong></div>
            <div><span>LOKASI</span><strong>{event.venue}</strong></div>
          </div>
        </div>
        <aside className="booking-card">
          <span className="booking-card-label">TIKET TERSEDIA</span>
          <h3>Jadilah bagian<br />dari keseruannya.</h3>
          <p>Harga tiket mulai dari</p>
          <strong className="detail-price">{formatRupiah(event.priceFrom)}</strong>
          <Link className="button button-primary full-button" href={`/event/${event.id}/book`}>
            Pilih tiket <span aria-hidden="true">→</span>
          </Link>
          <small>Pembayaran aman · E-ticket instan</small>
        </aside>
      </div>
    </div>
  );
}
