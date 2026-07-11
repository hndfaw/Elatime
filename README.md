# Elatime 🗺️🧸

**Elatime** deploys backend scraping agents that monitor municipal websites,
community boards, and venue schedules for **kid-friendly and toddler
activities**, then aggregates everything onto a **custom, hand-illustrated
interactive canvas map**.

The initial deployment is anchored to **Lee County, Florida** — targeting
**Cape Coral** and **Fort Myers** — and is built to add new geographic
boundaries by editing a single config file.

> Built with Next.js · TypeScript · Tailwind CSS · custom SVG map (no map tiles).

---

## What it does

- **Scraping agents** fetch events from municipal calendars, community boards,
  and venue schedules (see `config/regions.json`).
- A **normalization pipeline** classifies each event into a controlled
  vocabulary — category (storytime, playground, arts & crafts, music, outdoor,
  museum, …), age band (infant → kid), free vs. ticketed — and geolocates it.
- Results are written to a structured **`data/events.json`** dataset that the
  frontend ships with (no runtime database required).
- The **frontend** plots every event on an interactive SVG map with zoom, pan,
  category/age/free filters, a synced event list, and a detail popover.
- An **autonomous GitHub Actions loop** refreshes the data on a schedule and can
  (once a model credential is added) implement backlog issues on its own.

---

## Architecture at a glance

```
┌────────────────────────┐      ┌──────────────────────────┐
│  config/regions.json    │      │  GitHub Actions           │
│  (scrape targets, geo)  │─────▶│  Autonomous Loop (~45 min)│
└────────────────────────┘      │  scrape → commit → agent  │
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
                                  │  custom SVG canvas map     │
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
| `src/lib/geo.ts` | WGS84 → SVG projection (equirectangular, latitude-corrected). |
| `src/lib/mapArt.ts` | Hand-authored SVG geometry for the illustrated map. |
| `src/lib/scraper/` | Scraping agents: `classify`, `parsers`, `fixtures`, orchestrator (`index`). |
| `src/lib/filters.ts` | Pure, testable filter logic for the UI. |
| `src/components/` | React UI: `MapCanvas`, `MapExplorer`, `EventList`, `EventDetail`, `Filters`. |
| `scripts/scrape.ts` | CLI the autonomous loop runs each cycle → writes `data/events.json`. |
| `data/events.json` | The committed, structured dataset the frontend renders. |
| `.github/workflows/` | `ci.yml` (typecheck/test/build) and `autonomous-loop.yml` (the cron loop). |
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
- `fixture` — fixtures only.

Every raw event is normalized: category & age bands are inferred from text,
free/ticketed is detected, coordinates fall back to the source venue, and
out-of-region events are dropped. Events get a **deterministic id** so
re-scrapes de-duplicate instead of piling up.

---

## Adding a new region

Elatime is modular by construction — **no code changes required**:

1. Add a `Region` object to `config/regions.json` with `bounds`, `center`,
   `cities`, and one or more `sources`.
2. (Optional) add hand-drawn map geometry for the region in `src/lib/mapArt.ts`
   keyed by the region id — otherwise a neutral landmass is used.
3. Run `npm run scrape`. Done.

`src/lib/regions.ts` validates the config (unique ids, valid bounds, matching
`regionId`s) and the suite fails loudly if anything is malformed.

---

## Autonomous loop (GitHub Actions)

`.github/workflows/autonomous-loop.yml` runs on a **~45-minute cron**
(`*/45 * * * *`, i.e. `:00` and `:45`; see the cadence note in the workflow) and
on manual dispatch. Each cycle it installs deps, **gates on a green suite**
(`typecheck` + `test`), runs the scrape, and commits a refreshed
`data/events.json` back to `main` only when it changed.

### The agent job stays dormant until you add a credential

The second job (`autonomous-agent`) uses
[`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action)
to implement the highest-priority backlog issue autonomously. **It runs in the
cloud only after you provide a model credential and opt in:**

```bash
gh secret set CLAUDE_CODE_OAUTH_TOKEN --body <your-token>   # model credential
gh variable set ENABLE_AUTONOMOUS_AGENT --body true         # opt in
```

Until both exist, the agent job is skipped and only the scrape/commit runs.
This is intentional: **you build in-session; the cloud loop activates when you
choose.**

---

## Project management

The backlog is tracked as **GitHub Issues** labeled `elatime-backlog` with
`priority/{p0,p1,p2}` labels — a scope-portable equivalent of a Projects board.
The autonomous agent reads this backlog to pick its next unit of work.

---

## Quality gate

Every feature ships with unit + integration + component tests
(`tests/`, Vitest + Testing Library). The rule, enforced by both humans and the
loop: **only merge on a fully green suite** — never broken or partial work.

## Tech notes

- **Next.js 16 / React 19 / TypeScript / Tailwind 3.** The map uses custom SVG
  paths and a bespoke projection — no Leaflet/Mapbox/Google Maps, no map tiles.
- One remaining `npm audit` moderate advisory is a transitive build-time
  `postcss` inside Next's own tree; its "fix" downgrades Next to 9.x (worse), so
  it is intentionally left in place. The critical Next.js CVE is patched.
