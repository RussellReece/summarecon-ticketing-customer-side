import { getAvailableEvents, getEvent, loadSeed } from "./lib/data.js";
import { accountOrders, computeSectionCounters, createHold, createOrder, formatDate, login, logout, processMockCallback, register, releaseHold, rupiah, selectionQuantity, statusLabel } from "./lib/services.js";
import { getCurrentUser, getTable, resetDemo, setSession, writeTable } from "./lib/repository.js";
import { MAX_TICKETS_PER_ORDER } from "./lib/config.js";
import { statusTone } from "./lib/status-mapper.js";

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));
const statusClass = (status) => ({ success: "", warning: "waiting", error: "error", neutral: "neutral", info: "neutral" }[statusTone(status)]);
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function safeReturnUrl(candidate, fallback = "/account/orders") {
  return candidate?.startsWith("/") && !candidate.startsWith("//") ? candidate : fallback;
}

function navigate(path) {
  history.pushState({}, "", path);
  window.scrollTo(0, 0);
  render();
}

function header() {
  const user = getCurrentUser();
  return `<header class="site-header"><div class="shell nav">
    <a class="brand" href="/" data-nav><span class="brand-flower" aria-hidden="true">✿</span><span>Summarecon <em>Tickets</em></span></a>
    <nav class="nav-links" aria-label="Navigasi utama">
      <a href="/" data-nav>Acara</a>
      <a href="/account/orders" data-nav>Tiket saya</a>
      <a href="/account/profile" data-nav>Bantuan</a>
    </nav>
    <a class="nav-action" href="${user ? "/account/profile" : "/login"}" data-nav>${user ? escapeHTML(user.full_name.split(" ")[0]) : "Masuk"}</a>
  </div></header>`;
}

function footer() {
  return `<footer class="footer"><div class="shell footer-row">
    <div><strong>Summarecon Tickets · Bandung</strong><p>Ticketing portal resmi untuk acara di Summarecon Mall Bandung.</p></div>
    <div><p>Terhubung langsung dengan Live API</p></div>
  </div></footer>`;
}

function page(content) {
  app.innerHTML = `${header()}<main class="main">${content}</main>${footer()}`;
}

function loadingPage() {
  app.innerHTML = `<main class="loading-screen" aria-live="polite"><span class="bloom-mark" aria-hidden="true">✿</span><p>Memuat data acara dari live API…</p></main>`;
}

function errorPage(error) {
  page(`<section class="shell page"><div class="error-state"><span class="status error">Ada kendala</span><h1>Halaman belum dapat dimuat</h1><p>${escapeHTML(error.message)}</p><button class="button button-primary" data-action="retry">Coba lagi</button></div></section>`);
  document.querySelector("[data-action=retry]")?.addEventListener("click", () => render());
}

function normalizeEventItem(raw) {
  const id = raw.slug || raw.id || raw.event_id || "event";
  const name = raw.title || raw.event_name || "Acara Summarecon";
  const status = raw.status || raw.event_status || "SALES_OPEN";
  const startAt = raw.start_at || raw.event_date || "2026-12-20T10:00:00";
  const venueObj = typeof raw.venue === "object" && raw.venue !== null ? raw.venue : null;
  const venueName = venueObj ? (venueObj.name || venueObj.venue_name || "Summarecon Mall Bandung") : (raw.venue_name || raw.venue || "Summarecon Mall Bandung");
  const venueId = raw.venue_id || (venueObj ? venueObj.id || venueObj.venue_id : "VEN-DWT-001");
  const price = Number(raw.price_from || raw.priceFrom || (raw.ticket_categories?.[0]?.price ?? 150000));
  const description = raw.description || "";

  return {
    ...raw,
    event_id: id,
    event_name: name,
    event_status: status,
    start_at: startAt,
    venue_id: venueId,
    venue_name: venueName,
    price,
    description,
  };
}

function eventArt(event) {
  const date = new Date(event.start_at);
  const month = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "Asia/Jakarta" }).format(date);
  return `<div class="event-art ${event.event_status === "CANCELLED" ? "cancelled" : ""}">
    <span class="event-status"><span class="status ${statusClass(event.event_status)}">${escapeHTML(statusLabel(event.event_status))}</span></span>
    <span class="date-tile"><strong>${date.getDate() || 20}</strong><small>${escapeHTML(month || "DES")}</small></span>
    <span class="event-art-title">${escapeHTML(event.event_name)}</span>
    <span class="event-venue-caption">${escapeHTML(event.venue_name)}</span>
  </div>`;
}

function eventCard(rawEvent) {
  const event = normalizeEventItem(rawEvent);
  return `<article class="event-card">
    <a href="/events/${encodeURIComponent(event.event_id)}" data-nav aria-label="Lihat ${escapeHTML(event.event_name)}">${eventArt(event)}</a>
    <div class="event-body">
      <span class="eyebrow">${escapeHTML(event.venue_name)} · ${escapeHTML(event.event_status === "COMPLETED" ? "ARSIP ACARA" : "SUMMARECON MALL BANDUNG")}</span>
      <h3><a href="/events/${encodeURIComponent(event.event_id)}" data-nav>${escapeHTML(event.event_name)}</a></h3>
      <p class="event-meta">◷ ${escapeHTML(formatDate(event.start_at, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }))} WIB</p>
      <div class="event-bottom"><span><small>Mulai dari</small><strong>${escapeHTML(rupiah(event.price))}</strong></span>
      <a class="button button-secondary" href="/events/${encodeURIComponent(event.event_id)}" data-nav>Lihat acara →</a></div>
    </div>
  </article>`;
}

async function homePage() {
  loadingPage();
  try {
    const rawEvents = await getAvailableEvents();
    const events = (Array.isArray(rawEvents) ? rawEvents : []).map(normalizeEventItem);
    const initial = events.length
      ? events.map((event) => eventCard(event)).join("")
      : `<div class="empty-state"><span class="empty-mark">✿</span><h3>Belum ada acara yang dibuka.</h3></div>`;

    page(`<section class="hero"><div class="shell hero-grid">
        <div class="hero-copy"><span class="eyebrow">MOMEN SERU DI SUMMARECON MALL BANDUNG</span>
          <h1>Acara seru,<br>cerita <span>baru.</span></h1>
          <p>Temukan acara, pilih tempat terbaik, dan simpan momen bersama. Terhubung langsung dengan live API Summarecon.</p>
          <a class="button button-primary" href="#events">Jelajahi acara <span aria-hidden="true">↓</span></a>
        </div>
        <div class="hero-art" aria-hidden="true"><i class="petal"></i><i class="petal"></i><i class="petal"></i><i class="petal"></i><i class="petal"></i><i class="petal-core"></i></div>
        <div class="hero-location">⌖ SUMMARECON MALL · BANDUNG</div>
      </div></section>
      <section class="shell search-panel" aria-label="Cari acara">
        <div class="field"><label for="event-search">Cari acara</label><input id="event-search" type="search" placeholder="Konser, pameran…"></div>
        <button class="button button-primary" data-action="apply-filters">Cari acara</button>
      </section>
      <section class="shell section" id="events">
        <div class="section-head"><div><span class="eyebrow">PILIHAN UNTUKMU (LIVE API)</span><h2>Temukan acaramu.</h2></div><span class="muted" id="event-count">${events.length} acara</span></div>
        <div class="category-row" aria-label="Filter status acara"><button class="chip" aria-pressed="true" data-category="">✿ Semua acara</button><button class="chip" aria-pressed="false" data-category="SALES_OPEN">Tiket tersedia</button></div>
        <div class="event-grid" id="event-grid">${initial}</div>
      </section>`);

    const filter = () => {
      const query = document.querySelector("#event-search")?.value.trim().toLocaleLowerCase("id") || "";
      const filtered = events.filter((event) => {
        return `${event.event_name} ${event.description} ${event.venue_name}`.toLocaleLowerCase("id").includes(query);
      });
      const grid = document.querySelector("#event-grid");
      if (grid) {
        grid.innerHTML = filtered.length
          ? filtered.map((event) => eventCard(event)).join("")
          : `<div class="empty-state"><span class="empty-mark">✿</span><h3>Belum ada acara yang cocok.</h3><p>Coba ubah kata kunci pencarian.</p></div>`;
      }
      const count = document.querySelector("#event-count");
      if (count) count.textContent = `${filtered.length} acara`;
    };
    document.querySelector("#event-search")?.addEventListener("input", filter);
    document.querySelector("[data-action=apply-filters]")?.addEventListener("click", filter);
  } catch (error) {
    console.error("[homePage] Error loading live events:", error);
    errorPage(error);
  }
}

