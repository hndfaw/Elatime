import { describe, it, expect } from "vitest";
import {
  validateConfig,
  getRegions,
  getRegion,
  getDefaultRegion,
  getEnabledSources,
  RegionsConfigError,
} from "@/lib/regions";
import type { Region, RegionsConfig } from "@/lib/types";

describe("regions config (committed)", () => {
  it("passes structural validation", () => {
    expect(() => validateConfig()).not.toThrow();
  });

  it("has Lee County as the default region", () => {
    const region = getDefaultRegion();
    expect(region.id).toBe("lee-county-fl");
    expect(region.county).toBe("Lee");
    expect(region.state).toBe("FL");
  });

  it("targets Cape Coral and Fort Myers", () => {
    const region = getDefaultRegion();
    expect(region.cities).toEqual(expect.arrayContaining(["Cape Coral", "Fort Myers"]));
  });

  it("every source references its own region and has a parser", () => {
    for (const region of getRegions()) {
      for (const source of region.sources) {
        expect(source.regionId).toBe(region.id);
        expect(["generic-jsonld", "generic-list", "rss", "ical", "fixture"]).toContain(
          source.parser
        );
      }
    }
  });

  it("getEnabledSources filters by region and enabled flag", () => {
    const all = getEnabledSources();
    const lee = getEnabledSources("lee-county-fl");
    expect(lee.length).toBeGreaterThan(0);
    expect(all.length).toBeGreaterThanOrEqual(lee.length);
    expect(lee.every((s) => s.enabled !== false)).toBe(true);
  });

  it("getRegion returns undefined for unknown ids", () => {
    expect(getRegion("nowhere")).toBeUndefined();
  });
});

describe("validateConfig error cases", () => {
  function baseRegion(): Region {
    return {
      id: "r1",
      name: "R1",
      county: "C",
      state: "ST",
      bounds: { west: -1, east: 1, south: -1, north: 1 },
      center: { lat: 0, lng: 0 },
      cities: [],
      sources: [],
    };
  }

  it("rejects empty regions", () => {
    const cfg: RegionsConfig = { defaultRegionId: "x", regions: [] };
    expect(() => validateConfig(cfg)).toThrow(RegionsConfigError);
  });

  it("rejects invalid bounds", () => {
    const region = baseRegion();
    region.bounds = { west: 1, east: -1, south: -1, north: 1 };
    const cfg: RegionsConfig = { defaultRegionId: "r1", regions: [region] };
    expect(() => validateConfig(cfg)).toThrow(/invalid bounds/);
  });

  it("rejects duplicate source ids", () => {
    const region = baseRegion();
    const src = {
      id: "dup",
      name: "n",
      type: "venue" as const,
      regionId: "r1",
      url: "u",
      parser: "fixture" as const,
    };
    region.sources = [src, { ...src }];
    const cfg: RegionsConfig = { defaultRegionId: "r1", regions: [region] };
    expect(() => validateConfig(cfg)).toThrow(/duplicate source id/);
  });

  it("rejects a source whose regionId mismatches its region", () => {
    const region = baseRegion();
    region.sources = [
      { id: "s", name: "n", type: "venue", regionId: "other", url: "u", parser: "fixture" },
    ];
    const cfg: RegionsConfig = { defaultRegionId: "r1", regions: [region] };
    expect(() => validateConfig(cfg)).toThrow(/does not match/);
  });

  it("rejects a default id that matches no region", () => {
    const cfg: RegionsConfig = { defaultRegionId: "ghost", regions: [baseRegion()] };
    expect(() => validateConfig(cfg)).toThrow(/defaultRegionId/);
  });
});
