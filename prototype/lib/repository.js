// prototype/lib/repository.js
// Local storage repository for prototype session & state.
// Static dummy seeding has been completely disabled.

import { SEED_VERSION } from "./config.js";

const tables = {
  system_settings: "etvm_settings",
  users: "etvm_users",
  event_seats: "etvm_inventory",
  event_sections: "etvm_sections",
  booking_holds: "etvm_holds",
  queue_entries: "etvm_queue",
  orders: "etvm_orders",
  payments: "etvm_payments",
  payment_gateway_callbacks: "etvm_callbacks",
  tickets: "etvm_tickets",
  e_tickets: "etvm_etickets",
  refunds: "etvm_refunds",
  refund_status_histories: "etvm_refund_histories",
  participant_change_logs: "etvm_participant_logs",
  notification_logs: "etvm_notifications",
};

function readJSON(key, fallback) {
  const value = localStorage.getItem(key);
  return value === null ? fallback : JSON.parse(value);
}

/**
 * DISABLED: We no longer seed local dummy JSON.
 * Data is fetched on-demand from the live API.
 */
export async function seedIfEmpty() {
  return;
}

export async function resetDemo() {
  localStorage.removeItem("etvm_auth");
  localStorage.removeItem("etvm_selection");
  localStorage.removeItem("etvm_checkout_draft");
  localStorage.removeItem("summa_customer_session");
  window.dispatchEvent(new CustomEvent("etvm:changed"));
}

export function getTable(table) {
  const key = tables[table];
  if (!key) throw new Error(`Namespace data tidak dikenal: ${table}`);
  return readJSON(key, []);
}

export function writeTable(table, rows) {
  const key = tables[table];
  if (!key) throw new Error(`Namespace data tidak dikenal: ${table}`);
  const meta = readJSON("etvm_meta", { seedVersion: SEED_VERSION, inventoryVersion: 0 });
  localStorage.setItem(key, JSON.stringify(rows));
  localStorage.setItem("etvm_meta", JSON.stringify({ ...meta, inventoryVersion: meta.inventoryVersion + 1 }));
  window.dispatchEvent(new CustomEvent("etvm:changed"));
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel("etvm-inventory");
    channel.postMessage({ table, version: meta.inventoryVersion + 1 });
    channel.close();
  }
}

export function getSession() {
  return readJSON("etvm_auth", null);
}

export function setSession(user) {
  localStorage.setItem("etvm_auth", JSON.stringify({
    userId: user.user_id || user.id || "USR-CUSTOMER",
    fullName: user.full_name || user.name || "Customer",
    email: user.email,
  }));
  window.dispatchEvent(new CustomEvent("etvm:changed"));
}

export function clearSession() {
  localStorage.removeItem("etvm_auth");
  localStorage.removeItem("summa_customer_session");
  document.cookie = "summa_customer_session=; path=/; max-age=0";
  window.dispatchEvent(new CustomEvent("etvm:changed"));
}

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  return {
    user_id: session.userId,
    full_name: session.fullName || "Customer",
    email: session.email || "",
  };
}

export function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
