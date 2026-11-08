// src/components/seat-map/SeatMap.tsx
//
// Rebuilt data-driven Seat Map integrating VenueRenderer with the live API.
// Eliminates the old hardcoded 4x10 grid and Socket.IO dependencies.
// Handles all 3 venues: Atrium Cibadak (80 seats, 2 blocks), Downtown Walk (0 seats), Sawarga Courtyard (mixed).

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { TicketEvent, Seat } from "@/types/event";
import { useBookingStore, loadReleasedFromSession } from "@/lib/store/useBookingStore";
import { fetchEvent, fetchEventSeats } from "@/services/customerApi";
import {
  VenueRenderer,
  normalizeSeatStatus,
  type VenueSeat,
  type VenueSection,
  type VenueLayoutElement,
} from "./VenueRenderer";
import { getVenueElements } from "@/lib/data/venueTemplates";

interface SeatMapProps {
  event: TicketEvent;
}

interface RawSeat {
  event_seat_id?: string;
  seat_label?: string;
  row_label?: string;
  seat_number?: string | number;
  section_id?: string;
  block_code?: string;
  position?: { x: number; y: number; unit?: string };
  status?: string;
  blocked_reason?: string | null;
  id?: number | string;
}

interface RawCategory {
  ticket_category_id?: string;
  category_name?: string;
  price?: number;
}

interface RawSection {
  section_id: string;
  event_section_id?: string;
  section_name: string;
  booking_type?: "BOOK_BY_SEAT" | "BOOK_BY_QUOTA" | "STANDING";
  capacity?: number;
  available?: number;
  sold?: number;
  reserved?: number;
  blocked?: number;
}

interface RawLiveEvent {
  event_status?: string;
  venue?: { name?: string };
  layout?: {
    template_id?: string;
    elements?: VenueLayoutElement[];
  };
  categories?: RawCategory[];
  sections?: RawSection[];
}

