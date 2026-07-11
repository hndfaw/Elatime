import { describe, it, expect } from "vitest";
import { parseJsonLd, parseList, normalize, toIso } from "@/lib/scraper/parsers";
import type { ScrapeSource } from "@/lib/types";

const jsonldSource: ScrapeSource = {
  id: "src-jsonld",
  name: "JSONLD Source",
  type: "venue",
  regionId: "lee-county-fl",
  url: "https://example.org/events",
  parser: "generic-jsonld",
  venue: { name: "Test Venue", lat: 26.64, lng: -81.87 },
};

const listSource: ScrapeSource = {
  id: "src-list",
  name: "List Source",
  type: "municipal",
  regionId: "lee-county-fl",
  url: "https://example.org/calendar",
  parser: "generic-list",
  selectors: {
    item: ".event",
    title: ".title",
    date: ".date",
    link: "a",
    description: ".desc",
  },
  venue: { name: "City Hall", lat: 26.64, lng: -81.87 },
};

describe("toIso", () => {
  it("parses a valid date", () => {
    expect(toIso("2026-07-12T15:00:00Z")).toBe("2026-07-12T15:00:00.000Z");
  });
  it("returns undefined for junk", () => {
    expect(toIso("not a date")).toBeUndefined();
    expect(toIso("")).toBeUndefined();
    expect(toIso(undefined)).toBeUndefined();
  });
});

describe("parseJsonLd", () => {
  it("extracts a single Event with geo + offers", () => {
    const html = `<html><head>
      <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Event","name":"Toddler Storytime",
       "startDate":"2026-07-12T15:00:00Z","endDate":"2026-07-12T16:00:00Z",
       "url":"https://example.org/e/1","description":"Songs for tots",
       "location":{"@type":"Place","name":"Library","geo":{"latitude":26.64,"longitude":-81.87},
       "address":{"streetAddress":"1 Main","addressLocality":"Fort Myers","addressRegion":"FL"}},
       "offers":{"@type":"Offer","price":0,"priceCurrency":"USD"}}
      </script></head><body></body></html>`;
    const events = parseJsonLd(html);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Toddler Storytime");
    expect(events[0].location).toEqual({ lat: 26.64, lng: -81.87 });
    expect(events[0].startsAt).toBe("2026-07-12T15:00:00.000Z");
    expect(events[0].priceText).toBe("Free");
    expect(events[0].address).toContain("Fort Myers");
  });

  it("handles @graph arrays and ignores non-events", () => {
    const html = `<script type="application/ld+json">
      {"@graph":[{"@type":"WebSite","name":"Site"},
      {"@type":"Event","name":"Craft Day","startDate":"2026-07-13"}]}
      </script>`;
    const events = parseJsonLd(html);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Craft Day");
  });

  it("returns empty on malformed JSON without throwing", () => {
    const html = `<script type="application/ld+json">{ not json }</script>`;
    expect(parseJsonLd(html)).toEqual([]);
  });
});

describe("parseList", () => {
  it("extracts items via selectors and resolves relative links", () => {
    const html = `<div>
      <div class="event"><span class="title">Open Play</span>
        <span class="date">2026-07-14T14:00:00Z</span>
        <span class="desc">Drop in</span><a href="/e/2">more</a></div>
      <div class="event"><span class="title">Nature Walk</span>
        <span class="date">2026-07-15T13:00:00Z</span><a href="/e/3">more</a></div>
    </div>`;
    const events = parseList(html, listSource);
    expect(events).toHaveLength(2);
    expect(events[0].title).toBe("Open Play");
    expect(events[0].url).toBe("https://example.org/e/2");
    expect(events[1].title).toBe("Nature Walk");
  });

  it("skips items with no title", () => {
    const html = `<div class="event"><span class="date">2026-07-14</span></div>`;
    expect(parseList(html, listSource)).toEqual([]);
  });

  it("returns empty when source has no selectors", () => {
    expect(parseList("<div/>", jsonldSource)).toEqual([]);
  });
});

describe("normalize", () => {
  const scrapedAt = "2026-07-11T00:00:00.000Z";
  const fallback = "2026-07-12T00:00:00.000Z";

  it("fills geolocation from the source venue when missing", () => {
    const ev = normalize(
      { title: "Storytime for toddlers", startsAt: "2026-07-12T15:00:00.000Z" },
      jsonldSource,
      scrapedAt,
      fallback
    );
    expect(ev).not.toBeNull();
    expect(ev!.location).toEqual({ lat: 26.64, lng: -81.87 });
    expect(ev!.category).toBe("storytime");
    expect(ev!.venueName).toBe("Test Venue");
    expect(ev!.regionId).toBe("lee-county-fl");
  });

  it("returns null when there is no title", () => {
    expect(normalize({ title: "" }, jsonldSource, scrapedAt, fallback)).toBeNull();
  });

  it("returns null when neither event nor source provide a location", () => {
    const noVenue: ScrapeSource = { ...jsonldSource, venue: undefined };
    expect(
      normalize({ title: "Something" }, noVenue, scrapedAt, fallback)
    ).toBeNull();
  });

  it("uses the fallback start when none is provided", () => {
    const ev = normalize({ title: "Play" }, jsonldSource, scrapedAt, fallback);
    expect(ev!.startsAt).toBe(fallback);
  });
});
