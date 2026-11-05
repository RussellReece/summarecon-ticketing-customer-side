import type { TicketEvent } from "@/types/event";

export const events: TicketEvent[] = [
  {
    id: "sound-of-summarecon",
    title: "Sound of Summarecon",
    category: "MUSIK",
    venue: "Summarecon Mall Bandung",
    city: "Bandung",
    dateLabel: "Sab, 21 Nov 2026",
    dateISO: "2026-11-21",
    time: "19.00 WIB",
    priceFrom: 350000,
    premiumPrice: 850000,
    description:
      "Satu malam, banyak cerita. Nikmati penampilan musisi pilihan dalam perayaan musik dan kebersamaan di jantung kota Bandung.",
    theme: "violet",
    badge: "PALING DINANTI",
  },
  {
    id: "weekend-jazz",
    title: "Weekend Jazz Society",
    category: "MUSIK",
    venue: "Summarecon Mall Bandung",
    city: "Bandung",
    dateLabel: "Min, 29 Nov 2026",
    dateISO: "2026-11-29",
    time: "18.30 WIB",
    priceFrom: 275000,
    premiumPrice: 700000,
    description:
      "Akhiri akhir pekan dengan aransemen jazz yang hangat, pilihan kuliner, dan suasana santai bersama teman-teman.",
    theme: "amber",
    badge: "SEGERA HABIS",
  },
  {
    id: "creative-market",
    title: "The Creative Market",
    category: "LIFESTYLE",
    venue: "Summarecon Mall Bandung",
    city: "Bandung",
    dateLabel: "Min, 06 Des 2026",
    dateISO: "2026-12-06",
    time: "10.00 WIB",
    priceFrom: 50000,
    premiumPrice: 150000,
    description:
      "Temukan karya lokal, workshop kreatif, dan inspirasi baru dari komunitas kreator dalam satu ruang yang seru.",
    theme: "blue",
    badge: "TIKET TERSEDIA",
  },
];

export function getEventById(id: string) {
  return events.find((event) => event.id === id);
}
