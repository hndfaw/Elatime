import type { GeoPoint } from "../types";

/**
 * Approximate geocoding for Lee County Library branches.
 *
 * The library iCal feed gives a branch name in LOCATION but no coordinates.
 * We map each branch to the well-known coordinates of the city/area it sits in
 * (documented municipal centroids — not invented), which is accurate enough to
 * place events on the right part of the stylized county map. Precise
 * per-building geocoding is tracked as a follow-up.
 *
 * Matching is by case-insensitive substring; more specific names (e.g. "north
 * fort myers", "fort myers beach") are checked before the generic "fort myers".
 */

interface BranchRule {
  match: string[];
  point: GeoPoint;
}

// Order matters: specific entries first.
const BRANCHES: BranchRule[] = [
  { match: ["north fort myers"], point: { lat: 26.717, lng: -81.8998 } },
  { match: ["fort myers beach"], point: { lat: 26.4523, lng: -81.949 } },
  { match: ["cape coral", "northwest regional"], point: { lat: 26.5629, lng: -81.9495 } },
  { match: ["lakes regional"], point: { lat: 26.5772, lng: -81.8807 } },
  { match: ["riverdale"], point: { lat: 26.656, lng: -81.748 } },
  { match: ["east county", "lehigh"], point: { lat: 26.612, lng: -81.639 } },
  { match: ["estero"], point: { lat: 26.438, lng: -81.8067 } },
  { match: ["pine island", "bokeelia"], point: { lat: 26.68, lng: -82.15 } },
  { match: ["sanibel", "captiva"], point: { lat: 26.448, lng: -82.11 } },
  { match: ["dunbar"], point: { lat: 26.64, lng: -81.84 } },
  // Downtown / generic Fort Myers branches.
  {
    match: ["downtown", "fort myers regional", "2050 lee", "fort myers"],
    point: { lat: 26.6406, lng: -81.8723 },
  },
];

/** Resolve a branch/location string to approximate coordinates, if known. */
export function locateLeeBranch(location?: string): GeoPoint | undefined {
  if (!location) return undefined;
  const hay = location.toLowerCase();
  for (const rule of BRANCHES) {
    if (rule.match.some((m) => hay.includes(m))) return rule.point;
  }
  return undefined;
}
