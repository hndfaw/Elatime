"use client";

import type { ElaEvent } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_LABELS, formatWhen } from "@/lib/format";

interface EventListProps {
  events: ElaEvent[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

/** Scrollable chronological list of events, synced with the map selection. */
export default function EventList({ events, selectedId, onSelect }: EventListProps) {
  if (events.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm text-white/50">
        No events match your filters yet. Try clearing a filter.
      </p>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Event list">
      {events.map((event) => {
        const selected = event.id === selectedId;
        return (
          <li key={event.id}>
            <button
              type="button"
              onClick={() => onSelect?.(event.id)}
              aria-current={selected}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-sky bg-sky/10"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[event.category] }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{event.title}</p>
                  <p className="mt-0.5 text-xs text-white/60">
                    {formatWhen(event.startsAt, event.endsAt)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-white/50">
                    {event.venueName}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
                      {CATEGORY_LABELS[event.category]}
                    </span>
                    {event.isFree && (
                      <span className="rounded bg-mint/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mint">
                        Free
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
