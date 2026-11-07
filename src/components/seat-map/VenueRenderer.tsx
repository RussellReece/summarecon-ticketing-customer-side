// src/components/seat-map/VenueRenderer.tsx
//
// Dynamic, data-driven Venue & Seat Map Renderer for Summarecon Ticketing.
// Supports 3 venues: Atrium Cibadak (80 seats, 2 blocks), Downtown Walk (0 seats, standing/quota),
// and Sawarga Courtyard (mixed standing, rear seats, quota; handles Option A/B).

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { SeatLegend } from "./SeatLegend";
import { QuotaCard, type QuotaSectionData } from "./QuotaCard";
import { formatRupiah } from "@/lib/utils";

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
  selectedQuota: Record<string, number>;
  onToggleSeat: (seat: VenueSeat) => void;
  onQuotaChange: (sectionId: string, count: number) => void;
  onRefreshSeats?: () => Promise<void>;
  maxTicketsTotal?: number;
}

export function VenueRenderer({
  eventStatus,
  venueName,
  layoutElements,
  seats,
  sections,
  selectedSeatIds,
  selectedQuota,
  onToggleSeat,
  onQuotaChange,
  onRefreshSeats,
  maxTicketsTotal = 4,
}: VenueRendererProps) {
  const [hoveredSeat, setHoveredSeat] = useState<VenueSeat | null>(null);

  const isCancelled = eventStatus === "CANCELLED";

  // Calculate total tickets selected across seats and quota
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

  // Periodic polling for seat updates (paused when tab hidden)
  useEffect(() => {
    if (!onRefreshSeats || isCancelled) return;

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        onRefreshSeats();
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [onRefreshSeats, isCancelled]);

  // Handle seat click
  const handleSeatClick = useCallback(
    (seat: VenueSeat) => {
      if (isCancelled) return;
      if (seat.status !== "AVAILABLE" && !selectedSeatIds.includes(seat.event_seat_id)) {
        return;
      }
      onToggleSeat(seat);
    },
    [isCancelled, selectedSeatIds, onToggleSeat]
  );

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Banner Cancelled if applicable */}
      {isCancelled && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-2 font-medium">
            <span className="text-lg">⚠️</span>
            <span>
              <strong>Event Dibatalkan:</strong> Pemesanan tiket untuk acara ini telah dinonaktifkan.
            </span>
          </div>
          <span className="text-xs px-2.5 py-1 bg-rose-200/60 rounded-full font-semibold">
            CANCELLED
          </span>
        </div>
      )}

      {/* Header Denah + Disclaimers */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600 bg-amber-50/70 border border-amber-200/80 px-4 py-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-900">{venueName}</span>
          <span className="text-stone-400">·</span>
          <span className="font-medium text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
            Konsep prototype
          </span>
        </div>
        <span className="text-stone-500 italic">
          Kapasitas contoh (prototype) · Maks. {maxTicketsTotal} tiket per transaksi
        </span>
      </div>

      {/* Interactive Venue Canvas Container */}
      <div
        className={`relative w-full rounded-2xl bg-gradient-to-b from-[#FFFBF8] to-[#FFF5EF] border border-[#E8DCCF] shadow-sm overflow-hidden p-2 sm:p-4 ${
          isCancelled ? "opacity-60 pointer-events-none border-dashed border-stone-400" : ""
        }`}
      >
        {/* Aspect Ratio Box (16:11 ratio: padding-top ~ 68.75%) */}
        <div className="relative w-full pb-[70%] sm:pb-[66%] select-none">
          {/* 1. NON-TICKETABLE ELEMENTS (Stage, Backstage, Aisles, FOH, Gates) */}
          {layoutElements
            .filter((el) => !el.ticketable)
            .map((el) => {
              const { x, y, width = 10, height = 8 } = el.position;

              if (el.element_type === "STAGE") {
                return (
                  <div
                    key={el.element_id}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      background: "linear-gradient(135deg, #D93A2F 0%, #EE6A35 50%, #F4A23B 100%)",
                    }}
                    className="absolute flex items-center justify-center rounded-xl shadow-md text-white font-black tracking-widest text-xs sm:text-sm uppercase text-center border border-white/20 z-10 pointer-events-none"
                  >
                    <span>{el.name}</span>
                  </div>
                );
              }

              if (el.element_type === "BACKSTAGE") {
                return (
                  <div
                    key={el.element_id}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    className="absolute flex items-center justify-center rounded-lg bg-stone-200/90 border border-stone-300 text-stone-600 text-[10px] sm:text-xs font-semibold text-center z-10 pointer-events-none"
                  >
                    <span>{el.name}</span>
                  </div>
                );
              }

              if (el.element_type === "AISLE") {
                return (
                  <div
                    key={el.element_id}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    className="absolute flex items-center justify-center bg-stone-100/60 border border-dashed border-stone-300/60 rounded text-[9px] text-stone-400 font-medium z-5 pointer-events-none"
                  >
                    <span className="rotate-90 sm:rotate-0">{el.name}</span>
                  </div>
                );
              }

              if (el.element_type === "FRONT_OF_HOUSE") {
                return (
                  <div
                    key={el.element_id}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    className="absolute flex items-center justify-center rounded-lg bg-stone-800 text-stone-100 text-[10px] sm:text-xs font-bold shadow z-10 pointer-events-none"
                  >
                    <span>{el.name}</span>
                  </div>
                );
              }

              if (el.element_type === "ACCESSIBLE_VIEWING") {
                return (
                  <div
                    key={el.element_id}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    className="absolute flex items-center justify-center rounded-lg bg-sky-100 border border-sky-300 text-sky-800 text-[10px] sm:text-xs font-bold text-center z-10 pointer-events-none"
                  >
                    <span>♿ {el.name}</span>
                  </div>
                );
              }

              if (el.element_type === "CHECK_IN" || el.element_type === "ENTRY" || el.element_type === "EXIT") {
                return (
                  <div
                    key={el.element_id}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    className="absolute flex items-center justify-center rounded-lg bg-amber-100/80 border border-amber-300 text-amber-900 text-[10px] sm:text-xs font-bold text-center z-10 pointer-events-none"
                  >
                    <span>{el.name}</span>
                  </div>
                );
              }

              if (el.element_type === "EMERGENCY_ACCESS") {
                return (
                  <div
                    key={el.element_id}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    className="absolute flex items-center justify-center rounded border border-dashed border-stone-300 bg-stone-50/50 text-[9px] text-stone-400 font-medium z-5 pointer-events-none"
                  >
                    <span>{el.name}</span>
                  </div>
                );
              }

              // Default non-ticketable
              return (
                <div
                  key={el.element_id}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                  }}
                  className="absolute flex items-center justify-center rounded bg-stone-100/70 border border-stone-200 text-stone-500 text-[9px] text-center z-5 pointer-events-none"
                >
                  <span>{el.name}</span>
                </div>
              );
            })}

          {/* 2. TICKET SECTION BACKGROUND BOUNDARIES */}
          {layoutElements
            .filter((el) => el.ticketable)
            .map((el) => {
              const { x, y, width = 20, height = 20 } = el.position;
              return (
                <div
                  key={`boundary-${el.element_id}`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                  }}
                  className="absolute rounded-xl border border-dashed border-stone-300/80 bg-white/40 pointer-events-none z-1 flex flex-col justify-between p-1.5"
                >
                  <span className="text-[10px] font-bold text-stone-400 tracking-wide">
                    {el.name}
                  </span>
                </div>
              );
            })}

          {/* 3. NUMBERED SEATS (BOOK_BY_SEAT) */}
          {seats.map((seat) => {
            const isSelected = selectedSeatIds.includes(seat.event_seat_id);
            const isSold = seat.status === "SOLD";
            const isLocked = seat.status === "LOCKED";
            const isBlocked = seat.status === "BLOCKED";
            const isAvailable = seat.status === "AVAILABLE" && !isSelected;

            let seatClass =
              "w-6 h-6 sm:w-7 sm:h-7 rounded-md font-bold text-[10px] sm:text-[11px] flex items-center justify-center transition-all duration-150 shadow-sm cursor-pointer ";
            let symbol = seat.seat_number;
            let titleText = `Kursi ${seat.seat_label} (${seat.category_name ?? "Reguler"} - ${
              seat.price ? formatRupiah(seat.price) : ""
            })`;

            if (isSelected) {
              seatClass +=
                "bg-[#D93A2F] text-white ring-2 ring-white scale-110 shadow-md font-black z-30";
              symbol = "✓";
              titleText += " - Pilihanmu";
            } else if (isSold) {
              seatClass += "bg-[#6B5A6E] text-white opacity-85 cursor-not-allowed z-10";
              symbol = "✕";
              titleText += " - Sudah Terisi";
            } else if (isLocked) {
              seatClass += "bg-[#E9A12B] text-white opacity-90 cursor-not-allowed z-10";
              symbol = "⋯";
              titleText += " - Sedang Ditahan (10 menit)";
            } else if (isBlocked) {
              seatClass +=
                "bg-stone-300 text-stone-600 cursor-not-allowed opacity-80 z-10";
              symbol = "⊘";
              titleText += ` - Terblokir: ${seat.blocked_reason ?? "Teknis"}`;
            } else {
              // AVAILABLE
              seatClass +=
                "bg-[#1F8F7E] text-white hover:bg-[#187567] hover:scale-105 active:scale-95 z-20";
              titleText += " - Tersedia";
            }

            return (
              <button
                key={seat.event_seat_id}
                type="button"
                style={{
                  position: "absolute",
                  left: `${seat.position.x}%`,
                  top: `${seat.position.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                disabled={isCancelled || (!isSelected && !isAvailable)}
                onClick={() => handleSeatClick(seat)}
                onMouseEnter={() => setHoveredSeat(seat)}
                onMouseLeave={() => setHoveredSeat(null)}
                className={seatClass}
                title={titleText}
                aria-label={`Kursi ${seat.seat_label}, ${seat.category_name ?? ""}, Status: ${
                  isSelected ? "Pilihanmu" : seat.status
                }`}
                aria-pressed={isSelected}
              >
                {symbol}
              </button>
            );
          })}
        </div>

        {/* Floating Tooltip info for hovered seat */}
        {hoveredSeat && (
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-stone-900/90 text-white px-3 py-1.5 rounded-lg text-xs shadow-lg flex items-center gap-3 z-40 backdrop-blur-sm">
            <span className="font-bold text-amber-300">{hoveredSeat.seat_label}</span>
            <span className="text-stone-300">{hoveredSeat.category_name ?? "Reguler"}</span>
            <span className="font-semibold text-white">
              {hoveredSeat.price ? formatRupiah(hoveredSeat.price) : ""}
            </span>
            <span className="text-[11px] text-stone-400 capitalize">
              Status: {hoveredSeat.status.toLowerCase()}
            </span>
          </div>
        )}
      </div>

      {/* Seat Map Legend */}
      <SeatLegend />

      {/* 4. STANDING & BOOK_BY_QUOTA SECTION CARDS */}
      {quotaSections.length > 0 && (
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider">
              Pilihan Tiket Area Non-Seat / Standing
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
                maxSelectable={
                  (selectedQuota[qs.sectionId] || 0) + remainingAllowance
                }
                onCountChange={onQuotaChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
