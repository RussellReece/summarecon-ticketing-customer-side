// src/components/seat-map/VenueRenderer.tsx
//
// Redesigned Data-Driven Venue & Seat Map Renderer for Summarecon Ticketing.
// Built according to Style Guide and Mobile-First specifications:
// - CSS Grid per block: eliminates vertical overlap and guarantees mathematical alignment.
// - 5 distinct seat statuses: uniform baseline, size, border width (box-sizing: border-box).
// - Clean neutral facilities with SVG line icons (no black blocks, no emojis).
// - Responsive modes: Desktop full venue layout & Mobile "Overview + Fokus Blok" mode.
// - Live region (aria-live) & accessible keyboard navigation.

"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { SeatLegend } from "./SeatLegend";
import { QuotaCard, type QuotaSectionData } from "./QuotaCard";
import { formatRupiah } from "@/lib/utils";
import { loadReleasedFromSession } from "@/lib/store/useBookingStore";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface VenueLayoutElement {
  element_id: string;
  name: string;
  element_type:
    | "STAGE"
    | "BACKSTAGE"
    | "TICKET_SECTION"
    | "AISLE"
    | "ACCESSIBLE_VIEWING"
    | "FRONT_OF_HOUSE"
    | "CHECK_IN"
    | "ENTRY"
    | "EXIT"
    | "EMERGENCY_ACCESS"
    | "TENANT_AREA"
    | string;
  ticketable: boolean;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  section_id?: string;
  booking_type?: "BOOK_BY_SEAT" | "BOOK_BY_QUOTA" | "STANDING" | string;
}

export interface VenueSeat {
  event_seat_id: string;
  seat_label: string;
  row_label: string;
  seat_number: string | number;
  section_id: string;
  block_code?: string;
  position: {
    x: number;
    y: number;
    unit?: string;
  };
  status: "AVAILABLE" | "LOCKED" | "SOLD" | "BLOCKED" | "DISABLED_EVENT_CANCELLED" | string;
  price?: number;
  category_name?: string;
  blocked_reason?: string | null;
}

export interface VenueSection {
  section_id: string;
  event_section_id?: string;
  section_name: string;
  booking_type: "BOOK_BY_SEAT" | "BOOK_BY_QUOTA" | "STANDING";
  capacity: number;
  available: number;
  sold: number;
  reserved: number;
  price: number;
  category_name: string;
}

export interface VenueRendererProps {
  eventId: string;
  eventName: string;
  eventStatus: string;
  venueName: string;
  layoutElements: VenueLayoutElement[];
  seats: VenueSeat[];
  sections: VenueSection[];
  selectedSeatIds: string[];
  releasedSeatIds?: string[];
  selectedQuota: Record<string, number>;
  onToggleSeat: (seat: VenueSeat) => void;
  onQuotaChange: (sectionId: string, count: number) => void;
  onRefreshSeats?: () => Promise<void>;
  maxTicketsTotal?: number;
}

interface SeatBlockData {
  blockId: string;
  blockName: string;
  categoryName: string;
  price: number;
  availableCount: number;
  totalCount: number;
  rows: {
    rowLabel: string;
    seats: VenueSeat[];
  }[];
}

// ─── Status Normalizer (Single Source of Truth) ─────────────────────────────

export function normalizeSeatStatus(
  rawStatus?: string | null
): "AVAILABLE" | "LOCKED" | "SOLD" | "BLOCKED" | "DISABLED_EVENT_CANCELLED" {
  const upper = String(rawStatus || "AVAILABLE").trim().toUpperCase();
  if (upper === "SOLD" || upper === "PAID" || upper === "BOOKED" || upper === "ISSUED") {
    return "SOLD";
  }
  if (upper === "BLOCKED" || upper === "UNAVAILABLE" || upper === "DISABLED") {
    return "BLOCKED";
  }
  if (
    upper === "LOCKED" ||
    upper === "HELD" ||
    upper === "RESERVED" ||
    upper === "HOLD" ||
    upper === "PENDING"
  ) {
    return "LOCKED";
  }
  if (upper === "DISABLED_EVENT_CANCELLED" || upper === "CANCELLED") {
    return "DISABLED_EVENT_CANCELLED";
  }
  return "AVAILABLE";
}

