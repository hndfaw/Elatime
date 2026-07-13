"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElaEvent, Region } from "@/lib/types";
import { applyFilters, EMPTY_FILTERS, type EventFilters } from "@/lib/filters";
import dynamic from "next/dynamic";
import { formatAge, isStale, type DatasetStatus } from "@/lib/dataset";
import EventDetail from "./EventDetail";
import EventList from "./EventList";
import Filters from "./Filters";
import AboutData from "./AboutData";
import Mascot from "./Mascot";

// Leaflet touches `window` at import, so the real map is client-only.
const RealMap = dynamic(() => import("./RealMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-3xl bg-paper text-sm text-ink-soft shadow-soft">
      <Mascot size={44} title="" />
      Loading map…
    </div>
  ),
});

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

  const wordmark = (
    <span className="font-display font-bold">
      <span className="text-coral">Ela</span>
      <span className="text-ink">time</span>
    </span>
  );

  return (
    <div className="flex h-full flex-col gap-3 lg:grid lg:grid-cols-[360px,1fr] lg:gap-4">
      {/* Compact mobile header (hidden on large screens) */}
      <div className="flex shrink-0 items-center justify-between lg:hidden">
        <div className="flex items-center gap-2">
          <Mascot size={30} title="" />
          <span className="text-xl">{wordmark}</span>
        </div>
        <p className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink-soft shadow-card">
          {hasData ? `${filtered.length}/${events.length} events` : region.name}
        </p>
      </div>

      {/* Mobile Map/List toggle (hidden on large screens) */}
      <div
        role="tablist"
        aria-label="View"
        className="flex shrink-0 gap-1 rounded-full bg-paper p-1 shadow-card lg:hidden"
      >
        {(["map", "list"] as MobileView[]).map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={mobileView === view}
            onClick={() => setMobileView(view)}
            className={`flex-1 rounded-full py-1.5 text-sm font-semibold capitalize transition ${
              mobileView === view ? "bg-coral text-white shadow-card" : "text-ink-soft"
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
          <div className="flex items-center gap-3">
            <Mascot size={44} title="" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
                {region.name}, {region.state}
              </p>
              <h1 className="font-display text-2xl leading-none">{wordmark}</h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {hasData
              ? `${filtered.length} of ${events.length} kid-friendly events`
              : "Kid-friendly activities, mapped 🎈"}
          </p>
        </div>

        {status === "invalid" && (
          <p
            role="alert"
            className="rounded-2xl border border-coral/30 bg-coral/10 px-3 py-2 text-sm font-medium text-coral"
          >
            We couldn’t read the latest event data. Showing an empty map for now —
            the next refresh should restore it.
          </p>
        )}

        {hasData && freshness?.stale && (
          <p
            role="status"
            className="rounded-2xl border border-sunshine/50 bg-sunshine/20 px-3 py-2 text-xs font-medium text-ink"
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
          <div className="flex flex-1 flex-col items-center justify-center rounded-3xl bg-paper p-6 text-center shadow-soft">
            <Mascot size={72} title="" />
            <p className="mt-3 font-display text-lg font-semibold text-ink">
              No events to show yet
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {status === "invalid"
                ? "The event data couldn’t be loaded."
                : "The next scrape will fill this area with fun things to do."}
            </p>
          </div>
        )}

        {hasData && freshness && !freshness.stale && (
          <p className="text-[11px] text-ink-soft/70">Data refreshed {freshness.age}</p>
        )}

        <AboutData />
      </aside>

      {/* Map */}
      <div
        className={`relative min-h-0 flex-1 lg:block lg:h-full ${
          mobileView === "map" ? "block" : "hidden"
        }`}
      >
        <EventDetail event={selected} onClose={() => setSelectedId(null)} />
        <RealMap
          region={region}
          events={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        {!hasData && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="rounded-full bg-paper/90 px-4 py-2 text-sm font-medium text-ink-soft shadow-card backdrop-blur">
              No events plotted yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