function mapAsset(venueId) {
  if (venueId === "VEN-DWT-001") return "/maps/downtown-walk.svg";
  if (venueId === "VEN-ATR-001") return "/maps/atrium-cibadak.svg";
  if (venueId === "VEN-SWG-001") return "/maps/sawarga-option-b.svg";
  return "/maps/master-site.svg";
}

async function eventDetail(eventId) {
  const event = await getEvent(eventId);
  const seed = await loadSeed();
  const start = formatDate(event.start_at, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  const categories = event.categories;
  const enabled = event.event_status === "SALES_OPEN";
  const bookingLink = seed.system_settings.booking.queue_enabled && enabled
    ? `/events/${eventId}/queue`
    : `/events/${eventId}/booking`;
  const button = enabled
    ? `<a class="button button-primary button-block" href="${bookingLink}" data-nav>Pilih tiket · Lanjut</a>`
    : `<button class="button button-primary button-block" disabled>${event.event_status === "CANCELLED" ? "Penjualan tidak tersedia" : "Penjualan selesai"}</button>`;
  const types = [...new Set(event.sections.map((section) => section.booking_type))];
  const bookingNames = { BOOK_BY_SEAT: "Pilih kursi bernomor", BOOK_BY_QUOTA: "Pilih kuota area", STANDING: "Tiket standing" };
  const bookingTypes = types.map((type) => `<span class="chip">${escapeHTML(bookingNames[type] ?? type)}</span>`).join("");
  const minPrice = categories.reduce((min, item) => Math.min(min, item.price), Number.POSITIVE_INFINITY);
  page(`<section class="shell page">
    <a class="breadcrumb" href="/" data-nav>← Semua acara</a>
    <div class="detail-hero"><div><span class="eyebrow" style="color:white">${escapeHTML(event.venue?.venue_name)} · BANDUNG</span><h1>${escapeHTML(event.event_name)}</h1><p>${escapeHTML(event.description)}</p><span class="status ${statusClass(event.event_status)}">${escapeHTML(statusLabel(event.event_status))}</span></div></div>
    <div class="detail-grid">
      <div>
        <section class="card"><h2>Informasi acara</h2><p>◷ ${escapeHTML(start)} WIB</p><p>⌖ ${escapeHTML(event.venue?.venue_name)} · ${escapeHTML(event.venue?.location_label ?? "Summarecon Mall Bandung")}</p><p>Jenis tiket</p>        <div class="category-row">${bookingTypes || "<span class='muted'>Informasi tiket belum tersedia</span>"}</div>
        <h3>Kategori tiket</h3>${categories.map((category) => `<div class="ticket-category"><span>${escapeHTML(category.category_name)}</span><strong>${escapeHTML(rupiah(category.price))}</strong></div>`).join("")}
        <img class="map-preview" style="margin-top:18px" src="${mapAsset(event.venue_id)}" alt="Denah konseptual terbaru untuk ${escapeHTML(event.venue?.venue_name)}"><p class="prototype-note">Konsep prototype — bukan denah terukur atau kapasitas resmi.</p></section>
        <section class="card" style="margin-top:16px"><h2>Informasi pembelian</h2><p>Pengajuan refund peserta dapat dilakukan hingga 24 jam sebelum acara. Pengembalian dana diproses manual setelah peninjauan.</p><p>Perubahan nama peserta mengikuti batas waktu H-1. Kapasitas contoh (prototype).</p></section>
      </div>
      <aside class="card"><span class="eyebrow">TIKET ACARA</span><h2 style="margin-top:8px">Mulai ${Number.isFinite(minPrice) ? escapeHTML(rupiah(minPrice)) : "—"}</h2><p class="muted">Harga mengikuti kategori tiket yang tersedia.</p>${button}<p class="prototype-note" style="margin-top:14px">Mode prototype. Layout dan kapasitas harus divalidasi pengelola mal.</p></aside>
    </div>
  </section>`);
}

async function queuePage(eventId) {
  const event = await getEvent(eventId);
  const user = getCurrentUser();
  if (!user) return navigate(`/login?returnUrl=${encodeURIComponent(`/events/${eventId}/queue`)}`);
  const entries = getTable("queue_entries");
  let entry = entries.find((item) => item.event_id === eventId && item.user_id === user.user_id);
  if (!entry) {
    const waiting = entries.filter((item) => item.event_id === eventId && item.status === "WAITING");
    entry = {
      queue_entry_id: `QUE-${Date.now()}`, event_id: eventId, user_id: user.user_id,
      queue_number: waiting.length ? Math.max(...waiting.map((item) => item.queue_number)) + 1 : 19,
      entered_at: new Date().toISOString(), status: "WAITING",
    };
    writeTable("queue_entries", [...entries, entry]);
  }
  const waiting = entry.status === "WAITING";
  page(`<section class="shell page"><a class="breadcrumb" href="/events/${eventId}" data-nav>← Detail acara</a><div class="card" style="max-width:680px;margin:18px auto;text-align:center;padding:32px">
    <span class="eyebrow">ANTREAN TIKET · SIMULASI</span><h1 style="margin-top:12px">Nomor antrean ${entry.queue_number}</h1>
    <p class="muted">Antrean diproses FIFO per acara. Ini simulasi prototype, bukan estimasi waktu tunggu.</p>
    <span class="status ${waiting ? "waiting" : ""}">${waiting ? "Menunggu giliran" : "Giliran tersedia"}</span>
    <p style="margin-top:18px">Acara: <strong>${escapeHTML(event.event_name)}</strong></p>
    ${waiting ? `<button class="button button-primary" data-action="queue-turn" data-event="${escapeHTML(eventId)}">Simulasikan giliran saya</button>` : `<a class="button button-primary" data-nav href="/events/${eventId}/booking">Pilih tiket</a>`}
    <p class="prototype-note" style="margin-top:18px">Penekanan tombol ini hanya simulasi FIFO di browser dan tidak mengatur antrean nyata.</p>
  </div></section>`);
}

function readSelection() {
  return JSON.parse(sessionStorage.getItem("etvm_selection") ?? "[]");
}

function toggleSeat(seat) {
  let selection = readSelection();
  if (selection.some((item) => item.id === seat.event_seat_id)) {
    selection = selection.filter((item) => item.id !== seat.event_seat_id);
  } else if (selectionQuantity(selection) >= MAX_TICKETS_PER_ORDER) {
    showToast(`Maksimal ${MAX_TICKETS_PER_ORDER} tiket per pesanan.`);
    return;
  } else if (seat.status !== "AVAILABLE") {
    return;
  } else {
    const section = window.currentEvent.sections.find((item) => item.section_id === seat.section_id);
    const category = window.currentEvent.categories.find((item) => item.event_section_id === section.event_section_id);
    selection.push({ kind: "seat", id: seat.event_seat_id, label: seat.seat_label, sectionId: section.section_id, sectionName: section.section_name, category: category.category_name, price: category.price });
  }
  sessionStorage.setItem("etvm_selection", JSON.stringify(selection));
  renderBookingSummary();
  document.querySelectorAll("[data-seat]").forEach((button) => {
    const selected = selection.some((item) => item.id === button.dataset.seat);
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function renderBookingSummary() {
  const selected = readSelection();
  const total = selected.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0);
  const list = document.querySelector("#selection-list");
  const totalText = document.querySelector("#selection-total");
  const next = document.querySelector("#continue-booking");
  if (!list || !totalText || !next) return;
  list.innerHTML = selected.length ? selected.map((item) => `<div class="selection-row"><span>${escapeHTML(item.label ?? item.sectionName)} ${item.quantity ? `× ${item.quantity}` : ""}<small>${escapeHTML(item.category)}</small></span><strong>${escapeHTML(rupiah(item.price * (item.quantity ?? 1)))}</strong></div>`).join("") : `<p class="muted">Belum ada pilihan. Pilih kursi atau kategori di denah.</p>`;
  totalText.textContent = rupiah(total);
  next.disabled = selectionQuantity(selected) === 0;
  next.textContent = selectionQuantity(selected) ? `Lanjut · ${rupiah(total)}` : "Pilih tiket terlebih dahulu";
}

async function bookingPage(eventId) {
  const event = await getEvent(eventId);
  event.seats = getTable("event_seats").filter((seat) => seat.event_id === eventId);
  event.sections = getTable("event_sections").filter((section) => section.event_id === eventId);
  if (event.event_status !== "SALES_OPEN") {
    page(`<section class="shell page"><div class="error-state"><span class="status error">Penjualan tidak aktif</span><h1>Acara ini tidak membuka pemesanan.</h1><a class="button button-secondary" href="/events/${eventId}" data-nav>Kembali ke detail acara</a></div></section>`);
    return;
  }
  if (!getCurrentUser()) return navigate(`/login?returnUrl=${encodeURIComponent(`/events/${eventId}/booking`)}`);
  const settings = getTable("system_settings");
  if (settings.booking.queue_enabled) {
    const queueEntry = getTable("queue_entries").find((entry) => entry.event_id === eventId && entry.user_id === getCurrentUser().user_id);
    if (queueEntry?.status !== "SERVED") return navigate(`/events/${eventId}/queue`);
  }
  window.currentEvent = event;
  const selection = readSelection().filter((item) => item.kind !== "seat" || event.seats.some((seat) => seat.event_seat_id === item.id && seat.status === "AVAILABLE"));
  if (selection.length !== readSelection().length) {
    sessionStorage.setItem("etvm_selection", JSON.stringify(selection));
    showToast("Status denah berubah. Kursi yang tidak tersedia dilepas dari pilihan.");
  }
  const counters = computeSectionCounters(event, event.sections);
  const sectionsByBooking = counters.filter((section) => section.booking_type !== "BOOK_BY_SEAT");
  const seats = event.seats;
  const initialSeats = seats.map((seat) => {
    const x = seat.position?.x ?? 50;
    const y = seat.position?.y ?? 50;
    const label = seat.seat_label;
    const title = `${seat.row_label}${seat.seat_number}`;
    const selected = selection.some((item) => item.id === seat.event_seat_id);
    const style = `left:${x}%;top:${y}%`;
    return `<button type="button" class="seat ${seat.status.toLowerCase()} ${selected ? "selected" : ""}" data-seat="${escapeHTML(seat.event_seat_id)}" style="${style}" aria-label="Kursi ${escapeHTML(title)}, ${escapeHTML(statusLabel(seat.status))}" aria-pressed="${selected}" ${seat.status !== "AVAILABLE" ? "disabled" : ""} title="${escapeHTML(label)} · ${escapeHTML(statusLabel(seat.status))}">${escapeHTML(seat.seat_number)}</button>`;
  }).join("");
  const sectionOptions = sectionsByBooking.map((section) => {
    const category = event.categories.find((item) => item.event_section_id === section.event_section_id);
    const used = (section.sold_quantity ?? 0) + (section.reserved_quantity ?? 0);
    const percent = section.capacity ? Math.min(100, Math.round(used / section.capacity * 100)) : 0;
    return `<article class="quota-option" data-quota-option="${escapeHTML(section.event_section_id)}">
      <div class="section-head"><div><h3>${escapeHTML(section.section_name)}</h3><small>${escapeHTML(category?.category_name ?? "Tiket area")}</small></div><strong>${escapeHTML(rupiah(category?.price ?? 0))}</strong></div>
      <p class="prototype-note">${used} / ${section.capacity} terpakai · Kapasitas contoh (prototype)</p><div class="progress"><span style="width:${percent}%"></span></div>
      <div class="stepper"><button data-action="qty-minus" data-section="${escapeHTML(section.event_section_id)}" aria-label="Kurangi jumlah">−</button><output data-qty="${escapeHTML(section.event_section_id)}">0</output><button data-action="qty-plus" data-section="${escapeHTML(section.event_section_id)}" data-max="${Math.min(section.available_quantity, MAX_TICKETS_PER_ORDER)}" aria-label="Tambah jumlah">+</button></div>
    </article>`;
  }).join("");
  const hasSeats = event.sections.some((section) => section.booking_type === "BOOK_BY_SEAT");
  const seatMap = hasSeats ? `<div class="seat-canvas" role="group" aria-label="Denah kursi interaktif"><div class="stage">PANGGUNG</div><div class="map-context backstage">BACKSTAGE</div><div class="map-side left">SISI</div><div class="map-side right">SISI</div><div class="map-aisle">MAIN AISLE</div><div class="map-context a11y">A11Y</div><div class="map-context foh">FOH</div><div class="map-context checkin">CHECK-IN</div><div class="map-context exit">EXIT</div><div class="map-context rear-lane">REAR CIRCULATION / EGRESS · KEEP CLEAR</div>${initialSeats}</div>
    <div class="legend"><span><i></i>Tersedia</span><span><i class="l-held"></i>Terblokir / ditahan</span><span><i class="l-sold"></i>Terjual</span><span><i class="l-selected"></i>Pilihanmu</span></div>
    <p class="prototype-note" style="margin-top:14px">Seat map memakai koordinat <code>normalized_percent</code> dari seed. Maksimal ${MAX_TICKETS_PER_ORDER} tiket per pesanan (asumsi prototype). Kursi baru ditahan 10 menit setelah kamu menekan Lanjut.</p>` : `<div class="quota-grid">${sectionOptions}</div>`;
  page(`<section class="shell page"><a class="breadcrumb" href="/events/${eventId}" data-nav>← Detail acara</a>
    <div class="steps"><span class="step active"><b>1</b>Kursi</span><span class="muted">→</span><span class="step"><b>2</b>Data</span><span class="muted">→</span><span class="step"><b>3</b>Bayar</span><span class="muted">→</span><span class="step"><b>4</b>E-ticket</span></div>
    <div class="section-head"><div><span class="eyebrow">PILIH TIKET</span><h1 style="margin:8px 0">${escapeHTML(event.event_name)}</h1><p class="muted">Pilih sementara. Hold dimulai setelah tombol Lanjut.</p></div><span class="status neutral">Kapasitas contoh (prototype)</span></div>
    <div class="booking-layout"><section class="card"><h2>Denah event · ${escapeHTML(event.venue?.venue_name)}</h2>${seatMap}</section>
    <aside class="card selection-card"><span class="eyebrow">RINGKASAN PILIHAN</span><h2 style="margin-top:7px">Tiketmu</h2><div id="selection-list"></div><div class="selection-row"><strong>Total</strong><strong id="selection-total">${escapeHTML(rupiah(0))}</strong></div><button id="continue-booking" class="button button-primary button-block" data-action="continue-booking" data-event="${escapeHTML(eventId)}">Pilih tiket terlebih dahulu</button><p class="prototype-note" style="margin-top:14px">Kursi tetap tersedia selama kamu belum menekan Lanjut.</p></aside></div>
  </section>`);
  renderBookingSummary();
  document.querySelectorAll("[data-seat]").forEach((button) => button.addEventListener("click", () => {
    const seat = event.seats.find((item) => item.event_seat_id === button.dataset.seat);
    if (seat) toggleSeat(seat);
  }));
  document.querySelectorAll("[data-quota-option]").forEach((option) => option.addEventListener("click", (eventClick) => {
    if (eventClick.target.closest("button")) return;
    option.classList.toggle("selected");
  }));
}

function holdTime(hold) {
  const left = Math.max(0, Math.ceil((Date.parse(hold.reserved_until) - Date.now()) / 1000));
  return `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
}

async function participantsPage(holdId) {
  const hold = getTable("booking_holds").find((item) => item.hold_id === holdId && item.status === "ACTIVE");
  if (!hold || hold.user_id !== getCurrentUser()?.user_id) throw new Error("Hold tidak ditemukan atau tidak tersedia.");
  const event = await getEvent(hold.event_id);
  const draft = JSON.parse(sessionStorage.getItem("etvm_checkout_draft") ?? "{}");
  const selected = readSelection();
  const names = draft.participants ?? Array.from({ length: hold.quantity }, () => "");
  const user = getCurrentUser();
  page(`<section class="shell page"><a class="breadcrumb" href="/events/${hold.event_id}/booking" data-nav>← Kembali ke denah</a><div class="steps"><span class="step done"><b>✓</b>Kursi</span><span>→</span><span class="step active"><b>2</b>Data</span><span>→</span><span class="step"><b>3</b>Bayar</span><span>→</span><span class="step"><b>4</b>E-ticket</span></div>
    <div class="detail-grid"><section class="card"><h1>Data pemesan & peserta</h1><p class="muted">${escapeHTML(event.event_name)}</p><div class="timer"><span>⏱ Kursi ditahan untuk kamu</span><strong id="hold-countdown">${holdTime(hold)}</strong></div>
      <form id="participants-form"><h2>Data pemesan</h2><div class="form-grid">
        <div class="form-field"><label for="buyer-name">Nama pemesan</label><input id="buyer-name" name="buyerName" required value="${escapeHTML(draft.buyer?.name ?? user.full_name)}"></div>
        <div class="form-field"><label for="buyer-email">Email</label><input id="buyer-email" name="buyerEmail" type="email" required value="${escapeHTML(draft.buyer?.email ?? user.email)}"></div>
        <div class="form-field full"><label for="buyer-phone">Nomor telepon</label><input id="buyer-phone" name="buyerPhone" required value="${escapeHTML(draft.buyer?.phone ?? user.phone_number ?? "")}"></div>
      </div><h2 style="margin-top:22px">Nama peserta</h2>${names.map((name, index) => `<div class="form-field" style="margin:10px 0"><label for="participant-${index}">Peserta ${index + 1}</label><input id="participant-${index}" name="participant-${index}" required value="${escapeHTML(name)}"></div>`).join("")}<button class="button button-primary" type="submit">Lanjut ke ringkasan</button></form>
    </section><aside class="card"><h2>Ringkasan hold</h2><p>${hold.quantity} tiket · ${escapeHTML(event.venue?.venue_name)}</p><p class="prototype-note">Timer dihitung dari waktu server simulasi dan tidak direset saat halaman dimuat ulang.</p><button class="button button-secondary" data-action="release-hold" data-hold="${escapeHTML(holdId)}">Batalkan pilihan</button></aside></div></section>`);
  const holdTimer = setInterval(() => {
    const countdown = document.querySelector("#hold-countdown");
    if (!countdown) {
      clearInterval(holdTimer);
      return;
    }
    countdown.textContent = holdTime(hold);
    if (Date.parse(hold.reserved_until) <= Date.now()) {
      clearInterval(holdTimer);
      releaseHold(holdId);
      showToast("Waktu hold selesai. Pilih tiket kembali.");
      navigate(`/events/${hold.event_id}/booking`);
    }
  }, 1000);
  document.querySelector("#participants-form").addEventListener("submit", (eventSubmit) => {
    eventSubmit.preventDefault();
    const form = new FormData(eventSubmit.currentTarget);
    const buyer = { name: String(form.get("buyerName")).trim(), email: String(form.get("buyerEmail")).trim(), phone: String(form.get("buyerPhone")).trim() };
    const participants = Array.from({ length: hold.quantity }, (_, index) => String(form.get(`participant-${index}`)).trim());
    sessionStorage.setItem("etvm_checkout_draft", JSON.stringify({ holdId, buyer, participants, selection: selected }));
    navigate(`/checkout/${holdId}/summary`);
  });
}

async function summaryPage(holdId) {
  const draft = JSON.parse(sessionStorage.getItem("etvm_checkout_draft") ?? "{}");
  const hold = getTable("booking_holds").find((item) => item.hold_id === holdId && item.status === "ACTIVE");
  if (!hold || hold.user_id !== getCurrentUser()?.user_id || draft.holdId !== holdId) throw new Error("Ringkasan tidak tersedia.");
  const event = await getEvent(hold.event_id);
  const selected = draft.selection ?? [];
  const expandedSelection = selected.flatMap((item) => Array.from({ length: item.quantity ?? 1 }, () => item));
  const total = expandedSelection.reduce((sum, item) => sum + item.price, 0);
  page(`<section class="shell page"><a class="breadcrumb" href="/checkout/${holdId}/participants" data-nav>← Data peserta</a><div class="steps"><span class="step done"><b>✓</b>Kursi</span><span>→</span><span class="step done"><b>✓</b>Data</span><span>→</span><span class="step active"><b>3</b>Bayar</span><span>→</span><span class="step"><b>4</b>E-ticket</span></div>
    <div class="detail-grid"><section class="card"><h1>Ringkasan pesanan</h1><h2>${escapeHTML(event.event_name)}</h2><p class="muted">${escapeHTML(formatDate(event.start_at, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }))} · ${escapeHTML(event.venue?.venue_name)}</p>
      ${expandedSelection.map((item, index) => `<div class="selection-row"><span>${escapeHTML(item.label ?? item.sectionName)} · ${escapeHTML(draft.participants[index] ?? "")}</span><strong>${escapeHTML(rupiah(item.price))}</strong></div>`).join("")}
      <div class="selection-row"><strong>Total pembayaran</strong><strong>${escapeHTML(rupiah(total))}</strong></div><p class="prototype-note">Biaya admin Rp0 sesuai data prototype. Pembayaran QRIS hanya simulasi.</p>
    </section><aside class="card"><h2>Waktu tersisa</h2><div class="timer"><span>Hold tiket</span><strong>${holdTime(hold)}</strong></div><button class="button button-primary button-block" data-action="create-order" data-hold="${escapeHTML(holdId)}">Buat pesanan & lanjut bayar</button><p class="prototype-note" style="margin-top:12px">Tiket baru diterbitkan setelah callback sandbox tervalidasi.</p></aside></div></section>`);
}

async function paymentPage(orderId) {
  const order = getTable("orders").find((item) => item.order_id === orderId && item.user_id === getCurrentUser()?.user_id);
  if (!order) throw new Error("Pesanan tidak ditemukan atau tidak tersedia.");
  const payment = getTable("payments").find((item) => item.order_id === orderId);
  const event = await getEvent(order.event_id);
  if (order.order_status === "PAID") return navigate(`/payment/${orderId}/result`);
  const remaining = payment ? Math.max(0, Math.ceil((Date.parse(payment.expires_at) - Date.now()) / 1000)) : 0;
  page(`<section class="shell page"><a class="breadcrumb" href="/account/orders/${orderId}" data-nav>← Detail pesanan</a><div class="callout">Mode uji — pembayaran sandbox, tidak ada uang sungguhan.</div>
    <div class="payment-grid" style="margin-top:18px"><section class="card"><span class="eyebrow">PEMBAYARAN QRIS</span><h1 style="margin-top:9px">Selesaikan pembayaran.</h1><p>${escapeHTML(event.event_name)}</p><div class="selection-row"><span>Nominal</span><strong>${escapeHTML(rupiah(order.total_amount))}</strong></div><div class="selection-row"><span>Status pembayaran</span><span class="status ${statusClass(payment?.payment_status)}">${escapeHTML(statusLabel(payment?.payment_status))}</span></div><div class="timer"><span>Batas pembayaran</span><strong id="payment-countdown">${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}</strong></div>
      <p class="prototype-note">Status sukses hanya diproses melalui callback mock tervalidasi. Di prototype ini panel berikut adalah alat developer, bukan pembayaran nyata.</p>
    </section><aside class="card qris-panel"><h2>QRIS Sandbox</h2><div id="payment-qr" class="qr-wrap" aria-label="Kode pembayaran sandbox"><div class="qris-fallback">QRIS<br><small>SIMULASI</small></div></div><strong>${escapeHTML(rupiah(order.total_amount))}</strong><p class="prototype-note">Kode QR uji, tidak dapat dibayar oleh aplikasi bank.</p></aside></div>
    <section class="card" style="margin-top:18px"><span class="eyebrow">ALAT DEV · SIMULASI CALLBACK</span><h2 style="margin-top:8px">Uji hasil pembayaran</h2><p class="prototype-note">Setiap skenario melewati validasi signature, nominal, dan kunci idempotensi. Signature salah ditolak dan tidak mengubah status pembayaran.</p><div class="category-row">
      <button class="button button-primary" data-action="payment-callback" data-status="SUCCESS" data-order="${escapeHTML(orderId)}">Simulasikan callback sukses</button>
      <button class="button button-secondary" data-action="payment-callback" data-status="FAILED" data-order="${escapeHTML(orderId)}">Gagal</button>
      <button class="button button-secondary" data-action="payment-callback" data-status="PENDING" data-order="${escapeHTML(orderId)}">Pending</button>
      <button class="button button-secondary" data-action="payment-callback" data-status="EXPIRED" data-order="${escapeHTML(orderId)}">Kedaluwarsa</button>
      <button class="button button-secondary" data-action="payment-callback" data-status="EXPIRED" data-order="${escapeHTML(orderId)}">Pending lebih dari 7 menit</button>
      <button class="button button-secondary" data-action="payment-callback" data-status="SUCCESS" data-order="${escapeHTML(orderId)}" data-invalid-signature="true">Signature salah</button>
      <button class="button button-secondary" data-action="payment-callback" data-status="${escapeHTML(payment?.payment_status ?? "PENDING")}" data-order="${escapeHTML(orderId)}" data-duplicate="true">Callback duplikat</button>
    </div></section>
  </section>`);
  const code = window.qrcode(0, "M");
  code.addData(`MOCK-QRIS|${order.order_code}|${order.total_amount}|${payment?.expires_at ?? ""}`);
  code.make();
  document.querySelector("#payment-qr").innerHTML = code.createSvgTag(5, 2);
  const interval = setInterval(() => {
    const target = document.querySelector("#payment-countdown");
    if (!target) return clearInterval(interval);
    const left = Math.max(0, Math.ceil((Date.parse(payment.expires_at) - Date.now()) / 1000));
    target.textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
    if (!left && payment.payment_status === "PENDING") {
      clearInterval(interval);
      processMockCallback(orderId, "EXPIRED");
      showToast("Pembayaran kedaluwarsa setelah pemeriksaan status provider sandbox.");
      navigate(`/payment/${orderId}/result`);
    }
  }, 1000);
}

async function paymentResult(orderId) {
  const order = getTable("orders").find((item) => item.order_id === orderId && item.user_id === getCurrentUser()?.user_id);
  if (!order) throw new Error("Pesanan tidak ditemukan.");
  const payment = getTable("payments").find((item) => item.order_id === orderId);
  const success = payment?.payment_status === "SUCCESS" && order.order_status === "PAID";
  const reconciliation = order.reconciliation_required === true;
  const title = reconciliation ? "Pembayaran perlu direkonsiliasi." : success ? "Pembayaran berhasil." : "Status pesanan diperbarui.";
  const message = reconciliation
    ? "Pembayaran terkonfirmasi, tetapi inventori tidak tersedia untuk alokasi ulang. Tidak ada tiket yang diterbitkan; perlu penanganan admin."
    : success ? "E-ticket satu QR untuk pesanan ini sudah tersedia." : "Tiket tidak diterbitkan sebelum pembayaran berhasil.";
  page(`<section class="shell page"><div class="card" style="max-width:650px;margin:30px auto;text-align:center;padding:36px"><span class="status ${success ? "" : statusClass(payment?.payment_status)}">${escapeHTML(statusLabel(payment?.payment_status))}</span><h1 style="margin-top:15px">${title}</h1><p class="muted">${message}</p><div class="category-row" style="justify-content:center"><a class="button button-primary" href="${success ? `/account/orders/${orderId}/ticket` : `/account/orders/${orderId}`}" data-nav>${success ? "Buka e-ticket" : "Lihat pesanan"}</a>${payment?.payment_status === "EXPIRED" ? `<a class="button button-secondary" href="/payment/${orderId}" data-nav>Buka alat uji callback terlambat</a>` : ""}<a class="button button-secondary" href="/account/orders" data-nav>Pesanan saya</a></div></div></section>`);
}

async function ordersPage() {
  if (!getCurrentUser()) return navigate(`/login?returnUrl=${encodeURIComponent("/account/orders")}`);
  const seed = await loadSeed();
  const orders = accountOrders();
  const cards = orders.map((order) => {
    const event = seed.events.find((item) => item.event_id === order.event_id);
    const payment = getTable("payments").find((item) => item.order_id === order.order_id);
    return `<article class="order-card"><div><span class="eyebrow">${escapeHTML(order.order_code)}</span><h2 style="margin:6px 0">${escapeHTML(event?.event_name ?? "Acara")}</h2><p class="muted">${escapeHTML(formatDate(event?.start_at ?? order.created_at, { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }))} · ${order.quantity} tiket</p><span class="status ${statusClass(order.order_status)}">${escapeHTML(statusLabel(order.order_status))}</span> <span class="status ${statusClass(payment?.payment_status)}">${escapeHTML(statusLabel(payment?.payment_status))}</span></div><strong>${escapeHTML(rupiah(order.total_amount ?? 0))}</strong><div class="order-actions"><a class="button button-secondary" href="/account/orders/${order.order_id}" data-nav>Detail pesanan</a>${order.order_status === "PENDING" ? `<a class="button button-primary" href="/payment/${order.order_id}" data-nav>Lanjut bayar</a>` : ""}</div></article>`;
  }).join("");
  page(`<section class="shell page"><span class="eyebrow">AKUN SAYA</span><h1 style="margin:8px 0 22px">Pesanan dan tiket</h1>${cards || `<div class="empty-state"><span class="empty-mark">✿</span><h2>Belum ada pesanan</h2><a class="button button-primary" href="/" data-nav>Jelajahi acara</a></div>`}<p class="prototype-note">Informasi transaksi pada layar ini hanya menampilkan data milik akun demo yang sedang masuk.</p></section>`);
}

async function orderDetail(orderId) {
  const order = accountOrders().find((item) => item.order_id === orderId);
  if (!order) throw new Error("Akses tidak tersedia.");
  const event = await getEvent(order.event_id);
  const payment = getTable("payments").find((item) => item.order_id === orderId);
  const tickets = getTable("tickets").filter((item) => item.order_id === orderId);
  const refunds = getTable("refunds").filter((item) => item.order_id === orderId);
  const deadline = Date.parse(event.start_at) - 24 * 60 * 60 * 1000;
  const changeAllowed = event.event_status !== "CANCELLED" && Date.now() <= deadline;
  const ticketsWithRefund = new Set(refunds.flatMap((refund) => refund.ticket_ids ?? []));
  const ticketRows = tickets.length ? tickets.map((ticket) => {
    const canChange = changeAllowed && ticket.ticket_status === "ISSUED"
      && ticket.attendance_status !== "CHECKED_IN" && !ticketsWithRefund.has(ticket.ticket_id);
    return `<div class="ticket-participant"><div class="selection-row"><span><strong>${escapeHTML(ticket.participant_name)}</strong> · ${escapeHTML(ticket.event_seat_id ?? "Tiket area")}</span><span class="status ${statusClass(ticket.ticket_status)}">${escapeHTML(statusLabel(ticket.ticket_status))}</span></div>
      ${canChange ? `<form class="change-name-form" data-ticket="${escapeHTML(ticket.ticket_id)}"><label for="name-${escapeHTML(ticket.ticket_id)}">Ubah nama peserta sebelum H-1</label><div class="order-actions"><input class="text-input" id="name-${escapeHTML(ticket.ticket_id)}" name="participantName" value="${escapeHTML(ticket.participant_name)}" required><button class="button button-secondary">Simpan nama</button></div></form>` : ""}</div>`;
  }).join("") : `<p class="muted">Belum ada tiket yang diterbitkan.</p>`;
  const hasTicketRecord = getTable("e_tickets").some((ticket) => ticket.order_id === orderId);
  const refundAction = event.event_status === "CANCELLED" && refunds.some((refund) => refund.refund_data_status === "NOT_SUBMITTED")
    ? `<a class="button button-secondary button-block" style="margin-top:10px" href="/account/refunds/${refunds.find((refund) => refund.refund_data_status === "NOT_SUBMITTED").refund_id}" data-nav>Lengkapi data refund</a>`
    : event.event_status === "CANCELLED" || order.order_status === "PAID"
      ? `<a class="button button-secondary button-block" style="margin-top:10px" href="/account/orders/${orderId}/refund" data-nav>Informasi refund</a>` : "";
  const canViewTicket = order.order_status === "PAID" || (event.event_status === "CANCELLED" && hasTicketRecord && payment?.payment_status === "SUCCESS");
  page(`<section class="shell page"><a class="breadcrumb" href="/account/orders" data-nav>← Pesanan saya</a><div class="detail-grid"><section class="card"><span class="eyebrow">${escapeHTML(order.order_code)}</span><h1 style="margin-top:8px">${escapeHTML(event.event_name)}</h1><p>${escapeHTML(formatDate(event.start_at, { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }))} · ${escapeHTML(event.venue?.venue_name)}</p><div class="selection-row"><span>Pesanan</span><span class="status ${statusClass(order.order_status)}">${escapeHTML(statusLabel(order.order_status))}</span></div><div class="selection-row"><span>Pembayaran</span><span class="status ${statusClass(payment?.payment_status)}">${escapeHTML(statusLabel(payment?.payment_status))}</span></div><div class="selection-row"><span>Total</span><strong>${escapeHTML(rupiah(order.total_amount))}</strong></div><h2 style="margin-top:22px">Tiket peserta</h2>${ticketRows}<p class="prototype-note">Perubahan nama tidak mengubah harga, QR, atau jumlah tiket. Batas H-1: ${escapeHTML(formatDate(deadline, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }))} WIB.</p></section><aside class="card"><h2>Aksi pesanan</h2>${order.order_status === "PENDING" ? `<a class="button button-primary button-block" href="/payment/${orderId}" data-nav>Lanjutkan pembayaran</a>` : ""}${canViewTicket ? `<a class="button button-primary button-block" href="/account/orders/${orderId}/ticket" data-nav>${event.event_status === "CANCELLED" ? "Lihat tiket tidak berlaku" : "Lihat e-ticket"}</a>` : ""}${refundAction}${refunds.map((refund) => `<p style="margin-top:14px"><a class="breadcrumb" href="/account/refunds/${refund.refund_id}" data-nav>Refund · ${escapeHTML(statusLabel(refund.status))} →</a></p>`).join("")}</aside></div></section>`);
  document.querySelectorAll(".change-name-form").forEach((form) => form.addEventListener("submit", (event) => {
    event.preventDefault();
    const ticketId = form.dataset.ticket;
    const newName = String(new FormData(form).get("participantName")).trim();
    const allTickets = getTable("tickets");
    const ticket = allTickets.find((item) => item.ticket_id === ticketId);
    if (!ticket || !newName || Date.now() > deadline) {
      showToast("Perubahan nama tidak dapat diproses setelah batas H-1.");
      return;
    }
    const previousName = ticket.participant_name;
    writeTable("tickets", allTickets.map((item) => item.ticket_id === ticketId ? { ...item, participant_name: newName, name_last_updated_at: new Date().toISOString() } : item));
    writeTable("participant_change_logs", [...getTable("participant_change_logs"), {
      change_log_id: `PCL-${Date.now()}`, ticket_id: ticketId, changed_by: getCurrentUser().user_id,
      old_participant_name: previousName, new_participant_name: newName,
      changed_at: new Date().toISOString(), change_type: "CUSTOMER_NAME_CHANGE",
    }]);
    showToast("Nama peserta diperbarui. QR dan nilai tiket tidak berubah.");
    orderDetail(orderId);
  }));
}

async function ticketPage(orderId) {
  const order = accountOrders().find((item) => item.order_id === orderId);
  if (!order) throw new Error("Akses tidak tersedia.");
  const payment = getTable("payments").find((item) => item.order_id === orderId);
  const event = await getEvent(order.event_id);
  const tickets = getTable("tickets").filter((item) => item.order_id === orderId && ["ISSUED", "USED", "REFUND_PENDING"].includes(item.ticket_status));
  const etickets = getTable("e_tickets");
  let eticket = etickets.find((item) => item.order_id === orderId);
  if (!eticket || payment?.payment_status !== "SUCCESS") throw new Error("E-ticket hanya tersedia setelah pembayaran berhasil.");
  const cancelled = event.event_status === "CANCELLED";
  if (!cancelled && !eticket.qr_token) {
    eticket = { ...eticket, qr_token: crypto.randomUUID() };
    writeTable("e_tickets", etickets.map((item) => item.order_id === orderId ? eticket : item));
  }
  const attendeeRows = tickets.map((ticket) => `<div class="ticket-participant"><strong>${escapeHTML(ticket.participant_name)}</strong><span class="muted"> · ${escapeHTML(ticket.event_seat_id ?? "Tiket area")} · ${escapeHTML(statusLabel(ticket.ticket_status))}</span></div>`).join("");
  const validity = cancelled
    ? `<div class="callout" style="grid-column:1/-1">Tiket tidak berlaku — event dibatalkan. <a href="/account/orders/${orderId}/refund" data-nav>Isi data refund</a>.</div>`
    : `<div class="full qris-panel" style="grid-column:1/-1"><div class="qr-wrap" id="ticket-qr"></div><span class="status">Valid · satu QR untuk seluruh pesanan</span></div>`;
  const validCount = eticket.valid_ticket_count ?? tickets.length;
  page(`<section class="shell page"><a class="breadcrumb" href="/account/orders/${orderId}" data-nav>← Detail pesanan</a><div style="max-width:680px;margin:auto"><div class="ticket-hero"><span class="eyebrow" style="color:white">E-TICKET · SUMMARECON BANDUNG</span><h1 style="margin:9px 0">${escapeHTML(event.event_name)}</h1><p>${escapeHTML(formatDate(event.start_at, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }))} WIB · ${escapeHTML(event.venue?.venue_name)}</p></div>
      <div class="ticket-details"><div><span class="muted">Order ID</span><strong style="display:block">${escapeHTML(order.order_code)}</strong></div><div><span class="muted">Scan</span><strong style="display:block">${cancelled ? "Tidak berlaku" : `${eticket.successful_scan_count}/${validCount}`}</strong></div><div class="full" style="grid-column:1/-1"><h2>Peserta</h2>${attendeeRows}</div>${validity}</div>
      <p class="prototype-note" style="margin-top:14px">QR demo ini hanya untuk demonstrasi. Jangan gunakan sebagai tiket masuk nyata.</p><button class="button button-secondary" data-action="print-ticket">Cetak / Simpan PDF</button></div></section>`);
  if (cancelled) return;
  const code = window.qrcode(0, "M");
  code.addData(eticket.qr_token);
  code.make();
  document.querySelector("#ticket-qr").innerHTML = code.createSvgTag(5, 2);
}

async function refundPage(orderId) {
  const order = accountOrders().find((item) => item.order_id === orderId);
  if (!order) throw new Error("Akses tidak tersedia.");
  const event = await getEvent(order.event_id);
  const seed = await loadSeed();
  const existingRefunds = getTable("refunds").filter((refund) => refund.order_id === orderId);
  const alreadyRequested = new Set(existingRefunds.flatMap((refund) => refund.ticket_ids ?? []));
  const deadline = Date.parse(event.start_at) - 24 * 60 * 60 * 1000;
  const tickets = getTable("tickets").filter((item) => item.order_id === orderId
    && item.ticket_status === "ISSUED"
    && item.attendance_status !== "CHECKED_IN"
    && !alreadyRequested.has(item.ticket_id)
    && (event.event_status === "CANCELLED" || Date.now() <= deadline));
  const isCancelled = event.event_status === "CANCELLED";
  if (!tickets.length) {
    page(`<section class="shell page"><a class="breadcrumb" href="/account/orders/${orderId}" data-nav>← Detail pesanan</a><div class="empty-state"><span class="status neutral">Refund tidak tersedia</span><h1 style="margin-top:14px">Tidak ada tiket yang dapat diajukan.</h1><p>Tiket yang sudah digunakan, pernah diajukan refund, atau melewati batas H-1 tidak dapat diajukan ulang.</p></div></section>`);
    return;
  }
  page(`<section class="shell page"><a class="breadcrumb" href="/account/orders/${orderId}" data-nav>← Detail pesanan</a><div class="card" style="max-width:760px;margin:auto"><span class="eyebrow">REFUND MANUAL</span><h1 style="margin-top:8px">${isCancelled ? "Lengkapi data refund" : "Ajukan refund tiket"}</h1><p class="muted">${isCancelled ? "Acara dibatalkan. Isi data tujuan agar permintaan dapat diproses." : "Pengajuan peserta tersedia sampai 24 jam sebelum acara. Dana ditransfer manual setelah peninjauan."}</p>
    <form id="refund-form"><div class="form-field"><label for="refund-ticket">Pilih tiket</label><select id="refund-ticket" required>${tickets.map((ticket) => `<option value="${escapeHTML(ticket.ticket_id)}">${escapeHTML(ticket.participant_name)} · ${escapeHTML(ticket.event_seat_id ?? "Tiket area")}</option>`).join("")}</select></div><div class="form-grid" style="margin-top:14px">
      <div class="form-field"><label for="refund-method">Metode tujuan</label><select id="refund-method" required><option value="BANK_TRANSFER">Transfer bank</option><option value="E_WALLET">E-wallet</option></select></div><div class="form-field"><label for="refund-provider">Nama bank / provider</label><input id="refund-provider" required></div><div class="form-field"><label for="refund-account">Nomor rekening / akun</label><input id="refund-account" required inputmode="numeric" autocomplete="off"></div><div class="form-field"><label for="refund-holder">Nama pemilik rekening</label><input id="refund-holder" required></div><div class="form-field full"><label for="refund-reason">Alasan</label><input id="refund-reason" required value="${isCancelled ? "Pembatalan acara" : ""}"></div>
    </div><p class="prototype-note">Data rekening disimpan hanya dalam bentuk tersamarkan untuk demo lokal. Pengembalian dana tidak otomatis dan tidak melalui payment gateway.</p><button class="button button-primary" type="submit">${isCancelled ? "Kirim data refund" : "Ajukan refund"}</button></form></div></section>`);
  document.querySelector("#refund-form").addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const ticketId = document.querySelector("#refund-ticket").value;
    const ticket = tickets.find((item) => item.ticket_id === ticketId);
    const number = document.querySelector("#refund-account").value.trim();
    const method = document.querySelector("#refund-method").value;
    const old = getTable("refunds");
    const seededItem = seed.order_items.find((item) => item.order_item_id === ticket?.order_item_id);
    const selectedItem = order.selection?.[(ticket?.attendee_sequence ?? 1) - 1];
    const refund = {
      refund_id: `RFD-${Date.now()}`, refund_code: `RFD-DEMO-${Date.now()}`,
      refund_type: isCancelled ? "EVENT_CANCELLATION" : "PARTICIPANT_REQUEST",
      event_id: event.event_id, order_id: orderId, requested_by_user_id: getCurrentUser().user_id,
      ticket_ids: [ticketId], quantity: 1, refund_amount: Math.round(order.total_amount / Math.max(1, order.quantity)),
      currency: "IDR", status: isCancelled ? "APPROVED" : "UNDER_REVIEW",
      refund_data_status: "COMPLETE", approval_required: !isCancelled,
      requested_at: new Date().toISOString(), data_completed_at: new Date().toISOString(),
      target_completion_due_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
      manual_transfer: true, target_completion_days: 7,
      reason: document.querySelector("#refund-reason").value.trim(),
      approval_mode: isCancelled ? "NO_CUSTOMER_APPROVAL_EVENT_CANCELLED" : "ADMIN_REVIEW_REQUIRED",
      refund_destination: { refund_method: method, provider_name: document.querySelector("#refund-provider").value.trim(), account_number_masked: `****${number.slice(-4)}`, account_holder_name: document.querySelector("#refund-holder").value.trim() },
    };
    refund.refund_amount = seededItem?.unit_price ?? selectedItem?.price ?? Math.round(order.total_amount / Math.max(1, order.quantity));
    writeTable("refunds", [...old, refund]);
    writeTable("refund_status_histories", [...getTable("refund_status_histories"), {
      history_id: `RFH-${Date.now()}`, refund_id: refund.refund_id, from_status: null,
      to_status: refund.status, changed_at: new Date().toISOString(),
      changed_by: getCurrentUser().user_id, reason: "Diajukan dari prototype customer",
    }]);
    navigate(`/account/refunds/${refund.refund_id}`);
  });
}

async function refundDetail(refundId) {
  const refund = getTable("refunds").find((item) => item.refund_id === refundId && item.requested_by_user_id === getCurrentUser()?.user_id);
  if (!refund) throw new Error("Refund tidak ditemukan atau tidak tersedia.");
  const event = await getEvent(refund.event_id);
  const destination = refund.refund_destination;
  const history = getTable("refund_status_histories").filter((item) => item.refund_id === refundId);
  if (refund.refund_data_status === "NOT_SUBMITTED") {
    page(`<section class="shell page"><a class="breadcrumb" href="/account/orders/${refund.order_id}" data-nav>← Detail pesanan</a><div class="card" style="max-width:700px;margin:auto"><span class="eyebrow">${escapeHTML(refund.refund_code)}</span><h1 style="margin:8px 0">Lengkapi data refund</h1><p class="muted">Acara dibatalkan. Lengkapi empat data tujuan. Transfer dilakukan manual, bukan melalui gateway.</p>
      <form id="refund-complete-form"><div class="form-grid"><div class="form-field"><label for="complete-method">Metode tujuan</label><select id="complete-method" required><option value="BANK_TRANSFER">Transfer bank</option><option value="E_WALLET">E-wallet</option></select></div><div class="form-field"><label for="complete-provider">Nama bank / provider</label><input id="complete-provider" required></div><div class="form-field"><label for="complete-account">Nomor rekening / akun</label><input id="complete-account" inputmode="numeric" required></div><div class="form-field"><label for="complete-holder">Nama pemilik rekening</label><input id="complete-holder" required></div></div><p class="prototype-note">Nomor rekening hanya disimpan tersamarkan untuk demo lokal.</p><button class="button button-primary">Simpan data tujuan</button></form></div></section>`);
    document.querySelector("#refund-complete-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const number = document.querySelector("#complete-account").value.trim();
      const updated = {
        ...refund, status: "APPROVED", refund_data_status: "COMPLETE",
        data_completed_at: new Date().toISOString(),
        target_completion_due_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
        refund_destination: {
          refund_method: document.querySelector("#complete-method").value,
          provider_name: document.querySelector("#complete-provider").value.trim(),
          account_number_masked: `****${number.slice(-4)}`,
          account_holder_name: document.querySelector("#complete-holder").value.trim(),
        },
      };
      writeTable("refunds", getTable("refunds").map((item) => item.refund_id === refundId ? updated : item));
      writeTable("refund_status_histories", [...history, {
        history_id: `RFH-${Date.now()}`, refund_id: refundId, from_status: "REQUESTED",
        to_status: "APPROVED", changed_at: new Date().toISOString(),
        changed_by: getCurrentUser().user_id, reason: "Data refund dilengkapi pelanggan",
      }]);
      render();
    });
    return;
  }
  const timeline = history.sort((a, b) => Date.parse(a.changed_at) - Date.parse(b.changed_at))
    .map((item) => `<div class="selection-row"><span>${escapeHTML(item.from_status ? `${statusLabel(item.from_status)} → ` : "")}${escapeHTML(statusLabel(item.to_status))}</span><small>${escapeHTML(formatDate(item.changed_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }))}</small></div>`).join("");
  const due = refund.target_completion_due_at ? `<div class="selection-row"><span>Target penyelesaian</span><strong>${escapeHTML(formatDate(refund.target_completion_due_at, { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }))}</strong></div>` : "";
  page(`<section class="shell page"><a class="breadcrumb" href="/account/orders/${refund.order_id}" data-nav>← Detail pesanan</a><div class="card" style="max-width:700px;margin:auto"><span class="eyebrow">${escapeHTML(refund.refund_code)}</span><h1 style="margin:8px 0">Status refund</h1><p>${escapeHTML(event.event_name)}</p><p><span class="status ${statusClass(refund.status)}">${escapeHTML(statusLabel(refund.status))}</span> <span class="status neutral">${escapeHTML(refund.refund_data_status === "COMPLETE" ? "Data lengkap" : "Data belum lengkap")}</span></p><div class="selection-row"><span>Nominal contoh</span><strong>${escapeHTML(rupiah(refund.refund_amount))}</strong></div><div class="selection-row"><span>Tujuan</span><strong>${escapeHTML(destination?.provider_name ?? "Belum diisi")} · ${escapeHTML(destination?.account_number_masked ?? "—")}</strong></div><div class="selection-row"><span>Proses dana</span><strong>Transfer manual oleh admin</strong></div>${due}<h2 style="margin-top:22px">Riwayat proses</h2>${timeline || `<p class="muted">Belum ada riwayat.</p>`}<p class="callout" style="margin-top:16px">Status permintaan tidak berarti dana sudah dikembalikan. Target sampai 7 hari hanya berlaku setelah data tujuan lengkap.</p></div></section>`);
}

async function profilePage() {
  const user = getCurrentUser();
  if (!user) return navigate(`/login?returnUrl=${encodeURIComponent("/account/profile")}`);
  page(`<section class="shell page"><div class="card" style="max-width:680px;margin:auto"><span class="eyebrow">AKUN DEMO</span><h1 style="margin:8px 0">Profil</h1><form id="profile-form"><div class="form-grid"><div class="form-field full"><label for="profile-name">Nama lengkap</label><input id="profile-name" required value="${escapeHTML(user.full_name)}"></div><div class="form-field"><label for="profile-email">Email</label><input id="profile-email" type="email" required value="${escapeHTML(user.email)}"></div><div class="form-field"><label for="profile-phone">Nomor telepon</label><input id="profile-phone" required value="${escapeHTML(user.phone_number ?? "")}"></div></div><div class="category-row" style="margin-top:18px"><button class="button button-primary">Simpan profil</button><a class="button button-secondary" href="/account/orders" data-nav>Lihat pesanan</a><button class="button button-secondary" type="button" data-action="logout">Keluar</button><button class="button button-secondary" type="button" data-action="reset-demo">Reset demo</button></div></form><p class="prototype-note">Akun demo bukan autentikasi produksi. Data tersimpan di browser ini.</p></div></section>`);
  document.querySelector("#profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const users = getTable("users");
    const updated = users.map((item) => item.user_id === user.user_id ? {
      ...item, full_name: document.querySelector("#profile-name").value.trim(),
      email: document.querySelector("#profile-email").value.trim(),
      phone_number: document.querySelector("#profile-phone").value.trim(),
    } : item);
    writeTable("users", updated);
    showToast("Profil diperbarui.");
    profilePage();
  });
}

async function loginPage() {
  const returnUrl = safeReturnUrl(new URLSearchParams(location.search).get("returnUrl"));
  page(`<section class="shell page"><div class="card" style="max-width:560px;margin:16px auto"><span class="eyebrow">SELAMAT DATANG KEMBALI</span><h1 style="margin:8px 0">Masuk ke akunmu.</h1><form id="login-form"><div class="form-field"><label for="login-email">Email</label><input id="login-email" type="email" required autocomplete="username" placeholder="nama@email.com"></div><div class="form-field" style="margin-top:12px"><label for="login-password">Kata sandi</label><input id="login-password" type="password" required autocomplete="current-password" placeholder="Kata sandi akunmu"></div><label style="display:flex;align-items:center;gap:8px;margin:12px 0"><input type="checkbox" id="show-password"> Tampilkan kata sandi</label><p class="form-error" id="login-error"></p><button class="button button-primary button-block" id="login-btn">Masuk</button></form>
    <div class="account-demo"><strong>Akun Live API (Summarecon)</strong><p><button class="chip" type="button" data-demo-email="nadia.demo@example.test">nadia.demo@example.test</button> <button class="chip" type="button" data-demo-email="rafi.demo@example.test">rafi.demo@example.test</button></p><p>Kata sandi API: <code>Summarecon2026!</code></p></div><p class="muted">Belum punya akun? <a href="/register?returnUrl=${encodeURIComponent(returnUrl)}" data-nav>Daftar di sini</a></p></div></section>`);
  document.querySelector("#show-password").addEventListener("change", (event) => {
    document.querySelector("#login-password").type = event.target.checked ? "text" : "password";
  });
  document.querySelectorAll("[data-demo-email]").forEach((button) => button.addEventListener("click", () => {
    document.querySelector("#login-email").value = button.dataset.demoEmail;
    document.querySelector("#login-password").value = "Summarecon2026!";
  }));
  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const btn = document.querySelector("#login-btn");
    const errEl = document.querySelector("#login-error");
    errEl.textContent = "";
    btn.disabled = true;
    btn.textContent = "Memeriksa kredensial...";

    try {
      await login(document.querySelector("#login-email").value.trim(), document.querySelector("#login-password").value);
      navigate(returnUrl.startsWith("/") ? returnUrl : "/account/orders");
    } catch (error) {
      errEl.textContent = error.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "Masuk";
    }
  });
}

async function registerPage() {
  const returnUrl = safeReturnUrl(new URLSearchParams(location.search).get("returnUrl"));
  page(`<section class="shell page"><div class="card" style="max-width:620px;margin:auto"><span class="eyebrow">AKUN PELANGGAN</span><h1 style="margin:8px 0">Buat akun demo.</h1><form id="register-form"><div class="form-grid"><div class="form-field full"><label for="register-name">Nama lengkap</label><input id="register-name" required minlength="2"></div><div class="form-field"><label for="register-email">Email</label><input id="register-email" type="email" required></div><div class="form-field"><label for="register-phone">Nomor telepon</label><input id="register-phone" required></div><div class="form-field"><label for="register-password">Kata sandi demo</label><input id="register-password" type="password" required minlength="6"></div><div class="form-field"><label for="register-confirm">Konfirmasi kata sandi</label><input id="register-confirm" type="password" required></div></div><p class="form-error" id="register-error"></p><button class="button button-primary" style="margin-top:14px">Buat akun</button></form><p class="prototype-note" style="margin-top:16px">Registrasi disimpan di localStorage; jangan masukkan data pribadi nyata.</p></div></section>`);
  document.querySelector("#register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.querySelector("#register-password").value;
    if (password !== document.querySelector("#register-confirm").value) {
      document.querySelector("#register-error").textContent = "Konfirmasi kata sandi belum sama.";
      return;
    }
    try {
      const user = await register({
        name: document.querySelector("#register-name").value.trim(),
        email: document.querySelector("#register-email").value.trim(),
        phone: document.querySelector("#register-phone").value.trim(),
        password,
      });
      setSession(user);
      navigate(returnUrl);
    } catch (error) {
      document.querySelector("#register-error").textContent = error.message;
    }
  });
}

async function route() {
  const segments = location.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (!segments.length) return homePage();
  if (segments[0] === "events" && segments[2] === "queue") return queuePage(segments[1]);
  if (segments[0] === "events" && segments[2] === "booking") return bookingPage(segments[1]);
  if (segments[0] === "events" && segments.length === 2) return eventDetail(segments[1]);
  if (segments[0] === "login") return loginPage();
  if (segments[0] === "register") return registerPage();
  if (segments[0] === "checkout" && segments[2] === "participants") return participantsPage(segments[1]);
  if (segments[0] === "checkout" && segments[2] === "summary") return summaryPage(segments[1]);
  if (segments[0] === "payment" && segments[2] === "result") return paymentResult(segments[1]);
  if (segments[0] === "payment") return paymentPage(segments[1]);
  if (segments[0] === "account" && segments[1] === "orders" && segments.length === 2) return ordersPage();
  if (segments[0] === "account" && segments[1] === "orders" && segments[3] === "ticket") return ticketPage(segments[2]);
  if (segments[0] === "account" && segments[1] === "orders" && segments[3] === "refund") return refundPage(segments[2]);
  if (segments[0] === "account" && segments[1] === "orders" && segments.length === 3) return orderDetail(segments[2]);
  if (segments[0] === "account" && segments[1] === "refunds") return refundDetail(segments[2]);
  if (segments[0] === "account" && segments[1] === "profile") return profilePage();
  throw new Error("Rute tidak ditemukan.");
}

async function render() {
  loadingPage();
  try {
    await route();
  } catch (error) {
    errorPage(error instanceof Error ? error : new Error("Terjadi kesalahan yang tidak diketahui."));
  }
}

document.addEventListener("click", async (event) => {
  const link = event.target.closest("a[data-nav]");
  if (link) {
    event.preventDefault();
    navigate(link.getAttribute("href"));
    return;
  }
  const action = event.target.closest("[data-action]");
  if (!action) return;
  try {
    if (action.dataset.action === "retry") return render();
    if (action.dataset.action === "reset-demo") {
      await resetDemo();
      sessionStorage.clear();
      showToast("Data demo dikembalikan ke seed awal.");
      return navigate("/");
    }
    if (action.dataset.action === "logout") {
      logout();
      navigate("/");
      return;
    }
    if (action.dataset.action === "print-ticket") {
      window.print();
      return;
    }
    if (action.dataset.action === "queue-turn") {
      const entries = getTable("queue_entries");
      writeTable("queue_entries", entries.map((entry) => entry.event_id === action.dataset.event && entry.user_id === getCurrentUser()?.user_id ? { ...entry, status: "SERVED", served_at: new Date().toISOString() } : entry));
      return render();
    }
    if (action.dataset.action === "qty-plus" || action.dataset.action === "qty-minus") {
      const output = document.querySelector(`[data-qty="${action.dataset.section}"]`);
      const current = Number(output.value || output.textContent || 0);
      const next = action.dataset.action === "qty-plus" ? Math.min(Number(action.dataset.max), current + 1) : Math.max(0, current - 1);
      output.value = String(next);
      output.textContent = String(next);
      const event = window.currentEvent;
      const section = event.sections.find((item) => item.event_section_id === action.dataset.section);
      const category = event.categories.find((item) => item.event_section_id === section.event_section_id);
      let selection = readSelection().filter((item) => item.kind !== "section");
      if (next > 0) selection.push({ kind: "section", id: section.section_id, sectionId: section.section_id, sectionName: section.section_name, category: category.category_name, price: category.price, quantity: next });
      sessionStorage.setItem("etvm_selection", JSON.stringify(selection));
      renderBookingSummary();
      return;
    }
    if (action.dataset.action === "continue-booking") {
      const event = await getEvent(action.dataset.event);
      const selection = readSelection();
      if (!getCurrentUser()) return navigate(`/login?returnUrl=${encodeURIComponent(`/events/${event.event_id}/booking`)}`);
      const hold = createHold(event, selection);
      navigate(`/checkout/${hold.hold_id}/participants`);
      return;
    }
    if (action.dataset.action === "release-hold") {
      if (!window.confirm("Batalkan pilihan dan lepaskan hold ini?")) return;
      releaseHold(action.dataset.hold);
      sessionStorage.removeItem("etvm_selection");
      sessionStorage.removeItem("etvm_checkout_draft");
      navigate(`/events/${getTable("booking_holds").find((hold) => hold.hold_id === action.dataset.hold)?.event_id}/booking`);
      return;
    }
    if (action.dataset.action === "create-order") {
      const draft = JSON.parse(sessionStorage.getItem("etvm_checkout_draft") ?? "{}");
      const order = await createOrder(action.dataset.hold, draft.participants, draft.buyer);
      sessionStorage.removeItem("etvm_checkout_draft");
      navigate(`/payment/${order.order_id}`);
      return;
    }
    if (action.dataset.action === "payment-callback") {
      let result = processMockCallback(action.dataset.order, action.dataset.status, action.dataset.invalidSignature === "true");
      if (result.status === "REJECTED_SIGNATURE") {
        showToast("Callback ditolak karena signature tidak valid; status tidak berubah.");
        return;
      }
      if (action.dataset.duplicate === "true") result = processMockCallback(action.dataset.order, action.dataset.status);
      if (result.duplicate) showToast("Callback idempoten: hasil sama, tidak membuat tiket duplikat.");
      if (result.status === "NEEDS_ADMIN_ALLOCATION") showToast("Pembayaran sukses terlambat; alokasi inventori memerlukan penanganan admin.");
      navigate(`/payment/${action.dataset.order}/result`);
      return;
    }
    if (action.dataset.action === "apply-filters") document.querySelector("#events").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Aksi tidak dapat diproses.");
    if (location.pathname.includes("/booking")) render();
  }
});

window.addEventListener("popstate", render);
window.addEventListener("storage", (event) => {
  if (event.key?.startsWith("etvm_")) render();
});
window.addEventListener("etvm:changed", () => {
  if (location.pathname.startsWith("/account")) render();
});

window.resetDemo = resetDemo;
await render();
