import { describe, it, expect } from "vitest";
import {
  applyFilters,
  matchesFilters,
  toggle,
  categoryCounts,
  EMPTY_FILTERS,
} from "@/lib/filters";
import type { ElaEvent } from "@/lib/types";

function ev(overrides: Partial<ElaEvent>): ElaEvent {
  return {
    id: "e",
    title: "Toddler Storytime",
    description: "Songs and rhymes",
    category: "storytime",
    ageBands: ["toddler"],
    regionId: "lee-county-fl",
    sourceId: "s",
    venueName: "Library",
    location: { lat: 26.64, lng: -81.87 },
    startsAt: "2026-07-12T15:00:00.000Z",
    isFree: true,
    tags: [],
    scrapedAt: "2026-07-11T00:00:00.000Z",
    ...overrides,
  };
}

const sample: ElaEvent[] = [
  ev({ id: "a", category: "storytime", ageBands: ["toddler"], isFree: true, startsAt: "2026-07-12T15:00:00.000Z" }),
  ev({ id: "b", title: "Dino Day", category: "museum", ageBands: ["kid"], isFree: false, startsAt: "2026-07-15T16:00:00.000Z" }),
  ev({ id: "c", title: "Music Jam", category: "music", ageBands: ["all-ages"], isFree: true, startsAt: "2026-07-13T22:00:00.000Z" }),
];

describe("matchesFilters", () => {
  it("passes everything with empty filters", () => {
    expect(sample.every((e) => matchesFilters(e, EMPTY_FILTERS))).toBe(true);
  });
  it("filters by category", () => {
    const f = { ...EMPTY_FILTERS, categories: ["museum" as const] };
    expect(matchesFilters(sample[1], f)).toBe(true);
    expect(matchesFilters(sample[0], f)).toBe(false);
  });
  it("filters by age band (any overlap)", () => {
    const f = { ...EMPTY_FILTERS, ageBands: ["toddler" as const] };
    expect(matchesFilters(sample[0], f)).toBe(true);
    expect(matchesFilters(sample[1], f)).toBe(false);
  });
  it("filters free only", () => {
    const f = { ...EMPTY_FILTERS, freeOnly: true };
    expect(matchesFilters(sample[1], f)).toBe(false);
    expect(matchesFilters(sample[0], f)).toBe(true);
  });
  it("filters by query over title/desc/venue", () => {
    const f = { ...EMPTY_FILTERS, query: "dino" };
    expect(matchesFilters(sample[1], f)).toBe(true);
    expect(matchesFilters(sample[0], f)).toBe(false);
  });
  it("filters by after timestamp", () => {
    const f = { ...EMPTY_FILTERS, after: "2026-07-14T00:00:00.000Z" };
    expect(matchesFilters(sample[1], f)).toBe(true);
    expect(matchesFilters(sample[0], f)).toBe(false);
  });
});

describe("applyFilters", () => {
  it("returns matches sorted by start time", () => {
    const out = applyFilters(sample, { ...EMPTY_FILTERS, freeOnly: true });
    expect(out.map((e) => e.id)).toEqual(["a", "c"]);
  });
});

describe("toggle", () => {
  it("adds absent and removes present", () => {
    expect(toggle(["x"], "y")).toEqual(["x", "y"]);
    expect(toggle(["x", "y"], "y")).toEqual(["x"]);
  });
});

describe("categoryCounts", () => {
  it("counts events per category", () => {
    expect(categoryCounts(sample)).toEqual({ storytime: 1, museum: 1, music: 1 });
  });
});
