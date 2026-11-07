// src/components/shared/BookingHoldManager.tsx
"use client";

import { useEffect } from "react";
import { useBookingStore } from "@/lib/store/useBookingStore";

export function BookingHoldManager() {
  const isLocked = useBookingStore((state) => state.isLocked);
  const tick = useBookingStore((state) => state.tick);

  useEffect(() => {
    if (!isLocked) return;
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [isLocked, tick]);

  return null;
}
