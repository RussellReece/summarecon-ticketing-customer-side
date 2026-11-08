// src/lib/store/useBookingStore.ts
//
// Central booking state store for Summarecon Ticketing.
// Handles seat selection (client-only), atomic API hold creation on "Lanjut",
// server-synchronised countdown timer, and booking reset.

"use client";

import { create } from "zustand";
import type { Seat } from "@/types/event";
import { holdSeats, releaseHolds } from "@/services/customerApi";
import { getSecondsRemaining } from "@/lib/time-utils";

const HOLD_DURATION_SECONDS = 10 * 60; // 10 minutes
const MAX_SEATS = 4;
const STORAGE_KEY = "summa_booking_state";
const RELEASED_STORAGE_KEY = "summa_released_seats";

export interface QuotaSelectionItem {
  sectionId: string;
  count: number;
  sectionName: string;
  categoryName: string;
  price: number;
}

export interface BuyerInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
}

interface BookingState {
  eventId: string | null;
  selectedSeats: Seat[];
  selectedQuota: Record<string, number>;
  quotaItems: Record<string, QuotaSelectionItem>;

  holdId: string | null;
  holdIds: string[];
  heldSeatIds: string[];
  releasedSeatIds: string[];
  reservedUntil: string | null;
  timeLeft: number;
  isLocked: boolean;
  timerId: ReturnType<typeof setInterval> | null;
  conflictError: string | null;

  buyerInfo: BuyerInfo;
  participantNames: Record<string, string>;

  // Actions
  setEvent: (eventId: string) => void;
  toggleSeat: (eventId: string, seat: Seat) => void;
  setQuota: (item: QuotaSelectionItem) => void;
  clearSelection: () => void;

  createHold: (eventId: string, userId?: string) => Promise<{ success: boolean; error?: string }>;
  releaseHold: (eventId: string) => Promise<void>;

  setBuyerInfo: (info: Partial<BuyerInfo>) => void;
  setParticipantName: (key: string, name: string) => void;
  setConflictError: (msg: string | null) => void;

  startLockTimer: (reservedUntilISO: string) => void;
  tick: () => void;
  clearLockTimer: () => void;
  resetBooking: () => void;
  hydrateFromStorage: () => void;
}

function saveReleasedToSession(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    const clean = Array.from(
      new Set(
        ids
          .filter((id) => Boolean(id) && id !== "undefined" && id !== "null")
          .map((id) => String(id).trim())
      )
    );
    sessionStorage.setItem(RELEASED_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Ignore storage quota
  }
}

export function loadReleasedFromSession(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(RELEASED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .filter((id) => Boolean(id) && id !== "undefined" && id !== "null")
          .map((id) => String(id).trim())
      : [];
  } catch {
    return [];
  }
}

function expandSeatIdentifiers(seats: Seat[] | undefined): string[] {
  if (!Array.isArray(seats)) return [];
  const keys: string[] = [];
  seats.forEach((s) => {
    if (s.id) keys.push(String(s.id).trim());
    if (s.row && s.number !== undefined) {
      const numStr = String(s.number).padStart(2, "0");
      keys.push(`${s.row}${numStr}`);
      keys.push(`${s.row}-${numStr}`);
      keys.push(`ATR-${s.row}-${numStr}`);
    }
  });
  return keys.filter((k) => Boolean(k) && k !== "undefined" && k !== "null");
}

function saveToSession(state: Partial<BookingState>) {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      eventId: state.eventId,
      selectedSeats: state.selectedSeats,
      selectedQuota: state.selectedQuota,
      quotaItems: state.quotaItems,
      holdId: state.holdId,
      holdIds: state.holdIds,
      heldSeatIds: state.heldSeatIds,
      reservedUntil: state.reservedUntil,
      isLocked: state.isLocked,
      buyerInfo: state.buyerInfo,
      participantNames: state.participantNames,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota
  }
}

