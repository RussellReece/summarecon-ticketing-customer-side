// src/components/seat-map/SeatMap.tsx
//
// Rebuilt data-driven Seat Map integrating VenueRenderer with the live API.
// Eliminates the old hardcoded 4x10 grid and Socket.IO dependencies.
// Handles all 3 venues: Atrium Cibadak (80 seats, 2 blocks), Downtown Walk (0 seats), Sawarga Courtyard (mixed).

"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { TicketEvent, Seat } from "@/types/event";
import { useBookingStore } from "@/lib/store/useBookingStore";
import { fetchEvent, fetchEventSeats } from "@/services/customerApi";
import {
  VenueRenderer,
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

  // Booking store
  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const selectedQuota = useBookingStore((s) => s.selectedQuota);
  const toggleSeatAction = useBookingStore((s) => s.toggleSeat);
  const setQuotaAction = useBookingStore((s) => s.setQuota);
  const setEventAction = useBookingStore((s) => s.setEvent);
  const conflictError = useBookingStore((s) => s.conflictError);

  const selectedSeatIds = selectedSeats.map((s) => s.id);

  // Initialize event in store
  useEffect(() => {
    setEventAction(event.id);
  }, [event.id, setEventAction]);

  const processApiData = useCallback(
    (liveEventData: RawLiveEvent | null, seatsData: RawSeat[]) => {
      const resolvedVenueName = liveEventData?.venue?.name || event.venue || "Atrium Cibadak";
      setVenueName(resolvedVenueName);

      const resolvedStatus =
        liveEventData?.event_status || (event.badge === "CANCELLED" ? "CANCELLED" : "SALES_OPEN");
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
      const sectionsRaw: RawSection[] = liveEventData?.sections || [];

      const parsedSections: VenueSection[] = sectionsRaw.map((s) => {
        const cat = categories.find(
          (c) =>
            c.category_name?.toLowerCase().includes(s.section_name?.toLowerCase()) ||
            c.ticket_category_id?.includes(s.section_id)
        );
        const price =
          cat?.price ||
          (s.section_name?.toLowerCase().includes("a") ? event.premiumPrice : event.priceFrom);

        return {
          section_id: s.section_id,
          event_section_id: s.event_section_id,
          section_name: s.section_name,
          booking_type:
            (s.booking_type as "BOOK_BY_SEAT" | "BOOK_BY_QUOTA" | "STANDING") || "BOOK_BY_SEAT",
          capacity: s.capacity || 40,
          available: s.available ?? ((s.capacity || 40) - (s.sold || 0) - (s.blocked || 0)),
          sold: s.sold || 0,
          reserved: s.reserved || 0,
          price,
          category_name: cat?.category_name || s.section_name,
        };
      });
      setVenueSections(parsedSections);

      // Collect seats from paid orders for this event to reflect SOLD status in client
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
            const matchesEvent = !o.event?.id || String(o.event.id) === String(event.id);
            if (isPaid && matchesEvent) {
              if (Array.isArray(o.seat_ids)) {
                o.seat_ids.forEach((sid) => paidSeatSet.add(String(sid).toUpperCase().replace(/\s+/g, "")));
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

      const parsedSeats: VenueSeat[] = seatsData.map((s) => {
        const isBlockA = s.block_code === "BLOCK_A" || s.section_id?.includes("A");
        const price = isBlockA ? event.premiumPrice : event.priceFrom;
        const categoryName = isBlockA ? "Premium" : "Reguler";

        const seatIdStr = String(s.event_seat_id || s.seat_label || `SEAT-${s.id}`).toUpperCase().replace(/\s+/g, "");
        const seatLabelStr = (s.seat_label || `${s.row_label}${s.seat_number}`).toUpperCase().replace(/\s+/g, "");
        const isPaid = paidSeatSet.has(seatIdStr) || paidSeatSet.has(seatLabelStr);

        return {
          event_seat_id: s.event_seat_id || s.seat_label || `SEAT-${s.id}`,
          seat_label: s.seat_label || `${s.row_label}${s.seat_number}`,
          row_label: s.row_label || s.seat_label?.charAt(0) || "A",
          seat_number: s.seat_number || s.seat_label?.slice(1) || 1,
          section_id: s.section_id || (isBlockA ? "SEC-ATR-A" : "SEC-ATR-B"),
          block_code: s.block_code,
          position: s.position || { x: 50, y: 50, unit: "normalized_percent" },
          status: isPaid ? "SOLD" : s.status || "AVAILABLE",
          price,
          category_name: categoryName,
          blocked_reason: s.blocked_reason,
        };
      });

      setVenueSeats(parsedSeats);
      setLoading(false);
    },
    [event]
  );

  // Initial data load effect
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        let liveEventData: RawLiveEvent | null = null;
        try {
          const evRes = await fetchEvent(event.id);
          liveEventData = evRes.data as unknown as RawLiveEvent;
        } catch {
          // Continue
        }

        let seatsData: RawSeat[] = [];
        try {
          const seatsRes = await fetchEventSeats(event.id);
          const dataPayload = seatsRes.data as unknown as { items?: RawSeat[] } | RawSeat[];
          seatsData = Array.isArray(dataPayload) ? dataPayload : dataPayload?.items || [];
        } catch {
          // Continue
        }

        if (active) {
          processApiData(liveEventData, seatsData);
        }
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
  }, [event.id, processApiData]);

  // Polling refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      const seatsRes = await fetchEventSeats(event.id);
      const dataPayload = seatsRes.data as unknown as { items?: RawSeat[] } | RawSeat[];
      const freshSeats = Array.isArray(dataPayload) ? dataPayload : dataPayload?.items || [];

      setVenueSeats((prev) => {
        return prev.map((seat) => {
          const fresh = freshSeats.find(
            (s) => (s.event_seat_id || s.seat_label) === seat.event_seat_id
          );
          if (fresh && fresh.status) {
            return { ...seat, status: fresh.status };
          }
          return seat;
        });
      });
    } catch {
      // ignore background poll failure
    }
  }, [event.id]);

  // Handle seat toggle
  const handleToggleSeat = useCallback(
    (vSeat: VenueSeat) => {
      const seatForStore: Seat = {
        id: vSeat.event_seat_id,
        row: vSeat.row_label,
        number: Number(vSeat.seat_number) || 1,
        category: vSeat.category_name || "Reguler",
        price: vSeat.price || event.priceFrom,
        area: vSeat.block_code || vSeat.section_id,
        status: vSeat.status,
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
        selectedQuota={selectedQuota}
        onToggleSeat={handleToggleSeat}
        onQuotaChange={handleQuotaChange}
        onRefreshSeats={handleRefresh}
        maxTicketsTotal={4}
      />
    </div>
  );
}
