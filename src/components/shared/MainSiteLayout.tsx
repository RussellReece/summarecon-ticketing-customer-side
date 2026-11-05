import type { ReactNode } from "react";
import { BookingHoldManager } from "@/components/shared/BookingHoldManager";
import { Footer } from "@/components/shared/Footer";
import { Header } from "@/components/shared/Header";

export function MainSiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BookingHoldManager />
      <Header />
      <main className="site-main">{children}</main>
      <Footer />
    </>
  );
}
