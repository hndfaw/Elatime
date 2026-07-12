# Elatime — Architecture & Product Spec

## 1. Product

Elatime helps parents and caregivers of young children (infants → ~12) discover
**kid-friendly and toddler activities** near them. It continuously monitors
public event sources and presents everything on a single, playful, interactive
map — so "what can we do with the kids near us this week?" is answerable at a
glance.

**Primary market (v1):** Lee County, Florida — Cape Coral & Fort Myers.
**Design goal:** adding a new county/city is a config edit, not a code change.

### Core user stories

- As a caregiver, I see nearby kid events plotted on a map I can pan/zoom.
- I filter by category (storytime, playground, arts, music, outdoor, museum…),
  by my child's age band, and by "free only."
- I click a marker (or a list row) to see when/where/cost and a source link.
- The data refreshes itself without anyone tending it.

## 2. System overview

Three cooperating layers:

1. **Regional config** (`config/regions.json`) — the single source of truth for
   *where* to look and *what* to scrape.
2. **Data pipeline** (`src/lib/scraper/*`, `scripts/scrape.ts`) — agents that
   fetch, parse, classify, geolocate, de-dupe → `data/events.json`.
3. **Frontend** (`src/app`, `src/components`, `src/lib`) — a Next.js app that
   projects the dataset onto a custom SVG canvas map.

The **Claude Code session** ties them together, running the pipeline and working
the backlog on request. There is **no scheduled GitHub Actions cron**.

## 3. Domain model (`src/lib/types.ts`)

- `Region` — id, county/state, `bounds` (WGS84 box), `center`, `cities`,
  `sources[]`.
- `ScrapeSource` — id, `type` (municipal | community | venue), `url`, `parser`,
  optional `venue` (name + coordinates + address), optional CSS `selectors`,
  `enabled`.
- `ElaEvent` — the normalized unit: title, description, `category`, `ageBands`,
  `location` (lat/lng), `startsAt`/`endsAt`, `isFree`/`price`, `url`, `tags`,
  and a deterministic `id`.
- `EventsDataset` — `generatedAt`, `schemaVersion`, `regionIds`, `events[]`.

## 4. Data pipeline

### 4.1 Fetch
`scrapeSource` optionally performs a live HTTP GET (axios, browser-like UA,
timeout, redirects). Live mode is off by default so CI/offline runs are
deterministic.

### 4.2 Parse (`src/lib/scraper/parsers.ts`)
- **`generic-jsonld`** — parses `schema.org/Event` JSON-LD, flattening single
  objects, arrays, and `@graph`; extracts geo, address, and offers/price.
- **`generic-list`** — walks a list/detail DOM using the source's CSS selectors,
  resolving relative links.

### 4.3 Fixtures (`src/lib/scraper/fixtures.ts`)
Every source has curated sample events dated relative to run time. When live
parsing yields nothing (blocked, changed markup, offline), the pipeline uses
fixtures — the map is **never empty**, and tests are deterministic.

### 4.4 Classify (`src/lib/scraper/classify.ts`)
Regex heuristics map free text → `EventCategory` and `AgeBand[]`, detect
free/ticketed, and compute a deterministic FNV-1a `id` from
`source|title|start` so re-scrapes de-dupe.

### 4.5 Normalize + guard (`src/lib/scraper/index.ts`)
`normalize` fills missing coordinates from the source venue; events that
geolocate **outside the region bounds** are dropped. `dedupe` keeps the newest
copy per id and sorts chronologically.

### 4.6 Output
`scripts/scrape.ts` writes `data/events.json`. The autonomous loop commits it.

## 5. Map rendering

### 5.1 Projection (`src/lib/geo.ts`)
A latitude-corrected equirectangular projection maps lat/lng into the SVG's
local space. It preserves aspect ratio and centers content, so the bounds'
center lands at the viewport center. Correcting longitude by
`cos(centerLat)` keeps horizontal/vertical scale visually consistent at Lee
County's latitude (~26.6°N).

### 5.2 Illustrated geometry (`src/lib/mapArt.ts`)
Rather than map tiles, Elatime draws a **stylized custom map** — landmass,
coastline, the Caloosahatchee estuary dividing Cape Coral from Fort Myers, inland
lakes, city tints, and labels — all as SVG paths in the projection's coordinate
space. Per-region art is keyed by region id with a neutral fallback.

### 5.3 Interaction (`src/components/MapCanvas.tsx`)
Wheel/pinch zoom, drag-to-pan (pointer events), marker selection, and a
golden-angle fan-out so co-located markers stay legible. Category color encodes
type; the selected marker pulses.

### 5.4 Composition (`src/components/MapExplorer.tsx`)
Owns filter + selection state; composes `Filters`, `EventList`, `EventDetail`,
and `MapCanvas`. Filtering is pure and lives in `src/lib/filters.ts`.

**Responsive layout.** On large screens the two panes sit side-by-side
(`lg:grid-cols-[360px,1fr]`). On phones they stack behind a **Map/List toggle**
so each pane gets the full viewport instead of the sidebar squeezing the map;
picking an event from the list jumps back to the map so the pin is visible. The
map itself scales via an SVG `viewBox` (no fixed pixel width), and the detail
popover is width-capped to the viewport, so there is no horizontal overflow at
phone widths.

## 6. Automation model (no GitHub cron)

Elatime has **no scheduled GitHub Actions**. Nothing runs or commits on its own
in the cloud.

- **`ci.yml`** — typecheck + test + build, on push/PR to `main` only.
- **`manual-scrape.yml`** — `workflow_dispatch` only (no `schedule`). Green-gates,
  runs the scrape, and — only if the `commit` input is set — commits
  `data/events.json`. Trigger it by hand when you want a cloud refresh.

**Scheduling is session-driven.** The Claude Code session runs the pipeline and
works the `elatime-backlog` issues on request, and can self-schedule a cadence
when asked (e.g. "three tasks over three hours"). This keeps Actions minutes and
repo commits under explicit manual control.

## 7. Testing strategy

Vitest + Testing Library, in `tests/`:

- **Unit:** geo projection, classifiers, parsers, filters, formatters,
  config validation.
- **Integration:** the scraper end-to-end (live-fetch path, fixture fallback,
  bounds guard, dedupe, determinism).
- **Component:** list/detail render + interaction, `MapExplorer` filter wiring.
- **Data guard:** the committed `data/events.json` stays schema-valid and
  in-region.

Rule: **merge only on a fully green suite.**

## 7a. Resilience (empty / stale / malformed data)

The committed dataset is machine-generated, so the frontend treats it as
untrusted input:

- **`safeLoadDataset`** (`src/lib/dataset.ts`) validates the schema version and
  shape, drops individual malformed events, and returns a status of
  `ok | empty | invalid`. A bad file yields a safe empty dataset, never a crash.
- **Empty state** — when a region has no events, `MapExplorer` renders a clear
  empty state (sidebar + map overlay) instead of blank filters and a dead map.
- **Stale badge** — freshness is computed client-side (post-mount, to avoid a
  hydration mismatch) from `generatedAt`; data older than 48h shows an amber
  "may be out of date" notice with a human age label.
- **Invalid banner** — an `invalid` status surfaces a non-blocking alert
  explaining the data couldn’t be read and that the next refresh should restore it.

## 8. Extensibility roadmap

- More sources per region (schools, churches, parenting Facebook groups via RSS).
- Additional regions (config-only).
- Live scraping hardened per-source (retry/backoff, per-source parsers).
- Saved favorites, "near me" geolocation, week/weekend quick filters.
- Optional persistence + an ingestion API if the dataset outgrows a JSON file.
