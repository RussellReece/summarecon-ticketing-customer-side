import { events } from "@/lib/data/events";
import TicketPageClient from "./TicketPageClient";

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return events.map(({ id }) => ({ id }));
}

export default function TicketPage({ params }: TicketPageProps) {
  return <TicketPageClient params={params} />;
}
