import MapExplorer from "@/components/MapExplorer";
import { getDefaultRegion } from "@/lib/regions";
import type { ElaEvent, EventsDataset } from "@/lib/types";
import dataset from "../../data/events.json";

/**
 * Home page (server component). Loads the pre-scraped events dataset that the
 * autonomous pipeline commits to the repo, scopes it to the default region,
 * and hands it to the interactive client explorer.
 */
export default function Home() {
  const data = dataset as EventsDataset;
  const region = getDefaultRegion();
  const events: ElaEvent[] = data.events.filter((e) => e.regionId === region.id);

  return (
    <main className="mx-auto h-screen max-w-[1400px] p-4 lg:p-6">
      <MapExplorer region={region} events={events} generatedAt={data.generatedAt} />
    </main>
  );
}