function loadFromSession(): Partial<BookingState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const useBookingStore = create<BookingState>((set, get) => ({
  eventId: null,
  selectedSeats: [],
  selectedQuota: {},
  quotaItems: {},

  holdId: null,
  holdIds: [],
  heldSeatIds: [],
  releasedSeatIds: loadReleasedFromSession(),
  reservedUntil: null,
  timeLeft: HOLD_DURATION_SECONDS,
  isLocked: false,
  timerId: null,
  conflictError: null,

  buyerInfo: {
    fullName: "",
    email: "",
    phoneNumber: "",
  },
  participantNames: {},

  hydrateFromStorage: () => {
    const saved = loadFromSession();
    const persistedReleased = loadReleasedFromSession();
    if (!saved) {
      if (persistedReleased.length > 0) {
        set((prev) => ({
          releasedSeatIds: Array.from(new Set([...prev.releasedSeatIds, ...persistedReleased])),
        }));
      }
      return;
    }

    if (saved.reservedUntil) {
      const remaining = getSecondsRemaining(saved.reservedUntil);
      if (remaining <= 0) {
        // Expired already
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      set((prev) => ({
        ...saved,
        releasedSeatIds: Array.from(new Set([...prev.releasedSeatIds, ...persistedReleased])),
        timeLeft: remaining,
        isLocked: true,
      }));
      get().startLockTimer(saved.reservedUntil);
      return;
    }

    set((prev) => ({
      ...saved,
      releasedSeatIds: Array.from(new Set([...prev.releasedSeatIds, ...persistedReleased])),
    }));
  },

  setEvent: (eventId: string) => {
    const state = get();
    const persistedReleased = loadReleasedFromSession();
    if (state.eventId && state.eventId !== eventId) {
      get().resetBooking();
      set({
        eventId,
        heldSeatIds: [],
        releasedSeatIds: Array.from(new Set([...state.releasedSeatIds, ...persistedReleased])),
      });
      saveToSession(get());
    } else if (!state.eventId) {
      set({
        eventId,
        releasedSeatIds: Array.from(new Set([...state.releasedSeatIds, ...persistedReleased])),
      });
    }
  },

  toggleSeat: (eventId: string, seat: Seat) => {
    const state = get();
    // Do not allow editing selection while locked in hold
    if (state.isLocked && state.eventId === eventId) return;

    const currentSeats = state.eventId === eventId ? state.selectedSeats : [];
    const currentQuotaCount = Object.values(state.selectedQuota).reduce((a, b) => a + b, 0);

    const isAlreadySelected = currentSeats.some((s) => s.id === seat.id);

    // Strictly reject selecting any seat whose status is not AVAILABLE
    if (!isAlreadySelected && seat.status && String(seat.status).toUpperCase() !== "AVAILABLE") {
      return;
    }

    // Max 4 tickets total
    if (!isAlreadySelected && currentSeats.length + currentQuotaCount >= MAX_SEATS) {
      set({
        conflictError: `Maksimal pemilihan adalah ${MAX_SEATS} tiket per transaksi.`,
      });
      return;
    }

    const nextSeats = isAlreadySelected
      ? currentSeats.filter((s) => s.id !== seat.id)
      : [...currentSeats, seat];

    set({
      eventId,
      selectedSeats: nextSeats,
      conflictError: null,
    });
    saveToSession(get());
  },

  setQuota: (item: QuotaSelectionItem) => {
    const state = get();
    if (state.isLocked) return;

    const currentSeatsCount = state.selectedSeats.length;
    const otherQuotaCount = Object.entries(state.selectedQuota)
      .filter(([id]) => id !== item.sectionId)
      .reduce((a, [, c]) => a + c, 0);

    const safeCount = Math.min(item.count, MAX_SEATS - currentSeatsCount - otherQuotaCount);

    const nextQuota = { ...state.selectedQuota };
    const nextQuotaItems = { ...state.quotaItems };

    if (safeCount > 0) {
      nextQuota[item.sectionId] = safeCount;
      nextQuotaItems[item.sectionId] = { ...item, count: safeCount };
    } else {
      delete nextQuota[item.sectionId];
      delete nextQuotaItems[item.sectionId];
    }

    set({
      selectedQuota: nextQuota,
      quotaItems: nextQuotaItems,
      conflictError: null,
    });
    saveToSession(get());
  },

  clearSelection: () => {
    set({
      selectedSeats: [],
      selectedQuota: {},
      quotaItems: {},
      conflictError: null,
    });
    saveToSession(get());
  },

  // Atomic hold creation on "Lanjut"
  createHold: async (eventId: string, userId?: string) => {
    const { selectedSeats, selectedQuota, releasedSeatIds } = get();
    const totalSelected =
      selectedSeats.length + Object.values(selectedQuota).reduce((a, b) => a + b, 0);

    if (totalSelected === 0) {
      return { success: false, error: "Pilih minimal 1 kursi atau tiket." };
    }

    const seatIds = selectedSeats.map((s) => s.id);
    const allHeldKeys = expandSeatIdentifiers(selectedSeats);

    try {
      set({ conflictError: null });

      // If there are numbered seats, call holdSeats API
      if (seatIds.length > 0) {
        const res = await holdSeats(eventId, seatIds, userId);
        const holdData = res.data as {
          reserved_until?: string;
          hold_id?: string;
          hold_ids?: string[] | number[];
          event_seat_ids?: string[];
          seat_ids?: (string | number)[];
        };
        const reservedUntil =
          holdData.reserved_until || new Date(Date.now() + HOLD_DURATION_SECONDS * 1000).toISOString();
        const holdId = holdData.hold_id || String(holdData.hold_ids?.[0] || "");
        const holdIds = holdData.hold_ids
          ? holdData.hold_ids.map(String)
          : holdId
          ? [holdId]
          : [];

        const apiReturnedSeatIds = [
          ...(Array.isArray(holdData.event_seat_ids) ? holdData.event_seat_ids.map(String) : []),
          ...(Array.isArray(holdData.seat_ids) ? holdData.seat_ids.map(String) : []),
        ];
        const finalHeldKeys = Array.from(new Set([...allHeldKeys, ...apiReturnedSeatIds]));
        const nextReleased = releasedSeatIds.filter((id) => !finalHeldKeys.includes(id));
        saveReleasedToSession(nextReleased);

        set({
          eventId,
          isLocked: true,
          holdId,
          holdIds,
          heldSeatIds: finalHeldKeys,
          releasedSeatIds: nextReleased,
          reservedUntil,
        });

        get().startLockTimer(reservedUntil);
        saveToSession(get());
        return { success: true };
      }

      // If standing/quota only, hold locally with 10 min timer
      const reservedUntil = new Date(Date.now() + HOLD_DURATION_SECONDS * 1000).toISOString();
      set({
        eventId,
        isLocked: true,
        holdId: `HLD-QUOTA-${Date.now()}`,
        holdIds: [`HLD-QUOTA-${Date.now()}`],
        heldSeatIds: [],
        reservedUntil,
      });

      get().startLockTimer(reservedUntil);
      saveToSession(get());
      return { success: true };
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      const is409 = errorObj?.status === 409 || errorObj?.message?.includes("409");
      const message = is409
        ? "Salah satu kursi pilihanmu baru saja diambil orang lain. Silakan pilih kursi lain yang tersedia."
        : errorObj?.message || "Gagal mengunci tiket. Silakan coba lagi.";

      set({ conflictError: message });
      return { success: false, error: message };
    }
  },

  releaseHold: async (eventId: string) => {
    const state = get();
    const saved = loadFromSession();

    const holdIds =
      state.holdIds.length > 0
        ? state.holdIds
        : saved?.holdIds && saved.holdIds.length > 0
        ? saved.holdIds
        : [];
    const holdId = state.holdId || saved?.holdId || null;
    const idsToRelease = holdIds.length > 0 ? holdIds : holdId ? [holdId] : [];

    // Collect every seat identifier from active state AND sessionStorage BEFORE resetting
    const keysFromHeld = [
      ...(state.heldSeatIds || []),
      ...(saved?.heldSeatIds || []),
    ];
    const keysFromSelected = [
      ...expandSeatIdentifiers(state.selectedSeats),
      ...expandSeatIdentifiers(saved?.selectedSeats),
    ];

    const mergedReleased = Array.from(
      new Set(
        [
          ...loadReleasedFromSession(),
          ...state.releasedSeatIds,
          ...keysFromHeld,
          ...keysFromSelected,
        ].filter((id) => Boolean(id) && id !== "undefined" && id !== "null")
      )
    );

    // Persist immediately to sessionStorage and Zustand BEFORE network call / navigation
    saveReleasedToSession(mergedReleased);

    const { timerId } = get();
    if (timerId) clearInterval(timerId);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }

    set({
      eventId: state.eventId || eventId,
      selectedSeats: [],
      selectedQuota: {},
      quotaItems: {},
      holdId: null,
      holdIds: [],
      heldSeatIds: [],
      releasedSeatIds: mergedReleased,
      reservedUntil: null,
      timeLeft: HOLD_DURATION_SECONDS,
      isLocked: false,
      timerId: null,
      conflictError: null,
      participantNames: {},
    });

    if (idsToRelease.length > 0) {
      try {
        await releaseHolds(eventId, idsToRelease);
      } catch {
        // Backend auto-expires holds on timeout (DELETE /holds may return 405)
      }
    }
  },

  setBuyerInfo: (info: Partial<BuyerInfo>) => {
    set((state) => ({
      buyerInfo: { ...state.buyerInfo, ...info },
    }));
    saveToSession(get());
  },

  setParticipantName: (key: string, name: string) => {
    set((state) => ({
      participantNames: { ...state.participantNames, [key]: name },
    }));
    saveToSession(get());
  },

  setConflictError: (msg: string | null) => {
    set({ conflictError: msg });
  },

  startLockTimer: (reservedUntilISO: string) => {
    const { timerId } = get();
    if (timerId) clearInterval(timerId);

    const initialRemaining = getSecondsRemaining(reservedUntilISO);
    set({
      reservedUntil: reservedUntilISO,
      timeLeft: initialRemaining,
      isLocked: true,
    });

    const newTimerId = setInterval(() => {
      get().tick();
    }, 1000);

    set({ timerId: newTimerId });
  },

  tick: () => {
    const { reservedUntil } = get();
    if (!reservedUntil) return;

    const remaining = getSecondsRemaining(reservedUntil);
    if (remaining <= 0) {
      get().resetBooking();
      set({
        conflictError: "Waktu penahanan tiket (10 menit) telah habis. Silakan pilih kembali tiketmu.",
      });
      return;
    }

    set({ timeLeft: remaining });
  },

  clearLockTimer: () => {
    const { timerId } = get();
    if (timerId) clearInterval(timerId);
    set({ timerId: null, isLocked: false });
  },

  resetBooking: () => {
    const { timerId } = get();
    if (timerId) clearInterval(timerId);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }

    set({
      selectedSeats: [],
      selectedQuota: {},
      quotaItems: {},
      holdId: null,
      holdIds: [],
      heldSeatIds: [],
      reservedUntil: null,
      timeLeft: HOLD_DURATION_SECONDS,
      isLocked: false,
      timerId: null,
      conflictError: null,
      participantNames: {},
    });
  },
}));
