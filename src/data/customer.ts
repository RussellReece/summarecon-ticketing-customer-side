// src/data/customer.ts
//
// Dynamic Customer Data Service Layer.
// Fully transitioned from static mock to live API calls via `apiClient`.
// Re-exports customer types and core fetch functions.

import {
  fetchEvents,
  fetchEventSeats,
  fetchMyOrders,
  fetchMyQR,
} from "@/services/customerApi";
import type { CustomerEvent, CustomerOrder, CustomerSeat, CustomerQRResponse } from "@/types/customer";

export * from "@/types/customer";
export * from "@/services/customerApi";

/**
 * Fetch available events (PUBLISHED and SALES_OPEN).
 * Dynamic replacement for the old mock data.
 * Gracefully extracts items whether the API returns `{ data: [...] }` or `{ data: { items: [...] } }`.
 */
export async function getAvailableEvents(): Promise<CustomerEvent[]> {
  const response = await fetchEvents({ status: "SALES_OPEN" });
  const raw = response?.data as unknown;
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === "object" && "items" in raw && Array.isArray((raw as { items: unknown[] }).items)) {
    return (raw as { items: CustomerEvent[] }).items;
  }
  return [];
}

/**
 * Fetch authenticated customer's orders.
 * Supports passing a session token explicitly or relying on cookie session.
 */
export async function getMyOrders(token?: string): Promise<CustomerOrder[]> {
  const response = await fetchMyOrders(token);
  const raw = response?.data as unknown;
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === "object" && "items" in raw && Array.isArray((raw as { items: unknown[] }).items)) {
    return (raw as { items: CustomerOrder[] }).items;
  }
  return [];
}

/**
 * Fetch seat status for an event.
 */
export async function getEventSeats(eventId: number | string): Promise<CustomerSeat[]> {
  const response = await fetchEventSeats(eventId);
  const raw = response?.data as unknown;
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === "object" && "items" in raw && Array.isArray((raw as { items: unknown[] }).items)) {
    return (raw as { items: CustomerSeat[] }).items;
  }
  return [];
}

/**
 * Fetch real-time QR code for a paid order.
 */
export async function getMyQR(orderId: number | string, token?: string): Promise<CustomerQRResponse> {
  return fetchMyQR(orderId, token);
}
