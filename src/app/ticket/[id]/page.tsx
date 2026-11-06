"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { TicketPass } from "@/components/shared/TicketPass";
import { events, getEventById } from "@/lib/data/events";
import { useBookingStore } from "@/lib/store/useBookingStore";

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return events.map(({ id }) => ({ id }));
}

export default function TicketPage({ params }: TicketPageProps) {
  return (
    <Suspense
      fallback={
        <div className="page-container route-loading">
          Menyiapkan tiket...
        </div>
      }
    >
      <TicketPageContent params={params} />
    </Suspense>
  );
}

async function TicketPageContent({ params }: TicketPageProps) {
  const { id } = await params;
  const event = getEventById(id);

  if (!event) notFound();

  return <TicketContent id={id} event={event} />;
}

function TicketContent({
  id,
  event,
}: {
  id: string;
  event: (typeof events)[number];
}) {
  const router = useRouter();
  const { selectedSeats, resetBooking } = useBookingStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="page-container route-loading">
        Menyiapkan tiket...
      </div>
    );
  }

  const qrValue = JSON.stringify({ orderId: id });

  return (
    <div className="page-container ticket-page">
      <Link className="back-link" href="/">
        ← Kembali ke beranda
      </Link>

      <div className="ticket-heading">
        <span className="ticket-success-mark">✓</span>
        <span className="eyebrow eyebrow-dark">TIKET DEMO</span>
        <h1>
          Siap untuk
          <br />
          momen seru?
        </h1>
        <p>
          Ini pratinjau e-ticket. QR code belum berlaku untuk masuk acara.
        </p>
      </div>

      <div className="bg-white border border-summa-line rounded-ticket overflow-hidden shadow-summa">
        {/* Header Tiket */}
        <div className="bg-summa-gradient text-white p-5">
          <small className="tracking-[0.25em] text-[11px] font-display">
            E-TICKET
          </small>

          <h3 className="font-display font-bold text-[22px] mt-1 mb-2 leading-tight">
            {event.title}
          </h3>

          <div className="text-[13px] opacity-95">
            {event.date}
            <br />
            {event.location}
          </div>
        </div>

        {/* Rincian Tiket */}
        <div className="p-4 md:p-5 flex justify-between gap-2 border-b-2 border-dashed border-summa-line">
          <div>
            <span className="text-[12px] text-summa-muted block">
              Order ID
            </span>
            <b className="font-display block">{id}</b>
          </div>

          <div className="text-right">
            <span className="text-[12px] text-summa-muted block">
              Kuantitas
            </span>
            <b className="font-display block">
              {selectedSeats.length || 1} Tiket
            </b>
          </div>
        </div>

        {/* Area Kode QR */}
        <div className="p-6 flex flex-col items-center">
          <p className="text-[13px] text-summa-muted text-center mb-4">
            Tunjukkan QR Code ini kepada petugas di pintu masuk. Satu QR
            berlaku untuk seluruh peserta dalam pesanan ini.
          </p>

          <div className="bg-white p-2 rounded-xl">
            <QRCode
              value={qrValue}
              size={180}
              bgColor="#FFFFFF"
              fgColor="#2A1F2D"
            />
          </div>

          <span className="mt-4 text-xs font-medium bg-summa-tint text-summa-primaryDark px-3 py-1.5 rounded-full">
            Status: Valid
          </span>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => {
            resetBooking();
            router.push("/");
          }}
          className="text-summa-muted text-sm underline hover:text-summa-ink"
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}