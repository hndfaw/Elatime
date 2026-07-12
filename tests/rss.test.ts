import { describe, it, expect } from "vitest";
import { parseRss, parseCivicDates } from "@/lib/scraper/parsers";
import { isKidRelevant } from "@/lib/scraper/classify";
import type { ScrapeSource } from "@/lib/types";

const rssSource: ScrapeSource = {
  id: "fortmyers-city-events",
  name: "Fort Myers RSS",
  type: "municipal",
  regionId: "lee-county-fl",
  url: "https://fl-fortmyers.civicplus.com/RSSFeed.aspx?ModID=58&CID=All-calendar.xml",
  parser: "rss",
  kidFilter: true,
  linkRewrite: { from: "www.fortmyers.gov", to: "fl-fortmyers.civicplus.com" },
  venue: { name: "City of Fort Myers", lat: 26.6406, lng: -81.8723 },
};

// Mirrors the real CivicEngage feed at fl-fortmyers.civicplus.com: each
// <description> is an HTML fragment (in CDATA) with <strong>/<br> markup.
const SAMPLE_RSS = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:calendarEvent="urn:civic:calendar">
  <channel>
    <title>Fort Myers Calendar</title>
    <item>
      <title>STARS Management Advisory Board Meeting</title>
      <link>https://www.fortmyers.gov/Calendar.aspx?EID=5900</link>
      <description><![CDATA[<strong>Event date:</strong> July 15, 2026 <br><strong>Event Time: </strong>04:00 PM - 05:30 PM<br><strong>Location:</strong> <br>2200 Second St.<br>Fort Myers, FL 33901]]></description>
      <pubDate>Mon, 27 Jan 2025 14:42:50 -0500</pubDate>
    </item>
    <item>
      <title>27th Annual Big Backpack Giveaway Event</title>
      <link>https://www.fortmyers.gov/Calendar.aspx?EID=6001</link>
      <description><![CDATA[<strong>Event date:</strong> July 26, 2026 <br><strong>Event Time: </strong>10:00 AM - 01:00 PM<br><strong>Location:</strong> <br>2250 Broadway<br>Fort Myers, FL 33901]]></description>
      <pubDate>Mon, 15 Jun 2026 08:32:20 -0500</pubDate>
    </item>
    <item>
      <title>Family Storytime in the Park</title>
      <link>https://www.fortmyers.gov/Calendar.aspx?EID=6002</link>
      <description><![CDATA[<strong>Event date:</strong> July 20, 2026 <br><strong>Event Time: </strong>09:30 AM - 10:30 AM<br><strong>Location:</strong> <br>Centennial Park<br>Fort Myers, FL 33901]]></description>
    </item>
  </channel>
</rss>`;

describe("parseRss", () => {
  it("parses every item with title, link (host-rewritten), date, and time", () => {
    const events = parseRss(SAMPLE_RSS, rssSource);
    expect(events).toHaveLength(3);

    const backpack = events.find((e) => e.title.includes("Backpack"))!;
    expect(backpack.url).toBe("https://fl-fortmyers.civicplus.com/Calendar.aspx?EID=6001");
    // 10:00 AM Eastern (EDT, UTC-4) on Jul 26 -> 14:00 UTC.
    expect(backpack.startsAt).toBe("2026-07-26T14:00:00.000Z");
    expect(backpack.endsAt).toBe("2026-07-26T17:00:00.000Z");
    // Location is lifted out of the embedded HTML.
    expect(backpack.address).toContain("2250 Broadway");
    // Metadata prefix is stripped from the description.
    expect(backpack.description ?? "").not.toMatch(/Event date:|Event Time:/);
  });

  it("falls back to pubDate when the description lacks an event date", () => {
    const xml = `<rss><channel><item>
      <title>No Date Event</title>
      <link>https://example.org/e</link>
      <description>Just a description with no structured date.</description>
      <pubDate>Mon, 20 Jul 2026 14:00:00 GMT</pubDate>
    </item></channel></rss>`;
    const events = parseRss(xml, { ...rssSource, linkRewrite: undefined });
    expect(events[0].startsAt).toBe("2026-07-20T14:00:00.000Z");
  });

  it("skips items with no title", () => {
    const xml = `<rss><channel><item><description>x</description></item></channel></rss>`;
    expect(parseRss(xml, rssSource)).toEqual([]);
  });
});

describe("parseCivicDates", () => {
  it("combines the event date and start/end times", () => {
    const { startsAt, endsAt } = parseCivicDates(
      "Event date: July 26, 2026 | Event Time: 10:00 AM - 01:00 PM"
    );
    // Eastern (EDT) wall-clock converted to UTC.
    expect(startsAt).toBe("2026-07-26T14:00:00.000Z");
    expect(endsAt).toBe("2026-07-26T17:00:00.000Z");
  });

  it("uses the date alone (midnight Eastern) when no time is present", () => {
    const { startsAt, endsAt } = parseCivicDates("Event date: July 26, 2026 | All day");
    expect(startsAt).toBe("2026-07-26T04:00:00.000Z");
    expect(endsAt).toBeUndefined();
  });

  it("falls back to pubDate when nothing parses", () => {
    const { startsAt } = parseCivicDates("no dates here", "Mon, 20 Jul 2026 14:00:00 GMT");
    expect(startsAt).toBe("2026-07-20T14:00:00.000Z");
  });
});

describe("isKidRelevant", () => {
  it("keeps kid/family events", () => {
    expect(isKidRelevant("Family Storytime in the Park")).toBe(true);
    expect(isKidRelevant("27th Annual Big Backpack Giveaway", "backpacks for children")).toBe(true);
    expect(isKidRelevant("Toddler Craft Morning")).toBe(true);
  });
  it("drops government meetings and adult civic business", () => {
    expect(isKidRelevant("STARS Management Advisory Board Meeting")).toBe(false);
    expect(isKidRelevant("City Council Budget Hearing")).toBe(false);
    expect(isKidRelevant("Zoning Commission Public Meeting")).toBe(false);
  });
});
