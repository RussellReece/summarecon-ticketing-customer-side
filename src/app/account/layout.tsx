import { MainSiteLayout } from "@/components/shared/MainSiteLayout";
import type { ReactNode } from "react";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <MainSiteLayout>{children}</MainSiteLayout>;
}

