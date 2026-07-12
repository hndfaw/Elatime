import { describe, it, expect } from "vitest";
import { parseIcal, icalDateToIso } from "@/lib/scraper/parsers";
import { scrapeSource } from "@/lib/scraper";
import { getEnabledSources } from "@/lib/regions";
import type { ScrapeSource } from "@/lib/types";

const icalSource: ScrapeSource = {
  id: "lee-library-storytimes",
  name: "Lee Library iCal",
  type: "municipal",
  regionId: "lee-county-fl",
  url: "https://leelibrary.librarymarket.com/events/feed/ical",
  parser: "ical",
  kidFilter: true,
  venue: { name: "Lee County Library", lat: 26.6428, lng: -81.8723 },
};

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sabre//Sabre VObject 4.6.0//EN
BEGIN:VEVENT
UID:1
SUMMARY:Baby Rhyme Time
DTSTART;TZID=America/New_York:20260720T093000
DTEND;TZID=America/New_York:20260720T101500
DESCRIPTION:Rhymes and songs for babies and toddlers\\, ages 0-2.
LOCATION:Cape Coral-Lee County Public Library
URL:https://leelibrary.librarymarket.com/event/baby-rhyme-time-1
END:VEVENT
BEGIN:VEVENT
UID:2
SUMMARY:Adult Book Club
DTSTART:20260721T230000Z
DESCRIPTION:Monthly book discussion for adults.
END:VEVENT
BEGIN:VEVENT
UID:3
SUMMARY:Summer Reading Program Cra
 fts!
DTSTART;VALUE=DATE:20260726
DESCRIPTION:Drop-in crafts for all ages\\, while supplies last.
LOCATION:Lakes Regional Library
END:VEVENT
END:VCALENDAR`;

describe("parseIcal", () => {
  it("parses every VEVENT, unfolding lines and unescaping text", () => {
    const events = parseIcal(SAMPLE_ICS, icalSource);
    expect(events).toHaveLength(3);

    const baby = events.find((e) => e.title === "Baby Rhyme Time")!;
    // 9:30 AM Eastern (EDT) -> 13:30 UTC.
    expect(baby.startsAt).toBe("2026-07-20T13:30:00.000Z");
    expect(baby.endsAt).toBe("2026-07-20T14:15:00.000Z");
    expect(baby.description).toBe("Rhymes and songs for babies and toddlers, ages 0-2.");
    expect(baby.address).toBe("Cape Coral-Lee County Public Library");
    expect(baby.url).toContain("baby-rhyme-time");

    // Folded SUMMARY is reconstructed.
    expect(events.some((e) => e.title === "Summer Reading Program Crafts!")).toBe(true);
  });

  it("handles UTC (Z), floating/Eastern, and all-day dates", () => {
    const events = parseIcal(SAMPLE_ICS, icalSource);
    const adult = events.find((e) => e.title === "Adult Book Club")!;
    expect(adult.startsAt).toBe("2026-07-21T23:00:00.000Z"); // Z stays UTC

    const crafts = events.find((e) => e.title.startsWith("Summer Reading"))!;
    // All-day 20260726 -> midnight Eastern -> 04:00 UTC.
    expect(crafts.startsAt).toBe("2026-07-26T04:00:00.000Z");
  });
});

describe("icalDateToIso", () => {
  it("keeps explicit UTC times", () => {
    expect(icalDateToIso("20260721T230000Z")).toBe("2026-07-21T23:00:00.000Z");
  });
  it("treats floating times as Eastern", () => {
    expect(icalDateToIso("20260720T093000", { TZID: "America/New_York" })).toBe(
      "2026-07-20T13:30:00.000Z"
    );
  });
  it("treats all-day dates as midnight Eastern", () => {
    expect(icalDateToIso("20260726", { VALUE: "DATE" })).toBe("2026-07-26T04:00:00.000Z");
  });
  it("returns undefined for unparseable input", () => {
    expect(icalDateToIso("garbage")).toBeUndefined();
  });
});

describe("scrapeSource with an iCal kidFilter source", () => {
  const source = () =>
    getEnabledSources("lee-county-fl").find((s) => s.id === "lee-library-storytimes")!;

  it("keeps kid/family events and drops adult ones", async () => {
    const events = await scrapeSource(source(), {
      live: true,
      now: new Date("2026-07-12T12:00:00.000Z"),
      fetcher: async () => SAMPLE_ICS,
    });
    const titles = events.map((e) => e.title);
    expect(titles).toContain("Baby Rhyme Time");
    expect(titles).toContain("Summer Reading Program Crafts!");
    expect(titles).not.toContain("Adult Book Club");
    // Geolocated to the library venue (in-bounds).
    expect(events.every((e) => e.regionId === "lee-county-fl")).toBe(true);
  });

  it("drops events outside the time horizon", async () => {
    const farFuture = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Toddler Storytime Next Year
DTSTART:20271201T140000Z
END:VEVENT
END:VCALENDAR`;
    const events = await scrapeSource(source(), {
      live: true,
      now: new Date("2026-07-12T12:00:00.000Z"),
      horizonDays: 120,
      fetcher: async () => farFuture,
    });
    // Event is >1 year out -> filtered -> falls back to fixtures (or empty).
    expect(events.find((e) => e.title.includes("Next Year"))).toBeUndefined();
  });
});
