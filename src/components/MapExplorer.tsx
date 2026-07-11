"use client";

import { useMemo, useState } from "react";
import type { ElaEvent, Region } from "@/lib/types";
import { applyFilters, EMPTY_FILTERS, type EventFilters } from "@/lib/filters";
import MapCanvas from "./MapCanvas";
import EventDetail from "./EventDetail";
import EventList from "./EventList";
import Filters from "./Filters";

interface MapExplorerProps {
  region: Region;
  events: ElaEvent[];
  generatedAt: string;
}

/**
 * Top-level client surface: owns filter + selection state and composes the
 * map, detail popover, filters, and list into a responsive two-pane layout.
 */
export default function MapExplorer({ region, events, generatedAt }: MapExplorerProps) {
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => applyFilters(events, filters), [events, filters]);
  const selected = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  const updated = useMemo(() => {
    const d = new Date(generatedAt);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  }, [generatedAt]);

  return (
    <div className="grid h-full grid-rows-[auto,1fr] gap-4 lg:grid-cols-[360px,1fr] lg:grid-rows-1">
      {/* Sidebar */}
      <aside className="flex min-h-0 flex-col gap-4 lg:h-full">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/40">
            {region.name}, {region.state}
          </p>
          <h1 className="font-display text-2xl font-bold text-white">
            <span className="text-coral">Ela</span>time
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {filtered.length} of {events.length} kid-friendly events
          </p>
        </div>

        <Filters events={events} filters={filters} onChange={setFilters} />

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <EventList
            events={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {updated && (
          <p className="text-[11px] text-white/30">Data refreshed {updated}</p>
        )}
      </aside>

      {/* Map */}
      <div className="relative min-h-[420px] lg:h-full">
        <EventDetail event={selected} onClose={() => setSelectedId(null)} />
        <MapCanvas
          region={region}
          events={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
    </div>
  );
}
