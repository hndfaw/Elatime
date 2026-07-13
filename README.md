# Elatime 🗺️🧸

**Elatime** deploys backend scraping agents that monitor municipal websites,
community boards, and venue schedules for **kid-friendly and toddler
activities**, then aggregates everything onto a **real interactive map**
(Leaflet + OpenStreetMap) with zoom-aware marker clustering.

The initial deployment is anchored to **Lee County, Florida** — targeting
**Cape Coral** and **Fort Myers** — and is built to add new geographic
boundaries by editing a single config file.

> Built with Next.js · TypeScript · Tailwind CSS · Leaflet + OpenStreetMap (open-source, no API key).

---

## What it does

- **Scraping agents** fetch events from municipal calendars, community boards,
  and venue schedules (see `config/regions.json`).
- A **normalization pipeline** classifies each event into a controlled
  vocabulary — category (storytime, playground, arts & crafts, music, outdoor,
  museum, …), age band (infant → kid), free vs. ticketed — and geolocates it.
- Results are written to a structured **`data/events.json`** dataset that the
  frontend ships with (no runtime database required).
- The **frontend** plots every event on an interactive map with zoom, pan,
  category/age/free filters, a synced event list, and a detail popover.
- The **Claude Code session** refreshes the data and works the backlog on
  request; a **manual-only** Actions workflow can also refresh data in the cloud
  when triggered by hand. No scheduled GitHub jobs.

---

## Architecture at a glance

```
┌────────────────────────┐      ┌──────────────────────────┐
│  config/regions.json    │      │  Claude Code session      │
│  (scrape targets, geo)  │─────▶│  runs scrape on request   │
└────────────────────────┘      │  (session-scheduled)      │
             │                   └────────────┬─────────────┘
             ▼                                │
┌────────────────────────┐                    ▼
│  Scraper agents         │       ┌──────────────────────────┐
│  axios + cheerio        │       │  data/events.json         │
│  parsers: jsonld / list │──────▶│  (structured dataset)     │
│  offline-safe fixtures  │       └────────────┬─────────────┘
└────────────────────────┘                    │
                                               ▼
                                  ┌──────────────────────────┐
                                  │  Next.js frontend          │
                                  │  Leaflet + OpenStreetMap   │
                                  │  geo projection + markers  │
                                  │  filters · list · detail   │
                                  └──────────────────────────┘
```

Full details in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Project layout

| Path | Purpose |
| --- | --- |
| `config/regions.json` | **Regional config** — regions, bounds, and scrape sources. The one file to edit to add a county/city. |
| `src/lib/types.ts` | Shared domain model (events, regions, sources). |
| `src/lib/regions.ts` | Typed loader + validator for the regional config. |
| `src/lib/geo.ts` | Geo helpers — bounds checks + Haversine distance. |
| `src/components/RealMap.tsx` | Leaflet + OpenStreetMap map with `leaflet.markercluster`. |
| `src/lib/scraper/` | Scraping agents: `classify`, `parsers`, `fixtures`, orchestrator (`index`). |
| `src/lib/filters.ts` | Pure, testable filter logic for the UI. |
| `src/components/` | React UI: `RealMap`, `MapExplorer`, `EventList`, `EventDetail`, `Filters`. |
| `scripts/scrape.ts` | CLI the autonomous loop runs each cycle → writes `data/events.json`. |
| `data/events.json` | The committed, structured dataset the frontend renders. |
| `.github/workflows/` | `ci.yml` (typecheck/test/build on push/PR) and `manual-scrape.yml` (manual-only scrape; no cron). |
| `tests/` | Vitest unit + integration + component tests. |

---

## Getting started

```bash
npm install
npm run scrape      # generate data/events.json (offline-safe fixtures)
npm run dev         # http://localhost:3000
```

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Production build. |
| `npm run scrape` | Run the pipeline (fixtures) → `data/events.json`. |
| `npm run scrape -- --live` | Attempt live HTTP scraping, falling back to fixtures. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Full Vitest suite. |

---

## The data pipeline

The scraper is **network-optional by design**. Municipal calendars frequently
block bots, rate-limit, or change markup. Each source therefore ships with
curated **fixtures**; when a live fetch yields nothing (or is disabled), the
pipeline falls back to fixtures so the map is never empty and CI stays
deterministic.

Each source declares a **parser**:

- `generic-jsonld` — extracts `schema.org/Event` JSON-LD (single, array, or
  `@graph`).
