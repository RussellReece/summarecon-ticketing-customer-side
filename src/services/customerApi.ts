// src/services/customerApi.ts
//
// All customer-facing API calls, grouped by domain.
// Import from here — never reach into apiClient directly from components.
//
// Auth note:
//   Private endpoints (/api/customer/…) require the `summa_customer_session`
//   cookie.  In Server Components the cookie is forwarded automatically via
//   `credentials: "include"` + Next.js `cookies()` forwarding.
//   In Client Components the browser sends the HttpOnly cookie automatically.

import {
  type ApiListResponse,
  type ApiSingleResponse,
  type AuthResponse,
  type BookingHoldResponse,
  type CustomerEvent,
  type CustomerOrder,
  type CustomerProfile,
  type CustomerQRResponse,
  type CustomerRefund,
  type CustomerSeat,
  type RefundDestination,
} from "@/types/customer";
import { apiDelete, apiGet, apiPatch, apiPost } from "./apiClient";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AUTH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Register a new customer account.
 * `POST /api/auth/register`
 */
export function registerCustomer(payload: {
  full_name: string;
  email: string;
  phone_number: string;
  password: string;
}): Promise<ApiSingleResponse<AuthResponse>> {
  return apiPost("/auth/register", payload);
}

/**
 * Log in with email + password.
 * `POST /api/auth/login`
 * Sends `{ email, password, audience: "CUSTOMER" }` as required by backend.
 * On success the server sets the `summa_customer_session` HttpOnly cookie.
 */
export function loginCustomer(payload: {
  email: string;
  password: string;
  audience?: "CUSTOMER" | "ADMIN" | "CHECKIN";
}): Promise<ApiSingleResponse<AuthResponse>> {
  return apiPost("/auth/login", {
    audience: "CUSTOMER",
    ...payload,
  });
}

/**
 * Log out the current session.
 * `POST /api/auth/logout`
 */
export function logoutCustomer(): Promise<void> {
  return apiPost("/auth/logout");
}

/**
 * Fetch the currently authenticated customer's profile.
 * `GET /api/auth/me`
 * Throws ApiError 401 if not logged in.
 */
