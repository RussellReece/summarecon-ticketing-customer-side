import type { ReactNode } from "react";
import { MainSiteLayout } from "@/components/shared/MainSiteLayout";

export default function OrderLayout({ children }: { children: ReactNode }) {
  return <MainSiteLayout>{children}</MainSiteLayout>;
}
