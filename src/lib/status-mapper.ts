// src/lib/status-mapper.ts
//
// Central status mapper for Summarecon Ticketing Customer Portal.
// Maps all backend enum statuses to user-facing Bahasa Indonesia labels,
// tones, symbols, and styling classes per the Style Guide.

export type StatusTone = "success" | "warning" | "error" | "neutral" | "info";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  symbol: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const STATUS_LABELS: Record<string, string> = {
  // Event
  DRAFT: "Draf",
  PUBLISHED: "Akan Datang",
  SALES_OPEN: "Tiket Tersedia",
  SALES_CLOSED: "Penjualan Ditutup",
  ONGOING: "Sedang Berlangsung",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",

  // Order
  PENDING: "Menunggu Pembayaran",
  PAID: "Terbayar",
  EXPIRED: "Kedaluwarsa",
  PARTIALLY_REFUNDED: "Refund Sebagian",
  REFUNDED: "Refund Selesai",

  // Payment
  INITIATED: "Menyiapkan Pembayaran",
  SUCCESS: "Berhasil",
  FAILED: "Gagal",

  // Ticket
  RESERVED: "Disiapkan",
  ISSUED: "Tiket Terbit",
  USED: "Sudah Digunakan",
  REFUND_PENDING: "Refund Ditinjau",

  // Attendance
  NOT_CHECKED_IN: "Belum Check-in",
  CHECKED_IN: "Sudah Check-in",

  // Seat
  AVAILABLE: "Tersedia",
  LOCKED: "Sedang Ditahan",
  SOLD: "Terjual",
  BLOCKED: "Terblokir",
  DISABLED_EVENT_CANCELLED: "Event Dibatalkan",
  RELEASED_EXPIRED: "Hold Kedaluwarsa",

  // Refund
  REQUESTED: "Lengkapi Data Refund",
  UNDER_REVIEW: "Menunggu Review",
  REJECTED: "Refund Ditolak",
  APPROVED: "Disetujui",
  PROCESSING: "Diproses Manual",
  NEED_CONFIRMATION: "Perlu Konfirmasi",

  // Refund Data
  NOT_SUBMITTED: "Data Belum Dikirim",
  COMPLETE: "Data Lengkap",
  NEED_CORRECTION: "Perlu Perbaikan Data",

  // Notification
  QUEUED: "Dalam Antrean",
  SENT: "Terkirim",
  DELIVERED: "Diterima",
};

export const STATUS_TONES: Record<string, StatusTone> = {
  // Success (Green / Teal)
  SALES_OPEN: "success",
  PAID: "success",
  SUCCESS: "success",
  ISSUED: "success",
  CHECKED_IN: "success",
  AVAILABLE: "success",
  APPROVED: "success",
  COMPLETE: "success",

  // Warning (Amber / Yellow)
  PENDING: "warning",
  INITIATED: "warning",
  LOCKED: "warning",
  BLOCKED: "warning",
  USED: "warning",
  REFUND_PENDING: "warning",
  REQUESTED: "warning",
  UNDER_REVIEW: "warning",
  PROCESSING: "warning",
  NEED_CONFIRMATION: "warning",
  NEED_CORRECTION: "warning",
  QUEUED: "warning",

  // Error (Red / Vermilion)
  FAILED: "error",
  REJECTED: "error",

  // Neutral (Gray / Muted)
  DRAFT: "neutral",
  SALES_CLOSED: "neutral",
  COMPLETED: "neutral",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
  PARTIALLY_REFUNDED: "neutral",
  REFUNDED: "neutral",
  SOLD: "neutral",
  DISABLED_EVENT_CANCELLED: "neutral",
  RELEASED_EXPIRED: "neutral",
  NOT_CHECKED_IN: "neutral",
  NOT_SUBMITTED: "neutral",

  // Info (Blue / Indigo)
  PUBLISHED: "info",
  ONGOING: "info",
  SENT: "info",
  DELIVERED: "info",
};

export const STATUS_SYMBOLS: Record<string, string> = {
  // Success
  SALES_OPEN: "●",
  PAID: "✓",
  SUCCESS: "✓",
  ISSUED: "✓",
  CHECKED_IN: "✓",
  AVAILABLE: "●",
  APPROVED: "✓",
  COMPLETE: "✓",

  // Warning
  PENDING: "◷",
  INITIATED: "⋯",
  LOCKED: "⋯",
  BLOCKED: "⊘",
  USED: "●",
  REFUND_PENDING: "◷",
  REQUESTED: "!",
  UNDER_REVIEW: "◷",
  PROCESSING: "⋯",
  NEED_CONFIRMATION: "?",
  NEED_CORRECTION: "!",
  QUEUED: "⋯",

  // Error
  FAILED: "✕",
  REJECTED: "✕",

  // Neutral
  DRAFT: "—",
  SALES_CLOSED: "—",
  COMPLETED: "—",
  CANCELLED: "✕",
  EXPIRED: "—",
  PARTIALLY_REFUNDED: "↩",
  REFUNDED: "↩",
  SOLD: "✕",
  DISABLED_EVENT_CANCELLED: "—",
  RELEASED_EXPIRED: "—",
  NOT_CHECKED_IN: "○",
  NOT_SUBMITTED: "○",

  // Info
  PUBLISHED: "●",
  ONGOING: "●",
  SENT: "✓",
  DELIVERED: "✓",
};

export const TONE_STYLES: Record<
  StatusTone,
  { bg: string; text: string; border: string; badge: string }
> = {
  success: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    badge: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    badge: "bg-amber-50 text-amber-800 border border-amber-200",
  },
  error: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    badge: "bg-rose-50 text-rose-800 border border-rose-200",
  },
  neutral: {
    bg: "bg-stone-100",
    text: "text-stone-700",
    border: "border-stone-200",
    badge: "bg-stone-100 text-stone-700 border border-stone-200",
  },
  info: {
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
    badge: "bg-sky-50 text-sky-800 border border-sky-200",
  },
};

/**
 * Returns human-readable Indonesian label for any status.
 */
export function getStatusLabel(status: string | null | undefined): string {
  if (!status) return "Informasi";
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/**
 * Returns color tone for any status.
 */
export function getStatusTone(status: string | null | undefined): StatusTone {
  if (!status) return "neutral";
  return STATUS_TONES[status] ?? "neutral";
}

/**
 * Returns representative symbol (✓, ✕, ◷, ●, etc.) for status.
 */
export function getStatusSymbol(status: string | null | undefined): string {
  if (!status) return "●";
  return STATUS_SYMBOLS[status] ?? "●";
}

/**
 * Full metadata for rendering badges with color + symbol + text.
 */
export function getStatusMeta(status: string | null | undefined): StatusMeta {
  const tone = getStatusTone(status);
  const styles = TONE_STYLES[tone];
  return {
    label: getStatusLabel(status),
    tone,
    symbol: getStatusSymbol(status),
    bgClass: styles.bg,
    textClass: styles.text,
    borderClass: styles.border,
  };
}

