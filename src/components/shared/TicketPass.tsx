"use client";

import QRCode from "react-qr-code";
import type { TicketEvent } from "@/types/event";
import { useBookingStore } from "@/lib/store/useBookingStore";

export function TicketPass({ event }: { event: TicketEvent }) {
  const seats = useBookingStore((state) => state.selectedSeats);
  const seatLabel = seats.length ? seats.map((seat) => seat.id).join(", ") : "A01";

  return (
    <article className="ticket-pass">
      <div className={`ticket-pass-art art-${event.theme}`}>
        <span className="ticket-pass-category">{event.category} · {event.city}</span>
        <strong>{event.title}</strong>
        <span>{event.dateLabel} · {event.time}</span>
      </div>
      <div className="ticket-pass-details">
        <div><span>LOKASI</span><strong>{event.venue}</strong></div>
        <div><span>KURSI</span><strong>{seatLabel}</strong></div>
        <div><span>PEMESAN</span><strong>Tamu Summarecon</strong></div>
        <div className="ticket-qr">
          <QRCode value={`DEMO-${event.id}-${seatLabel}`} size={104} />
          <span>PRATINJAU · TIDAK VALID</span>
        </div>
      </div>
      <div className="ticket-pass-foot">Tunjukkan e-ticket resmi saat memasuki area acara.</div>
    </article>
  );
}
