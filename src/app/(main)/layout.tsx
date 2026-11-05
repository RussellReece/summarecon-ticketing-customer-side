import { MainSiteLayout } from "@/components/shared/MainSiteLayout";
import type { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return <MainSiteLayout>{children}</MainSiteLayout>;
}