export function fetchMe(): Promise<ApiSingleResponse<CustomerProfile>> {
  return apiGet("/auth/me");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. EVENTS  (public, no auth required)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FetchEventsParams {
  /** Filter by status. Customer portal should normally use "SALES_OPEN". */
  status?: "PUBLISHED" | "SALES_OPEN" | "SALES_CLOSED" | "COMPLETED";
  category?: string;
  city?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

/**
 * Fetch the public list of published events.
 * `GET /api/events`
 *
 * Defaults to `status=SALES_OPEN` so the catalog never shows unavailable events.
 *
 * @example
 * // Server Component
 * const { data: events } = await fetchEvents({ status: "SALES_OPEN" });
 */
export function fetchEvents(
  params: FetchEventsParams = {},
): Promise<ApiListResponse<CustomerEvent>> {
  const { status = "SALES_OPEN", ...rest } = params;
  return apiGet("/events", { status, ...rest });
}

/**
 * Fetch a single event by its numeric ID.
 * `GET /api/events/:id`
 *
 * @throws ApiError 404 if the event does not exist or is not published.
 */
export function fetchEvent(eventId: number | string): Promise<ApiSingleResponse<CustomerEvent>> {
  return apiGet(`/events/${eventId}`);
}

/**
 * Fetch the seat map for a specific event.
 * `GET /api/events/:id/seats`
 *
 * Returns all seats with their current status (AVAILABLE / LOCKED / SOLD / BLOCKED).
 * Sensitive fields like `current_order_id` are stripped server-side.
 *
 * @throws ApiError 404 if the event doesn't exist.
 */
export function fetchEventSeats(
  eventId: number | string,
): Promise<ApiListResponse<CustomerSeat>> {
  return apiGet(`/events/${eventId}/seats`, undefined, { cache: "no-store" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. BOOKING HOLDS  (requires auth)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hold a set of seats for 10 minutes (atomic transaction).
 * `POST /api/events/:id/holds`
 *
 * - All seats must be AVAILABLE; any LOCKED/SOLD seat causes a 409.
 * - Seats are set to LOCKED and a `booking_holds` row is created.
 *
 * @throws ApiError 401 — not authenticated
 * @throws ApiError 409 — one or more seats already taken
 */
export function holdSeats(
  eventId: number | string,
  seatIds: (number | string)[],
  userId?: string,
): Promise<ApiSingleResponse<BookingHoldResponse>> {
  return apiPost(`/events/${eventId}/holds`, {
    seat_ids: seatIds,
    event_seat_ids: seatIds,
    ...(userId ? { user_id: userId } : {}),
  });
}

/**
 * Release held seats before the timer expires.
 * `DELETE /api/events/:id/holds`
 * Uses `keepalive: true` so the browser completes the DELETE request even if
 * the user immediately navigates back to the seat map route.
 */
export function releaseHolds(
  eventId: number | string,
  holdIds: (number | string)[],
  seatIds?: (number | string)[],
): Promise<void> {
  const primaryHoldId = holdIds[0] !== undefined ? String(holdIds[0]) : undefined;
  return apiDelete(`/events/${eventId}/holds`, {
    keepalive: true,
    body: {
      ...(primaryHoldId ? { hold_id: primaryHoldId } : {}),
      hold_ids: holdIds,
      ...(seatIds && seatIds.length > 0
        ? { event_seat_ids: seatIds, seat_ids: seatIds }
        : {}),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ORDERS  (requires auth)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateOrderPayload {
  event_id: number | string;
  user_id?: string;
  hold_id?: string | null;
  seat_ids: (number | string)[];
  event_seat_ids?: (number | string)[];
  buyer?: {
    full_name: string;
    email: string;
    phone_number: string;
  };
  items?: Array<{
    seat_id?: number | string;
    event_seat_id?: number | string;
    attendee_name: string;
    participant_name?: string;
  }>;
}

/**
 * Create a new order from held seats.
 * `POST /api/orders`
 *
 * @throws ApiError 401 — not authenticated
 * @throws ApiError 409 — holds have expired
 */
export function createOrder(
  payload: CreateOrderPayload,
): Promise<ApiSingleResponse<CustomerOrder>> {
  return apiPost("/orders", payload);
}

/**
 * Pay and confirm an order.
 * `POST /api/orders/:id/pay`
 * Transitions order to PAID and seats to SOLD in SQLite database.
 */
export function payOrder(
  orderId: number | string,
): Promise<ApiSingleResponse<{ order_id: string; order_code: string; order_status: string; qr_token?: string }>> {
  return apiPost(`/orders/${orderId}/pay`, {});
}

/**
 * Fetch all orders belonging to the logged-in customer.
 * `GET /api/customer/orders`
 *
 * Results are always filtered to `WHERE user_id = session.user_id` on the
 * server — customers can never see other users' orders.
 *
 * @param token Optional session token for Server Components / Actions
 * @throws ApiError 401 — not authenticated
 */
export function fetchMyOrders(token?: string): Promise<ApiListResponse<CustomerOrder>> {
  return apiGet("/customer/orders", undefined, token ? { token } : undefined);
}

/**
 * Fetch a single order by its ID.
 * Resolves order through the customer orders list to prevent 404 console errors.
 *
 * @param token Optional session token
 * @throws ApiError 401 — not authenticated
 * @throws ApiError 404 — order not found (or belongs to another user)
 */
export async function fetchMyOrder(
  orderId: number | string,
  token?: string,
): Promise<ApiSingleResponse<CustomerOrder>> {
  // Upstream API serves customer orders via /customer/orders list.
  // Resolve first from the list to avoid noisy 404 in browser console.
  try {
    const listRes = await fetchMyOrders(token);
    const list = Array.isArray(listRes.data)
      ? listRes.data
      : (listRes.data as { items?: CustomerOrder[] })?.items || [];
    const found = list.find(
      (o: CustomerOrder & { order_id?: string | number }) =>
        String(o.id) === String(orderId) ||
        String(o.order_id) === String(orderId) ||
        String(o.order_code) === String(orderId),
    );
    if (found) {
      return { data: found };
    }
  } catch {
    // Fall through to direct fetch
  }

  // Fallback to direct path
  return await apiGet(`/customer/orders/${orderId}`, undefined, token ? { token } : undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. E-TICKETS / QR  (requires auth + order must be PAID)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch the QR code image for a paid order.
 * `GET /api/customer/orders/:id/qr`
 *
 * The API generates a QR image on-the-fly from the e-ticket token stored in
 * the `e_tickets` table (created by the payment webhook).
 *
 * @param token Optional session token
 * @throws ApiError 401 — not authenticated
 * @throws ApiError 404 — order not found or not yet paid
 */
export function fetchMyQR(
  orderId: number | string,
  token?: string,
): Promise<CustomerQRResponse> {
  return apiGet(`/customer/orders/${orderId}/qr`, undefined, token ? { token } : undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. REFUNDS  (requires auth)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateRefundPayload {
  order_id: number | string;
  reason?: string;
  dest_method?: "BANK_TRANSFER" | "E_WALLET";
  dest_provider_name?: string;
  dest_account_number?: string;
  dest_account_holder?: string;
  refund_destination?: RefundDestination;
}

/**
 * Submit a refund request for a paid order.
 * `POST /api/customer/refunds`
 *
 * Creates a `refunds` row with status `UNDER_REVIEW` or `REQUESTED`.
 *
 * @throws ApiError 401 — not authenticated
 * @throws ApiError 409 — refund already exists for this order
 */
export function createRefund(
  payload: CreateRefundPayload,
): Promise<ApiSingleResponse<CustomerRefund>> {
  const body = {
    order_id: payload.order_id,
    reason: payload.reason || "Pengajuan refund peserta",
    dest_method:
      payload.dest_method ||
      payload.refund_destination?.method ||
      "BANK_TRANSFER",
    dest_provider_name:
      payload.dest_provider_name ||
      payload.refund_destination?.bank_or_provider ||
      "BCA",
    dest_account_number:
      payload.dest_account_number ||
      payload.refund_destination?.account_number ||
      "",
    dest_account_holder:
      payload.dest_account_holder ||
      payload.refund_destination?.account_name ||
      "",
    refund_destination: payload.refund_destination,
  };
  return apiPost("/customer/refunds", body);
}

/**
 * Update the refund destination for a cancelled-event refund.
 * `PATCH /api/customer/refunds/:id/destination`
 *
 * Only valid when refund status is `REQUESTED` (event cancelled by organiser).
 * Submitting the destination automatically escalates status to `APPROVED`.
 *
 * @throws ApiError 401 — not authenticated
 * @throws ApiError 409 — wrong refund status
 */
export function updateRefundDestination(
  refundId: number | string,
  destination: RefundDestination,
): Promise<ApiSingleResponse<CustomerRefund>> {
  return apiPatch(`/customer/refunds/${refundId}/destination`, { destination });
}

