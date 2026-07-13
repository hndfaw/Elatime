import type { AgeBand, EventCategory } from "./types";

/** Human labels for categories, used in the UI legend and chips. */
export const CATEGORY_LABELS: Record<EventCategory, string> = {
  storytime: "Storytime",
  playground: "Playground",
  "arts-crafts": "Arts & Crafts",
  music: "Music & Dance",
  outdoor: "Outdoor & Nature",
  museum: "Museum & Science",
  sports: "Sports & Active",
  seasonal: "Seasonal",
  class: "Classes",
  other: "Other",
};

/** Marker/legend color per category (matches tailwind palette intent). */
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  storytime: "#4cc9f0",
  playground: "#ff6b6b",
  "arts-crafts": "#ffd166",
  music: "#b892ff",
  outdoor: "#06d6a0",
  museum: "#f78c6b",
  sports: "#ef476f",
  seasonal: "#ffb4a2",
  class: "#83c5be",
  other: "#9aa5b1",
};

export const AGE_LABELS: Record<AgeBand, string> = {
  infant: "Infant (0-1)",
  toddler: "Toddler (1-3)",
  preschool: "Preschool (3-5)",
  kid: "Kid (5-12)",
  "all-ages": "All ages",
};

// Format event dates/times in the venue's own timezone (Lee County is Eastern),
// not the viewer's. This keeps the displayed time correct for everyone (a 10am
// Fort Myers storytime reads "10:00 AM" regardless of where you're viewing) and
// makes server + client render identical text, avoiding hydration mismatches.
const EVENT_TZ = "America/New_York";

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: EVENT_TZ,
});

const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: EVENT_TZ,
});

/** "Sat, Jul 12" style date label. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date TBD";
  return DATE_FMT.format(d);
}

/** "3:00 PM" style time label. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return TIME_FMT.format(d);
}

/** "Sat, Jul 12 · 3:00 PM – 4:00 PM" combined label. */
export function formatWhen(startsAt: string, endsAt?: string): string {
  const date = formatDate(startsAt);
  const start = formatTime(startsAt);
  if (!start) return date;
  const end = endsAt ? formatTime(endsAt) : "";
  return end ? `${date} · ${start} – ${end}` : `${date} · ${start}`;
}
