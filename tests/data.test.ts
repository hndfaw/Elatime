import { describe, it, expect } from "vitest";
import dataset from "../data/events.json";
import { validateConfig, getRegion } from "@/lib/regions";
import { withinBounds } from "@/lib/geo";
import { SCHEMA_VERSION } from "@/lib/scraper";
import type { EventsDataset } from "@/lib/types";

/**
 * Guards the committed dataset the frontend ships with. The autonomous loop
 * regenerates data/events.json each cycle; this test ensures whatever lands in
 * the repo stays structurally sound and in-region.
 */
describe("committed data/events.json", () => {
  const data = dataset as EventsDataset;

  it("matches the current schema version", () => {
    expect(data.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("has a valid generatedAt timestamp", () => {
    expect(new Date(data.generatedAt).toString()).not.toBe("Invalid Date");
  });

  it("contains events", () => {
    expect(Array.isArray(data.events)).toBe(true);
    expect(data.events.length).toBeGreaterThan(0);
  });

  it("references only configured regions, with in-bounds coordinates", () => {
    validateConfig();
    for (const e of data.events) {
      const region = getRegion(e.regionId);
      expect(region, `region ${e.regionId} exists`).toBeTruthy();
      expect(withinBounds(e.location, region!.bounds)).toBe(true);
    }
  });

  it("has unique event ids", () => {
    const ids = data.events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has required fields on every event", () => {
    for (const e of data.events) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.category).toBeTruthy();
      expect(e.ageBands.length).toBeGreaterThan(0);
      expect(typeof e.isFree).toBe("boolean");
    }
  });
});
