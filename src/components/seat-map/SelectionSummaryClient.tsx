"use client";

import Link from "next/link";
import { useBookingStore } from "@/lib/store/useBookingStore";
import { formatRupiah } from "@/lib/utils";

export function SelectionSummaryClient() {
  const selectedSeats = useBookingStore((state) => state.selectedSeats);
  const eventId = useBookingStore((state) => state.eventId);

  const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  return (
    <>
      <div className="selected-seat-list">
        {selectedSeats.length === 0 ? (
          <p className="empty-selection">Belum ada kursi dipilih. Pilih kursi di denah untuk melanjutkan.</p>
        ) : selectedSeats.map((seat) => (
          <div className="selected-seat" key={seat.id}>
            <span>{seat.id} <small>{seat.category}</small></span>
            <strong>{formatRupiah(seat.price)}</strong>
          </div>
        ))}
      </div>
      <div className="selection-total">
        <span>Total <small>{selectedSeats.length} tiket</small></span>
        <strong>{formatRupiah(total)}</strong>
      </div>
      <Link
        aria-disabled={selectedSeats.length === 0}
        className={`button button-primary full-button ${selectedSeats.length === 0 ? "button-disabled" : ""}`}
        href={selectedSeats.length > 0 && eventId ? `/order/${eventId}` : "#"}
        onClick={(event) => {
          if (selectedSeats.length === 0) event.preventDefault();
        }}
      >
        Lanjutkan <span aria-hidden="true">→</span>
      </Link>
    </>
  );
}