// ─── Single Seat Component (Memoized for zero-lag rendering) ──────────────────

interface SeatItemProps {
  seat: VenueSeat;
  isSelected: boolean;
  isCancelled: boolean;
  sizeMode?: "desktop" | "mobile";
  onSelect: (seat: VenueSeat) => void;
  onHover: (seat: VenueSeat | null) => void;
}

const SeatItem = React.memo(function SeatItem({
  seat,
  isSelected,
  isCancelled,
  sizeMode = "desktop",
  onSelect,
  onHover,
}: SeatItemProps) {
  const normStatus = normalizeSeatStatus(seat.status);
  const isSold = normStatus === "SOLD";
  const isLocked = normStatus === "LOCKED";
  const isBlocked = normStatus === "BLOCKED";
  const isSeatCancelled = isCancelled || normStatus === "DISABLED_EVENT_CANCELLED";
  const isUnavailableFromBackend = isSold || isLocked || isBlocked || isSeatCancelled;
  const isAvailable = normStatus === "AVAILABLE" && !isSelected && !isSeatCancelled;

  // Dimensions
  // Mobile focus mode: 44px x 44px
  // Desktop full mode: 36px x 36px
  const dimClass =
    sizeMode === "mobile"
      ? "w-11 h-11 text-xs"
      : "w-9 h-9 text-[11px] sm:w-[38px] sm:h-[38px] sm:text-xs";

  let statusClass = "";
  let iconSymbol = String(seat.seat_number).padStart(2, "0");
  let statusTextIndo = "Tersedia";

  if (isSeatCancelled) {
    statusClass =
      "bg-transparent border-2 border-dashed border-stone-300 text-stone-400 opacity-60 cursor-not-allowed";
    iconSymbol = "—";
    statusTextIndo = "Event Dibatalkan";
  } else if (isSold) {
    // SOLD (Backend Single Source of Truth)
    statusClass =
      "bg-[#6B5A6E] border-2 border-[#6B5A6E] text-white font-bold opacity-90 cursor-not-allowed select-none";
    iconSymbol = "✕";
    statusTextIndo = "Sudah Terjual";
  } else if (isBlocked) {
    // BLOCKED (Backend Single Source of Truth)
    statusClass =
      "border-2 border-[#9A8F95] text-[#5A4D5C] font-bold cursor-not-allowed opacity-80 select-none";
    iconSymbol = "⊘";
    statusTextIndo = `Terblokir: ${seat.blocked_reason ?? "Kebutuhan operasional"}`;
  } else if (isLocked && !isSelected) {
    // LOCKED / HELD (Held by other user)
    statusClass =
      "bg-[#E9A12B] border-2 border-[#E9A12B] text-[#2A1F2D] font-bold opacity-90 cursor-not-allowed select-none";
    iconSymbol = "⋯";
    statusTextIndo = "Sedang Ditahan (10 menit)";
  } else if (isSelected) {
    // SELECTED (Local state)
    statusClass =
      "bg-[#D93A2F] border-2 border-[#D93A2F] text-white font-black shadow-md scale-[1.06] z-20 ring-2 ring-[#8C1F2B] ring-offset-1";
    iconSymbol = "✓";
    statusTextIndo = "Pilihanmu";
  } else {
    // AVAILABLE
    const seatNum = Number(seat.seat_number) || 0;
    const isBlockB = seat.block_code === "BLOCK_B" || (!seat.block_code && seatNum > 5);
    const isPremium =
      !isBlockB &&
      (seat.block_code === "BLOCK_A" ||
        seat.category_name?.toLowerCase().includes("premium") ||
        seat.category_name?.toLowerCase().includes("vip"));

    if (isPremium) {
      statusClass =
        "bg-[#FFF8E7] border-2 border-[#D9822B] text-[#8F4800] font-bold hover:scale-[1.06] hover:bg-[#FEEBC8] hover:shadow-sm active:scale-95 cursor-pointer z-10";
      statusTextIndo = "Tersedia (Premium/VIP)";
    } else {
      statusClass =
        "bg-[#E3F4F1] border-2 border-[#1F8F7E] text-[#14665A] font-semibold hover:scale-[1.06] hover:bg-[#d5eeea] hover:shadow-sm active:scale-95 cursor-pointer z-10";
      statusTextIndo = "Tersedia (Reguler)";
    }
  }

  const tooltipText = `Kursi ${seat.seat_label} · ${seat.category_name ?? "Reguler"} · ${
    seat.price ? formatRupiah(seat.price) : ""
  } · ${statusTextIndo}`;

  return (
    <button
      type="button"
      className={`${dimClass} rounded-[8px] rounded-b-[5px] flex flex-col items-center justify-center transition-all duration-150 relative select-none shrink-0 ${statusClass}`}
      disabled={isSeatCancelled || (isUnavailableFromBackend && !isSelected) || (!isSelected && !isAvailable)}
      onClick={() => {
        if (isSeatCancelled || (isUnavailableFromBackend && !isSelected)) return;
        onSelect(seat);
      }}
      onMouseEnter={() => onHover(seat)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(seat)}
      onBlur={() => onHover(null)}
      title={tooltipText}
      aria-label={`Kursi ${seat.seat_label}, ${seat.category_name ?? "Reguler"}, Rp ${
        seat.price ?? 0
      }, ${statusTextIndo}`}
      aria-pressed={isSelected}
      aria-disabled={!isAvailable && !isSelected}
    >
      <span className="leading-none">{iconSymbol}</span>
      {isSelected && (
        <span className="text-[8px] font-bold leading-none opacity-90 -mt-0.5">
          {seat.seat_number}
        </span>
      )}
    </button>
  );
});

