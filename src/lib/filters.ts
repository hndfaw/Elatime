import type { AgeBand, ElaEvent, EventCategory } from "./types";

/** Named date-range shortcuts for the quick-filter buttons. */
export type DatePreset = "all" | "today" | "weekend" | "week";

/** UI filter state for the event explorer. Pure data, easy to test. */
export interface EventFilters {
  categories: EventCategory[];
  ageBands: AgeBand[];
  freeOnly: boolean;
  /** Case-insensitive substring match over title/description/venue. */
  query: string;
  /** Only include events starting on/after this ISO instant. */
  after?: string;
  /** Only include events starting strictly before this ISO instant. */
  before?: string;
  /** Which date shortcut is active (UI highlight; drives after/before). */
  datePreset?: DatePreset;
}

export const EMPTY_FILTERS: EventFilters = {
  categories: [],
  ageBands: [],
  freeOnly: false,
  query: "",
  datePreset: "all",
};

/**
 * Compute the {after, before} range for a date preset, in the viewer's local
 * time. "weekend" is the upcoming (or current) Saturday–Sunday; "week" is the
 * next 7 days from now.
 */
export function dateRangePreset(
  preset: DatePreset,
  now: Date
): { after?: string; before?: string } {
  if (preset === "all") return {};
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "today") {
    const end = new Date(startOfDay);
    end.setDate(end.getDate() + 1);
    return { after: startOfDay.toISOString(), before: end.toISOString() };
  }

  if (preset === "week") {
    const end = new Date(startOfDay);
    end.setDate(end.getDate() + 7);
    return { after: now.toISOString(), before: end.toISOString() };
  }

  // weekend: from Saturday 00:00 to Monday 00:00 (or from now if it's the weekend).
  const day = now.getDay(); // 0 Sun … 6 Sat
  if (day === 0) {
    const mon = new Date(startOfDay);
    mon.setDate(mon.getDate() + 1);
    return { after: now.toISOString(), before: mon.toISOString() };
  }
  const sat = new Date(startOfDay);
  sat.setDate(sat.getDate() + ((6 - day + 7) % 7));
  const mon = new Date(sat);
  mon.setDate(mon.getDate() + 2);
  const after = day === 6 ? now.toISOString() : sat.toISOString();
  return { after, before: mon.toISOString() };
}

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
  if (filters.before && event.startsAt >= filters.before) return false;

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
