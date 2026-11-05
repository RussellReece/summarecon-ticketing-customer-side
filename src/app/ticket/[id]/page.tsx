import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TicketPass } from "@/components/shared/TicketPass";
import { events, getEventById } from "@/lib/data/events";

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return events.map(({ id }) => ({ id }));
}

export default function TicketPage({ params }: TicketPageProps) {
  return (
    <Suspense fallback={<div className="page-container route-loading">Menyiapkan tiket...</div>}>
      <TicketPageContent params={params} />
    </Suspense>
  );
}

async function TicketPageContent({ params }: TicketPageProps) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();

  return (
    <div className="page-container ticket-page">
      <Link className="back-link" href="/">← Kembali ke beranda</Link>
      <div className="ticket-heading">
        <span className="ticket-success-mark">✓</span>
        <span className="eyebrow eyebrow-dark">TIKET DEMO</span>
        <h1>Siap untuk<br />momen seru?</h1>
        <p>Ini pratinjau e-ticket. QR code belum berlaku untuk masuk acara.</p>
      </div>
      <TicketPass event={event} />
    </div>
  );
}
