export interface TicketEvent {
  id: string;
  title: string;
  category: string;
  venue: string;
  city: string;
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
}

export interface UserSession {
  name: string;
  email: string;
}
