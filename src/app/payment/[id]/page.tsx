// src/app/payment/[id]/page.tsx
// Dynamic route for checkout / payment flow.

import PaymentPageClient from "./PaymentPageClient";

interface PaymentPageProps {
  params: Promise<{ id: string }>;
}

export default function PaymentPage({ params }: PaymentPageProps) {
  return <PaymentPageClient params={params} />;
}
