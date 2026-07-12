import axios from "axios";
import type { ElaEvent, EventsDataset, ScrapeSource } from "../types";
import { SCHEMA_VERSION } from "../types";
import { withinBounds } from "../geo";
import { getRegion } from "../regions";
import {
  parseJsonLd,
  parseList,
  parseRss,
  parseIcal,
  normalize,
  type RawEvent,
} from "./parsers";
import { isKidRelevant } from "./classify";
import { locateLeeBranch } from "./leeBranches";
import { fixturesFor } from "./fixtures";

// Re-exported for existing importers (tests, callers) that reference it here.
export { SCHEMA_VERSION };

export interface ScrapeOptions {
  /** When false (default in CI/offline), skip live HTTP and use fixtures. */
  live?: boolean;
  /** Injected clock for deterministic tests. */
  now?: Date;
  /** Per-request timeout (ms). */
  timeoutMs?: number;
  /** Optional fetch override for testing. Returns HTML or null on failure. */
  fetcher?: (url: string, timeoutMs: number) => Promise<string | null>;
  /** Optional logger. */
  log?: (msg: string) => void;
  /** Keep events starting no more than this many days ahead (default 120). */
  horizonDays?: number;
  /** Also keep events that started within this many hours ago (default 24). */
  pastHours?: number;
}

/** Default HTTP fetch using axios with a browser-like UA. */
async function defaultFetcher(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await axios.get<string>(url, {
      timeout: timeoutMs,
      responseType: "text",
      maxRedirects: 5,
      headers: {
        "User-Agent":
          "ElatimeBot/0.1 (+https://github.com/hndfaw/Elatime; kid-friendly event aggregator)",
        Accept: "text/html,application/xhtml+xml",
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });
    return typeof res.data === "string" ? res.data : String(res.data);
  } catch {
    return null;
  }
}

/** Run a single source's parser over provided HTML. */
export function parseSource(html: string, source: ScrapeSource): RawEvent[] {
  switch (source.parser) {
    case "generic-jsonld":
      return parseJsonLd(html);
    case "generic-list":
      return parseList(html, source);
    case "rss":
      return parseRss(html, source);
    case "ical":
      return parseIcal(html, source);
    case "fixture":
      return [];
    default:
      return [];
  }
}

/**
 * Scrape one source into normalized events. Attempts a live fetch when
 * `live` is set and a fetcher is available; falls back to fixtures whenever
 * the live path yields no usable events, so the pipeline is never empty.
 */
export async function scrapeSource(
  source: ScrapeSource,
  opts: ScrapeOptions
): Promise<ElaEvent[]> {
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();
  const fallbackStart = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  const log = opts.log ?? (() => {});
  const region = getRegion(source.regionId);

  // Only keep events within a sensible time window around now, so large feeds
  // (e.g. a full library iCal) don't flood the map with far-future or past dates.
  const minMs = now.getTime() - (opts.pastHours ?? 24) * 3600_000;
  const maxMs = now.getTime() + (opts.horizonDays ?? 120) * 24 * 3600_000;

  // Turn raw events into normalized, in-bounds ElaEvents. `applyKidFilter`
  // strips non-family items from broad municipal feeds (kidFilter sources).
  const finalize = (raws: RawEvent[], applyKidFilter: boolean): ElaEvent[] => {
    const out: ElaEvent[] = [];
    for (let raw of raws) {
      if (applyKidFilter && source.kidFilter && !isKidRelevant(raw.title, raw.description)) {
        continue;
      }
      // Resolve branch coordinates from the location text when configured.
      if (source.branchGeocode && !raw.location) {
        const point = locateLeeBranch(raw.address);
        if (point) raw = { ...raw, location: point };
      }
      const ev = normalize(raw, source, nowIso, fallbackStart);
      if (!ev) continue;
      if (region && !withinBounds(ev.location, region.bounds)) continue;
      const t = Date.parse(ev.startsAt);
      if (!Number.isNaN(t) && (t < minMs || t > maxMs)) continue;
      out.push(ev);
    }
    return out;
  };

  // Live path first (when enabled). kidFilter applies to live feeds only.
  let events: ElaEvent[] = [];
  if (opts.live) {
    const fetcher = opts.fetcher ?? defaultFetcher;
    const html = await fetcher(source.url, opts.timeoutMs ?? 15000);
    if (html) {
      try {
        const raws = parseSource(html, source);
        events = finalize(raws, true);
        log(`  ${source.id}: live yielded ${events.length} usable event(s)`);
      } catch (err) {
        log(`  ${source.id}: parse error, will use fixtures — ${String(err)}`);
      }
    } else {
      log(`  ${source.id}: fetch failed, will use fixtures`);
    }
  }

  // Fall back to curated fixtures whenever the live path produced nothing.
  // Fixtures are already kid-relevant, so they bypass the kid filter.
  if (events.length === 0) {
    const fixtures = fixturesFor(source.id, now);
    events = finalize(fixtures, false);
    if (events.length) log(`  ${source.id}: using ${events.length} fixture event(s)`);
  }

  return events;
}

/** De-duplicate events by id, keeping the most recently scraped copy. */
export function dedupe(events: ElaEvent[]): ElaEvent[] {
  const byId = new Map<string, ElaEvent>();
  for (const ev of events) {
    const existing = byId.get(ev.id);
    if (!existing || ev.scrapedAt >= existing.scrapedAt) {
      byId.set(ev.id, ev);
    }
  }
  return [...byId.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Run the full pipeline across the given sources and build a dataset. */
export async function runScrape(
  sources: ScrapeSource[],
  opts: ScrapeOptions = {}
): Promise<EventsDataset> {
  const now = opts.now ?? new Date();
  const all: ElaEvent[] = [];
  for (const source of sources) {
    const events = await scrapeSource(source, opts);
    all.push(...events);
  }
  const events = dedupe(all);
  const regionIds = [...new Set(sources.map((s) => s.regionId))];
  return {
    generatedAt: now.toISOString(),
    schemaVersion: SCHEMA_VERSION,
    regionIds,
    events,
  };
}
