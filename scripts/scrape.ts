/**
 * Elatime scrape CLI — the routine the autonomous loop runs each cycle.
 *
 * Usage:
 *   tsx scripts/scrape.ts            # offline-safe (fixtures), deterministic
 *   tsx scripts/scrape.ts --live     # attempt live HTTP, fall back to fixtures
 *   tsx scripts/scrape.ts --region lee-county-fl
 *
 * Always writes data/events.json. Exits non-zero only on a genuine failure to
 * write output, so the CI loop stays green as long as the pipeline runs.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getEnabledSources, validateConfig } from "../src/lib/regions";
import { runScrape } from "../src/lib/scraper";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../data/events.json");

function parseArgs(argv: string[]) {
  const args = { live: false, region: undefined as string | undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--live") args.live = true;
    else if (argv[i] === "--region") args.region = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  validateConfig();

  const sources = getEnabledSources(args.region);
  console.log(
    `[scrape] ${sources.length} source(s)${args.region ? ` in ${args.region}` : ""}, live=${args.live}`
  );

  const dataset = await runScrape(sources, {
    live: args.live,
    log: (m) => console.log(m),
  });

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(dataset, null, 2) + "\n", "utf8");

  console.log(
    `[scrape] wrote ${dataset.events.length} event(s) to data/events.json (generatedAt ${dataset.generatedAt})`
  );
}

main().catch((err) => {
  console.error("[scrape] fatal:", err);
  process.exit(1);
});
