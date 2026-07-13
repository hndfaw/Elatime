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
      <p className="px-1 py-8 text-center text-sm text-ink-soft">
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
              className={`w-full rounded-2xl border-2 bg-paper p-3 text-left shadow-card transition ${
                selected
                  ? "border-coral"
                  : "border-transparent hover:border-coral/30"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: CATEGORY_COLORS[event.category] }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{event.title}</p>
                  <p className="mt-0.5 text-xs font-medium text-ink-soft">
                    {formatWhen(event.startsAt, event.endsAt)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-soft/80">
                    {event.venueName}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                      {CATEGORY_LABELS[event.category]}
                    </span>
                    {event.isFree && (
                      <span className="rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
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
