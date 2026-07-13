import { describe, it, expect } from "vitest";
import { parseCity, placeLabel, dominantCategory, groupByVenue } from "@/lib/venues";
import type { ElaEvent } from "@/lib/types";

function ev(over: Partial<ElaEvent> = {}): ElaEvent {
  return {
    id: Math.random().toString(36).slice(2),
    title: "Storytime",
    category: "storytime",
    ageBands: ["toddler"],
    regionId: "lee-county-fl",
    sourceId: "lee-library-storytimes",
    venueName: "Lee County Library",
    address: "519 Chiquita Blvd. N., Cape Coral, FL, 33993, US",
    location: { lat: 26.6623, lng: -82.0063 },
    startsAt: "2026-07-20T15:00:00.000Z",
    isFree: true,
    tags: [],
    scrapedAt: "2026-07-11T00:00:00.000Z",
    ...over,
  };
}

describe("parseCity", () => {
  it("extracts the city segment from an address", () => {
    expect(parseCity("519 Chiquita Blvd. N., Cape Coral, FL, 33993, US")).toBe("Cape Coral");
  });
  it("returns undefined for empty/short addresses", () => {
    expect(parseCity(undefined)).toBeUndefined();
    expect(parseCity("Somewhere")).toBeUndefined();
  });
});

describe("placeLabel", () => {
  it("qualifies a generic venue with its city", () => {
    expect(placeLabel(ev())).toBe("Lee County Library · Cape Coral");
  });
  it("keeps the venue name when it already names the city", () => {
    expect(
      placeLabel(ev({ venueName: "Cape Coral Parks & Recreation" }))
    ).toBe("Cape Coral Parks & Recreation");
  });
});

describe("dominantCategory", () => {
  it("returns the most common category", () => {
    const events = [
      ev({ category: "storytime" }),
      ev({ category: "storytime" }),
      ev({ category: "music" }),
    ];
    expect(dominantCategory(events)).toBe("storytime");
  });
});

describe("groupByVenue", () => {
  it("groups events at the same coordinate and labels them", () => {
    const events = [
      ev({ id: "a", location: { lat: 26.6623, lng: -82.0063 } }),
      ev({ id: "b", location: { lat: 26.6623, lng: -82.0063 } }),
      ev({ id: "c", location: { lat: 26.6406, lng: -81.8723 }, venueName: "City of Fort Myers", address: "2200 Second St, Fort Myers, FL 33901" }),
    ];
    const venues = groupByVenue(events);
    expect(venues).toHaveLength(2);
    const cape = venues.find((v) => v.events.length === 2)!;
    expect(cape.events.map((e) => e.id).sort()).toEqual(["a", "b"]);
    expect(cape.label).toContain("Cape Coral");
    expect(cape.location).toEqual({ lat: 26.6623, lng: -82.0063 });
  });

  it("sorts events within a venue chronologically", () => {
    const venues = groupByVenue([
      ev({ id: "late", startsAt: "2026-07-25T00:00:00.000Z" }),
      ev({ id: "early", startsAt: "2026-07-20T00:00:00.000Z" }),
    ]);
    expect(venues[0].events.map((e) => e.id)).toEqual(["early", "late"]);
  });
});
