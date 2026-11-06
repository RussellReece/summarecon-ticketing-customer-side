
"use client";

import Link from "next/link";
import { Suspense, use, useEffect } from "react";
import { notFound } from "next/navigation";

import { SeatMap } from "@/components/seat-map/SeatMap";
import CountdownTimer from "@/components/shared/CountdownTimer";
import { SelectionSummaryClient } from "@/components/seat-map/SelectionSummaryClient";

import { formatRupiah } from "@/lib/utils";
import { getEventById } from "@/lib/data/events";
import { useBookingStore } from "@/lib/store/useBookingStore";
import {
  connectSocket,
  disconnectSocket,
} from "@/lib/socket/socketClient";

interface BookingPageProps {
  params: Promise<{ id: string }>;
}

export default function BookingPage({ params }: BookingPageProps) {
  return (
    <Suspense
      fallback={
        <div className="page-container route-loading">
          Menyiapkan denah kursi...
        </div>
      }
    >
      <BookingPageContent params={params} />
    </Suspense>
  );
}

function BookingPageContent({ params }: BookingPageProps) {
  const { id } = use(params);
  const event = getEventById(id);

  const {
    selectedSeats,
    startLockTimer,
    setLockedByOthers,
    addLockedByOther,
    removeLockedByOther,
  } = useBookingStore();

  const totalPrice = selectedSeats.reduce(
    (sum, seat) => sum + seat.price,
    0
  );

  // Socket.IO connection and real-time seat locking
  useEffect(() => {
    // Connect to Socket.IO server
    const socket = connectSocket();

    if (!socket) return;

    // Join event room when connected
    socket.on("connect", () => {
      socket.emit("join-event", id);
    });

    // Receive initially locked seats
    socket.on("initial-locked-seats", (seatIds: string[]) => {
      setLockedByOthers(seatIds);
    });

    // Handle seats locked by other users
    socket.on("seat-locked-by-other", (seatId: string) => {
      addLockedByOther(seatId);
    });

    // Handle released seats
    socket.on("seat-released", (seatId: string) => {
      removeLockedByOther(seatId);
    });

    // Cleanup listeners and disconnect socket
    return () => {
      socket.off("connect");
      socket.off("initial-locked-seats");
      socket.off("seat-locked-by-other");
      socket.off("seat-released");

      disconnectSocket();
    };
  }, [
    id,
    setLockedByOthers,
    addLockedByOther,
    removeLockedByOther,
  ]);

  if (!event) notFound();

  // Handle booking and lock selected seats
  const handleBooking = () => {
    if (selectedSeats.length === 0) return;

    // Start 10-minute countdown
    startLockTimer();

    // Get current socket instance
    const socket = connectSocket();

    if (socket) {
      // Lock selected seats on the server
      const seatIds = selectedSeats.map((seat) => seat.id);

      socket.emit("lock-seats", {
        eventId: id,
        seatIds,
        duration: 600,
      });
    }

    // TODO: Redirect to order form
    // router.push(`/order/${id}`);
  };

  return (
    <div className="page-container booking-page">
      <Link className="back-link" href={`/event/${event.id}`}>
        ← Detail acara
      </Link>

      <div className="booking-title-row">
        <div>
          <span className="eyebrow eyebrow-dark">
            PILIH TEMPAT DUDUK
          </span>

          <h1>
            Temukan tempat
            <br />
            terbaikmu.
          </h1>

          <p>
            {event.title} <span>·</span> {event.dateLabel}
          </p>
        </div>

        <CountdownTimer />
      </div>

      <div className="booking-layout">
        <section className="seat-panel">
          <SeatMap event={event} />
        </section>

        <aside className="selection-panel">
          <span className="booking-card-label">
            RINGKASAN PILIHAN
          </span>

          <h2>Tiketmu</h2>

          <div className="selection-event">
            {event.title}

            <small>
              {event.dateLabel} · {event.time}
            </small>
          </div>

          <SelectionSummaryClient />

          <div className="selection-prices">
            <span>
              Platinum
              <strong>
                {formatRupiah(event.premiumPrice)}
              </strong>
            </span>

            <span>
              Regular
              <strong>
                {formatRupiah(event.priceFrom)}
              </strong>
            </span>
          </div>

          <p className="selection-limit">
            Pilih maksimal 4 kursi. Kursi akan ditahan otomatis.
          </p>

          <button
            type="button"
            className="booking-button"
            onClick={handleBooking}
            disabled={selectedSeats.length === 0}
          >
            Lanjutkan Pemesanan

            {totalPrice > 0 && (
              <strong>{formatRupiah(totalPrice)}</strong>
            )}
          </button>
        </aside>
      </div>
    </div>
  );
}
