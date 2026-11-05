import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "SummareconTicket",
    template: "%s | Summarecon Tickets",
  },
  description:
    "Temukan acara seru di Summarecon Mall Bandung dan pesan tiket pilihanmu dengan mudah.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}