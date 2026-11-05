"use client";

import { formatCountdown } from "@/lib/utils";
import { useBookingStore } from "@/lib/store/useBookingStore";

export default function CountdownTimer() {
  const timeLeft = useBookingStore((state) => state.timeLeft);
  const selectedCount = useBookingStore((state) => state.selectedSeats.length);

  return (
    <div aria-live="polite" className="hold-timer" role="timer">
      <span className="timer-dot" />
      <span>{selectedCount > 0 ? "Kursi ditahan untuk kamu" : "Waktu tahan kursi"}</span>
      <strong>{selectedCount > 0 ? formatCountdown(timeLeft) : "10:00"}</strong>
      <span className="timer-support">
        {selectedCount > 0
          ? "Selesaikan pembayaran sebelum waktu habis"
          : "Mulai setelah memilih kursi"}
      </span>
    </div>
  );
}