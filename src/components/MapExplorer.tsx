"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElaEvent, Region } from "@/lib/types";
import { applyFilters, EMPTY_FILTERS, type EventFilters } from "@/lib/filters";
import { formatAge, isStale, type DatasetStatus } from "@/lib/dataset";
import MapCanvas from "./MapCanvas";
import EventDetail from "./EventDetail";
import EventList from "./EventList";
import Filters from "./Filters";

interface MapExplorerProps {
  region: Region;
  events: ElaEvent[];
  generatedAt: string;
  status?: DatasetStatus;
}

type MobileView = "map" | "list";

/**
 * Top-level client surface: owns filter + selection state and composes the
 * map, detail popover, filters, and list.
 *
 * Layout: two panes side-by-side on large screens; on phones the panes stack
 * behind a Map/List toggle so each gets the full viewport (rather than the
 * sidebar squeezing the map). Handles empty / stale / malformed data too.
 */
export default function MapExplorer({
  region,
  events,
  generatedAt,
  status = "ok",
}: MapExplorerProps) {
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("map");

  // Freshness is computed after mount (client-only) so it reflects real elapsed
  // time at view — and avoids a server/client hydration mismatch from Date.now.
  const [freshness, setFreshness] = useState<{ stale: boolean; age: string } | null>(
    null
  );
  useEffect(() => {
    if (!generatedAt) return;
    setFreshness({ stale: isStale(generatedAt), age: formatAge(generatedAt) });
  }, [generatedAt]);

  const filtered = useMemo(() => applyFilters(events, filters), [events, filters]);
  const selected = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  const hasData = events.length > 0;

  // Selecting from the list on a phone jumps to the map so the pin is visible.
  const selectFromList = (id: string) => {
    setSelectedId(id);
    setMobileView("map");
  };

  return (
    <div className="flex h-full flex-col gap-3 lg:grid lg:grid-cols-[360px,1fr] lg:gap-4">
      {/* Compact mobile header (hidden on large screens) */}
      <div className="flex shrink-0 items-baseline justify-between lg:hidden">
        <h1 className="font-display text-xl font-bold text-white">
          <span className="text-coral">Ela</span>time
        </h1>
        <p className="text-xs text-white/50">
          {hasData ? `${filtered.length}/${events.length} events` : region.name}
        </p>
      </div>

      {/* Mobile Map/List toggle (hidden on large screens) */}
      <div
        role="tablist"
        aria-label="View"
        className="flex shrink-0 gap-1 rounded-lg bg-white/5 p-1 lg:hidden"
      >
        {(["map", "list"] as MobileView[]).map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={mobileView === view}
            onClick={() => setMobileView(view)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition ${
              mobileView === view ? "bg-white/15 text-white" : "text-white/60"
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Sidebar */}
      <aside
        className={`min-h-0 flex-1 flex-col gap-4 lg:flex lg:h-full lg:flex-none ${
          mobileView === "list" ? "flex" : "hidden"
        }`}
      >
        <div className="hidden lg:block">
          <p className="text-xs uppercase tracking-widest text-white/40">
            {region.name}, {region.state}
          </p>
          <h1 className="font-display text-2xl font-bold text-white">
            <span className="text-coral">Ela</span>time
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {hasData
              ? `${filtered.length} of ${events.length} kid-friendly events`
              : "Kid-friendly activities, mapped"}
          </p>
        </div>

        {status === "invalid" && (
          <p
            role="alert"
            className="rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral"
          >
            We couldn’t read the latest event data. Showing an empty map for now —
            the next refresh should restore it.
          </p>
        )}

        {hasData && freshness?.stale && (
          <p
            role="status"
            className="rounded-lg border border-sunshine/40 bg-sunshine/10 px-3 py-2 text-xs text-sunshine"
          >
            ⚠ This data may be out of date (last refreshed {freshness.age}).
          </p>
        )}

        {hasData ? (
          <>
            <Filters events={events} filters={filters} onChange={setFilters} />
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <EventList
                events={filtered}
                selectedId={selectedId}
                onSelect={selectFromList}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-3xl" aria-hidden>
              🗺️
            </p>
            <p className="mt-2 font-medium text-white">No events to show yet</p>
            <p className="mt-1 text-sm text-white/50">
              {status === "invalid"
                ? "The event data couldn’t be loaded."
                : "The next scrape will populate activities for this area."}
            </p>
          </div>
        )}

        {hasData && freshness && !freshness.stale && (
          <p className="text-[11px] text-white/30">Data refreshed {freshness.age}</p>
        )}
      </aside>

      {/* Map */}
      <div
        className={`relative min-h-0 flex-1 lg:block lg:h-full ${
          mobileView === "map" ? "block" : "hidden"
        }`}
      >
        <EventDetail event={selected} onClose={() => setSelectedId(null)} />
        <MapCanvas
          region={region}
          events={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        {!hasData && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="rounded-full bg-canvas/80 px-4 py-2 text-sm text-white/60 backdrop-blur">
              No events plotted yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
