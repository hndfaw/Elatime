import type { ElaEvent, GeoPoint } from "./types";

/**
 * Group events into the physical places (venues/buildings) they happen at, so
 * the map can show one legible, named pin per location instead of anonymous
 * per-event dots.
 *
 * `venueName` in the data is coarse (e.g. every library branch is "Lee County
 * Library"), so we build a friendlier label from the venue name + the city
 * parsed out of the street address, and group by rounded coordinates.
 */

export interface Venue {
  /** Stable key derived from the rounded coordinate. */
  key: string;
  /** Friendly place label, e.g. "Lee County Library · Cape Coral". */
  label: string;
  venueName: string;
  address?: string;
  location: GeoPoint;
  /** Events at this place, sorted chronologically. */
  events: ElaEvent[];
}

/** Extract the city from an address like "519 Chiquita Blvd. N., Cape Coral, FL, 33993, US". */
export function parseCity(address?: string): string | undefined {
  if (!address) return undefined;
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  // [street, city, state, zip, country] — city is the second segment.
  return parts.length >= 2 ? parts[1] : undefined;
}

/** A friendly place label: venue name, qualified by city when it adds info. */
export function placeLabel(event: ElaEvent): string {
  const city = parseCity(event.address);
  if (city && !event.venueName.toLowerCase().includes(city.toLowerCase())) {
    return `${event.venueName} · ${city}`;
  }
  return event.venueName;
}

/** The most common category among a set of events (first-seen tie-break). */
export function dominantCategory(events: ElaEvent[]): ElaEvent["category"] {
  const counts = new Map<ElaEvent["category"], number>();
  for (const e of events) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  let best: ElaEvent["category"] = events[0]?.category ?? "other";
  let bestN = -1;
  for (const e of events) {
    const n = counts.get(e.category)!;
    if (n > bestN) {
      bestN = n;
      best = e.category;
    }
  }
  return best;
}

/** Group events by physical location (rounded coordinate). */
export function groupByVenue(events: ElaEvent[]): Venue[] {
  const byKey = new Map<string, Venue>();
  for (const ev of events) {
    const key = `${ev.location.lat.toFixed(4)},${ev.location.lng.toFixed(4)}`;
    let venue = byKey.get(key);
    if (!venue) {
      venue = {
        key,
        label: placeLabel(ev),
        venueName: ev.venueName,
        address: ev.address,
        location: ev.location,
        events: [],
      };
      byKey.set(key, venue);
    }
    venue.events.push(ev);
  }
  const venues = [...byKey.values()];
  for (const v of venues) v.events.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return venues;
}
