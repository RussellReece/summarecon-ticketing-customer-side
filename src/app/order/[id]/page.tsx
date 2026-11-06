import { events } from "@/lib/data/events";
import OrderPageClient from "./OrderPageClient";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return events.map(({ id }) => ({ id }));
}

export default function OrderPage({ params }: OrderPageProps) {
  return <OrderPageClient params={params} />;
}
