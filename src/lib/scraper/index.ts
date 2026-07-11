import axios from "axios";
import type { ElaEvent, EventsDataset, ScrapeSource } from "../types";
import { withinBounds } from "../geo";
import { getRegion } from "../regions";
import { parseJsonLd, parseList, normalize, type RawEvent } from "./parsers";
import { fixturesFor } from "./fixtures";

export const SCHEMA_VERSION = 1;

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

  let raws: RawEvent[] = [];
  if (opts.live) {
    const fetcher = opts.fetcher ?? defaultFetcher;
    const html = await fetcher(source.url, opts.timeoutMs ?? 15000);
    if (html) {
      try {
        raws = parseSource(html, source);
        log(`  ${source.id}: live parse yielded ${raws.length} raw events`);
      } catch (err) {
        log(`  ${source.id}: parse error, will use fixtures — ${String(err)}`);
      }
    } else {
      log(`  ${source.id}: fetch failed, using fixtures`);
    }
  }

  if (raws.length === 0) {
    raws = fixturesFor(source.id, now);
    if (raws.length) log(`  ${source.id}: using ${raws.length} fixture events`);
  }

  const region = getRegion(source.regionId);
  const normalized: ElaEvent[] = [];
  for (const raw of raws) {
    const ev = normalize(raw, source, nowIso, fallbackStart);
    if (!ev) continue;
    // Drop events that geolocate outside the region's bounds.
    if (region && !withinBounds(ev.location, region.bounds)) continue;
    normalized.push(ev);
  }
  return normalized;
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
