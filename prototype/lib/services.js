import { HOLD_MINUTES, MAX_TICKETS_PER_ORDER, PAYMENT_PENDING_MINUTES } from "./config.js";
import { getAvailableEvents, loadSeed } from "./data.js";
import { clearSession, getCurrentUser, getTable, nextId, setSession, writeTable } from "./repository.js";
import { statusLabel } from "./status-mapper.js";

export { statusLabel };

export const rupiah = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
export const formatDate = (date, options = { day: "numeric", month: "short", year: "numeric" }) => new Intl.DateTimeFormat("id-ID", options).format(new Date(date));

export async function visibleEvents() {
  const events = await getAvailableEvents();
  return Array.isArray(events) ? events : [];
}

export async function login(email, password) {
  const url = "/api/auth/login";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      email,
      password,
      audience: "CUSTOMER",
    }),
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  let data = {};
  if (contentType.includes("application/json")) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  } else {
    throw new Error(`Server mengembalikan non-JSON (${response.status} ${response.statusText}): ${text.slice(0, 80)}`);
  }

  if (!response.ok) {
    throw new Error(data.message || `Email atau kata sandi tidak cocok (${response.status}). Pastikan menggunakan Summarecon2026!.`);
  }

  const token = data.data?.token || data.data?.session_token || data.token || data.session_token;
  if (token) {
    document.cookie = `summa_customer_session=${token}; path=/; max-age=86400; SameSite=Lax`;
    localStorage.setItem("summa_customer_session", token);
  }

  const user = data.data?.user || data.user || {
    user_id: "USR-CUSTOMER",
    full_name: email.split("@")[0],
    email: email,
  };

  setSession(user);
  return user;
}

export async function register(values) {
  const url = "/api/auth/register";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      full_name: values.name,
      email: values.email,
      phone_number: values.phone,
      password: values.password,
    }),
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  let data = {};
  if (contentType.includes("application/json")) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  } else {
    throw new Error(`Server mengembalikan non-JSON (${response.status} ${response.statusText}): ${text.slice(0, 80)}`);
  }

  if (!response.ok) {
    throw new Error(data.message || "Gagal membuat akun.");
  }

  const user = data.data?.user || data.user || {
    user_id: "USR-CUSTOMER",
    full_name: values.name,
    email: values.email,
  };

  setSession(user);
  return user;
}

export function logout() {
  clearSession();
}

export function computeSectionCounters(event, sections) {
  const seats = getTable("event_seats").filter((seat) => seat.event_id === event.event_id);
  return sections.map((section) => {
    if (section.booking_type !== "BOOK_BY_SEAT") return section;
    const ownSeats = seats.filter((seat) => seat.section_id === section.section_id);
    const sold = ownSeats.filter((seat) => seat.status === "SOLD").length;
    const blocked = ownSeats.filter((seat) => seat.status === "BLOCKED").length;
    const reserved = ownSeats.filter((seat) => seat.status === "LOCKED").length;
    return { ...section, sold_quantity: sold, blocked_quantity: blocked, reserved_quantity: reserved, available_quantity: ownSeats.length - sold - blocked - reserved };
  });
}

export function selectionQuantity(selection) {
  return selection.reduce((quantity, item) => quantity + (item.kind === "section" ? Number(item.quantity) : 1), 0);
}

function expireOldHolds() {
  const holds = getTable("booking_holds");
  const orders = getTable("orders");
  const payments = getTable("payments");
  const seats = getTable("event_seats");
  let changed = false;
  const now = Date.now();
  const nextHolds = holds.map((hold) => {
    if (hold.status !== "ACTIVE" || Date.parse(hold.reserved_until) > now) return hold;
    const holdOrder = orders.find((order) => order.order_id === hold.order_id);
    const latestPayment = payments.filter((payment) => payment.order_id === hold.order_id).at(-1);
    if (latestPayment?.payment_status === "SUCCESS"
      || (latestPayment?.payment_status === "PENDING" && Date.parse(latestPayment.expires_at) > now)) return hold;
    changed = true;
    const seatIds = hold.event_seat_ids ?? [];
    for (const seat of seats) if (seatIds.includes(seat.event_seat_id) && seat.status === "LOCKED") seat.status = "AVAILABLE";
    if (hold.section_id) {
      const sections = getTable("event_sections");
      const section = sections.find((item) => item.section_id === hold.section_id);
      if (section) {
        section.reserved_quantity = Math.max(0, section.reserved_quantity - (hold.quantity ?? 0));
        section.available_quantity += hold.quantity ?? 0;
        writeTable("event_sections", sections);
      }
    }
    if (holdOrder && holdOrder.order_status === "PENDING") holdOrder.order_status = "EXPIRED";
    return { ...hold, status: "RELEASED_EXPIRED", released_at: new Date().toISOString(), release_reason: "HOLD_TIMEOUT_AFTER_PAYMENT_STATUS_CHECK" };
  });
  if (changed) {
    writeTable("event_seats", seats);
    writeTable("orders", orders);
    writeTable("booking_holds", nextHolds);
  }
}

