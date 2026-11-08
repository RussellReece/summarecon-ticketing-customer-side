// src/lib/data/events.ts
//
// Event data adapter & dynamic lookup.
// Provides backward-compatible helpers while integrating with the live API.

import type { TicketEvent } from "@/types/event";

/**
 * Normalizes an API CustomerEvent into the TicketEvent shape expected by the UI.
 */
export function adaptCustomerEvent(eventInput: unknown): TicketEvent {
  const event = (eventInput || {}) as Record<string, unknown>;
  const rawDate = (event.event_date as string) || (event.start_at as string) || (event.dateISO as string) || "2026-11-21";
  const dateISO = String(rawDate).split("T")[0];
  let dateLabel = dateISO;
  try {
    dateLabel = new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${dateISO}T12:00:00`));
  } catch {
    // fallback to iso
  }

  let time = "19.00 WIB";
  if (event.start_time) {
    const [h, m] = String(event.start_time).split(":");
    time = `${h}.${m} WIB`;
  } else if (event.start_at && String(event.start_at).includes("T")) {
    const [h, m] = String(event.start_at).split("T")[1].split(":");
    time = `${h}.${m} WIB`;
  }

  const category = (event.category as string) || (event.event_category as string) || "MUSIK";
  const venueObj = typeof event.venue === "object" && event.venue !== null ? (event.venue as Record<string, unknown>) : null;
  const venue = venueObj
    ? String(venueObj.name || "Summarecon Mall Bandung")
    : String(event.venue_name || event.venue || "Summarecon Mall Bandung");
  const city = venueObj
    ? String(venueObj.city || "Bandung")
    : String(event.city || "Bandung");

  let priceFrom = Number(event.price_from || event.priceFrom || 0);
  let premiumPrice = Number(event.price_to || event.premiumPrice || 0);

  if (Array.isArray(event.categories) && event.categories.length > 0) {
    const prices = (event.categories as Array<{ price?: number }>)
      .map((c) => Number(c.price))
      .filter((p) => !isNaN(p) && p > 0);
    if (prices.length > 0) {
      priceFrom = Math.min(...prices);
      premiumPrice = Math.max(...prices);
    }
  }

  // Sensible defaults if not present
  if (!priceFrom) priceFrom = 250000;
  if (!premiumPrice || premiumPrice === priceFrom) premiumPrice = 350000;

  const theme: "violet" | "amber" | "blue" =
    category.toUpperCase().includes("JAZZ") || category.toUpperCase().includes("EXPO")
      ? "amber"
      : category.toUpperCase().includes("MUSIK")
        ? "violet"
        : "blue";

  return {
    id: String(event.event_id || event.id || event.slug),
    title: (event.title as string) || (event.event_name as string) || "Event Summarecon",
    category,
    venue,
    city,
    dateLabel,
    dateISO,
    time,
    priceFrom,
    premiumPrice,
    description: (event.description as string) || "Nikmati momen terbaik di Summarecon Mall Bandung.",
    theme,
    badge: "TIKET TERSEDIA",
  };
}

// In-memory cache for live events fetched from the API during the user's session
const liveEventsCache = new Map<string, TicketEvent>();

export function cacheLiveEvent(eventInput: unknown): TicketEvent {
  const rec = (eventInput || {}) as Record<string, unknown>;
  const adapted = adaptCustomerEvent(rec);
  liveEventsCache.set(String(adapted.id), adapted);
  if (rec.id) liveEventsCache.set(String(rec.id), adapted);
  if (rec.slug) liveEventsCache.set(String(rec.slug), adapted);
  if (rec.event_id) liveEventsCache.set(String(rec.event_id), adapted);
  return adapted;
}

/**
 * Fallback static events (used only if API fails or for offline demo)
 */
export const events: TicketEvent[] = [
  {
    id: "EVT-ATR-001",
    title: "Bandung Tech & Creative Expo",
    category: "EXPO",
    venue: "Atrium Cibadak",
    city: "Bandung",
    dateLabel: "Min, 20 Des 2026",
    dateISO: "2026-12-20",
    time: "10.00 WIB",
    priceFrom: 250000,
    premiumPrice: 350000,
    description:
      "Pameran teknologi dan kreativitas dengan tempat duduk bernomor pada Atrium Cibadak.",
    theme: "amber",
    badge: "TIKET TERSEDIA",
  },
  {
    id: "EVT-SWG-001",
    title: "Sawarga Outdoor Live Fest",
    category: "FESTIVAL",
    venue: "Sawarga Courtyard",
    city: "Bandung",
    dateLabel: "Min, 27 Des 2026",
    dateISO: "2026-12-27",
    time: "16.00 WIB",
    priceFrom: 175000,
    premiumPrice: 350000,
    description:
      "Konser outdoor dengan standing pit di depan, reserved seating di belakang, dan reserved quota.",
    theme: "violet",
    badge: "TIKET TERSEDIA",
  },
  {
    id: "EVT-V3-002",
    title: "Bandung Fest 2026",
    category: "FESTIVAL",
    venue: "Sawarga Courtyard",
    city: "Bandung",
    dateLabel: "Sab, 09 Jan 2027",
    dateISO: "2027-01-09",
    time: "15.00 WIB",
    priceFrom: 150000,
    premiumPrice: 300000,
    description:
      "Festival musik dan kreativitas outdoor Bandung Fest di area Sawarga Courtyard.",
    theme: "violet",
    badge: "TIKET TERSEDIA",
  },
  {
    id: "sound-of-summarecon",
    title: "Sound of Summarecon",
    category: "MUSIK",
    venue: "Summarecon Mall Bandung",
    city: "Bandung",
    dateLabel: "Sab, 21 Nov 2026",
    dateISO: "2026-11-21",
    time: "19.00 WIB",
    priceFrom: 350000,
    premiumPrice: 850000,
    description:
      "Satu malam, banyak cerita. Nikmati penampilan musisi pilihan dalam perayaan musik dan kebersamaan di jantung kota Bandung.",
    theme: "violet",
    badge: "PALING DINANTI",
  },
  {
    id: "weekend-jazz",
    title: "Weekend Jazz Society",
    category: "MUSIK",
    venue: "Summarecon Mall Bandung",
    city: "Bandung",
    dateLabel: "Min, 29 Nov 2026",
    dateISO: "2026-11-29",
    time: "18.30 WIB",
    priceFrom: 275000,
    premiumPrice: 700000,
    description:
      "Akhiri akhir pekan dengan aransemen jazz yang hangat, pilihan kuliner, dan suasana santai bersama teman-teman.",
    theme: "amber",
    badge: "SEGERA HABIS",
  },
  {
    id: "creative-market",
    title: "The Creative Market",
    category: "LIFESTYLE",
    venue: "Summarecon Mall Bandung",
    city: "Bandung",
    dateLabel: "Min, 06 Des 2026",
    dateISO: "2026-12-06",
    time: "10.00 WIB",
    priceFrom: 50000,
    premiumPrice: 150000,
    description:
      "Temukan karya lokal, workshop kreatif, dan inspirasi baru dari komunitas kreator dalam satu ruang yang seru.",
    theme: "blue",
    badge: "TIKET TERSEDIA",
  },
];

export function getEventById(id: string): TicketEvent | undefined {
  // Check live cache first
  if (liveEventsCache.has(id)) {
    return liveEventsCache.get(id);
  }
  // Check fallback array
  return events.find((event) => event.id === id);
}
