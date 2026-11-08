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
const RELEASED_TTL_STORAGE_KEY = "summa_released_seats_ttl";

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

    const expiresAt = Date.now() + HOLD_DURATION_SECONDS * 1000;
    const ttlMap: Record<string, number> = {};
    try {
      const existingRaw = localStorage.getItem(RELEASED_TTL_STORAGE_KEY);
      if (existingRaw) {
        const parsed = JSON.parse(existingRaw) as Record<string, number>;
        const now = Date.now();
        Object.entries(parsed).forEach(([k, exp]) => {
          if (typeof exp === "number" && exp > now && clean.includes(k)) {
            ttlMap[k] = exp;
          }
        });
      }
    } catch {
      // Ignore parse error
    }
    clean.forEach((id) => {
      if (!ttlMap[id]) {
        ttlMap[id] = expiresAt;
      }
    });
    localStorage.setItem(RELEASED_TTL_STORAGE_KEY, JSON.stringify(ttlMap));
  } catch {
    // Ignore storage quota
  }
}

export function loadReleasedFromSession(): string[] {
  if (typeof window === "undefined") return [];
  const collected = new Set<string>();
  try {
    const raw = sessionStorage.getItem(RELEASED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed
          .filter((id) => Boolean(id) && id !== "undefined" && id !== "null")
          .forEach((id) => collected.add(String(id).trim()));
      }
    }
  } catch {
    // Ignore sessionStorage error
  }
  try {
    const rawTtl = localStorage.getItem(RELEASED_TTL_STORAGE_KEY);
    if (rawTtl) {
      const parsedTtl = JSON.parse(rawTtl) as Record<string, number>;
      const now = Date.now();
      const validTtl: Record<string, number> = {};
      let expiredFound = false;
      Object.entries(parsedTtl).forEach(([id, exp]) => {
        if (typeof exp === "number" && exp > now && id && id !== "undefined" && id !== "null") {
          collected.add(String(id).trim());
          validTtl[id] = exp;
        } else {
          expiredFound = true;
        }
      });
      if (expiredFound) {
        localStorage.setItem(RELEASED_TTL_STORAGE_KEY, JSON.stringify(validTtl));
      }
    }
  } catch {
    // Ignore localStorage error
  }
  return Array.from(collected);
}

function expandSeatKeyVariants(rawKey: string): string[] {
  const trimmed = String(rawKey || "").trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return [];
  const out = [trimmed];
  const match = trimmed.toUpperCase().match(/(?:ATR-)?([A-Z])-?(\d{1,2})\b/);
  if (match) {
    const row = match[1];
    const numStr = match[2].padStart(2, "0");
    out.push(`${row}${numStr}`);
    out.push(`${row}-${numStr}`);
    out.push(`ATR-${row}-${numStr}`);
  }
  return out;
}

function expandSeatIdentifiers(seats: Seat[] | undefined): string[] {
  if (!Array.isArray(seats)) return [];
  const keys: string[] = [];
  seats.forEach((s) => {
    if (s.id) keys.push(...expandSeatKeyVariants(String(s.id)));
    if (s.row && s.number !== undefined) {
      const numStr = String(s.number).padStart(2, "0");
      keys.push(`${s.row}${numStr}`);
      keys.push(`${s.row}-${numStr}`);
      keys.push(`ATR-${s.row}-${numStr}`);
    }
  });
  return keys.filter((k) => Boolean(k) && k !== "undefined" && k !== "null");
}

interface ActiveOrderSessionData {
  holdId: string | null;
  holdIds: string[];
  eventId: string | null;
  seatIds: string[];
  expandedSeatKeys: string[];
}

function loadActiveOrderFromSession(): ActiveOrderSessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("summa_active_order");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      hold_id?: string | number | null;
      hold_ids?: (string | number)[];
      event_id?: string | number;
      event?: { id?: string | number; event_id?: string | number };
      seat_ids?: (string | number)[];
      event_seat_ids?: (string | number)[];
      items?: Array<{
        id?: string | number;
        seat_id?: string | number;
        event_seat_id?: string | number;
        seat_label?: string;
      }>;
    };
    const holdId = parsed.hold_id ? String(parsed.hold_id).trim() : null;
    const holdIds = Array.isArray(parsed.hold_ids)
      ? parsed.hold_ids.map((id) => String(id).trim()).filter(Boolean)
      : holdId
      ? [holdId]
      : [];
    const eventId = parsed.event_id
      ? String(parsed.event_id)
      : parsed.event?.event_id
      ? String(parsed.event.event_id)
      : parsed.event?.id
      ? String(parsed.event.id)
      : null;

    const rawSeatIds: string[] = [];
    const keys: string[] = [];
    if (Array.isArray(parsed.seat_ids)) {
      parsed.seat_ids.forEach((id) => {
        rawSeatIds.push(String(id).trim());
        keys.push(...expandSeatKeyVariants(String(id)));
      });
    }
    if (Array.isArray(parsed.event_seat_ids)) {
      parsed.event_seat_ids.forEach((id) => {
        rawSeatIds.push(String(id).trim());
        keys.push(...expandSeatKeyVariants(String(id)));
      });
    }
    if (Array.isArray(parsed.items)) {
      parsed.items.forEach((item) => {
        if (item.id) keys.push(...expandSeatKeyVariants(String(item.id)));
        if (item.seat_id) {
          rawSeatIds.push(String(item.seat_id).trim());
          keys.push(...expandSeatKeyVariants(String(item.seat_id)));
        }
        if (item.event_seat_id) {
          rawSeatIds.push(String(item.event_seat_id).trim());
          keys.push(...expandSeatKeyVariants(String(item.event_seat_id)));
        }
        if (item.seat_label) keys.push(...expandSeatKeyVariants(String(item.seat_label)));
      });
    }

    return {
      holdId,
      holdIds,
      eventId,
      seatIds: Array.from(new Set(rawSeatIds.filter(Boolean))),
      expandedSeatKeys: Array.from(new Set(keys.filter(Boolean))),
    };
  } catch {
    return null;
  }
}

