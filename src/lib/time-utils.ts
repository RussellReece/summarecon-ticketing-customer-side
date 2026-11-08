// src/lib/time-utils.ts
//
// Timezone and countdown utilities for Summarecon Ticketing (WIB / Asia/Jakarta).

let serverTimeOffsetMs = 0;

/**
 * Record server time from HTTP Response `Date` header to avoid client clock skew.
 */
export function setServerTimeFromHeader(dateHeaderString: string | null | undefined) {
  if (!dateHeaderString) return;
  try {
    const serverTimestamp = new Date(dateHeaderString).getTime();
    if (!Number.isNaN(serverTimestamp)) {
      serverTimeOffsetMs = serverTimestamp - Date.now();
    }
  } catch {
    // Ignore invalid header
  }
}

/**
 * Get current estimated server time in milliseconds.
 */
export function getEstimatedServerTime(): number {
  return Date.now() + serverTimeOffsetMs;
}

const PAYMENT_DURATION_SECONDS = 7 * 60; // 7 minutes (420 seconds) for QRIS payment

/**
 * Safely parse an ISO or SQLite timestamp string (or numeric epoch ms) into epoch milliseconds.
 * Normalizes SQLite UTC strings like "2026-11-08 13:20:00" to UTC ISO format.
 */
export function parseTimestampMs(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    return Number.isNaN(raw) ? null : raw;
  }
  const str = String(raw).trim();
  if (!str) return null;

  // Handle numeric string
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    return Number.isNaN(num) ? null : num;
  }

  // Handle SQLite UTC format "YYYY-MM-DD HH:MM:SS" without timezone indicator
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    const parsedUtc = new Date(str.replace(" ", "T") + "Z").getTime();
    if (!Number.isNaN(parsedUtc)) return parsedUtc;
  }

  const parsed = new Date(str).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Compute absolute expiration timestamp (in ms) for a 7-minute QRIS payment window.
 * Priority:
 * 1. Explicit `payment_expires_at` / `expires_at` / `payment.expires_at`
 * 2. `created_at` + 7 minutes (420 seconds)
 */
export function getPaymentExpiryTimestampMs(
  order:
    | {
        payment_expires_at?: string | number | null;
        expires_at?: string | number | null;
        created_at?: string | number | null;
        payment?: {
          expires_at?: string | number | null;
          created_at?: string | number | null;
        } | null;
      }
    | null
    | undefined,
  fallbackStartMs?: number | null
): number | null {
  if (order) {
    const explicitExpiry =
      parseTimestampMs(order.payment_expires_at) ??
      parseTimestampMs(order.payment?.expires_at) ??
      parseTimestampMs(order.expires_at);
    if (explicitExpiry !== null) {
      return explicitExpiry;
    }

    const createdMs =
      parseTimestampMs(order.created_at) ?? parseTimestampMs(order.payment?.created_at);
    if (createdMs !== null) {
      return createdMs + PAYMENT_DURATION_SECONDS * 1000;
    }
  }

  if (fallbackStartMs !== null && fallbackStartMs !== undefined && !Number.isNaN(fallbackStartMs)) {
    return fallbackStartMs + PAYMENT_DURATION_SECONDS * 1000;
  }

  return null;
}

/**
 * Calculate remaining seconds for a QRIS payment based on absolute timestamps:
 * Remaining Time = Expiry Time - Current Estimated Server Time.
 */
export function getPaymentSecondsRemaining(
  order:
    | {
        payment_expires_at?: string | number | null;
        expires_at?: string | number | null;
        created_at?: string | number | null;
        payment?: {
          expires_at?: string | number | null;
          created_at?: string | number | null;
        } | null;
      }
    | null
    | undefined,
  fallbackStartMs?: number | null
): number {
  const expiryMs = getPaymentExpiryTimestampMs(order, fallbackStartMs);
  if (expiryMs === null) return PAYMENT_DURATION_SECONDS;

  const currentMs = getEstimatedServerTime();
  const diffSec = Math.floor((expiryMs - currentMs) / 1000);
  return Math.max(0, diffSec);
}

/**
 * Calculate remaining seconds until an ISO 8601 expiry string (e.g. reserved_until).
 */
export function getSecondsRemaining(expiresAtISO: string | number | null | undefined): number {
  const targetMs = parseTimestampMs(expiresAtISO);
  if (targetMs === null) return 0;

  const currentMs = getEstimatedServerTime();
  const diffSec = Math.floor((targetMs - currentMs) / 1000);
  return Math.max(0, diffSec);
}

/**
 * Format remaining seconds into MM:SS.
 */
export function formatRemainingTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format ISO date string into Indonesian readable format.
 * e.g. "Sabtu, 21 November 2026, 19:00 WIB"
 */
export function formatIndonesianDateTime(
  dateStr: string | null | undefined,
  timeStr?: string | null,
): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    const dateFormatted = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(date);

    if (timeStr) {
      const cleanTime = timeStr.slice(0, 5).replace(":", ".");
      return `${dateFormatted} · Pukul ${cleanTime} WIB`;
    }

    // If dateStr contains time information (ISO with T or timestamp)
    if (String(dateStr).includes("T") || !isNaN(Number(dateStr))) {
      const timeFormatted = new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
        hour12: false,
      }).format(date).replace(":", ".");
      return `${dateFormatted} · Pukul ${timeFormatted} WIB`;
    }

    return `${dateFormatted} WIB`;
  } catch {
    return dateStr;
  }
}

/**
 * Format date only in Indonesian.
 * e.g. "21 November 2026"
 */
export function formatIndonesianDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Check if the cutoff deadline (H-1 before event start in WIB) has passed.
 * Applies to:
 * - Participant refund request (must be >= 24h before event start)
 * - Name change (must be >= 24h before event start)
 *
 * @param eventDateStr e.g. "2026-11-21"
 * @param startTimeStr e.g. "19:00:00"
 * @returns { isPassed: boolean, deadlineFormatted: string, hoursRemaining: number }
 */
export function checkHMinusOneCutoff(
  eventDateStr: string | null | undefined,
  startTimeStr: string | null | undefined = "00:00:00",
): {
  isPassed: boolean;
  deadlineDate: Date | null;
  deadlineFormatted: string;
  hoursRemaining: number;
} {
  if (!eventDateStr) {
    return {
      isPassed: false,
      deadlineDate: null,
      deadlineFormatted: "-",
      hoursRemaining: 999,
    };
  }

  try {
    // Construct ISO string for event start in WIB (+07:00)
    const [year, month, day] = eventDateStr.split("T")[0].split("-").map(Number);
    const [hours, minutes] = (startTimeStr || "00:00:00").split(":").map(Number);

    // Event start date object
    const eventStartDate = new Date(Date.UTC(year, month - 1, day, hours - 7, minutes || 0));

    // Deadline is strictly 24 hours (1 day) before event start
    const deadlineMs = eventStartDate.getTime() - 24 * 60 * 60 * 1000;
    const deadlineDate = new Date(deadlineMs);

    const nowMs = getEstimatedServerTime();
    const isPassed = nowMs >= deadlineMs;
    const hoursRemaining = Math.max(0, Math.floor((deadlineMs - nowMs) / (1000 * 60 * 60)));

    const deadlineFormatted = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(deadlineDate) + " WIB";

    return {
      isPassed,
      deadlineDate,
      deadlineFormatted,
      hoursRemaining,
    };
  } catch {
    return {
      isPassed: false,
      deadlineDate: null,
      deadlineFormatted: "-",
      hoursRemaining: 999,
    };
  }
}

