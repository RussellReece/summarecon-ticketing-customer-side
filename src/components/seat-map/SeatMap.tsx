"use client";

import { useEffect, useState } from "react";
import type { Seat, TicketEvent } from "@/types/event";
import { useBookingStore } from "@/lib/store/useBookingStore";
import { connectSocket } from "@/lib/socket/socketClient";

const rows = ["A", "B", "C", "D"];
const seatsPerRow = 10;

interface SeatMapProps {
  event: TicketEvent;
}

export function SeatMap({ event }: SeatMapProps) {
  const selectedSeats = useBookingStore((state) => state.selectedSeats);
  const setEvent = useBookingStore((state) => state.setEvent);
  const toggleSeat = useBookingStore((state) => state.toggleSeat);

  const [liveUnavailable, setLiveUnavailable] = useState<string[]>([]);

  useEffect(() => {
    setEvent(event.id);

    const socket = connectSocket();
    if (!socket) return;

    const handleLocked = (seatId: string) =>
      setLiveUnavailable((current) =>
        current.includes(seatId) ? current : [...current, seatId]
      );

    const handleUnlocked = (seatId: string) =>
      setLiveUnavailable((current) =>
        current.filter((id) => id !== seatId)
      );

    socket.on("seat:locked", handleLocked);
    socket.on("seat:unlocked", handleUnlocked);

    return () => {
      socket.off("seat:locked", handleLocked);
      socket.off("seat:unlocked", handleUnlocked);
    };
  }, [event.id, setEvent]);

  function makeSeat(row: string, number: number): Seat {
    const category = row === "A" || row === "B" ? "Platinum" : "Regular";

    return {
      id: `${row}${String(number).padStart(2, "0")}`,
      row,
      number,
      category,
      price:
        category === "Platinum"
          ? event.premiumPrice
          : event.priceFrom,
    };
  }

  return (
    <div className="bg-white border border-summa-line rounded-ticket p-6 text-center max-w-2xl mx-auto shadow-summa">
      {/* Panggung */}
      <div className="bg-summa-gradient text-white rounded-t-lg rounded-b-[40px] py-2 font-display font-bold text-xs tracking-[0.3em] max-w-[340px] mx-auto mb-8">
        PANGGUNG
      </div>

      {/* Grid Kursi */}
      <div
        className="seat-map flex flex-col gap-3 justify-center max-w-md mx-auto mb-6"
        role="group"
        aria-label="Pilih kursi"
      >
        {rows.map((row) => (
          <div
            className="seat-row flex items-center justify-center gap-2"
            key={row}
          >
            <span className="row-label w-4 text-sm font-bold">
              {row}
            </span>

            {Array.from({ length: seatsPerRow }, (_, index) => {
              const seat = makeSeat(row, index + 1);

              const isSold =
                (row === "A" && [3, 4, 8].includes(seat.number)) ||
                (row === "C" && [6, 7].includes(seat.number));
              const isLiveHeld = liveUnavailable.includes(seat.id);
              const isUnavailable = isSold || isLiveHeld;

              const isSelected = selectedSeats.some(
                (item) => item.id === seat.id
              );

              let seatClass =
                "seat w-12 h-12 rounded-seat transition-all duration-200 border-none text-xs font-semibold ";

              if (isUnavailable) {
                seatClass += isLiveHeld
                  ? "seat-held bg-status-hold cursor-not-allowed"
                  : "seat-sold bg-status-sold cursor-not-allowed";
              } else if (isSelected) {
                seatClass +=
                  "seat-selected bg-summa-primary outline outline-2 outline-summa-tint scale-110 text-white";
              } else {
                seatClass +=
                  "bg-status-ok hover:opacity-80 cursor-pointer";
              }

              if (row === "A" || row === "B") {
                seatClass += " seat-premium";
              }

              return (
                <button
                  key={seat.id}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => toggleSeat(event.id, seat)}
                  aria-label={`Baris ${row}, kursi ${seat.number}${
                    isSold ? ", terjual" : isLiveHeld ? ", sedang dipesan" : ""
                  }`}
                  aria-pressed={isSelected}
                  title={`Kursi ${seat.id} - ${seat.category}`}
                  className={seatClass}
                >
                  {isSold ? "×" : isLiveHeld ? "◷" : isSelected ? "✓" : seat.number}
                </button>
              );
            })}

            <span className="row-label w-4 text-sm font-bold">
              {row}
            </span>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 justify-center text-[13px] text-summa-ink">
        <span className="flex items-center gap-1.5">
          <i className="w-3.5 h-3.5 rounded bg-status-ok legend-available" />
          Tersedia
        </span>

        <span className="flex items-center gap-1.5">
          <i className="w-3.5 h-3.5 rounded bg-status-hold legend-held" />
          Dipesan
        </span>

        <span className="flex items-center gap-1.5">
          <i className="w-3.5 h-3.5 rounded bg-status-sold legend-sold" />
          Terisi
        </span>

        <span className="flex items-center gap-1.5">
          <i className="w-3.5 h-3.5 rounded bg-summa-primary outline outline-1 outline-summa-tint" />
          Pilihanmu
        </span>
      </div>

      {/* Catatan */}
      <p className="mt-5 text-xs text-summa-ink/70">
        Maksimal 4 kursi per transaksi. Kursi yang dipilih ditahan selama
        10 menit.
      </p>
    </div>
  );
}