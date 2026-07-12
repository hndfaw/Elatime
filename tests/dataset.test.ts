import { describe, it, expect } from "vitest";
import {
  safeLoadDataset,
  isValidEvent,
  evaluateDataset,
  dataAgeHours,
  isStale,
  formatAge,
} from "@/lib/dataset";
import { SCHEMA_VERSION } from "@/lib/types";
import type { ElaEvent } from "@/lib/types";

function goodEvent(over: Partial<ElaEvent> = {}): ElaEvent {
  return {
    id: "e1",
    title: "Toddler Storytime",
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
    ...over,
  };
}

function goodDataset(events: unknown[]) {
  return {
    generatedAt: "2026-07-12T12:00:00.000Z",
    schemaVersion: SCHEMA_VERSION,
    regionIds: ["lee-county-fl"],
    events,
  };
}

describe("safeLoadDataset", () => {
  it("returns ok for a valid, non-empty dataset", () => {
    const { dataset, status } = safeLoadDataset(goodDataset([goodEvent()]));
    expect(status).toBe("ok");
    expect(dataset.events).toHaveLength(1);
  });

  it("returns empty when there are no valid events", () => {
    const { status } = safeLoadDataset(goodDataset([]));
    expect(status).toBe("empty");
  });

  it("drops malformed events but keeps valid ones", () => {
    const { dataset, status } = safeLoadDataset(
      goodDataset([goodEvent(), { id: "bad" }, null, { title: "no location" }])
    );
    expect(status).toBe("ok");
    expect(dataset.events).toHaveLength(1);
  });

  it("returns invalid for a wrong schema version", () => {
    const { status } = safeLoadDataset({ ...goodDataset([goodEvent()]), schemaVersion: 999 });
    expect(status).toBe("invalid");
  });

  it("returns invalid for junk input", () => {
    expect(safeLoadDataset(null).status).toBe("invalid");
    expect(safeLoadDataset("nope").status).toBe("invalid");
    expect(safeLoadDataset({ events: "not-an-array" }).status).toBe("invalid");
  });
});

describe("isValidEvent", () => {
  it("accepts a well-formed event", () => {
    expect(isValidEvent(goodEvent())).toBe(true);
  });
  it("rejects events missing required fields", () => {
    expect(isValidEvent({ id: "x" })).toBe(false);
    expect(isValidEvent(goodEvent({ title: "" }))).toBe(false);
    expect(isValidEvent({ ...goodEvent(), location: { lat: "no", lng: 1 } })).toBe(false);
    expect(isValidEvent(null)).toBe(false);
  });
});

describe("evaluateDataset (refresh safety gate)", () => {
  it("passes a valid, in-bounds, non-empty dataset", () => {
    const a = evaluateDataset(goodDataset([goodEvent()]));
    expect(a.ok).toBe(true);
    expect(a.eventCount).toBe(1);
    expect(a.problems).toEqual([]);
  });

  it("fails an empty dataset", () => {
    const a = evaluateDataset(goodDataset([]));
    expect(a.ok).toBe(false);
    expect(a.problems.join(" ")).toMatch(/no valid events/i);
  });

  it("fails when an event is outside its region bounds", () => {
    const a = evaluateDataset(
      goodDataset([goodEvent({ location: { lat: 40.0, lng: -74.0 } })])
    );
    expect(a.ok).toBe(false);
    expect(a.problems.join(" ")).toMatch(/outside their region bounds/i);
  });

  it("fails when an event references an unknown region", () => {
    const a = evaluateDataset(goodDataset([goodEvent({ regionId: "atlantis" })]));
    expect(a.ok).toBe(false);
    expect(a.problems.join(" ")).toMatch(/unknown region/i);
  });

  it("fails a malformed dataset", () => {
    expect(evaluateDataset(null).ok).toBe(false);
    expect(evaluateDataset({ events: [] }).ok).toBe(false);
  });
});

describe("data age helpers", () => {
  const gen = "2026-07-12T00:00:00.000Z";
  const now = Date.parse("2026-07-15T00:00:00.000Z"); // 3 days later

  it("computes age in hours", () => {
    expect(dataAgeHours(gen, now)).toBeCloseTo(72, 5);
    expect(dataAgeHours("bad-date")).toBeNull();
  });

  it("flags stale data past the threshold", () => {
    expect(isStale(gen, 48, now)).toBe(true);
    expect(isStale(gen, 96, now)).toBe(false);
    expect(isStale("bad", 48, now)).toBe(false);
  });

  it("formats a human age label", () => {
    expect(formatAge(gen, Date.parse("2026-07-12T00:30:00.000Z"))).toBe(
      "less than an hour ago"
    );
    expect(formatAge(gen, Date.parse("2026-07-12T05:00:00.000Z"))).toBe("5 hours ago");
    expect(formatAge(gen, now)).toBe("3 days ago");
    expect(formatAge("bad")).toBe("an unknown time ago");
  });
});