- `generic-list` — walks a configured list/detail DOM via CSS selectors.
- `rss` — parses an RSS/XML calendar feed (e.g. a CivicEngage municipal feed),
  reading the date/time out of the embedded HTML description and converting
  Eastern wall-clock times to UTC (DST-aware, via `Intl`).
- `fixture` — fixtures only.

**Real live source today:** the City of Fort Myers CivicEngage RSS feed
(`fl-fortmyers.civicplus.com`) is wired live with a **kid-relevance filter**
(`kidFilter`) that strips government meetings/budget hearings and keeps only
family/kid events. Other sources currently fall back to fixtures pending
per-source live work (see the open backlog). Run `npm run scrape -- --live` to
pull the real feed.

Every raw event is normalized: category & age bands are inferred from text,
free/ticketed is detected, coordinates fall back to the source venue, and
out-of-region events are dropped. Events get a **deterministic id** so
re-scrapes de-duplicate instead of piling up.

---

## Refreshing the data

There is **no cron** — data refreshes are intentional and one-step. Two ways:

**Locally** (recommended):

```bash
npm run refresh        # live scrape + safety gate, writes data/events.json
git add data/events.json && git commit -m "chore(data): refresh" && git push
```

`npm run refresh` runs a **live** scrape and then a **safety gate**
(`evaluateDataset`): the file is only overwritten when the new dataset is valid,
non-empty, and fully in-bounds. If a scrape breaks (sources down, a parser
regression), refresh exits non-zero and **leaves the existing good data
untouched**. Use `npm run refresh -- --dry-run` to scrape + validate without
writing.

**In the cloud** (no local setup): Actions → **Manual Scrape** → *Run workflow*,
with the `commit` input checked. It green-gates, scrapes, and commits.

Once the site is deployed (e.g. on Vercel), pushing the refreshed
`data/events.json` to `main` triggers a redeploy, so the live map updates. Any
recurring cadence is driven on request by the Claude Code session — not GitHub.

## Adding a new region

Elatime is modular by construction — **no code changes required**:

1. Add a `Region` object to `config/regions.json` with `bounds`, `center`,
   `cities`, and one or more `sources`.
2. Run `npm run scrape`. The map (Leaflet/OpenStreetMap) automatically fits to
   the region's bounds — no per-region map art required.

`src/lib/regions.ts` validates the config (unique ids, valid bounds, matching
`regionId`s) and the suite fails loudly if anything is malformed.

---

## Deployment note

When deploying, set **`NEXT_PUBLIC_SITE_URL`** to the site's origin (e.g.
`https://elatime.vercel.app`) so OpenGraph/Twitter link-preview image URLs
resolve absolutely. The favicon (`src/app/icon.svg`) and the generated social
card (`src/app/opengraph-image.tsx`) need no configuration.

## Automation model — no GitHub cron

Elatime deliberately has **no scheduled GitHub Actions**. There is no cron, and
nothing runs or commits on its own in the cloud.

- **`ci.yml`** runs only in response to a push / PR to `main` (typecheck + test +
  build).
- **`manual-scrape.yml`** is **manual-only** (`workflow_dispatch`). It never runs
  on a schedule; trigger it yourself from the Actions tab to refresh
  `data/events.json` in the cloud, with optional `live` and `commit` inputs.

**Scheduling is session-driven.** Day-to-day scraping and any recurring cadence
are orchestrated by the Claude Code session on request (e.g. "handle these three
tasks over the next three hours, one per hour"), not by GitHub's scheduler. This
keeps Actions minutes and repo commits fully under manual control.

---

## Project management

The backlog is tracked as **GitHub Issues** labeled `elatime-backlog` with
`priority/{p0,p1,p2}` labels — a scope-portable equivalent of a Projects board.
The Claude Code session reads this backlog to pick its next unit of work.

---

## Quality gate

Every feature ships with unit + integration + component tests
(`tests/`, Vitest + Testing Library). The rule, enforced by both humans and the
loop: **only merge on a fully green suite** — never broken or partial work.

## Tech notes

- **Next.js 16 / React 19 / TypeScript / Tailwind 3.** The map is **Leaflet +
  OpenStreetMap** raster tiles with `leaflet.markercluster` — all open-source,
  MIT/BSD-licensed, and **no API key**. The map is loaded client-only
  (`next/dynamic`, `ssr: false`) since Leaflet needs the DOM.
- One remaining `npm audit` moderate advisory is a transitive build-time
  `postcss` inside Next's own tree; its "fix" downgrades Next to 9.x (worse), so
  it is intentionally left in place. The critical Next.js CVE is patched.
