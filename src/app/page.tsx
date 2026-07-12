import MapExplorer from "@/components/MapExplorer";
import { getDefaultRegion } from "@/lib/regions";
import { safeLoadDataset } from "@/lib/dataset";
import type { ElaEvent } from "@/lib/types";
import rawDataset from "../../data/events.json";

/**
 * Home page (server component). Loads the pre-scraped events dataset that the
 * pipeline commits to the repo — defensively, so a partial/malformed/stale file
 * never crashes the page — scopes it to the default region, and hands it to the
 * interactive client explorer.
 */
export default function Home() {
  const { dataset, status } = safeLoadDataset(rawDataset);
  const region = getDefaultRegion();
  const events: ElaEvent[] = dataset.events.filter((e) => e.regionId === region.id);

  return (
    <main className="mx-auto h-screen max-w-[1400px] p-4 lg:p-6">
      <MapExplorer
        region={region}
        events={events}
        generatedAt={dataset.generatedAt}
        status={status}
      />
    </main>
  );
}
