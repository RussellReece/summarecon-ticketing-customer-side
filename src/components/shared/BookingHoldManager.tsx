"use client";

import { useEffect } from "react";
import { useBookingStore } from "@/lib/store/useBookingStore";

export function BookingHoldManager() {
  const selectedCount = useBookingStore((state) => state.selectedSeats.length);
  const tick = useBookingStore((state) => state.tick);

  useEffect(() => {
    if (selectedCount === 0) return;
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [selectedCount, tick]);

  return null;
}
