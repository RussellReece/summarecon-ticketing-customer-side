import { EventExplorer } from "@/components/shared/EventExplorer";
import { events } from "@/lib/data/events";

export default function HomePage() {
  return <EventExplorer events={events} />;
}
