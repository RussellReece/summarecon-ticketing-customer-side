// src/app/event/[id]/book/page.tsx
"use client";

import Link from "next/link";
import { Suspense, use, useEffect, useState, useTransition } from "react";
import { notFound, useRouter } from "next/navigation";

import { SeatMap } from "@/components/seat-map/SeatMap";
import { SelectionSummaryClient } from "@/components/seat-map/SelectionSummaryClient";

import { formatRupiah } from "@/lib/utils";
import { cacheLiveEvent, getEventById } from "@/lib/data/events";
import { fetchEvent, fetchMe } from "@/services/customerApi";
import type { CustomerProfile } from "@/types/customer";
import type { TicketEvent } from "@/types/event";
import { useBookingStore } from "@/lib/store/useBookingStore";

interface BookingPageProps {
  params: Promise<{ id: string }>;
}

export default function BookingPage({ params }: BookingPageProps) {
  return (
    <Suspense
      fallback={
        <div className="page-container route-loading text-center py-16">
          <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-medium text-stone-600">Menyiapkan denah venue...</p>
        </div>
      }
    >
      <BookingPageContent params={params} />
    </Suspense>
  );
}

function BookingPageContent({ params }: BookingPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [event, setEvent] = useState<TicketEvent | null>(() => getEventById(id) || null);
  const [isLoading, setIsLoading] = useState(!event);
  const [isHolding, setIsHolding] = useState(false);

  useEffect(() => {
    fetchEvent(id)
      .then((res) => {
        if (res.data) {
          setEvent(cacheLiveEvent(res.data));
        }
      })
      .catch((err) => {
        console.error("Failed to load event for booking:", err);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const quotaItems = useBookingStore((s) => s.quotaItems);
  const createHoldAction = useBookingStore((s) => s.createHold);
  const conflictError = useBookingStore((s) => s.conflictError);

  const quotaList = Object.values(quotaItems);
  const totalCount =
    selectedSeats.length + quotaList.reduce((acc, q) => acc + q.count, 0);

  const totalPrice =
    selectedSeats.reduce((sum, seat) => sum + seat.price, 0) +
    quotaList.reduce((sum, q) => sum + q.price * q.count, 0);

  if (isLoading) {
    return (
      <div className="page-container route-loading text-center py-16">
        <div className="w-8 h-8 border-3 border-[#D93A2F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-medium text-stone-600">Menyiapkan denah venue...</p>
      </div>
    );
  }

  if (!event) notFound();

  const isCancelled = event.badge === "CANCELLED";

  // Handle "Lanjut": Check auth, call atomic holdSeats, navigate to /order/:id
  const handleBooking = async () => {
    if (totalCount === 0 || isHolding || isCancelled) return;
    setIsHolding(true);

    try {
      // 1. Verify Authentication
      let currentUser: (CustomerProfile & { user_id?: string }) | null = null;
      try {
        const meRes = await fetchMe();
        currentUser = meRes.data as (CustomerProfile & { user_id?: string });
      } catch {
        // Not logged in -> Redirect to login with returnUrl
        const returnUrl = encodeURIComponent(`/event/${id}/book`);
        router.push(`/login?returnUrl=${returnUrl}`);
        return;
      }

      // 2. Create atomic hold (10 min timer)
      const userId = currentUser?.user_id || currentUser?.id || "USR-CUS-001";
      const result = await createHoldAction(id, String(userId));

      if (result.success) {
        startTransition(() => {
          router.push(`/order/${id}`);
        });
      }
    } catch (err) {
      console.error("Booking error:", err);
    } finally {
      setIsHolding(false);
    }
  };

  return (
    <div className="page-container booking-page py-6 max-w-7xl mx-auto px-4">
      <Link className="back-link inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 mb-4 transition" href={`/event/${event.id}`}>
        ← Kembali ke Detail Acara
      </Link>

      <div className="booking-title-row flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-200">
        <div>
          <span className="eyebrow eyebrow-dark text-xs font-bold uppercase tracking-widest text-stone-400 block mb-1">
            PILIH TEMPAT DUDUK & AREA
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-tight">
            Temukan tempat terbaikmu.
          </h1>

          <p className="text-sm text-stone-600 mt-1">
            <strong className="text-stone-800">{event.title}</strong> <span>·</span> {event.dateLabel} <span>·</span> {event.venue}
          </p>
        </div>

        {/* Reassurance text instead of premature timer */}
        <div className="text-right max-w-xs bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl text-left sm:text-right">
          <span className="text-[11px] font-bold text-amber-900 uppercase block tracking-wider mb-0.5">
            Informasi Penahanan Kursi
          </span>
          <p className="text-xs text-stone-600 leading-snug">
            Memilih belum mengunci kursi. Kursi ditahan selama <strong>10 menit</strong> setelah kamu menekan tombol Lanjut.
          </p>
        </div>
      </div>

      <div className="booking-layout grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Seat Map Canvas */}
        <section className="seat-panel lg:col-span-2">
          <SeatMap event={event} />
        </section>

        {/* Right: Summary & Lanjut CTA */}
        <aside className="selection-panel bg-white border border-stone-200 rounded-2xl p-6 shadow-sm sticky top-6">
          <span className="booking-card-label text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
            RINGKASAN PILIHAN
          </span>

          <h2 className="text-xl font-black text-stone-900 mb-2">Tiketmu</h2>

          <div className="selection-event p-3 rounded-xl bg-stone-50 border border-stone-100 mb-3">
            <h3 className="font-bold text-sm text-stone-900">{event.title}</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {event.dateLabel} · {event.time}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              {event.venue}
            </p>
          </div>

          <SelectionSummaryClient />

          <div className="selection-prices flex justify-between text-xs text-stone-500 py-3 border-t border-stone-100">
            <span>
              Kategori Terendah: <strong className="text-stone-700 block text-sm">{formatRupiah(event.priceFrom)}</strong>
            </span>
            <span className="text-right">
              Kategori Tertinggi: <strong className="text-stone-700 block text-sm">{formatRupiah(event.premiumPrice)}</strong>
            </span>
          </div>

          <p className="selection-limit text-[11px] text-stone-500 mb-4 italic">
            Maksimal 4 tiket per transaksi. Kursi ditahan 10 menit setelah kamu masuk ke langkah data peserta.
          </p>

          {conflictError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {conflictError}
            </div>
          )}

          <button
            type="button"
            className="w-full py-3.5 px-4 rounded-xl bg-[#D93A2F] text-white font-bold text-sm hover:bg-[#c23329] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm flex items-center justify-between"
            onClick={handleBooking}
            disabled={totalCount === 0 || isHolding || isPending || isCancelled}
          >
            <span>
              {isHolding || isPending ? "Mengunci tiket..." : "Lanjut ke Data Peserta →"}
            </span>

            {totalPrice > 0 && (
              <span className="font-black bg-white/20 px-2.5 py-0.5 rounded-lg text-xs">
                {formatRupiah(totalPrice)}
              </span>
            )}
          </button>
        </aside>
      </div>
    </div>
  );
}
