import type { AgeBand, ElaEvent, EventCategory } from "./types";

/** UI filter state for the event explorer. Pure data, easy to test. */
export interface EventFilters {
  categories: EventCategory[];
  ageBands: AgeBand[];
  freeOnly: boolean;
  /** Case-insensitive substring match over title/description/venue. */
  query: string;
  /** Only include events starting on/after this ISO instant. */
  after?: string;
}

export const EMPTY_FILTERS: EventFilters = {
  categories: [],
  ageBands: [],
  freeOnly: false,
  query: "",
};

/** True when an event passes every active filter. */
export function matchesFilters(event: ElaEvent, filters: EventFilters): boolean {
  if (filters.categories.length && !filters.categories.includes(event.category)) {
    return false;
  }
  if (
    filters.ageBands.length &&
    !event.ageBands.some((b) => filters.ageBands.includes(b))
  ) {
    return false;
  }
  if (filters.freeOnly && !event.isFree) return false;

  if (filters.after && event.startsAt < filters.after) return false;

  const q = filters.query.trim().toLowerCase();
  if (q) {
    const hay = `${event.title} ${event.description ?? ""} ${event.venueName}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/** Apply filters, returning matches sorted chronologically. */
export function applyFilters(events: ElaEvent[], filters: EventFilters): ElaEvent[] {
  return events
    .filter((e) => matchesFilters(e, filters))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Toggle a value in a list filter (add if absent, remove if present). */
export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Count events per category (over the full, unfiltered set). */
export function categoryCounts(events: ElaEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.category] = (counts[e.category] ?? 0) + 1;
  return counts;
}
