export interface TicketEvent {
  id: string;
  title: string;
  category: string;
  venue: string;
  city: string;
  date: string;
  location: string;
  dateLabel: string;
  dateISO: string;
  time: string;
  priceFrom: number;
  premiumPrice: number;
  description: string;
  theme: "violet" | "amber" | "blue";
  badge: string;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  category: string;
  price: number;
  area: string; // <-- Tambahkan baris ini
  status?: string; // (Bila ada properti lain, biarkan saja)
}

export interface UserSession {
  name: string;
  email: string;
}
