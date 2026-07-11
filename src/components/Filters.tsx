"use client";

import type { AgeBand, ElaEvent, EventCategory } from "@/lib/types";
import {
  AGE_LABELS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from "@/lib/format";
import { categoryCounts, toggle, type EventFilters } from "@/lib/filters";

interface FiltersProps {
  events: ElaEvent[];
  filters: EventFilters;
  onChange: (next: EventFilters) => void;
}

const AGE_ORDER: AgeBand[] = ["infant", "toddler", "preschool", "kid", "all-ages"];

/** Filter controls: search, free-only, category chips, and age bands. */
export default function Filters({ events, filters, onChange }: FiltersProps) {
  const counts = categoryCounts(events);
  const categories = (Object.keys(CATEGORY_LABELS) as EventCategory[]).filter(
    (c) => counts[c]
  );

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={filters.query}
        onChange={(e) => onChange({ ...filters, query: e.target.value })}
        placeholder="Search events, venues…"
        aria-label="Search events"
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky focus:outline-none"
      />

      <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          checked={filters.freeOnly}
          onChange={(e) => onChange({ ...filters, freeOnly: e.target.checked })}
          className="h-4 w-4 accent-mint"
        />
        Free events only
      </label>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          Category
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = filters.categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onChange({ ...filters, categories: toggle(filters.categories, c) })
                }
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                  active
                    ? "border-transparent bg-white/15 text-white"
                    : "border-white/10 text-white/60 hover:bg-white/5"
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[c] }}
                />
                {CATEGORY_LABELS[c]}
                <span className="text-white/40">{counts[c]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          Age
        </h3>
        <div className="flex flex-wrap gap-2">
          {AGE_ORDER.map((a) => {
            const active = filters.ageBands.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onChange({ ...filters, ageBands: toggle(filters.ageBands, a) })
                }
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  active
                    ? "border-sunshine bg-sunshine/20 text-white"
                    : "border-white/10 text-white/60 hover:bg-white/5"
                }`}
              >
                {AGE_LABELS[a]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
