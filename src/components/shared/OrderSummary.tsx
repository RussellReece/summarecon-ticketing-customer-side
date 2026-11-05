"use client";

import Link from "next/link";
import type { TicketEvent } from "@/types/event";
import { useBookingStore } from "@/lib/store/useBookingStore";
import { formatRupiah } from "@/lib/utils";

export function OrderSummary({ event }: { event: TicketEvent }) {
  const seats = useBookingStore((state) => state.selectedSeats);
  const total = seats.reduce((sum, seat) => sum + seat.price, 0);

  return (
    <div className="order-card">
      <div className={`order-art art-${event.theme}`}>
        <span>{event.theme === "violet" ? "SOUND" : event.theme === "amber" ? "JAZZ" : "CREATE"}</span>
      </div>
      <div className="order-card-content">
        <span className="booking-card-label">RINGKASAN PESANAN</span>
        <h2>{event.title}</h2>
        <p>{event.dateLabel} · {event.time}</p>
        <p>{event.venue}</p>
        <div className="order-seats">
          {seats.length ? seats.map((seat) => (
            <div key={seat.id}><span>Kursi {seat.id} · {seat.category}</span><strong>{formatRupiah(seat.price)}</strong></div>
          )) : <p>Kursi tidak ditemukan. Silakan kembali dan pilih kursi terlebih dahulu.</p>}
        </div>
        <div className="order-total"><span>Total pembayaran</span><strong>{formatRupiah(total)}</strong></div>
        {seats.length ? (
          <Link className="button button-primary full-button" href={`/ticket/${event.id}`}>
            Lanjutkan (demo) <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <Link className="button button-primary full-button" href={`/event/${event.id}/book`}>
            Pilih kursi <span aria-hidden="true">→</span>
          </Link>
        )}
        <p className="demo-note">Mode demo — pembayaran belum terhubung.</p>
      </div>
    </div>
  );
}
