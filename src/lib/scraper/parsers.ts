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

/**
 * Parse an RSS/XML calendar feed (e.g. a CivicEngage municipal feed).
 *
 * CivicEngage items carry the date/time inside the <description> as
 * "Event date: July 26, 2026 | Event Time: 10:00 AM - 1:00 PM | ...". We read
 * the date/time from there (falling back to <pubDate>), and optionally rewrite
 * the link host for feeds whose emitted domain no longer resolves.
 */
export function parseRss(xml: string, source: ScrapeSource): RawEvent[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const out: RawEvent[] = [];

  $("item").each((_, el) => {
    const node = $(el);
    const title = node.find("title").first().text().trim();
    if (!title) return;

    const rawDesc = node.find("description").first().text().trim();
    // CivicEngage embeds an HTML fragment in <description>; flatten it to text
    // ("<strong>Event date:</strong> July 15, 2026 <br>Event Time: ...").
    const plain = stripHtml(rawDesc);
    const link = rewriteHost(node.find("link").first().text().trim(), source.linkRewrite);
    const pubDate = node.find("pubDate").first().text().trim();

    const { startsAt, endsAt } = parseCivicDates(plain, pubDate);

    out.push({
      title,
      description: cleanDescription(plain),
      startsAt,
      endsAt,
      url: link || undefined,
      address: extractCivicLocation(plain),
      priceText: /\$\s?\d/.test(plain) ? plain.match(/\$\s?[\d.,]+/)?.[0] : undefined,
    });
  });

  return out;
}

/** Extract start/end ISO timestamps from a CivicEngage description blob. */
export function parseCivicDates(
  description: string,
  pubDate?: string
): { startsAt?: string; endsAt?: string } {
  const dateMatch = description.match(/Event date:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
  const timeMatch = description.match(
    /Event Time:\s*([\d]{1,2}:[\d]{2}\s*[APMapm.]{2})\s*-\s*([\d]{1,2}:[\d]{2}\s*[APMapm.]{2})/
  );

  if (dateMatch) {
    const date = dateMatch[1];
    const start = parseEastern(date, timeMatch?.[1]);
    const end = timeMatch ? parseEastern(date, timeMatch[2]) : undefined;
    if (start) return { startsAt: start, endsAt: end };
  }
  return { startsAt: toIso(pubDate), endsAt: undefined };
}

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

/**
 * Parse a "Month D, YYYY" date and optional "H:MM AM" time as America/New_York
 * wall-clock (Lee County's zone) and return the corresponding UTC ISO string.
 * DST is handled via Intl, so results are deterministic regardless of the host
 * machine's timezone.
 */
export function parseEastern(dateStr: string, timeStr?: string): string | undefined {
  const m = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return undefined;
  const month = MONTHS[m[1].toLowerCase()];
  if (month === undefined) return undefined;
  const day = Number(m[2]);
  const year = Number(m[3]);

  let hour = 0;
  let minute = 0;
  if (timeStr) {
    const t = timeStr.match(/(\d{1,2}):(\d{2})\s*([AaPp])/);
    if (t) {
      hour = Number(t[1]) % 12;
      if (/[Pp]/.test(t[3])) hour += 12;
      minute = Number(t[2]);
    }
  }
  return zonedWallTimeToUtc(year, month, day, hour, minute, "America/New_York");
}

/** Convert a wall-clock time in `tz` to the matching UTC ISO string. */
function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string
): string {
  const guess = Date.UTC(year, month, day, hour, minute);
  const offset = tzOffsetMs(guess, tz);
  return new Date(guess - offset).toISOString();
}

/** Offset (ms) of `tz` from UTC at the given instant. */
function tzOffsetMs(utcMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - utcMs;
}

/** Flatten an embedded HTML fragment to plain text. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Remove the CivicEngage metadata (Event date / Event Time / Location) from a
 * flattened description, leaving any human-written body text.
 */
function cleanDescription(plain: string): string | undefined {
  const cleaned = plain
    .replace(/Event date:\s*[A-Za-z]+\s+\d{1,2},?\s+\d{4}/i, "")
    .replace(/Event Time:\s*[\d:\sAPMapm.]+-\s*[\d:\sAPMapm.]+/i, "")
    .replace(/Location:.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || undefined;
}

/** Extract the Location/address line from a flattened CivicEngage description. */
function extractCivicLocation(plain: string): string | undefined {
  const m = plain.match(/Location:\s*(.+)$/i);
  if (!m) return undefined;
  const loc = m[1].replace(/\s+/g, " ").trim();
  return loc || undefined;
}

function rewriteHost(
  url: string,
  rewrite?: { from: string; to: string }
): string {
  if (!url || !rewrite) return url;
  return url.split(rewrite.from).join(rewrite.to);
}
