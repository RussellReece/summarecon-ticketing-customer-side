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
    if (!saved) return;

    if (saved.reservedUntil) {
      const remaining = getSecondsRemaining(saved.reservedUntil);
      if (remaining <= 0) {
        // Expired already
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      set({
        ...saved,
        timeLeft: remaining,
        isLocked: true,
      });
      get().startLockTimer(saved.reservedUntil);
      return;
    }

    set(saved);
  },

  setEvent: (eventId: string) => {
    const state = get();
    if (state.eventId !== eventId) {
      get().resetBooking();
      set({ eventId });
      saveToSession({ eventId });
    }
  },

  toggleSeat: (eventId: string, seat: Seat) => {
    const state = get();
    // Do not allow editing selection while locked in hold
    if (state.isLocked && state.eventId === eventId) return;

    const currentSeats = state.eventId === eventId ? state.selectedSeats : [];
    const currentQuotaCount = Object.values(state.selectedQuota).reduce((a, b) => a + b, 0);

    const isAlreadySelected = currentSeats.some((s) => s.id === seat.id);

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
    const { selectedSeats, selectedQuota } = get();
    const totalSelected =
      selectedSeats.length + Object.values(selectedQuota).reduce((a, b) => a + b, 0);

    if (totalSelected === 0) {
      return { success: false, error: "Pilih minimal 1 kursi atau tiket." };
    }

    const seatIds = selectedSeats.map((s) => s.id);

    try {
      set({ conflictError: null });

      // If there are numbered seats, call holdSeats API
      if (seatIds.length > 0) {
        const res = await holdSeats(eventId, seatIds, userId);
        const holdData = res.data as {
          reserved_until?: string;
          hold_id?: string;
          hold_ids?: string[] | number[];
        };
        const reservedUntil =
          holdData.reserved_until || new Date(Date.now() + HOLD_DURATION_SECONDS * 1000).toISOString();
        const holdId = holdData.hold_id || String(holdData.hold_ids?.[0] || "");
        const holdIds = holdData.hold_ids
          ? holdData.hold_ids.map(String)
          : holdId
          ? [holdId]
          : [];

        set({
          isLocked: true,
          holdId,
          holdIds,
          reservedUntil,
        });

        get().startLockTimer(reservedUntil);
        saveToSession(get());
        return { success: true };
      }

      // If standing/quota only, hold locally with 10 min timer
      const reservedUntil = new Date(Date.now() + HOLD_DURATION_SECONDS * 1000).toISOString();
      set({
        isLocked: true,
        holdId: `HLD-QUOTA-${Date.now()}`,
        holdIds: [`HLD-QUOTA-${Date.now()}`],
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
    const { holdIds, holdId } = get();
    const idsToRelease = holdIds.length > 0 ? holdIds : holdId ? [holdId] : [];

    if (idsToRelease.length > 0) {
      try {
        await releaseHolds(eventId, idsToRelease.map(Number));
      } catch {
        // Backend auto-expires holds on timeout
      }
    }

    get().resetBooking();
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
      reservedUntil: null,
      timeLeft: HOLD_DURATION_SECONDS,
      isLocked: false,
      timerId: null,
      conflictError: null,
      participantNames: {},
    });
  },
}));
