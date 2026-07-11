import type { RawEvent } from "./parsers";

/**
 * Offline-safe sample events per source.
 *
 * The pipeline is network-optional: many municipal calendars block bots, rate
 * limit, or change markup without notice. When a live fetch yields nothing (or
 * fails), the scraper falls back to these curated fixtures so the map is never
 * empty and CI stays deterministic. Dates are generated relative to the run
 * time so fixture events always sit in the near future.
 */

interface FixtureSpec {
  title: string;
  description: string;
  /** Days from the run date. */
  inDays: number;
  /** Start hour (local-ish, encoded as UTC for determinism). */
  hour: number;
  durationHrs?: number;
  priceText?: string;
  url?: string;
}

const FIXTURES: Record<string, FixtureSpec[]> = {
  "lee-library-storytimes": [
    {
      title: "Toddler Storytime: Songs & Rhymes",
      description:
        "Lap-sit stories, songs, and rhymes for toddlers ages 1-3 and their grownups. Free, no registration.",
      inDays: 1,
      hour: 15,
      durationHrs: 1,
      priceText: "Free",
    },
    {
      title: "Baby Lapsit Story Hour",
      description:
        "Gentle books and bounces for infants 0-18 months. A cozy introduction to the library for babies.",
      inDays: 3,
      hour: 14,
      durationHrs: 1,
      priceText: "Free",
    },
    {
      title: "Preschool Craft & Story Morning",
      description:
        "Stories followed by a hands-on art craft for pre-K children ages 3-5.",
      inDays: 6,
      hour: 15,
      durationHrs: 1,
    },
  ],
  "capecoral-parks-rec": [
    {
      title: "Open Play at Cultural Park",
      description:
        "Drop-in open play on the toddler playground with bubbles and sidewalk chalk. All ages welcome.",
      inDays: 2,
      hour: 14,
      durationHrs: 2,
      priceText: "Free",
    },
    {
      title: "Family Nature Walk",
      description:
        "A ranger-led stroller-friendly nature walk for families with young kids. Outdoor.",
      inDays: 5,
      hour: 13,
      durationHrs: 1,
    },
  ],
  "fortmyers-city-events": [
    {
      title: "Downtown Family Music Jam",
      description:
        "Live kids music and a dance-along in the riverfront park. Free community event for all ages.",
      inDays: 4,
      hour: 22,
      durationHrs: 2,
      priceText: "Free",
    },
    {
      title: "Saturday Market Kids Corner",
      description:
        "Toddler crafts and a petting zoo at the weekly downtown market.",
      inDays: 8,
      hour: 14,
      durationHrs: 3,
      priceText: "Free",
    },
  ],
  "imag-history-science": [
    {
      title: "Little Scientists: Sensory Lab",
      description:
        "A hands-on STEM sensory session designed for toddlers and preschoolers ages 2-5.",
      inDays: 3,
      hour: 15,
      durationHrs: 1,
      priceText: "$12 admission",
    },
    {
      title: "Dino Discovery Day",
      description:
        "Meet life-size dinosaurs and dig for fossils. A kid favorite for ages 3-10.",
      inDays: 9,
      hour: 16,
      durationHrs: 4,
      priceText: "$15 admission",
    },
  ],
  "lakes-regional-library": [
    {
      title: "Music & Movement for Tots",
      description:
        "Shake, sing, and dance with scarves and instruments. Toddlers 1-3 with a caregiver.",
      inDays: 2,
      hour: 15,
      durationHrs: 1,
      priceText: "Free",
    },
    {
      title: "STEAM Storytime",
      description:
        "Stories paired with a simple science experiment for preschoolers 3-5.",
      inDays: 7,
      hour: 14,
      durationHrs: 1,
      priceText: "Free",
    },
  ],
  "rotary-park-cape": [
    {
      title: "Butterfly Garden Explorers",
      description:
        "A guided outdoor walk through the butterfly house and boardwalk for families with little ones.",
      inDays: 4,
      hour: 14,
      durationHrs: 1,
      priceText: "Free",
    },
    {
      title: "Nature Tots: Pond Life",
      description:
        "Preschool nature program exploring the pond with nets and magnifiers. Ages 3-5.",
      inDays: 11,
      hour: 15,
      durationHrs: 1,
      priceText: "Free",
    },
  ],
};

/** Build fixture RawEvents for a source, dated relative to `now`. */
export function fixturesFor(sourceId: string, now: Date): RawEvent[] {
  const specs = FIXTURES[sourceId];
  if (!specs) return [];
  return specs.map((s) => {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() + s.inDays);
    start.setUTCHours(s.hour, 0, 0, 0);
    const end = new Date(start);
    end.setUTCHours(end.getUTCHours() + (s.durationHrs ?? 1));
    return {
      title: s.title,
      description: s.description,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      priceText: s.priceText,
      url: s.url,
    };
  });
}

/** Whether a source has fixtures available. */
export function hasFixtures(sourceId: string): boolean {
  return sourceId in FIXTURES;
}