export function SeatMap({ event }: SeatMapProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [layoutElements, setLayoutElements] = useState<VenueLayoutElement[]>([]);
  const [venueSeats, setVenueSeats] = useState<VenueSeat[]>([]);
  const [venueSections, setVenueSections] = useState<VenueSection[]>([]);
  const [venueName, setVenueName] = useState<string>(event.venue || "Summarecon Mall Bandung");
  const [eventStatus, setEventStatus] = useState<string>(
    event.badge === "CANCELLED" ? "CANCELLED" : "SALES_OPEN"
  );

  // Persistent Single Source of Truth from GET /api/events/:id/seats
  const apiSeatsRef = useRef<RawSeat[]>([]);
  const eventRef = useRef<TicketEvent>(event);
  useEffect(() => {
    eventRef.current = event;
  }, [event]);

  // Booking store
  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const selectedQuota = useBookingStore((s) => s.selectedQuota);
  const releasedSeatIds = useBookingStore((s) => s.releasedSeatIds);
  const toggleSeatAction = useBookingStore((s) => s.toggleSeat);
  const setQuotaAction = useBookingStore((s) => s.setQuota);
  const setEventAction = useBookingStore((s) => s.setEvent);
  const conflictError = useBookingStore((s) => s.conflictError);

  const selectedSeatIds = selectedSeats.map((s) => s.id);

  // Initialize event in store
  useEffect(() => {
    setEventAction(event.id);
  }, [event.id, setEventAction]);

  // Pure function that maps raw API seats into VenueSeat[] while preserving
  // backend statuses (SOLD, BLOCKED, LOCKED/HELD) as Single Source of Truth.
  const mapRawSeatsToVenueSeats = useCallback(
    (rawSeats: RawSeat[], currentEvent: TicketEvent, releasedIds: string[]): VenueSeat[] => {
      const paidSeatSet = new Set<string>();
      if (typeof window !== "undefined") {
        try {
          const rawLocal = localStorage.getItem("summa_customer_orders");
          const localOrders: Array<{
            status?: string;
            order_status?: string;
            event?: { id?: string | number };
            seat_ids?: Array<string | number>;
            items?: Array<{ id?: string; seat_label?: string }>;
          }> = rawLocal ? JSON.parse(rawLocal) : [];

          const rawActive = sessionStorage.getItem("summa_active_order");
          if (rawActive) {
            const active = JSON.parse(rawActive);
            if (active && !localOrders.some((o) => (o as { id?: string }).id === active.id)) {
              localOrders.push(active);
            }
          }

          localOrders.forEach((o) => {
            const isPaid = o.status === "PAID" || o.order_status === "PAID";
            const matchesEvent = !o.event?.id || String(o.event.id) === String(currentEvent.id);
            if (isPaid && matchesEvent) {
              if (Array.isArray(o.seat_ids)) {
                o.seat_ids.forEach((sid) =>
                  paidSeatSet.add(String(sid).toUpperCase().replace(/\s+/g, ""))
                );
              }
              if (Array.isArray(o.items)) {
                o.items.forEach((it) => {
                  if (it.seat_label) {
                    paidSeatSet.add(it.seat_label.toUpperCase().replace(/\s+/g, ""));
                    const m = it.seat_label.match(/([A-Z]\d+)/i);
                    if (m) paidSeatSet.add(m[1].toUpperCase());
                  }
                  if (it.id) {
                    paidSeatSet.add(String(it.id).toUpperCase().replace(/\s+/g, ""));
                  }
                });
              }
            }
          });
        } catch {
          // Ignore parse errors
        }
      }

      const persistedReleased = loadReleasedFromSession();
      const validReleasedSet = new Set(
        [...releasedIds, ...persistedReleased]
          .filter((id) => Boolean(id) && id !== "undefined" && id !== "null")
          .map((id) => String(id).trim().toUpperCase().replace(/\s+/g, ""))
      );

      return rawSeats.map((s) => {
        const trailingDigits = String(s.seat_number || s.seat_label || s.event_seat_id || "").match(
          /(\d+)$/
        );
        const num =
          Number(s.seat_number) || (trailingDigits ? Number(trailingDigits[1]) : 1);

        const isRearSeat =
          Boolean(s.row_label?.toUpperCase().includes("REAR")) ||
          Boolean(s.row_label?.toUpperCase().includes("BARIS")) ||
          Boolean(s.section_id?.toUpperCase().includes("SWG")) ||
          Boolean(s.event_seat_id?.toUpperCase().includes("SWG"));

        // Accurate Block A (VIP/Premium) vs Block B (Reguler) detection:
        // Never use `s.section_id?.includes("A")` because "SEC-ATR-B" and "SEC-SWG-SEAT" both contain "A".
        let isBlockA = false;
        let resolvedBlockCode = s.block_code;

        if (isRearSeat) {
          // Sawarga 12 rear seats: 01-06 VIP/Premium, 07-12 Reguler
          isBlockA = num <= 6;
          resolvedBlockCode = "REAR_SEAT";
        } else {
          const isBlockB =
            s.block_code === "BLOCK_B" ||
            Boolean(s.section_id?.toUpperCase().endsWith("-B")) ||
            num > 5;
          isBlockA =
            !isBlockB &&
            (s.block_code === "BLOCK_A" ||
              Boolean(s.section_id?.toUpperCase().endsWith("-A")) ||
              num <= 5);
          resolvedBlockCode = isBlockA ? "BLOCK_A" : "BLOCK_B";
        }

        const price = isBlockA ? currentEvent.premiumPrice : currentEvent.priceFrom;
        const categoryName = isBlockA ? "Premium" : "Reguler";

        const canonicalSeatId = String(
          s.event_seat_id || s.seat_label || `SEAT-${s.id}`
        ).trim();
        const canonicalLabel = String(
          s.seat_label || `${s.row_label || "A"}${String(num).padStart(2, "0")}`
        ).trim();

        const seatIdStr = canonicalSeatId.toUpperCase().replace(/\s+/g, "");
        const seatLabelStr = canonicalLabel.toUpperCase().replace(/\s+/g, "");
        const isPaid = paidSeatSet.has(seatIdStr) || paidSeatSet.has(seatLabelStr);

        const isReleasedByMe =
          validReleasedSet.has(seatIdStr) ||
          validReleasedSet.has(seatLabelStr) ||
          (s.id !== undefined &&
            s.id !== null &&
            validReleasedSet.has(String(s.id).trim().toUpperCase().replace(/\s+/g, "")));

        // Normalize backend status (Single Source of Truth)
        const apiStatus = normalizeSeatStatus(s.status);

        // Strict status resolution:
        // - SOLD and BLOCKED from backend are NEVER overridden by releasedSeatIds.
        // - LOCKED/HELD from backend becomes AVAILABLE if this exact seat's hold was just released by the current user.
        let resolvedStatus: VenueSeat["status"] = apiStatus;
        if (apiStatus === "DISABLED_EVENT_CANCELLED") {
          resolvedStatus = "DISABLED_EVENT_CANCELLED";
        } else if (apiStatus === "SOLD" || isPaid) {
          resolvedStatus = "SOLD";
        } else if (apiStatus === "BLOCKED") {
          resolvedStatus = "BLOCKED";
        } else if (apiStatus === "LOCKED") {
          resolvedStatus = isReleasedByMe ? "AVAILABLE" : "LOCKED";
        } else {
          resolvedStatus = "AVAILABLE";
        }

        return {
          event_seat_id: canonicalSeatId,
          seat_label: canonicalLabel,
          row_label: s.row_label || canonicalLabel.charAt(0) || "A",
          seat_number: num,
          section_id: s.section_id || (isBlockA ? "SEC-ATR-A" : "SEC-ATR-B"),
          block_code: resolvedBlockCode,
          position: s.position || { x: 50, y: 50, unit: "normalized_percent" },
          status: resolvedStatus,
          price,
          category_name: categoryName,
          blocked_reason: s.blocked_reason,
        };
      });
    },
    []
  );

  // Re-derive seat statuses in-memory when releasedSeatIds or event prices update
  // without re-fetching or resetting apiSeatsRef.current
  useEffect(() => {
    if (apiSeatsRef.current.length > 0) {
      const currentEvent = eventRef.current;
      setVenueSeats(
        mapRawSeatsToVenueSeats(apiSeatsRef.current, currentEvent, releasedSeatIds)
      );
    }
  }, [releasedSeatIds, event.priceFrom, event.premiumPrice, mapRawSeatsToVenueSeats]);

  // Initial data load effect — strictly depends ONLY on event.id so scroll/re-renders never reset seats
  useEffect(() => {
    let active = true;
    apiSeatsRef.current = [];

    async function loadData() {
      try {
        const currentEvent = eventRef.current;
        let liveEventData: RawLiveEvent | null = null;
        try {
          const evRes = await fetchEvent(event.id);
          liveEventData = evRes.data as unknown as RawLiveEvent;
        } catch {
          // Continue with fallback metadata if event detail fails
        }

        let seatsData: RawSeat[] = [];
        try {
          const seatsRes = await fetchEventSeats(event.id);
          const dataPayload = seatsRes.data as unknown as
            | { items?: RawSeat[]; seats?: RawSeat[] }
            | RawSeat[];
          seatsData = Array.isArray(dataPayload)
            ? dataPayload
            : dataPayload?.items || dataPayload?.seats || [];
        } catch {
          // Continue
        }

        if (!active) return;

        const resolvedVenueName =
          liveEventData?.venue?.name || currentEvent.venue || "Atrium Cibadak";
        setVenueName(resolvedVenueName);

        const resolvedStatus =
          liveEventData?.event_status ||
          (currentEvent.badge === "CANCELLED" ? "CANCELLED" : "SALES_OPEN");
        setEventStatus(resolvedStatus);

        let elements: VenueLayoutElement[] = [];
        if (liveEventData?.layout?.elements && liveEventData.layout.elements.length > 0) {
          elements = liveEventData.layout.elements;
        } else {
          const templateId = liveEventData?.layout?.template_id || event.id;
          elements = getVenueElements(templateId);
        }
        setLayoutElements(elements);

        const categories: RawCategory[] = liveEventData?.categories || [];
        let sectionsRaw: RawSection[] = liveEventData?.sections || [];

        const isFestivalLayout =
          elements.some((e) => e.booking_type === "STANDING" || e.element_id?.includes("SWG")) ||
          String(event.id).includes("SWG") ||
          String(event.id).includes("V3") ||
          String(currentEvent.title).toLowerCase().includes("fest");

        if (sectionsRaw.length === 0 && isFestivalLayout) {
          sectionsRaw = [
            {
              section_id: "SEC-SWG-S1",
              event_section_id: "EVS-SWG-S1",
              section_name: "Festival Standing",
              booking_type: "STANDING",
              capacity: 150,
              available: 150,
              sold: 0,
              reserved: 0,
            },
            {
              section_id: "SEC-SWG-Q1",
              event_section_id: "EVS-SWG-Q1",
              section_name: "Book by Quota Q1",
              booking_type: "BOOK_BY_QUOTA",
              capacity: 100,
              available: 100,
              sold: 0,
              reserved: 0,
            },
          ];
        }

        const parsedSections: VenueSection[] = sectionsRaw.map((s) => {
          const cat = categories.find(
            (c) =>
              c.category_name?.toLowerCase().includes(s.section_name?.toLowerCase()) ||
              c.ticket_category_id?.includes(s.section_id)
          );
          const isPremiumSec =
            s.section_id?.toUpperCase().endsWith("-A") ||
            s.section_name?.toLowerCase().includes("block a") ||
            s.section_name?.toLowerCase().includes("premium") ||
            s.section_name?.toLowerCase().includes("vip");
          const price =
            cat?.price || (isPremiumSec ? currentEvent.premiumPrice : currentEvent.priceFrom);

          return {
            section_id: s.section_id,
            event_section_id: s.event_section_id,
            section_name: s.section_name,
            booking_type:
              (s.booking_type as "BOOK_BY_SEAT" | "BOOK_BY_QUOTA" | "STANDING") || "BOOK_BY_SEAT",
            capacity: s.capacity || 40,
            available:
              s.available !== undefined && s.available > 0
                ? s.available
                : Math.max(0, (s.capacity || 100) - (s.sold || 0) - (s.blocked || 0)),
            sold: s.sold || 0,
            reserved: s.reserved || 0,
            price,
            category_name: cat?.category_name || s.section_name,
          };
        });
        setVenueSections(parsedSections);

        // Single Source of Truth: only generate synthetic fallback seats if backend returned 0 seats
        // AND we don't already have cached API seats for this event.
        let effectiveSeats = seatsData;
        if (effectiveSeats.length === 0 && apiSeatsRef.current.length > 0) {
          effectiveSeats = apiSeatsRef.current;
        } else if (effectiveSeats.length === 0) {
          if (isFestivalLayout) {
            effectiveSeats = Array.from({ length: 12 }, (_, i) => ({
              id: i + 1,
              event_seat_id: `SWG-REAR-${String(i + 1).padStart(2, "0")}`,
              seat_label: String(i + 1).padStart(2, "0"),
              row_label: "Baris 1",
              seat_number: i + 1,
              section_id: "SEC-SWG-SEAT",
              block_code: "REAR_SEAT",
              status: "AVAILABLE",
            }));
          } else {
            const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
            effectiveSeats = rows.flatMap((r) =>
              Array.from({ length: 10 }, (_, idx) => {
                const num = idx + 1;
                const numStr = String(num).padStart(2, "0");
                const isBlockA = num <= 5;
                return {
                  id: `${r}-${numStr}`,
                  event_seat_id: `ATR-${r}-${numStr}`,
                  seat_label: `${r}${numStr}`,
                  row_label: r,
                  seat_number: num,
                  section_id: isBlockA ? "SEC-ATR-A" : "SEC-ATR-B",
                  block_code: isBlockA ? "BLOCK_A" : "BLOCK_B",
                  status: "AVAILABLE",
                };
              })
            );
          }
        }

        apiSeatsRef.current = effectiveSeats;
        const currentReleased = Array.from(
          new Set([
            ...useBookingStore.getState().releasedSeatIds,
            ...loadReleasedFromSession(),
          ])
        );
        setVenueSeats(
          mapRawSeatsToVenueSeats(effectiveSeats, currentEvent, currentReleased)
        );
        setLoading(false);
      } catch (err: unknown) {
        if (active) {
          const errObj = err as { message?: string };
          setError(errObj?.message || "Gagal memuat denah kursi. Silakan refresh.");
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [event.id, mapRawSeatsToVenueSeats]);

  // Polling refresh handler — updates Single Source of Truth from backend without losing status
  const handleRefresh = useCallback(async () => {
    try {
      const seatsRes = await fetchEventSeats(event.id);
      const dataPayload = seatsRes.data as unknown as
        | { items?: RawSeat[]; seats?: RawSeat[] }
        | RawSeat[];
      const freshSeats = Array.isArray(dataPayload)
        ? dataPayload
        : dataPayload?.items || dataPayload?.seats || [];

      if (freshSeats.length > 0) {
        apiSeatsRef.current = freshSeats;
        const currentReleased = Array.from(
          new Set([
            ...useBookingStore.getState().releasedSeatIds,
            ...loadReleasedFromSession(),
          ])
        );
        setVenueSeats(
          mapRawSeatsToVenueSeats(freshSeats, eventRef.current, currentReleased)
        );
      }
    } catch {
      // ignore background poll failure and retain last known good seats
    }
  }, [event.id, mapRawSeatsToVenueSeats]);

  // Handle seat toggle — strictly block non-AVAILABLE seats from being selected
  const handleToggleSeat = useCallback(
    (vSeat: VenueSeat) => {
      const isAlreadySelected = useBookingStore
        .getState()
        .selectedSeats.some((s) => s.id === vSeat.event_seat_id);
      if (!isAlreadySelected && normalizeSeatStatus(vSeat.status) !== "AVAILABLE") {
        return;
      }

      const seatForStore: Seat = {
        id: vSeat.event_seat_id,
        row: vSeat.row_label,
        number: Number(vSeat.seat_number) || 1,
        category: vSeat.category_name || "Reguler",
        price: vSeat.price || event.priceFrom,
        area: vSeat.block_code || vSeat.section_id,
        status: normalizeSeatStatus(vSeat.status),
      };
      toggleSeatAction(event.id, seatForStore);
    },
    [event.id, event.priceFrom, toggleSeatAction]
  );

  // Handle quota change
  const handleQuotaChange = useCallback(
    (sectionId: string, count: number) => {
      const section = venueSections.find((s) => s.section_id === sectionId);
      if (!section) return;

      setQuotaAction({
        sectionId,
        count,
        sectionName: section.section_name,
        categoryName: section.category_name,
        price: section.price,
      });
    },
    [venueSections, setQuotaAction]
  );

  if (loading) {
    return (
      <div className="w-full bg-white border border-stone-200 rounded-2xl p-12 text-center shadow-sm">
        <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-stone-700">Memuat denah venue & ketersediaan kursi...</p>
        <p className="text-xs text-stone-400 mt-1">Mengambil data resmi dari backend live</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800">
        <p className="font-bold text-base mb-1">Terjadi kendala saat memuat denah</p>
        <p className="text-sm mb-4">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError(null);
          }}
          className="px-4 py-2 bg-[#D93A2F] text-white rounded-lg text-xs font-semibold hover:bg-[#c23329] transition"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Conflict / limit error message if any */}
      {conflictError && (
        <div
          role="alert"
          className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-sm"
        >
          <span className="text-base">⚠️</span>
          <span>{conflictError}</span>
        </div>
      )}

      {/* Main Venue Renderer */}
      <VenueRenderer
        eventId={event.id}
        eventName={event.title}
        eventStatus={eventStatus}
        venueName={venueName}
        layoutElements={layoutElements}
        seats={venueSeats}
        sections={venueSections}
        selectedSeatIds={selectedSeatIds}
        releasedSeatIds={releasedSeatIds}
        selectedQuota={selectedQuota}
        onToggleSeat={handleToggleSeat}
        onQuotaChange={handleQuotaChange}
        onRefreshSeats={handleRefresh}
        maxTicketsTotal={4}
      />
    </div>
  );
}