function loadActiveOrderSeatKeys(): string[] {
  return loadActiveOrderFromSession()?.expandedSeatKeys || [];
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
        // Expired already — still restore persisted releasedSeatIds
        sessionStorage.removeItem(STORAGE_KEY);
        if (persistedReleased.length > 0) {
          set((prev) => ({
            releasedSeatIds: Array.from(new Set([...prev.releasedSeatIds, ...persistedReleased])),
          }));
        }
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
    const mergedReleased = Array.from(new Set([...state.releasedSeatIds, ...persistedReleased]));
    if (state.eventId && state.eventId !== eventId) {
      get().resetBooking();
      set({
        eventId,
        heldSeatIds: [],
        releasedSeatIds: mergedReleased,
      });
      saveToSession(get());
    } else if (!state.eventId) {
      set({
        eventId,
        releasedSeatIds: mergedReleased,
      });
    } else if (mergedReleased.length !== state.releasedSeatIds.length) {
      set({
        releasedSeatIds: mergedReleased,
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
    const activeOrder = loadActiveOrderFromSession();

    // 1. Ekstrak hold_id / holdIds dari state, sessionStorage booking, dan summa_active_order SEBELUM menghapus state
    const holdIdsFromSources =
      state.holdIds.length > 0
        ? state.holdIds
        : saved?.holdIds && saved.holdIds.length > 0
        ? saved.holdIds
        : activeOrder?.holdIds && activeOrder.holdIds.length > 0
        ? activeOrder.holdIds
        : [];
    const primaryHoldId =
      state.holdId || saved?.holdId || activeOrder?.holdId || null;
    const idsToRelease = Array.from(
      new Set(
        (holdIdsFromSources.length > 0
          ? holdIdsFromSources
          : primaryHoldId
          ? [primaryHoldId]
          : []
        )
          .filter((id) => Boolean(id) && id !== "undefined" && id !== "null")
          .map(String)
      )
    );

    // Ekstrak seluruh ID kursi yang ditahan sebelum mereset state
    const keysFromHeld = [
      ...(state.heldSeatIds || []),
      ...(saved?.heldSeatIds || []),
    ].flatMap((id) => expandSeatKeyVariants(String(id)));
    const keysFromSelected = [
      ...expandSeatIdentifiers(state.selectedSeats),
      ...expandSeatIdentifiers(saved?.selectedSeats),
    ];
    const keysFromActiveOrder = activeOrder?.expandedSeatKeys || loadActiveOrderSeatKeys();

    const rawSeatIdsToRelease = Array.from(
      new Set(
        [
          ...state.selectedSeats.map((s) => String(s.id)),
          ...(saved?.selectedSeats || []).map((s) => String(s.id)),
          ...(activeOrder?.seatIds || []),
        ].filter((id) => Boolean(id) && id !== "undefined" && id !== "null")
      )
    );

    const mergedReleased = Array.from(
      new Set(
        [
          ...loadReleasedFromSession(),
          ...state.releasedSeatIds,
          ...keysFromHeld,
          ...keysFromSelected,
          ...keysFromActiveOrder,
        ].filter((id) => Boolean(id) && id !== "undefined" && id !== "null")
      )
    );

    const resolvedEventId =
      eventId || state.eventId || saved?.eventId || activeOrder?.eventId || "";

    // 2. Panggil API DELETE /api/events/:id/holds (dengan keepalive: true) dan await hingga selesai
    // SEBELUM menghapus state atau sessionStorage
    if (resolvedEventId && (idsToRelease.length > 0 || rawSeatIdsToRelease.length > 0)) {
      try {
        await releaseHolds(resolvedEventId, idsToRelease, rawSeatIdsToRelease);
      } catch (err) {
        console.warn("releaseHolds API warning (falling back to releasedSeatIds override):", err);
      }
    }

    // 3. Simpan daftar kursi yang dilepas ke storage (sessionStorage + localStorage TTL)
    saveReleasedToSession(mergedReleased);

    // 4. BARU hapus state & sessionStorage booking setelah request API selesai
    const { timerId } = get();
    if (timerId) clearInterval(timerId);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }

    set({
      eventId: resolvedEventId || state.eventId,
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
    const { reservedUntil, eventId } = get();
    if (!reservedUntil) return;

    const remaining = getSecondsRemaining(reservedUntil);
    if (remaining <= 0) {
      void get().releaseHold(eventId || "");
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
