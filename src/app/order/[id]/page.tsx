import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderSummary } from "@/components/shared/OrderSummary";
import { events, getEventById } from "@/lib/data/events";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return events.map(({ id }) => ({ id }));
}

export default function OrderPage({ params }: OrderPageProps) {
  return (
    <Suspense fallback={<div className="page-container route-loading">Memuat pesanan...</div>}>
      <OrderPageContent params={params} />
    </Suspense>
  );
}

async function OrderPageContent({ params }: OrderPageProps) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();

  return (
    <div className="page-container checkout-page">
      <Link className="back-link" href={`/event/${event.id}/book`}>← Kembali pilih kursi</Link>
      <div className="checkout-heading">
        <span className="eyebrow eyebrow-dark">SATU LANGKAH LAGI</span>
        <h1>Periksa pesananmu.</h1>
        <p>Pastikan detail tiket sudah sesuai sebelum melanjutkan.</p>
      </div>
      <OrderSummary event={event} />
    </div>
  );
}