export function createHold(event, selection) {
  const user = getCurrentUser();
  if (!user || user.role_id !== "ROLE-CUSTOMER") throw new Error("Masuk dengan akun pelanggan sebelum melanjutkan.");
  if (event.event_status !== "SALES_OPEN") throw new Error("Penjualan tiket untuk acara ini tidak aktif.");
  const now = Date.now();
  if (now < Date.parse(event.sales_start_at) || now > Date.parse(event.sales_end_at)) throw new Error("Periode penjualan tiket belum dibuka atau sudah ditutup.");
  if (getTable("system_settings").booking.queue_enabled) {
    const queueEntry = getTable("queue_entries").find((entry) => entry.event_id === event.event_id && entry.user_id === user.user_id);
    if (queueEntry?.status !== "SERVED") throw new Error("Selesaikan antrean acara sebelum memilih tiket.");
  }
  expireOldHolds();
  const currentHolds = getTable("booking_holds");
  if (currentHolds.some((hold) => hold.user_id === user.user_id && hold.event_id === event.event_id && hold.status === "ACTIVE")) {
    throw new Error("Kamu masih memiliki hold aktif untuk acara ini.");
  }
  const quantity = selectionQuantity(selection);
  if (quantity < 1 || quantity > MAX_TICKETS_PER_ORDER) throw new Error(`Pilih 1–${MAX_TICKETS_PER_ORDER} tiket.`);

  const seats = getTable("event_seats");
  const sections = getTable("event_sections");
  const until = new Date(now + HOLD_MINUTES * 60_000).toISOString();
  const seatIds = [...new Set(selection.filter((item) => item.kind === "seat").map((item) => item.id))];
  const sectionSelections = selection.filter((item) => item.kind === "section");
  if (seatIds.length && sectionSelections.length) throw new Error("Pilih kursi atau kuota dalam satu pesanan, bukan keduanya.");
  if (seatIds.length !== selection.filter((item) => item.kind === "seat").length) throw new Error("Pilihan kursi duplikat tidak diizinkan.");
  if (seatIds.some((id) => !seats.some((seat) => seat.event_seat_id === id && seat.event_id === event.event_id && seat.status === "AVAILABLE"))) {
    throw new Error("Satu atau beberapa kursi baru saja diambil. Pilih kursi lain.");
  }
  for (const item of sectionSelections) {
    const section = sections.find((candidate) => candidate.section_id === item.sectionId && candidate.event_id === event.event_id);
    if (!section || section.booking_type === "BOOK_BY_SEAT" || section.inventory_status !== "ACTIVE" || !Number.isInteger(item.quantity) || item.quantity < 1 || section.available_quantity < item.quantity) {
      throw new Error("Kuota tiket baru saja berubah. Perbarui pilihanmu.");
    }
  }
  if (sectionSelections.length > 1) throw new Error("Satu pesanan kuota hanya dapat memilih satu section.");

  const holdId = nextId("HLD");
  const hold = {
    hold_id: holdId, event_id: event.event_id, user_id: user.user_id, order_id: null,
    event_seat_ids: seatIds, section_id: sectionSelections[0]?.sectionId ?? null,
    quantity, hold_started_at: new Date(now).toISOString(),
    reserved_until: until, status: "ACTIVE",
  };
  for (const seat of seats) if (seatIds.includes(seat.event_seat_id)) seat.status = "LOCKED";
  writeTable("event_seats", seats);

  for (const item of sectionSelections) {
    const section = sections.find((candidate) => candidate.section_id === item.sectionId && candidate.event_id === event.event_id);
    section.available_quantity -= item.quantity;
    section.reserved_quantity += item.quantity;
  }
  if (sectionSelections.length) writeTable("event_sections", sections);
  writeTable("booking_holds", [...currentHolds, hold]);
  return hold;
}

