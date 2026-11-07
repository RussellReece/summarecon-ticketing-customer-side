// src/app/ticket/[id]/page.tsx
// Dynamic route for e-ticket display.

import TicketPageClient from "./TicketPageClient";

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default function TicketPage({ params }: TicketPageProps) {
  return <TicketPageClient params={params} />;
}
