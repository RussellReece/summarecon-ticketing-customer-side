// src/types/customer.ts
//
// Customer-facing types ONLY.
// These mirror what the live API actually returns — not admin/internal shapes.
// Admin types (e.g. full Event with DRAFT status, refund reviews, etc.) must
// never be imported here.

// ─── Generic API envelope ────────────────────────────────────────────────────

export interface ApiMeta {
  total?: number;
  page?: number;
  per_page?: number;
  perPage?: number;
  totalPages?: number;
  last_page?: number;
}

export interface ApiListEnvelope<T> {
  meta?: ApiMeta;
  items: T[];
}

/** 
 * API list responses may be `{ data: T[], meta?: ... }` or `{ data: { meta?: ..., items: T[] } }`
 */
export type ApiListResponse<T> = {
  data: T[] | ApiListEnvelope<T>;
  meta?: ApiMeta;
};

/** All API single-resource responses are wrapped in `{ data: T }` */
export interface ApiSingleResponse<T> {
  data: T;
}

// ─── Error shape ─────────────────────────────────────────────────────────────

export interface ApiErrorBody {
  message: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Venue ───────────────────────────────────────────────────────────────────

export interface CustomerVenue {
  id: number;
  name: string;
  address: string;
  city: string;
  province: string;
}

// ─── Event (public, published only) ──────────────────────────────────────────

/**
 * A public event as returned by `GET /api/events`.
 * The API never returns DRAFT events to this endpoint.
 */
export interface CustomerEvent {
  id: number;
  /** Human-readable slug used for routing, e.g. "sound-of-summarecon" */
  slug: string;
  title: string;
  description: string;
  /** e.g. "MUSIK", "LIFESTYLE" */
  category: string;
  status: "PUBLISHED" | "SALES_OPEN" | "SALES_CLOSED" | "COMPLETED" | "CANCELLED";
  event_date: string;        // ISO 8601 date string, e.g. "2026-11-21"
  start_time: string;        // e.g. "19:00:00"
  end_time: string | null;
  /** Lowest ticket price across all categories */
  price_from: number;
  /** Highest ticket price across all categories */
  price_to: number;
  cover_image_url: string | null;
  venue: CustomerVenue;
  /** Total seats still available */
  available_seats_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Ticket Category ─────────────────────────────────────────────────────────

export interface CustomerTicketCategory {
  id: number;
  name: string;        // e.g. "Platinum", "Regular"
  price: number;
  description: string | null;
  color_hex: string | null;
}

// ─── Event Section (zone on the seat map) ────────────────────────────────────

export interface CustomerEventSection {
  id: number;
  name: string;        // e.g. "Area A", "VIP"
  ticket_category: CustomerTicketCategory;
}

// ─── Seat ────────────────────────────────────────────────────────────────────

/**
 * A single seat as returned by `GET /api/events/:id/seats`.
 * The API filters out `current_order_id` for privacy; only status is exposed.
 */
export interface CustomerSeat {
  id: number;
  /** Display label, e.g. "A01", "B10" */
  seat_label: string;
  row_label: string;
  seat_number: number;
  status: "AVAILABLE" | "LOCKED" | "SOLD" | "BLOCKED";
  section: CustomerEventSection;
  /** Derived from section.ticket_category.price */
  price: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface CustomerProfile {
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
  role: "CUSTOMER";
  created_at: string;
}

export interface AuthResponse {
  user: CustomerProfile;
  token?: string;
  session_token?: string;
  message?: string;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export interface CustomerOrderItem {
  id: number;
  seat: Pick<CustomerSeat, "id" | "seat_label" | "row_label" | "seat_number">;
  ticket_category: Pick<CustomerTicketCategory, "id" | "name" | "price">;
  attendee_name: string;
  price_at_purchase: number;
}

export interface CustomerOrder {
  id: number;
  order_code: string;    // e.g. "ORD-20261121-XXXX"
  status: "PENDING" | "PAID" | "CANCELLED" | "REFUND_REQUESTED" | "REFUNDED";
  total_amount: number;
  event: Pick<CustomerEvent, "id" | "slug" | "title" | "event_date" | "start_time" | "venue">;
  items: CustomerOrderItem[];
  payment: CustomerPayment | null;
  created_at: string;
  updated_at: string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface CustomerPayment {
  id: number;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED";
  payment_method: string | null;
  /** QRIS payment data URL or deeplink */
  payment_url: string | null;
  /** QRIS image as a data URL (base64) */
  qr_string: string | null;
  expires_at: string | null;
  paid_at: string | null;
}

// ─── E-Ticket / QR ───────────────────────────────────────────────────────────

export interface CustomerQRResponse {
  /** Base64 data URL: "data:image/png;base64,..." */
  qr_image: string;
  /** The underlying token encoded in the QR */
  token: string;
  order_code: string;
  valid: boolean;
}

// ─── Booking Hold ─────────────────────────────────────────────────────────────

export interface BookingHoldResponse {
  hold_ids: number[];
  /** ISO 8601 — when the hold expires (10 minutes from creation) */
  reserved_until: string;
  seat_ids: number[];
}

// ─── Refund ───────────────────────────────────────────────────────────────────

export type RefundStatus =
  | "UNDER_REVIEW"
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED";

export interface CustomerRefund {
  id: number;
  order_id: number;
  status: RefundStatus;
  reason: string;
  refund_amount: number;
  refund_destination: RefundDestination | null;
  created_at: string;
  updated_at: string;
}

export interface RefundDestination {
  method: "BANK_TRANSFER" | "E_WALLET";
  account_name: string;
  account_number: string;
  bank_or_provider: string;
}