export function releaseHold(holdId) {
  const holds = getTable("booking_holds");
  const hold = holds.find((item) => item.hold_id === holdId);
  if (!hold || hold.status !== "ACTIVE") return;
  const payment = getTable("payments").filter((item) => item.order_id === hold.order_id).at(-1);
  if (payment?.payment_status === "SUCCESS") throw new Error("Pembayaran berhasil; hold tidak dapat dilepas.");
  const seats = getTable("event_seats");
  for (const seat of seats) if (hold.event_seat_ids?.includes(seat.event_seat_id) && seat.status === "LOCKED") seat.status = "AVAILABLE";
  writeTable("event_seats", seats);
  if (hold.section_id) {
    const sections = getTable("event_sections");
    const section = sections.find((item) => item.section_id === hold.section_id);
    if (section) {
      section.reserved_quantity = Math.max(0, section.reserved_quantity - (hold.quantity ?? 0));
      section.available_quantity += hold.quantity ?? 0;
      writeTable("event_sections", sections);
    }
  }
  writeTable("booking_holds", holds.map((item) => item.hold_id === holdId ? { ...item, status: "RELEASED_EXPIRED", released_at: new Date().toISOString() } : item));
}

export async function createOrder(holdId, participants, buyer) {
  const hold = getTable("booking_holds").find((item) => item.hold_id === holdId && item.status === "ACTIVE");
  if (!hold || Date.parse(hold.reserved_until) <= Date.now()) throw new Error("Waktu hold sudah habis. Pilih tiket kembali.");
  if (hold.order_id) throw new Error("Pesanan untuk hold ini sudah dibuat.");
  const user = getCurrentUser();
  if (!user || hold.user_id !== user.user_id) throw new Error("Akses pesanan tidak tersedia.");
  if (participants.length !== hold.quantity || participants.some((name) => !name.trim())) throw new Error("Nama peserta wajib diisi untuk setiap tiket.");
  if (!buyer?.name?.trim() || !buyer?.email?.trim() || !buyer?.phone?.trim()) throw new Error("Data pemesan belum lengkap.");
  const data = await loadSeed();
  const event = data.events.find((item) => item.event_id === hold.event_id);
  const eventSections = getTable("event_sections").filter((section) => section.event_id === hold.event_id);
  const categories = data.ticket_categories.filter((category) => category.event_id === hold.event_id);
  const seats = getTable("event_seats");
  if (!event || event.event_status !== "SALES_OPEN") throw new Error("Penjualan tiket untuk acara ini tidak aktif.");
  let resolvedSelection;
  if (hold.event_seat_ids?.length) {
    const heldSeats = hold.event_seat_ids.map((seatId) => seats.find((seat) => seat.event_seat_id === seatId && seat.event_id === hold.event_id && seat.status === "LOCKED"));
    if (heldSeats.some((seat) => !seat)) throw new Error("Status kursi pada hold berubah. Silakan pilih kembali.");
    resolvedSelection = heldSeats.map((seat) => {
      const section = eventSections.find((item) => item.section_id === seat.section_id);
      const category = categories.find((item) => item.event_section_id === section?.event_section_id);
      if (!section || !category) throw new Error("Kategori harga kursi tidak ditemukan.");
      return { kind: "seat", id: seat.event_seat_id, label: seat.seat_label, sectionId: section.section_id, sectionName: section.section_name, category: category.category_name, price: category.price };
    });
  } else {
    const section = eventSections.find((item) => item.section_id === hold.section_id && item.inventory_status === "ACTIVE");
    const category = categories.find((item) => item.event_section_id === section?.event_section_id);
    if (!section || !category || section.reserved_quantity < hold.quantity) throw new Error("Hold kuota tidak lagi tersedia.");
    resolvedSelection = Array.from({ length: hold.quantity }, () => ({
      kind: "section", id: section.section_id, label: section.section_name,
      sectionId: section.section_id, sectionName: section.section_name,
      category: category.category_name, price: category.price,
    }));
  }
  const prices = resolvedSelection.map((item) => item.price);
  const total = prices.reduce((sum, price) => sum + price, 0);
  const orderId = nextId("ORD");
  const paymentId = nextId("PAY");
  const order = {
    order_id: orderId, order_code: orderId, event_id: event.event_id, user_id: user.user_id,
    buyer_snapshot: { full_name: buyer.name, email: buyer.email, phone_number: buyer.phone },
    participant_names: participants, selection: resolvedSelection,
    order_status: "PENDING", quantity: hold.quantity, subtotal: total, discount_amount: 0,
    admin_fee: 0, total_amount: total, currency: "IDR", created_at: new Date().toISOString(),
  };
  const payment = {
    payment_id: paymentId, order_id: orderId, provider: "MOCK_SANDBOX", payment_method: "QRIS",
    amount: total, currency: "IDR", payment_status: "PENDING", initiated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + PAYMENT_PENDING_MINUTES * 60_000).toISOString(),
  };
  const holds = getTable("booking_holds").map((item) => item.hold_id === holdId ? { ...item, order_id: orderId } : item);
  writeTable("orders", [...getTable("orders"), order]);
  writeTable("payments", [...getTable("payments"), payment]);
  writeTable("booking_holds", holds);
  sessionStorage.removeItem("etvm_selection");
  return order;
}

