// prototype/lib/data.js
//
// Live API client for the prototype customer portal.
// Local dummy JSON seeding via /api/seed has been completely removed.

import { API_BASE_URL } from "./config.js";

/**
 * Ensures the API endpoint path always begins with "/api/".
 */
function resolveApiPath(path) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean.startsWith("/api/")) return clean;
  const base = (API_BASE_URL || "/api").replace(/\/+$/, "");
  return base.endsWith("/api") ? `${base}${clean}` : `${base}/api${clean}`;
}

/**
 * Fetch available events directly from the live backend API.
 * Calls GET /api/events?status=SALES_OPEN (proxied to https://summarecon-admin.axtra.tech)
 */
export async function getAvailableEvents() {
  const url = resolveApiPath("/events?status=SALES_OPEN");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    const preview = text.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      `Gagal memuat acara: Server mengembalikan non-JSON (${response.status} ${response.statusText}, Content-Type: ${contentType || "none"}). Respons: "${preview}"... Pastikan endpoint menggunakan prefix /api dan proxy aktif.`
    );
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error(`Gagal parse JSON dari API (${response.status}): ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(json.message || `Gagal memuat acara dari API (${response.status}: ${response.statusText}).`);
  }

  const raw = json.data || json;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray(raw.items)) return raw.items;
  return [];
}

/**
 * Fetch a single event by ID or slug from the live API.
 */
export async function getEvent(eventId) {
  try {
    const url = resolveApiPath(`/events/${encodeURIComponent(eventId)}`);
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (!contentType.includes("application/json")) {
      throw new Error(`Server returned non-JSON (${response.status}): ${text.slice(0, 80)}`);
    }

    if (response.ok) {
      const json = JSON.parse(text);
      const event = json.data || json;
      return {
        ...event,
        venue: typeof event.venue === "object" ? event.venue : { venue_name: event.venue || "Summarecon Mall Bandung" },
        sections: event.sections || [],
        categories: event.ticket_categories || event.categories || [],
        seats: event.seats || [],
      };
    }
  } catch (err) {
    console.warn("[getEvent] Live fetch error, falling back:", err);
  }

  // Fallback if ID is numeric or string
  throw new Error("Acara tidak ditemukan di server.");
}

/**
 * DISABLED: Local seed loading is removed. Returns a safe empty structure
 * so legacy callers do not throw or trigger network calls to /api/seed.
 */
export async function loadSeed() {
  return {
    venues: [
      { venue_id: "VEN-DWT-001", venue_name: "Downtown Walk" },
      { venue_id: "VEN-ATR-001", venue_name: "Atrium Cibadak (Lobby Ageung)" },
      { venue_id: "VEN-SWG-001", venue_name: "Sawarga Courtyard" },
    ],
    events: [],
    event_sections: [],
    ticket_categories: [],
    event_seats: [],
    users: [],
    layout_templates: [],
    system_settings: {
      booking: {
        queue_enabled: false,
      },
    },
  };
}
