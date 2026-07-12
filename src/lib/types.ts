// Core domain model for Elatime.
// These types are shared by the scraper (Node) and the frontend (Next.js).

/** A geographic bounding box in WGS84 degrees. */
export interface GeoBounds {
  /** Minimum longitude (west edge). */
  west: number;
  /** Maximum longitude (east edge). */
  east: number;
  /** Minimum latitude (south edge). */
  south: number;
  /** Maximum latitude (north edge). */
  north: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** The kind of site an agent scrapes. */
export type SourceType = "municipal" | "community" | "venue";

/**
 * Parser keys map a source to a concrete extraction strategy in the scraper.
 * "generic-jsonld" reads schema.org Event JSON-LD; "generic-list" walks a
 * configured list/detail DOM; "rss" parses an RSS/XML calendar feed (e.g. a
 * CivicEngage municipal feed); "ical" parses an iCalendar (.ics) feed (e.g. a
 * Library Market calendar); "fixture" reads a bundled sample (offline-safe).
 */
export type ParserKey =
  | "generic-jsonld"
  | "generic-list"
  | "rss"
  | "ical"
  | "fixture";

export interface ScrapeSource {
  id: string;
  name: string;
  type: SourceType;
  /** Region this source belongs to (see regions.json). */
  regionId: string;
  /** URL the agent fetches. */
  url: string;
  parser: ParserKey;
  /** Default venue geolocation when an event omits its own coordinates. */
  venue?: {
    name: string;
    lat: number;
    lng: number;
    address?: string;
  };
  /** Optional CSS selectors for the generic-list parser. */
  selectors?: {
    item: string;
    title: string;
    date?: string;
    link?: string;
    description?: string;
  };
  /**
   * When true, only events matching kid/family relevance keywords are kept.
   * Used for broad municipal feeds that mix gov meetings with family events.
   */
  kidFilter?: boolean;
  /**
   * Rewrite the host of event links, e.g. when a feed emits links to a domain
   * that no longer resolves. Applied to each event's url during parsing.
   */
  linkRewrite?: { from: string; to: string };
  /**
   * When true, resolve each event's coordinates from its location/branch text
   * (Lee County Library branches) instead of pinning everything to the source
   * venue. Falls back to the venue when the branch is unrecognized.
   */
  branchGeocode?: boolean;
  /** Marks a source as disabled without deleting its config. */
  enabled?: boolean;
}

export interface Region {
  id: string;
  name: string;
  county: string;
  state: string;
  /** Bounding box used for the SVG map projection. */
  bounds: GeoBounds;
  center: GeoPoint;
  /** Cities of interest inside the region (for UI grouping). */
  cities: string[];
  sources: ScrapeSource[];
}

export interface RegionsConfig {
  /** Region id rendered by default in the UI. */
  defaultRegionId: string;
  regions: Region[];
}

/** Age suitability buckets for kid-friendly filtering. */
export type AgeBand = "infant" | "toddler" | "preschool" | "kid" | "all-ages";

export type EventCategory =
  | "storytime"
  | "playground"
  | "arts-crafts"
  | "music"
  | "outdoor"
  | "museum"
  | "sports"
  | "seasonal"
  | "class"
  | "other";

export interface ElaEvent {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  ageBands: AgeBand[];
  regionId: string;
  sourceId: string;
  venueName: string;
  address?: string;
  location: GeoPoint;
  /** ISO 8601 start timestamp. */
  startsAt: string;
  /** ISO 8601 end timestamp, when known. */
  endsAt?: string;
  /** Free events are the common toddler case; false = ticketed. */
  isFree: boolean;
  price?: string;
  url?: string;
  tags: string[];
  /** ISO 8601 timestamp of when the agent captured this record. */
  scrapedAt: string;
}

export interface EventsDataset {
  /** ISO 8601 timestamp of the last successful pipeline run. */
  generatedAt: string;
  /** Schema version so the frontend can guard against drift. */
  schemaVersion: number;
  regionIds: string[];
  events: ElaEvent[];
}
