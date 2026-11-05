
"use client";

import { create } from "zustand";
import type { Seat } from "@/types/event";

// ==========================================
// TYPES & CONSTANTS
// ==========================================

const HOLD_DURATION_SECONDS = 10 * 60;
const MAX_SEATS = 4;

// ==========================================
// BOOKING STATE
// ==========================================

interface BookingState {
  eventId: string | null;
  selectedSeats: Seat[];

  expiresAt: number | null;
  timeLeft: number;

  isLocked: boolean;
  timerId: ReturnType<typeof setInterval> | null;

  // Actions
  setEvent: (eventId: string) => void;
  toggleSeat: (eventId: string, seat: Seat) => void;

  startLockTimer: () => void;
  tick: () => void;

  clearLockTimer: () => void;
  resetBooking: () => void;
}

// ==========================================
// ZUSTAND STORE
// ==========================================

export const useBookingStore = create<BookingState>((set, get) => ({
  eventId: null,
  selectedSeats: [],

  expiresAt: null,
  timeLeft: HOLD_DURATION_SECONDS,

  isLocked: false,
  timerId: null,

  // ========================================
  // SET EVENT
  // ========================================

  setEvent: (eventId) => {
    const state = get();

    if (state.eventId !== eventId) {
      get().resetBooking();

      set({
        eventId,
      });
    }
  },

  // ========================================
  // TOGGLE SEAT
  // ========================================

  toggleSeat: (eventId, seat) => {
    const state = get();

    const expired =
      state.expiresAt !== null &&
      state.expiresAt <= Date.now();

    // Different event or expired booking
    const seatsForEvent =
      state.eventId === eventId && !expired
        ? state.selectedSeats
        : [];

    const alreadySelected = seatsForEvent.some(
      (item) => item.id === seat.id
    );

    // Prevent selecting more than 4 seats
    if (!alreadySelected && seatsForEvent.length >= MAX_SEATS) {
      return;
    }

    const selectedSeats = alreadySelected
      ? seatsForEvent.filter((item) => item.id !== seat.id)
      : [...seatsForEvent, seat];

    // No seats selected: reset booking
    if (selectedSeats.length === 0) {
      get().resetBooking();

      set({ eventId });

      return;
    }

    const shouldStartTimer =
      expired || !state.expiresAt || state.eventId !== eventId;

    const expiresAt = shouldStartTimer
      ? Date.now() + HOLD_DURATION_SECONDS * 1000
      : state.expiresAt;

    set({
      eventId,
      selectedSeats,
      expiresAt,
      timeLeft: shouldStartTimer
        ? HOLD_DURATION_SECONDS
        : Math.max(
            0,
            Math.ceil((expiresAt! - Date.now()) / 1000)
          ),
      isLocked: true,
    });

    // Start timer only once
    if (shouldStartTimer || !state.timerId) {
      get().startLockTimer();
    }
  },

  // ========================================
  // START LOCK TIMER
  // ========================================

  startLockTimer: () => {
    const { timerId } = get();

    // Clear previous interval
    if (timerId) {
      clearInterval(timerId);
    }

    set({
      isLocked: true,
    });

    const newTimerId = setInterval(() => {
      get().tick();
    }, 1000);

    set({
      timerId: newTimerId,
    });
  },

  // ========================================
  // COUNTDOWN
  // ========================================

  tick: () => {
    const { expiresAt, selectedSeats } = get();

    if (!expiresAt || selectedSeats.length === 0) {
      return;
    }

    const timeLeft = Math.max(
      0,
      Math.ceil((expiresAt - Date.now()) / 1000)
    );

    // Time expired
    if (timeLeft <= 0) {
      get().resetBooking();
      return;
    }

    set({
      timeLeft,
    });
  },

  // ========================================
  // CLEAR TIMER
  // ========================================

  clearLockTimer: () => {
    const { timerId } = get();

    if (timerId) {
      clearInterval(timerId);
    }

    set({
      timerId: null,
      isLocked: false,
    });
  },

  // ========================================
  // RESET BOOKING
  // ========================================

  resetBooking: () => {
    const { timerId } = get();

    if (timerId) {
      clearInterval(timerId);
    }

    set({
      selectedSeats: [],
      expiresAt: null,
      timeLeft: HOLD_DURATION_SECONDS,
      isLocked: false,
      timerId: null,
    });
  },
}));
