import { describe, it, expect } from "vitest";
import {
  runScrape,
  scrapeSource,
  dedupe,
  parseSource,
  SCHEMA_VERSION,
} from "@/lib/scraper";
import { getEnabledSources } from "@/lib/regions";
import type { ElaEvent, ScrapeSource } from "@/lib/types";

const NOW = new Date("2026-07-11T12:00:00.000Z");

const jsonldSource: ScrapeSource = {
  id: "imag-history-science", // must match a real region source for bounds check
  name: "IMAG",
  type: "venue",
  regionId: "lee-county-fl",
  url: "https://theimag.org/events/",
  parser: "generic-jsonld",
  venue: { name: "IMAG", lat: 26.6449, lng: -81.8709 },
};

describe("parseSource dispatch", () => {
  it("routes jsonld and returns [] for fixture parser", () => {
    const html = `<script type="application/ld+json">{"@type":"Event","name":"X","startDate":"2026-07-12"}</script>`;
    expect(parseSource(html, jsonldSource)).toHaveLength(1);
    expect(parseSource(html, { ...jsonldSource, parser: "fixture" })).toEqual([]);
  });
});

describe("scrapeSource", () => {
  it("uses fixtures when offline (live=false)", async () => {
    const events = await scrapeSource(
      getEnabledSources("lee-county-fl").find((s) => s.id === "lee-library-storytimes")!,
      { live: false, now: NOW }
    );
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.regionId === "lee-county-fl")).toBe(true);
    expect(events.every((e) => e.sourceId === "lee-library-storytimes")).toBe(true);
  });

  it("uses live parse results when the fetcher returns usable HTML", async () => {
    const html = `<script type="application/ld+json">
      {"@type":"Event","name":"Live Toddler Class","startDate":"2026-07-20T15:00:00Z",
       "location":{"geo":{"latitude":26.6449,"longitude":-81.8709}}}
      </script>`;
    const events = await scrapeSource(jsonldSource, {
      live: true,
      now: NOW,
      fetcher: async () => html,
    });
    expect(events.map((e) => e.title)).toContain("Live Toddler Class");
  });

  it("falls back to fixtures when the fetcher fails", async () => {
    const events = await scrapeSource(jsonldSource, {
      live: true,
      now: NOW,
      fetcher: async () => null,
    });
    // IMAG has fixtures, so we still get events.
    expect(events.length).toBeGreaterThan(0);
  });

  it("drops events that geolocate outside the region bounds", async () => {
    const html = `<script type="application/ld+json">
      {"@type":"Event","name":"Far Away","startDate":"2026-07-20T15:00:00Z",
       "location":{"geo":{"latitude":40.0,"longitude":-74.0}}}
      </script>`;
    const events = await scrapeSource(jsonldSource, {
      live: true,
      now: NOW,
      fetcher: async () => html,
    });
    expect(events.find((e) => e.title === "Far Away")).toBeUndefined();
  });
});

describe("dedupe", () => {
  it("keeps the most recently scraped copy of a duplicate id", () => {
    const base: ElaEvent = {
      id: "dup",
      title: "T",
      category: "other",
      ageBands: ["all-ages"],
      regionId: "r",
      sourceId: "s",
      venueName: "v",
      location: { lat: 0, lng: 0 },
      startsAt: "2026-07-12T00:00:00.000Z",
      isFree: true,
      tags: [],
      scrapedAt: "2026-07-10T00:00:00.000Z",
    };
    const newer = { ...base, venueName: "newer", scrapedAt: "2026-07-11T00:00:00.000Z" };
    const out = dedupe([base, newer]);
    expect(out).toHaveLength(1);
    expect(out[0].venueName).toBe("newer");
  });

  it("sorts output chronologically by start", () => {
    const mk = (id: string, startsAt: string): ElaEvent => ({
      id,
      title: id,
      category: "other",
      ageBands: ["all-ages"],
      regionId: "r",
      sourceId: "s",
      venueName: "v",
      location: { lat: 0, lng: 0 },
      startsAt,
      isFree: true,
      tags: [],
      scrapedAt: "2026-07-10T00:00:00.000Z",
    });
    const out = dedupe([
      mk("late", "2026-07-20T00:00:00.000Z"),
      mk("early", "2026-07-12T00:00:00.000Z"),
    ]);
    expect(out.map((e) => e.id)).toEqual(["early", "late"]);
  });
});

describe("runScrape (integration)", () => {
  it("produces a complete dataset from all Lee County sources", async () => {
    const sources = getEnabledSources("lee-county-fl");
    const dataset = await runScrape(sources, { live: false, now: NOW });
    expect(dataset.schemaVersion).toBe(SCHEMA_VERSION);
    expect(dataset.generatedAt).toBe(NOW.toISOString());
    expect(dataset.regionIds).toEqual(["lee-county-fl"]);
    expect(dataset.events.length).toBeGreaterThanOrEqual(6);

    // Every event is well-formed and in-region.
    for (const e of dataset.events) {
      expect(e.id).toMatch(/^evt_/);
      expect(e.regionId).toBe("lee-county-fl");
      expect(e.location.lat).toBeGreaterThan(26.3);
      expect(e.location.lat).toBeLessThan(26.8);
      expect(new Date(e.startsAt).toString()).not.toBe("Invalid Date");
    }
  });

  it("is deterministic given a fixed clock", async () => {
    const sources = getEnabledSources("lee-county-fl");
    const a = await runScrape(sources, { live: false, now: NOW });
    const b = await runScrape(sources, { live: false, now: NOW });
    expect(a.events.map((e) => e.id)).toEqual(b.events.map((e) => e.id));
  });
});
