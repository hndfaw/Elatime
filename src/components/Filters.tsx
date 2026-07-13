"use client";

import type { AgeBand, ElaEvent, EventCategory } from "@/lib/types";
import {
  AGE_LABELS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from "@/lib/format";
import {
  categoryCounts,
  toggle,
  dateRangePreset,
  type DatePreset,
  type EventFilters,
} from "@/lib/filters";

interface FiltersProps {
  events: ElaEvent[];
  filters: EventFilters;
  onChange: (next: EventFilters) => void;
}

const AGE_ORDER: AgeBand[] = ["infant", "toddler", "preschool", "kid", "all-ages"];

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "weekend", label: "Weekend" },
  { key: "week", label: "This week" },
];

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
        className="w-full rounded-full border-2 border-transparent bg-paper px-4 py-2 text-sm text-ink shadow-card placeholder:text-ink-soft/60 focus:border-coral/40 focus:outline-none"
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="When">
        {DATE_PRESETS.map(({ key, label }) => {
          const active = (filters.datePreset ?? "all") === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => {
                const range = dateRangePreset(key, new Date());
                onChange({
                  ...filters,
                  datePreset: key,
                  after: range.after,
                  before: range.before,
                });
              }}
              className={`rounded-full border-2 px-3 py-1 text-xs font-bold shadow-card transition ${
                active
                  ? "border-sky bg-sky/15 text-ink"
                  : "border-transparent bg-paper text-ink-soft hover:border-sky/30"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={filters.freeOnly}
          onChange={(e) => onChange({ ...filters, freeOnly: e.target.checked })}
          className="h-4 w-4 accent-coral"
        />
        Free events only
      </label>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">
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
                className={`flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-semibold shadow-card transition ${
                  active
                    ? "border-coral bg-coral/10 text-ink"
                    : "border-transparent bg-paper text-ink-soft hover:border-coral/20"
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white"
                  style={{ backgroundColor: CATEGORY_COLORS[c] }}
                />
                {CATEGORY_LABELS[c]}
                <span className="text-ink-soft/60">{counts[c]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">
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
                className={`rounded-full border-2 px-2.5 py-1 text-xs font-semibold shadow-card transition ${
                  active
                    ? "border-grape bg-grape/15 text-ink"
                    : "border-transparent bg-paper text-ink-soft hover:border-grape/30"
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
