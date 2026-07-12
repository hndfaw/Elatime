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

describe("kidFilter RSS source (Fort Myers)", () => {
  const fmSource = () =>
    getEnabledSources("lee-county-fl").find((s) => s.id === "fortmyers-city-events")!;

  const RSS = (items: string) =>
    `<rss version="2.0"><channel>${items}</channel></rss>`;
  const boardItem = `<item><title>City Council Budget Hearing</title>
    <link>https://www.fortmyers.gov/Calendar.aspx?EID=1</link>
    <description>Event date: July 15, 2026 | Event Time: 04:00 PM - 05:30 PM | Adult civic business.</description></item>`;
  const kidItem = `<item><title>Family Storytime in the Park</title>
    <link>https://www.fortmyers.gov/Calendar.aspx?EID=2</link>
    <description>Event date: July 20, 2026 | Event Time: 09:30 AM - 10:30 AM | Toddler stories.</description></item>`;

  it("keeps kid events, drops gov meetings, and rewrites the link host", async () => {
    const events = await scrapeSource(fmSource(), {
      live: true,
      now: NOW,
      fetcher: async () => RSS(boardItem + kidItem),
    });
    expect(events.map((e) => e.title)).toEqual(["Family Storytime in the Park"]);
    expect(events[0].url).toContain("fl-fortmyers.civicplus.com");
    expect(events[0].url).not.toContain("www.fortmyers.gov");
    // Geolocated to the Fort Myers venue (in-bounds).
    expect(events[0].location.lat).toBeCloseTo(26.6406, 3);
  });

  it("falls back to fixtures when every live item is filtered out", async () => {
    const events = await scrapeSource(fmSource(), {
      live: true,
      now: NOW,
      fetcher: async () => RSS(boardItem),
    });
    // No kid events in the feed -> curated fixtures are used instead.
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.sourceId === "fortmyers-city-events")).toBe(true);
    expect(events.find((e) => e.title.includes("Budget Hearing"))).toBeUndefined();
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
