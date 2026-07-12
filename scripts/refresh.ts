/**
 * Elatime data refresh — the one-step, safe way to update data/events.json.
 *
 *   npm run refresh              # live scrape all regions, gated + written
 *   npm run refresh -- --region lee-county-fl
 *   npm run refresh -- --dry-run # scrape + validate, but do not write
 *
 * Unlike `npm run scrape`, refresh performs a LIVE scrape and then runs a
 * safety gate (evaluateDataset): the file is only overwritten when the new
 * dataset is valid, non-empty, and fully in-bounds. A broken scrape therefore
 * can never clobber good committed data — the script exits non-zero and leaves
 * the existing file untouched.
 *
 * There is no cron. Run this intentionally; commit + push the result, and a
 * connected host (e.g. Vercel) redeploys the site from the new data.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getEnabledSources, validateConfig } from "../src/lib/regions";
import { runScrape } from "../src/lib/scraper";
import { evaluateDataset } from "../src/lib/dataset";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../data/events.json");

function parseArgs(argv: string[]) {
  const args = { region: undefined as string | undefined, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--region") args.region = argv[++i];
    else if (argv[i] === "--dry-run") args.dryRun = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  validateConfig();

  const sources = getEnabledSources(args.region);
  console.log(`[refresh] live scrape of ${sources.length} source(s)`);
  const dataset = await runScrape(sources, {
    live: true,
    horizonDays: 60,
    log: (m) => console.log(m),
  });

  const assessment = evaluateDataset(dataset);
  if (!assessment.ok) {
    console.error(
      `[refresh] REFUSING to write — dataset failed the safety gate:\n` +
        assessment.problems.map((p) => `  - ${p}`).join("\n")
    );
    console.error("[refresh] existing data/events.json left untouched.");
    process.exit(1);
  }

  console.log(`[refresh] gate passed: ${assessment.eventCount} valid, in-bounds event(s)`);

  if (args.dryRun) {
    console.log("[refresh] --dry-run: not writing.");
    return;
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(dataset, null, 2) + "\n", "utf8");
  console.log(`[refresh] wrote data/events.json (generatedAt ${dataset.generatedAt})`);
  console.log("[refresh] next: commit + push; the deployed site redeploys from the new data.");
}

main().catch((err) => {
  console.error("[refresh] fatal:", err);
  process.exit(1);
});
