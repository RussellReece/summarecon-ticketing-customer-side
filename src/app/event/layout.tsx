import type { ReactNode } from "react";
import { MainSiteLayout } from "@/components/shared/MainSiteLayout";

export default function EventLayout({ children }: { children: ReactNode }) {
  return <MainSiteLayout>{children}</MainSiteLayout>;
}
