"use client";

import { formatCountdown } from "@/lib/utils";
import { useBookingStore } from "@/lib/store/useBookingStore";

export default function CountdownTimer() {
  const timeLeft = useBookingStore((state) => state.timeLeft);
  const isLocked = useBookingStore((state) => state.isLocked);
  const selectedCount = useBookingStore((state) => state.selectedSeats.length);

  return (
    <div aria-live="polite" className="hold-timer" role="timer">
      <span className="timer-dot" />
      <span>{isLocked ? "Kursi ditahan untuk kamu" : "Waktu tahan kursi"}</span>
      <strong>{isLocked ? formatCountdown(timeLeft) : "10:00"}</strong>
      <span className="timer-support">
        {isLocked
          ? "Selesaikan pembayaran sebelum waktu habis"
          : selectedCount > 0
            ? "Kursi baru ditahan 10 menit setelah kamu menekan Lanjut."
            : "Pilih kursi lalu tekan Lanjut untuk memulai hold."}
      </span>
    </div>
  );
}