export function processMockCallback(orderId, requestedStatus, invalidSignature = false) {
  if (!["SUCCESS", "FAILED", "PENDING", "EXPIRED"].includes(requestedStatus)) throw new Error("Status callback tidak valid.");
  const orders = getTable("orders");
  const order = orders.find((item) => item.order_id === orderId);
  if (!order || order.user_id !== getCurrentUser()?.user_id) throw new Error("Pesanan tidak ditemukan.");
  const payments = getTable("payments");
  const payment = payments.find((item) => item.order_id === orderId);
  if (!payment || payment.amount !== order.total_amount) throw new Error("Nominal pembayaran tidak cocok.");
  const callbacks = getTable("payment_gateway_callbacks");
  const idempotencyKey = invalidSignature
    ? `mock:${payment.payment_id}:invalid:${crypto.randomUUID()}`
    : `mock:${payment.payment_id}:${requestedStatus}`;
  const existing = callbacks.find((item) => item.idempotency_key === idempotencyKey);
  if (existing) return { status: existing.processing_result, duplicate: true };
  const terminal = ["SUCCESS", "FAILED", "EXPIRED"].includes(payment.payment_status);
  const ignoredTerminal = terminal && payment.payment_status !== requestedStatus
    && !(payment.payment_status !== "SUCCESS" && requestedStatus === "SUCCESS");
  const callback = {
    callback_id: nextId("CB"), payment_id: payment.payment_id, provider_event_id: nextId("EVT"),
    event_type: requestedStatus, received_at: new Date().toISOString(),
    signature_valid: !invalidSignature, idempotency_key: idempotencyKey,
    processing_result: invalidSignature ? "REJECTED_SIGNATURE" : ignoredTerminal ? "IGNORED_TERMINAL_STATUS" : requestedStatus,
  };
  writeTable("payment_gateway_callbacks", [...callbacks, callback]);
  if (invalidSignature) return { status: "REJECTED_SIGNATURE", duplicate: false };
  if (ignoredTerminal) return { status: "IGNORED_TERMINAL_STATUS", duplicate: false };

  let hold = getTable("booking_holds").find((item) => item.order_id === orderId);
  const seats = getTable("event_seats");
  const sections = getTable("event_sections");
  if (requestedStatus === "SUCCESS" && payment.payment_status !== "SUCCESS" && hold?.status !== "ACTIVE") {
    if (!hold) {
      writeTable("payments", payments.map((item) => item.payment_id === payment.payment_id ? { ...item, payment_status: "SUCCESS", paid_at: new Date().toISOString() } : item));
      writeTable("orders", orders.map((item) => item.order_id === orderId ? { ...item, reconciliation_required: true } : item));
      const callbacksAfter = getTable("payment_gateway_callbacks");
      writeTable("payment_gateway_callbacks", callbacksAfter.map((item) => item.idempotency_key === idempotencyKey ? { ...item, processing_result: "NEEDS_ADMIN_ALLOCATION" } : item));
      return { status: "NEEDS_ADMIN_ALLOCATION", duplicate: false };
    }
    const targetSeats = seats.filter((seat) => hold.event_seat_ids?.includes(seat.event_seat_id));
    const section = sections.find((item) => item.section_id === hold.section_id);
    const canRestoreSeats = hold.event_seat_ids?.length > 0
      && targetSeats.length === hold.event_seat_ids.length
      && targetSeats.every((seat) => seat.status === "AVAILABLE");
    const canRestoreQuota = !hold.event_seat_ids?.length && section && section.available_quantity >= order.quantity;
    if (!canRestoreSeats && !canRestoreQuota) {
      writeTable("payments", payments.map((item) => item.payment_id === payment.payment_id ? { ...item, payment_status: "SUCCESS", paid_at: new Date().toISOString() } : item));
      writeTable("orders", orders.map((item) => item.order_id === orderId ? { ...item, reconciliation_required: true } : item));
      const callbacksAfter = getTable("payment_gateway_callbacks");
      writeTable("payment_gateway_callbacks", callbacksAfter.map((item) => item.idempotency_key === idempotencyKey ? { ...item, processing_result: "NEEDS_ADMIN_ALLOCATION" } : item));
      return { status: "NEEDS_ADMIN_ALLOCATION", duplicate: false };
    }
    if (canRestoreSeats) for (const seat of targetSeats) seat.status = "LOCKED";
    if (canRestoreQuota) {
      section.available_quantity -= order.quantity;
      section.reserved_quantity += order.quantity;
    }
    writeTable("event_seats", seats);
    writeTable("event_sections", sections);
    hold = { ...hold, status: "ACTIVE", reserved_until: new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString() };
    writeTable("booking_holds", getTable("booking_holds").map((item) => item.order_id === orderId ? hold : item));
  }

  writeTable("payments", payments.map((item) => item.payment_id === payment.payment_id ? { ...item, payment_status: requestedStatus, paid_at: requestedStatus === "SUCCESS" ? new Date().toISOString() : item.paid_at } : item));
  if (requestedStatus === "SUCCESS") {
    writeTable("orders", orders.map((item) => item.order_id === orderId ? { ...item, order_status: "PAID", reconciliation_required: false, paid_at: new Date().toISOString() } : item));
    const existingTickets = getTable("tickets");
    if (!existingTickets.some((ticket) => ticket.order_id === orderId)) {
      const heldSection = sections.find((section) => section.section_id === hold?.section_id);
      if (heldSection) {
        heldSection.reserved_quantity = Math.max(0, heldSection.reserved_quantity - order.quantity);
        heldSection.sold_quantity += order.quantity;
        writeTable("event_sections", sections);
      }
      const eventTickets = Array.from({ length: order.quantity }, (_, index) => {
        const seatId = hold?.event_seat_ids?.[index] ?? null;
        const seat = seats.find((item) => item.event_seat_id === seatId);
        const section = sections.find((item) => seat ? item.section_id === seat.section_id : item.section_id === hold?.section_id);
        const ticketId = nextId("TKT");
        return {
          ticket_id: ticketId, ticket_code: ticketId, order_id: orderId, event_id: order.event_id,
          participant_name: order.participant_names[index], attendee_sequence: index + 1,
          event_section_id: section.event_section_id, event_seat_id: seatId, ticket_status: "ISSUED",
          attendance_status: "NOT_CHECKED_IN", issued_at: new Date().toISOString(),
        };
      });
      for (const seat of seats) if (hold?.event_seat_ids?.includes(seat.event_seat_id)) seat.status = "SOLD";
      writeTable("event_seats", seats);
      writeTable("tickets", [...existingTickets, ...eventTickets]);
      const opaqueToken = crypto.randomUUID();
      writeTable("e_tickets", [...getTable("e_tickets"), {
        e_ticket_id: nextId("ETK"), order_id: orderId, event_id: order.event_id,
        qr_token: opaqueToken, issued_at: new Date().toISOString(), ticket_quantity_at_issue: order.quantity,
        valid_ticket_count: order.quantity, successful_scan_count: 0, max_successful_scan_count: order.quantity,
        ticket_status_summary: "ISSUED",
      }]);
    }
    const holds = getTable("booking_holds");
    writeTable("booking_holds", holds.map((item) => item.order_id === orderId ? { ...item, status: "CONVERTED" } : item));
  } else if (requestedStatus === "FAILED" || requestedStatus === "EXPIRED") {
    const orderStatus = requestedStatus === "FAILED" ? "CANCELLED" : "EXPIRED";
    writeTable("orders", orders.map((item) => item.order_id === orderId ? { ...item, order_status: orderStatus } : item));
    const hold = getTable("booking_holds").find((item) => item.order_id === orderId);
    if (hold) releaseHold(hold.hold_id);
  }
  return { status: requestedStatus, duplicate: false };
}

export function accountOrders() {
  const user = getCurrentUser();
  if (!user) return [];
  return getTable("orders").filter((order) => order.user_id === user.user_id);
}
