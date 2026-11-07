// src/app/order/[id]/page.tsx
//
// Dynamic route — `id` is the event ID or slug used during the booking flow.
// No static params needed; this route is fully dynamic.

import OrderPageClient from "./OrderPageClient";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderPage({ params }: OrderPageProps) {
  return <OrderPageClient params={params} />;
}
