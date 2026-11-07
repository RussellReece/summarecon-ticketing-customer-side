// src/app/(main)/page.tsx
//
// Event Catalog Page — renders EventExplorer which executes client-side
// live fetching via `useEffect` -> `getAvailableEvents()` -> `GET /api/events`.

import { EventExplorer } from "@/components/shared/EventExplorer";

export default function HomePage() {
  return <EventExplorer />;
}
