"use client";

import { formatCountdown } from "@/lib/utils";
import { useBookingStore } from "@/lib/store/useBookingStore";

interface CountdownTimerProps {
  /**
   * - `default`: kartu timer lengkap (dipakai di sidebar desktop).
   * - `compact`: satu baris kapsul melayang (floating pill) untuk sticky mobile di bawah navbar.
   */
  variant?: "default" | "compact";
}

export default function CountdownTimer({ variant = "default" }: CountdownTimerProps) {
  const timeLeft = useBookingStore((state) => state.timeLeft);
  const isLocked = useBookingStore((state) => state.isLocked);
  const selectedCount = useBookingStore((state) => state.selectedSeats.length);

  if (variant === "compact") {
    const isCritical = isLocked && timeLeft <= 60;
    return (
      <div
        aria-live="polite"
        role="timer"
        className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-amber-50/95 backdrop-blur-xs border border-amber-300/90 shadow-md text-xs text-amber-900"
      >
        <span className="inline-flex items-center gap-2 font-semibold min-w-0">
          <span
            className={`w-2 h-2 rounded-full bg-[#E9A12B] shrink-0 ${isCritical ? "animate-ping" : "animate-pulse"}`}
            aria-hidden="true"
          />
          <span className="truncate">Sisa waktu penahanan kursi</span>
        </span>
        <strong
          className={`font-mono font-bold text-sm tabular-nums shrink-0 ${isCritical ? "text-[#B3261E]" : "text-[#D93A2F]"}`}
        >
          {isLocked ? formatCountdown(timeLeft) : "10:00"}
        </strong>
      </div>
    );
  }

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
