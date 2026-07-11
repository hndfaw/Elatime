import * as cheerio from "cheerio";
import type { ScrapeSource, ElaEvent, GeoPoint } from "../types";
import {
  classifyCategory,
  classifyAgeBands,
  detectFree,
  eventId,
} from "./classify";

/**
 * A loosely-typed event as pulled from a page, before normalization into the
 * strict ElaEvent shape. Parsers emit these; `normalize` finalizes them.
 */
export interface RawEvent {
  title: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  url?: string;
  location?: GeoPoint;
  venueName?: string;
  address?: string;
  priceText?: string;
}

/** Parse a date string into an ISO timestamp, or return undefined if unusable. */
export function toIso(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const t = Date.parse(trimmed);
  if (Number.isNaN(t)) return undefined;
  return new Date(t).toISOString();
}

/**
 * Normalize a RawEvent into a fully-formed ElaEvent, filling geolocation from
 * the source's venue when the event lacks its own coordinates. Returns null
 * when the record is unusable (no title, or no resolvable location).
 */
export function normalize(
  raw: RawEvent,
  source: ScrapeSource,
  scrapedAt: string,
  fallbackStart: string
): ElaEvent | null {
  const title = raw.title?.trim();
  if (!title) return null;

  const location = raw.location ??
    (source.venue ? { lat: source.venue.lat, lng: source.venue.lng } : null);
  if (!location) return null;

  const startsAt = raw.startsAt ?? fallbackStart;
  const description = raw.description?.trim();
  const priceBlob = `${title} ${description ?? ""} ${raw.priceText ?? ""}`;

  return {
    id: eventId(source.id, title, startsAt),
    title,
    description,
    category: classifyCategory(title, description),
    ageBands: classifyAgeBands(title, description),
    regionId: source.regionId,
    sourceId: source.id,
    venueName: raw.venueName ?? source.venue?.name ?? source.name,
    address: raw.address ?? source.venue?.address,
    location,
    startsAt,
    endsAt: raw.endsAt,
    isFree: detectFree(priceBlob),
    price: raw.priceText?.trim() || undefined,
    url: raw.url ?? source.url,
    tags: [source.type, source.regionId],
    scrapedAt,
  };
}

/**
 * Extract schema.org Event objects from JSON-LD <script> blocks.
 * Handles single objects, arrays, and @graph containers.
 */
export function parseJsonLd(html: string): RawEvent[] {
  const $ = cheerio.load(html);
  const out: RawEvent[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).contents().text();
    if (!text.trim()) return;
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return;
    }
    for (const node of flattenJsonLd(data)) {
      const type = node["@type"];
      const isEvent = Array.isArray(type)
        ? type.some((t) => /event/i.test(String(t)))
        : /event/i.test(String(type ?? ""));
      if (!isEvent) continue;

      const geo = node.location?.geo;
      const location =
        geo && geo.latitude != null && geo.longitude != null
          ? { lat: Number(geo.latitude), lng: Number(geo.longitude) }
          : undefined;

      out.push({
        title: String(node.name ?? "").trim(),
        description: node.description ? String(node.description) : undefined,
        startsAt: toIso(node.startDate),
        endsAt: toIso(node.endDate),
        url: node.url ? String(node.url) : undefined,
        location,
        venueName: node.location?.name ? String(node.location.name) : undefined,
        address: extractAddress(node.location?.address),
        priceText: extractPrice(node.offers),
      });
    }
  });

  return out.filter((e) => e.title);
}

/** Walk arbitrarily-nested JSON-LD into a flat list of objects. */
function flattenJsonLd(data: unknown): Array<Record<string, any>> {
  const result: Array<Record<string, any>> = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
    } else if (node && typeof node === "object") {
      const obj = node as Record<string, any>;
      if (Array.isArray(obj["@graph"])) obj["@graph"].forEach(visit);
      result.push(obj);
    }
  };
  visit(data);
  return result;
}

function extractAddress(address: unknown): string | undefined {
  if (!address) return undefined;
  if (typeof address === "string") return address;
  const a = address as Record<string, any>;
  const parts = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode]
    .filter(Boolean)
    .map(String);
  return parts.length ? parts.join(", ") : undefined;
}

function extractPrice(offers: unknown): string | undefined {
  if (!offers) return undefined;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  const o = offer as Record<string, any>;
  if (o?.price != null) {
    const num = Number(o.price);
    if (num === 0) return "Free";
    const cur = o.priceCurrency ? `${o.priceCurrency} ` : "$";
    return `${cur}${o.price}`;
  }
  return undefined;
}

/**
 * Parse a list/detail DOM using the source's configured CSS selectors.
 * Each matched item becomes a RawEvent; missing fields are left undefined so
 * `normalize` can fill them from the source venue.
 */
export function parseList(html: string, source: ScrapeSource): RawEvent[] {
  const sel = source.selectors;
  if (!sel) return [];
  const $ = cheerio.load(html);
  const out: RawEvent[] = [];

  $(sel.item).each((_, el) => {
    const node = $(el);
    const title = node.find(sel.title).first().text().trim();
    if (!title) return;
    const dateText = sel.date ? node.find(sel.date).first().text().trim() : undefined;
    const href = sel.link ? node.find(sel.link).first().attr("href") : undefined;
    const description = sel.description
      ? node.find(sel.description).first().text().trim()
      : undefined;

    out.push({
      title,
      description: description || undefined,
      startsAt: toIso(dateText),
      url: absoluteUrl(href, source.url),
      priceText: dateText && /\$/.test(dateText) ? dateText : undefined,
    });
  });

  return out;
}

function absoluteUrl(href: string | undefined, base: string): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
}