// ─── Main VenueRenderer Component ─────────────────────────────────────────────

export function VenueRenderer(props: VenueRendererProps) {
  const {
    eventStatus,
    venueName,
    seats,
    sections,
    selectedSeatIds,
    releasedSeatIds = [],
    selectedQuota,
    onToggleSeat,
    onQuotaChange,
    onRefreshSeats,
    maxTicketsTotal = 4,
  } = props;
  const [hoveredSeat, setHoveredSeat] = useState<VenueSeat | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"block" | "full">(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      return "full";
    }
    return "block";
  });
  const [activeBlockId, setActiveBlockId] = useState<string>("BLOCK_A");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isCancelled = eventStatus === "CANCELLED";

  // Show temporary toast message
  const triggerToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Total quota count
  const totalQuotaCount = useMemo(() => {
    return Object.values(selectedQuota).reduce((acc, count) => acc + count, 0);
  }, [selectedQuota]);

  const totalSelectedCount = selectedSeatIds.length + totalQuotaCount;
  const remainingAllowance = Math.max(0, maxTicketsTotal - totalSelectedCount);

  // Group standing/quota sections
  const quotaSections: QuotaSectionData[] = useMemo(() => {
    return sections
      .filter((s) => s.booking_type === "STANDING" || s.booking_type === "BOOK_BY_QUOTA")
      .map((s) => ({
        sectionId: s.section_id,
        sectionName: s.section_name,
        categoryName: s.category_name,
        price: s.price,
        capacity: s.capacity,
        sold: s.sold,
        reserved: s.reserved,
        available: s.available,
        bookingType: s.booking_type as "STANDING" | "BOOK_BY_QUOTA",
        disabled: isCancelled,
      }));
  }, [sections, isCancelled]);

  // Periodic polling for seat updates
  useEffect(() => {
    if (!onRefreshSeats || isCancelled) return;

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        onRefreshSeats();
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [onRefreshSeats, isCancelled]);

  // Extract structured Blocks from seats with strict local override for releasedSeatIds
  const seatBlocks: SeatBlockData[] = useMemo(() => {
    if (!seats || seats.length === 0) return [];

    const persistedReleased = loadReleasedFromSession();
    const releasedSet = new Set(
      [...releasedSeatIds, ...persistedReleased]
        .filter((id) => Boolean(id) && id !== "undefined" && id !== "null")
        .map((id) => String(id).trim().toUpperCase().replace(/\s+/g, ""))
    );

    const normalizedSeats: VenueSeat[] = seats.map((s) => {
      const norm = normalizeSeatStatus(s.status);
      // Strict override: ONLY override LOCKED/HELD seats if present in releasedSeatIds;
      // NEVER override SOLD or BLOCKED seats.
      if (norm === "LOCKED" && releasedSet.size > 0) {
        const idUpper = String(s.event_seat_id || "").trim().toUpperCase().replace(/\s+/g, "");
        const labelUpper = String(s.seat_label || "").trim().toUpperCase().replace(/\s+/g, "");
        if (releasedSet.has(idUpper) || releasedSet.has(labelUpper)) {
          return { ...s, status: "AVAILABLE" };
        }
      }
      return { ...s, status: norm };
    });

    // Detect if venue has Atrium Cibadak Block A & B pattern
    const isAtriumCibadak =
      normalizedSeats.some((s) => Number(s.seat_number) > 5) && normalizedSeats.length >= 40;
    const isSawarga = normalizedSeats.length <= 16 && normalizedSeats.length > 0;

    if (isSawarga) {
      // Sawarga Rear Seats (12 seats)
      const rowMap: Record<string, VenueSeat[]> = {};
      normalizedSeats.forEach((s) => {
        const r = s.row_label.replace("REAR-ROW-", "Baris ") || "Baris 1";
        if (!rowMap[r]) rowMap[r] = [];
        rowMap[r].push(s);
      });

      const rows = Object.entries(rowMap).map(([rowLabel, sList]) => ({
        rowLabel,
        seats: [...sList].sort((a, b) => Number(a.seat_number) - Number(b.seat_number)),
      }));

      const availableCount = normalizedSeats.filter(
        (s) =>
          normalizeSeatStatus(s.status) === "AVAILABLE" ||
          selectedSeatIds.includes(s.event_seat_id)
      ).length;

      return [
        {
          blockId: "REAR_SEAT",
          blockName: "Kursi Belakang (Rear Seat)",
          categoryName: "VIP (01–06) & Reguler (07–12)",
          price: normalizedSeats[normalizedSeats.length - 1]?.price ?? normalizedSeats[0]?.price ?? 250000,
          availableCount,
          totalCount: normalizedSeats.length,
          rows,
        },
      ];
    }

    if (isAtriumCibadak) {
      // Split Atrium into Block A (01-05) and Block B (06-10)
      const blockASeats = normalizedSeats.filter(
        (s) => s.block_code === "BLOCK_A" || (s.block_code !== "BLOCK_B" && Number(s.seat_number) <= 5)
      );
      const blockBSeats = normalizedSeats.filter(
        (s) => s.block_code === "BLOCK_B" || (s.block_code !== "BLOCK_A" && Number(s.seat_number) > 5)
      );

      const buildBlockData = (
        id: string,
        name: string,
        cat: string,
        price: number,
        sList: VenueSeat[]
      ): SeatBlockData => {
        const rowMap: Record<string, VenueSeat[]> = {};
        sList.forEach((s) => {
          const r = s.row_label || s.seat_label?.charAt(0) || "A";
          if (!rowMap[r]) rowMap[r] = [];
          rowMap[r].push(s);
        });

        // Ensure rows A to H order
        const rowKeys = Object.keys(rowMap).sort();
        const rows = rowKeys.map((r) => ({
          rowLabel: r,
          seats: [...rowMap[r]].sort((a, b) => Number(a.seat_number) - Number(b.seat_number)),
        }));

        const availableCount = sList.filter(
          (s) =>
            normalizeSeatStatus(s.status) === "AVAILABLE" ||
            selectedSeatIds.includes(s.event_seat_id)
        ).length;

        return {
          blockId: id,
          blockName: name,
          categoryName: cat,
          price,
          availableCount,
          totalCount: sList.length,
          rows,
        };
      };

      const blockA = buildBlockData(
        "BLOCK_A",
        "Block A · Seat 01–05",
        "Premium / VIP",
        blockASeats[0]?.price ?? 350000,
        blockASeats
      );

      const blockB = buildBlockData(
        "BLOCK_B",
        "Block B · Seat 06–10",
        "Reguler",
        blockBSeats[0]?.price ?? 250000,
        blockBSeats
      );

      return [blockA, blockB];
    }

    // Generic fallback for any other seating configuration
    const rowMap: Record<string, VenueSeat[]> = {};
    normalizedSeats.forEach((s) => {
      const r = s.row_label || "A";
      if (!rowMap[r]) rowMap[r] = [];
      rowMap[r].push(s);
    });

    const rows = Object.keys(rowMap)
      .sort()
      .map((r) => ({
        rowLabel: r,
        seats: [...rowMap[r]].sort((a, b) => Number(a.seat_number) - Number(b.seat_number)),
      }));

    return [
      {
        blockId: "BLOCK_ALL",
        blockName: "Area Kursi Penonton",
        categoryName: "Reguler",
        price: normalizedSeats[0]?.price ?? 250000,
        availableCount: normalizedSeats.filter((s) => normalizeSeatStatus(s.status) === "AVAILABLE").length,
        totalCount: normalizedSeats.length,
        rows,
      },
    ];
  }, [seats, selectedSeatIds, releasedSeatIds]);

  // Derive active block id safely without triggering effects
  const resolvedActiveBlockId = useMemo(() => {
    if (seatBlocks.length === 0) return "BLOCK_A";
    if (seatBlocks.some((b) => b.blockId === activeBlockId)) {
      return activeBlockId;
    }
    return seatBlocks[0].blockId;
  }, [seatBlocks, activeBlockId]);

  // Active block object
  const currentBlock = useMemo(() => {
    return seatBlocks.find((b) => b.blockId === resolvedActiveBlockId) || seatBlocks[0];
  }, [seatBlocks, resolvedActiveBlockId]);

  // Handle seat click with 4-ticket cap logic
  const handleSeatClick = useCallback(
    (seat: VenueSeat) => {
      if (isCancelled) return;

      const isAlreadySelected = selectedSeatIds.includes(seat.event_seat_id);
      const normStatus = normalizeSeatStatus(seat.status);

      if (!isAlreadySelected && normStatus !== "AVAILABLE") {
        return;
      }

      if (!isAlreadySelected && totalSelectedCount >= maxTicketsTotal) {
        triggerToast(`Maksimal ${maxTicketsTotal} tiket per transaksi`);
        return;
      }

      onToggleSeat(seat);
    },
    [isCancelled, selectedSeatIds, totalSelectedCount, maxTicketsTotal, triggerToast, onToggleSeat]
  );

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold shadow-xl border border-stone-700 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {toastMessage}
        </div>
      )}

      {/* Cancelled Banner if applicable */}
      {isCancelled && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-center justify-between shadow-2xs"
        >
          <div className="flex items-center gap-2.5 font-medium">
            <span className="text-xl">✕</span>
            <div>
              <strong className="block text-rose-950 font-bold">Acara Ini Telah Dibatalkan</strong>
              <span className="text-xs text-rose-800">
                Pemesanan tiket ditutup. Denah tempat duduk dinonaktifkan.
              </span>
            </div>
          </div>
          <span className="text-xs px-3 py-1 bg-rose-200/80 text-rose-900 rounded-full font-bold">
            CANCELLED
          </span>
        </div>
      )}

      {/* Header Bar + Prototype Info + View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#FAF7F2] border border-[#E8DFC9] p-3 rounded-2xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-extrabold text-stone-900 text-sm">{venueName}</span>
          <span className="text-stone-300">|</span>
          <span className="font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md text-[11px]">
            Konsep prototype
          </span>
          <span className="text-stone-500 text-[11px] hidden sm:inline">
            · Kapasitas contoh · Maks. {maxTicketsTotal} tiket
          </span>
        </div>

        {/* Mode Switcher Pill (Block Focus vs Full Venue) */}
        {seatBlocks.length > 1 && (
          <div className="flex items-center bg-white p-1 rounded-xl border border-stone-200 shadow-2xs shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("block")}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                viewMode === "block"
                  ? "bg-[#D93A2F] text-white shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Fokus Blok
            </button>
            <button
              type="button"
              onClick={() => setViewMode("full")}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                viewMode === "full"
                  ? "bg-[#D93A2F] text-white shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Denah Penuh
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODE 1: FOKUS BLOK (OPTIMIZED MOBILE-FIRST VIEW)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {viewMode === "block" && seatBlocks.length > 0 && currentBlock && (
        <div className="flex flex-col gap-4">
          {/* Mini-Overview Orientation Thumbnails */}
          {seatBlocks.length > 1 && (
            <div className="p-3 bg-stone-50/90 rounded-2xl border border-stone-200/80">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-2 text-center">
                Pilih Blok untuk Dilihat
              </span>

              {/* Mini visual stage orientation */}
              <div className="w-48 h-3 mx-auto rounded-t-md bg-gradient-to-r from-[#D93A2F] via-[#EE6A35] to-[#F4A23B] flex items-center justify-center text-[7px] text-white font-black tracking-widest uppercase mb-1.5 opacity-80 select-none">
                PANGGUNG / STAGE
              </div>

              {/* Block Tab Buttons (Touch Target >= 48px) */}
              <div className="grid grid-cols-2 gap-2">
                {seatBlocks.map((b) => {
                  const isActive = b.blockId === resolvedActiveBlockId;
                  return (
                    <button
                      key={b.blockId}
                      type="button"
                      onClick={() => setActiveBlockId(b.blockId)}
                      className={`min-h-[48px] px-3 py-2 rounded-xl text-left border transition-all ${
                        isActive
                          ? "bg-white border-[#D93A2F] shadow-sm ring-2 ring-[#D93A2F]/20"
                          : "bg-white/70 border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <strong
                          className={`text-xs font-bold ${
                            isActive ? "text-[#D93A2F]" : "text-stone-800"
                          }`}
                        >
                          {b.blockName.split("·")[0].trim()}
                        </strong>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          {b.availableCount} tersisa
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500 block mt-0.5">
                        {b.categoryName} · {formatRupiah(b.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compact Legend */}
          <SeatLegend compact={true} />

          {/* Block Seat Grid Canvas */}
          <div className="bg-white rounded-2xl border border-[#EADFDF] p-4 sm:p-6 shadow-sm relative overflow-hidden">
            {/* Directional Stage Ribbon */}
            <div className="w-full max-w-xs mx-auto py-1 px-4 mb-5 rounded-full bg-gradient-to-r from-[#D93A2F]/90 via-[#EE6A35]/90 to-[#F4A23B]/90 text-white font-extrabold text-[10px] sm:text-xs text-center tracking-wider uppercase shadow-2xs select-none">
              PANGGUNG / STAGE ↑
            </div>

            {/* Block Header Info */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">
                  {currentBlock.blockName}
                </h3>
                <span className="text-xs text-stone-500 font-medium">
                  {currentBlock.categoryName} ·{" "}
                  <strong className="text-[#D93A2F] font-bold">
                    {formatRupiah(currentBlock.price)}
                  </strong>
                </span>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-[#E3F4F1] px-2.5 py-1 rounded-full border border-[#1F8F7E]/20">
                {currentBlock.availableCount} kursi tersedia
              </span>
            </div>

            {/* Structured CSS Grid: Row Label + Seat Buttons */}
            <div className="flex flex-col gap-2.5 items-center justify-center overflow-x-auto py-2">
              {currentBlock.rows.map((row) => (
                <div key={row.rowLabel} className="flex items-center gap-2 sm:gap-2.5">
                  {/* Row Letter Label on the Left (A-H) */}
                  <span className="w-6 text-center font-bold text-xs sm:text-sm text-[#6B5A6E] select-none shrink-0">
                    {row.rowLabel}
                  </span>

                  {/* Seat Grid Row */}
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    {row.seats.map((seat) => (
                      <SeatItem
                        key={seat.event_seat_id}
                        seat={seat}
                        isSelected={selectedSeatIds.includes(seat.event_seat_id)}
                        isCancelled={isCancelled}
                        sizeMode="mobile"
                        onSelect={handleSeatClick}
                        onHover={setHoveredSeat}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Floating Tooltip info on click/hover */}
            {hoveredSeat && (
              <div className="mt-4 p-2.5 bg-stone-900/95 text-white rounded-xl text-xs flex items-center justify-between gap-3 shadow-md backdrop-blur-sm">
                <div>
                  <span className="font-extrabold text-amber-300 mr-2">
                    Kursi {hoveredSeat.seat_label}
                  </span>
                  <span className="text-stone-300 mr-2">
                    {hoveredSeat.category_name ?? "Reguler"}
                  </span>
                  <span className="font-bold text-white">
                    {hoveredSeat.price ? formatRupiah(hoveredSeat.price) : ""}
                  </span>
                </div>
                <span className="text-[11px] text-stone-300 capitalize">
                  {hoveredSeat.status.toLowerCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODE 2: DENAH PENUH (FULL VENUE ARCHITECTURAL VIEW)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {viewMode === "full" && (
        <div className="flex flex-col gap-4">
          {/* Zoom & View Controls */}
          <div className="flex items-center justify-between px-1">
            <SeatLegend compact={true} />

            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-stone-700 hover:bg-stone-100 transition"
                title="Perkecil (-)"
              >
                −
              </button>
              <span className="text-[11px] font-bold text-stone-600 px-1">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-stone-700 hover:bg-stone-100 transition"
                title="Perbesar (+)"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="px-2 h-8 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
                title="Reset Zoom"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Full Venue Container */}
          <div className="w-full rounded-2xl bg-gradient-to-b from-[#FFFDFB] to-[#FDF8F5] border border-[#EADFDF] p-4 sm:p-8 shadow-sm overflow-x-auto">
            <div
              className="min-w-[680px] max-w-4xl mx-auto flex flex-col gap-6 transition-transform duration-200 origin-top"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* 1. Stage Top */}
              <div className="w-full flex items-center justify-center">
                <div className="w-72 sm:w-96 py-3 px-6 rounded-t-xl rounded-b-[36px] bg-gradient-to-r from-[#D93A2F] via-[#EE6A35] to-[#F4A23B] shadow-md border border-white/20 text-white font-black text-sm tracking-widest uppercase text-center select-none">
                  STAGE / PANGGUNG UTAMA
                </div>
              </div>

              {/* 2. Side-by-Side Seating Blocks + Main Aisle */}
              {seatBlocks.length > 0 ? (
                <div className="flex items-start justify-center gap-4 sm:gap-8">
                  {/* Side Aisle Left */}
                  <div className="w-6 self-stretch border-r border-dashed border-stone-200 flex items-center justify-center">
                    <span className="rotate-90 text-[9px] font-semibold text-stone-400 tracking-widest uppercase">
                      AISLE
                    </span>
                  </div>

                  {/* Render Blocks */}
                  {seatBlocks.map((block) => (
                    <div key={block.blockId} className="flex flex-col gap-2 flex-1 max-w-[340px]">
                      {/* Block Title Chip (Above the frame) */}
                      <div className="flex items-center justify-between px-2 text-xs">
                        <span className="font-extrabold text-stone-900">{block.blockName}</span>
                        <span className="text-[11px] font-semibold text-emerald-800 bg-[#E3F4F1] px-2 py-0.5 rounded-md">
                          {block.availableCount} kursi
                        </span>
                      </div>

                      {/* Block Frame */}
                      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-col gap-2 items-center">
                        {block.rows.map((row) => (
                          <div key={row.rowLabel} className="flex items-center gap-2">
                            <span className="w-5 text-center font-bold text-xs text-[#6B5A6E] select-none shrink-0">
                              {row.rowLabel}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {row.seats.map((seat) => (
                                <SeatItem
                                  key={seat.event_seat_id}
                                  seat={seat}
                                  isSelected={selectedSeatIds.includes(seat.event_seat_id)}
                                  isCancelled={isCancelled}
                                  sizeMode="desktop"
                                  onSelect={handleSeatClick}
                                  onHover={setHoveredSeat}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Side Aisle Right */}
                  <div className="w-6 self-stretch border-l border-dashed border-stone-200 flex items-center justify-center">
                    <span className="rotate-90 text-[9px] font-semibold text-stone-400 tracking-widest uppercase">
                      AISLE
                    </span>
                  </div>
                </div>
              ) : (
                /* Pure Standing/Quota venue placeholder */
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500 text-sm">
                  Venue ini menggunakan format festival (Standing & Quota). Pilih area di bawah.
                </div>
              )}

              {/* 3. Rear Lane / Emergency Access */}
              <div className="w-full py-1.5 px-4 rounded-lg bg-stone-100/70 border border-dashed border-stone-300 text-center text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                Rear Circulation & Emergency Access Lane
              </div>

              {/* 4. Facilities Neutral Cards (Clean SVG Icons, No Black Boxes, No Emojis) */}
              <div className="grid grid-cols-4 gap-3 text-xs">
                {/* A11Y Accessible */}
                <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#F4F8FA] border border-[#D0E2EB] text-[#1D5C7A] font-bold shadow-2xs">
                  <svg
                    className="w-4 h-4 shrink-0 text-sky-700"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="4" r="2" />
                    <path d="m18 19 1-7-6 1" />
                    <path d="m5 8 3-3 5.5 3-2.36 3.5" />
                    <path d="M4.24 14.5a5 5 0 0 0 6.88 6" />
                    <path d="M13.73 21a5 5 0 0 0-1.73-9" />
                  </svg>
                  <span>A11Y Viewing</span>
                </div>

                {/* FOH (Front of House) */}
                <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#F7F4F2] border border-[#E5DFDC] text-[#5A4D5C] font-bold shadow-2xs">
                  <svg
                    className="w-4 h-4 shrink-0 text-stone-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 14h6" />
                    <path d="M4 10h16" />
                    <path d="M14 6h6" />
                    <path d="M4 18h16" />
                    <circle cx="8" cy="14" r="2" />
                    <circle cx="16" cy="10" r="2" />
                    <circle cx="10" cy="6" r="2" />
                  </svg>
                  <span>FOH Console</span>
                </div>

                {/* Check-in Gate */}
                <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#FDF9F0] border border-[#EFE2C8] text-[#7A5B15] font-bold shadow-2xs">
                  <svg
                    className="w-4 h-4 shrink-0 text-amber-700"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                    <path d="M13 5v2" />
                    <path d="M13 17v2" />
                    <path d="M13 11v2" />
                  </svg>
                  <span>Check-in Gate</span>
                </div>

                {/* Exit Gate */}
                <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#FCF2F2] border border-[#F2D0D0] text-[#8A2626] font-bold shadow-2xs">
                  <svg
                    className="w-4 h-4 shrink-0 text-rose-700"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                  <span>Exit Gate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          STANDING & BOOK_BY_QUOTA SECTION CARDS (Downtown Walk & Sawarga)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {quotaSections.length > 0 && (
        <div className="flex flex-col gap-3 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider">
              Pilihan Area Non-Seat / Standing & Kuota
            </h3>
            <span className="text-xs text-stone-500">
              Sisa kuota pemilihan: <strong>{remainingAllowance} tiket</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quotaSections.map((qs) => (
              <QuotaCard
                key={qs.sectionId}
                section={qs}
                selectedCount={selectedQuota[qs.sectionId] || 0}
                maxSelectable={(selectedQuota[qs.sectionId] || 0) + remainingAllowance}
                onCountChange={onQuotaChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
