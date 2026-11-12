// src/app/event/[id]/page.tsx
//
// Event Detail Page (Server Component).
// Fetches the event from the live API.
// Displays categories, venue booking type info, cancellation handling,
// and ticket policies (H-1 cutoff for name change & refund).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { fetchEvent } from "@/services/customerApi";
import { cacheLiveEvent } from "@/lib/data/events";
import { ApiError } from "@/types/customer";
import { formatRupiah } from "@/lib/utils";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const { data: event } = await fetchEvent(id);
    const rec = event as unknown as Record<string, unknown>;
    const title = (rec.title as string) || (rec.event_name as string) || "Detail Acara";
    const description = (rec.description as string) || "Momen seru di Summarecon Mall Bandung";
    return {
      title,
      description: description.slice(0, 160),
    };
  } catch {
    return { title: "Acara tidak ditemukan" };
  }
}

export default function EventPage({ params }: EventPageProps) {
  return (
    <Suspense
      fallback={
        <div className="page-container route-loading text-center py-16">
          <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold text-stone-700">Memuat detail acara...</p>
        </div>
      }
    >
      <EventPageContent params={params} />
    </Suspense>
  );
}

async function EventPageContent({ params }: EventPageProps) {
  const { id } = await params;

  let eventData: unknown;
  try {
    const res = await fetchEvent(id);
    eventData = res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  if (!eventData) notFound();
  const event = eventData as Record<string, unknown>;

  // Cache for downstream client components
  cacheLiveEvent(event);

  const title = String(event.title || event.event_name || "Detail Acara");
  const category = String(event.category || event.event_category || "MUSIK");
  const venueObj = typeof event.venue === "object" && event.venue !== null ? (event.venue as Record<string, unknown>) : null;
  const venueName = venueObj ? String(venueObj.name || "Summarecon Mall Bandung") : String(event.venue_name || event.venue || "Summarecon Mall Bandung");
  const venueCity = venueObj ? String(venueObj.city || "Bandung") : String(event.city || "Bandung");
  const venueAddress = venueObj ? (venueObj.address ? String(venueObj.address) : null) : (event.address ? String(event.address) : null);

  const rawDate = event.event_date || event.start_at || event.dateISO || "2026-11-21";
  const dateISO = String(rawDate).split("T")[0];
  let dateLabel = dateISO;
  try {
    dateLabel = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${dateISO}T12:00:00`));
  } catch {
    // fallback
  }

  let timeLabel = "19.00 WIB";
  if (event.start_time) {
    const [h, m] = String(event.start_time).split(":");
    timeLabel = `${h}.${m} WIB`;
  } else if (event.start_at && String(event.start_at).includes("T")) {
    const [h, m] = String(event.start_at).split("T")[1].split(":");
    timeLabel = `${h}.${m} WIB`;
  }

  interface EventCategoryItem {
    id?: string;
    ticket_category_id?: string;
    name?: string;
    category_name?: string;
    quota?: number;
    price?: number;
  }

  const rawCategories = Array.isArray(event.categories) ? (event.categories as EventCategoryItem[]) : [];
  const categories = rawCategories.map((c, idx) => ({
    id: c.id || c.ticket_category_id || `cat-${idx}`,
    name: c.name || c.category_name || "Kategori Tiket",
    quota: Number(c.quota || 0),
    price: Number(c.price || 0),
  }));

  const categoryPrices = categories.map((c) => c.price).filter((p) => p > 0);
  const priceFrom = Number(
    event.price_from ||
    event.priceFrom ||
    (categoryPrices.length > 0 ? Math.min(...categoryPrices) : 150000)
  );

  const isCancelled = event.event_status === "CANCELLED" || event.status === "CANCELLED";
  const isSoldOut = typeof event.available_seats_count === "number" && event.available_seats_count <= 0;

  const catUpper = category.toUpperCase();
  const theme: "violet" | "amber" | "blue" =
    catUpper.includes("JAZZ") || catUpper.includes("EXPO")
      ? "amber"
      : catUpper.includes("MUSIK")
        ? "violet"
        : "blue";

  const artWord = theme === "violet" ? "MUSIC" : theme === "amber" ? "EXPO" : "EVENT";
  const bookingSlug = String(event.slug || event.id || event.event_id || id);

  return (
    <div className="page-container detail-page max-w-6xl mx-auto py-6 px-4">
      <Link className="back-link inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 mb-4 transition" href="/#events">
        ← Kembali ke daftar acara
      </Link>

      {/* Hero Banner */}
      <section className={`detail-hero art-${theme} relative rounded-3xl p-6 sm:p-10 mb-8 overflow-hidden shadow-sm`}>
        <div className="relative z-10">
          <span className="detail-eyebrow text-xs font-bold uppercase tracking-widest text-white/90 block mb-2">
            {category} <i className="inline-block w-1.5 h-1.5 rounded-full bg-white/60 mx-1.5 align-middle" /> {venueCity}
          </span>
          <span className="detail-art-word absolute right-6 top-6 text-5xl sm:text-7xl font-black text-white/10 uppercase select-none pointer-events-none">
            {artWord}
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4 max-w-2xl">
            {title}
          </h1>

          {/* mt-4: `.detail-hero h1` (globals.css) me-reset margin-bottom h1 ke 0, jadi jarak dijaga dari container badge */}
          <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5">
            {isCancelled ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/20 backdrop-blur-md text-rose-100 border border-rose-300/40">
                <span className="w-2 h-2 rounded-full bg-rose-400" aria-hidden="true" />
                Dibatalkan
              </span>
            ) : isSoldOut ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-black/30 backdrop-blur-md text-white/75 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-stone-400" aria-hidden="true" />
                Habis Terjual
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#1F8F7E] ring-2 ring-emerald-300/40" aria-hidden="true" />
                Tiket Tersedia
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 max-w-full px-3.5 py-1.5 rounded-full text-xs font-medium bg-black/20 backdrop-blur-md text-white/90 border border-white/15">
              <svg className="w-3.5 h-3.5 text-white/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.686-6-10a6 6 0 0112 0c0 4.314-6 10-6 10z" />
                <circle cx="12" cy="11" r="2.5" />
              </svg>
              <span className="min-w-0 truncate">{venueName}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Cancelled Banner if applicable */}
      {isCancelled && (
        <div className="mb-8 p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <h3 className="font-bold text-base mb-1">Acara Ini Dibatalkan</h3>
            <p className="text-xs text-rose-800">
              Penyelenggara telah membatalkan acara ini. Penjualan tiket baru telah ditutup. Pembeli tiket terdahulu berhak mengajukan refund penuh.
            </p>
          </div>
          <Link
            href="/account/orders"
            className="px-4 py-2 bg-[#D93A2F] text-white font-bold text-xs rounded-xl hover:bg-[#c23329] transition shrink-0 text-center"
          >
            Lihat Tiket & Refund Saya →
          </Link>
        </div>
      )}

      <div className="detail-columns grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Description & Facts */}
        <div className="detail-copy lg:col-span-2 space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <span className="eyebrow eyebrow-dark text-xs font-bold uppercase tracking-widest text-stone-400 block mb-2">
              TENTANG ACARA
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-snug mb-4">
              Sebuah pengalaman yang layak dinantikan.
            </h2>
            <p className="text-stone-600 leading-relaxed text-sm">
              {event.description
                ? String(event.description)
                : "Nikmati pengalaman berkesan bersama musisi dan kreator di Summarecon Mall Bandung."}
            </p>

            {/* Event Facts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-stone-100 text-xs">
              <div>
                <span className="text-stone-400 font-semibold block uppercase">TANGGAL</span>
                <strong className="text-stone-900 font-bold text-sm mt-0.5 block">{dateLabel}</strong>
              </div>
              <div>
                <span className="text-stone-400 font-semibold block uppercase">WAKTU</span>
                <strong className="text-stone-900 font-bold text-sm mt-0.5 block">{timeLabel}</strong>
              </div>
              <div>
                <span className="text-stone-400 font-semibold block uppercase">LOKASI VENUE</span>
                <strong className="text-stone-900 font-bold text-sm mt-0.5 block">{venueName}</strong>
              </div>
              {venueAddress && (
                <div className="col-span-full">
                  <span className="text-stone-400 font-semibold block uppercase">ALAMAT</span>
                  <strong className="text-stone-800 text-xs mt-0.5 block">{venueAddress}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Categories List */}
          {categories.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-sm">
              <h3 className="font-bold text-base text-stone-900 mb-3">
                Kategori Tiket Tersedia
              </h3>
              <div className="divide-y divide-stone-100 text-xs">
                {categories.map((c) => (
                  <div key={c.id} className="py-3 flex items-start sm:items-center justify-between gap-3">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-stone-900 text-sm block leading-snug">{c.name}</span>
                      <span className="text-stone-500 text-xs block mt-0.5">Kuota contoh: {c.quota} tiket</span>
                    </div>
                    <strong className="text-sm sm:text-base font-extrabold text-[#D93A2F] shrink-0 text-right whitespace-nowrap pt-0.5 sm:pt-0">
                      {formatRupiah(c.price)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ticket Policy Box */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 text-xs text-stone-600 space-y-2">
            <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
              Kebijakan Tiket & Peserta
            </h4>
            <p>
              • <strong>Perubahan Nama Peserta:</strong> Dapat dilakukan secara mandiri di halaman pesanan hingga <strong>24 jam (H-1)</strong> sebelum acara dimulai.
            </p>
            <p>
              • <strong>Pengembalian Dana (Refund):</strong> Pengajuan refund peserta diterima paling lambat H-1 dan ditinjau oleh pihak manajemen. Jika acara dibatalkan penyelenggara, pengembalian dana 100% tanpa biaya administrasi.
            </p>
            <p>
              • <strong>Satu QR Per Pesanan:</strong> Seluruh peserta dalam satu transaksi menggunakan satu QR code e-ticket yang sama saat check-in di gate.
            </p>
          </div>
        </div>

        {/* Right Column: Booking Action Card (centered on stacked/mobile viewports, sidebar on desktop) */}
        <aside className="booking-card bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm lg:sticky lg:top-[calc(var(--header-h)+16px)] w-full max-w-lg mx-auto justify-self-center lg:max-w-none lg:mx-0">
          <span className="booking-card-label text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
            {isCancelled ? "ACARA DIBATALKAN" : isSoldOut ? "HABIS TERJUAL" : "TIKET TERSEDIA"}
          </span>

          <h3 className="text-xl font-black text-stone-900 mb-2">
            Jadilah bagian dari keseruannya.
          </h3>

          <p className="text-xs text-stone-500">Harga tiket mulai dari</p>
          <strong className="detail-price text-2xl font-black text-[#D93A2F] block my-1">
            {formatRupiah(priceFrom)}
          </strong>

          <div className="my-5">
            {isCancelled ? (
              <button
                className="w-full py-3.5 px-4 rounded-xl bg-stone-200 text-stone-500 font-bold text-xs cursor-not-allowed text-center"
                disabled
                type="button"
              >
                Penjualan Ditutup (Acara Dibatalkan)
              </button>
            ) : isSoldOut ? (
              <button
                className="w-full py-3.5 px-4 rounded-xl bg-stone-200 text-stone-500 font-bold text-xs cursor-not-allowed text-center"
                disabled
                type="button"
              >
                Tiket Habis Terjual
              </button>
            ) : (
              <Link
                className="w-full py-3.5 px-4 rounded-xl bg-[#D93A2F] text-white font-bold text-xs hover:bg-[#c23329] active:scale-[0.99] transition shadow-sm flex items-center justify-center gap-2 text-center"
                href={`/event/${bookingSlug}/book`}
              >
                Pilih Tempat Duduk & Tiket <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>

          <div className="text-[11px] text-stone-400 text-center space-y-1">
            <p>✓ Pembayaran QRIS aman</p>
            <p>✓ E-ticket instan satu QR per order</p>
            <p>✓ Konsep denah prototype resmi</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
