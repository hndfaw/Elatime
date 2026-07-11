import type { Region, RegionsConfig, ScrapeSource } from "./types";
import rawConfig from "../../config/regions.json";

/**
 * Typed, validated access to the regional scraping configuration.
 * The config is intentionally data-driven so new counties/cities can be added
 * by editing config/regions.json alone — no code changes required.
 */

const config = rawConfig as RegionsConfig;

export class RegionsConfigError extends Error {}

/** Validate the shape of the regions config; throws on structural problems. */
export function validateConfig(cfg: RegionsConfig = config): void {
  if (!cfg.regions?.length) {
    throw new RegionsConfigError("regions config must define at least one region");
  }
  const ids = new Set<string>();
  for (const region of cfg.regions) {
    if (!region.id) throw new RegionsConfigError("region missing id");
    if (ids.has(region.id)) {
      throw new RegionsConfigError(`duplicate region id: ${region.id}`);
    }
    ids.add(region.id);

    const { bounds } = region;
    if (
      bounds.west >= bounds.east ||
      bounds.south >= bounds.north
    ) {
      throw new RegionsConfigError(`region ${region.id} has invalid bounds`);
    }

    const sourceIds = new Set<string>();
    for (const source of region.sources) {
      if (!source.id) throw new RegionsConfigError(`source in ${region.id} missing id`);
      if (sourceIds.has(source.id)) {
        throw new RegionsConfigError(`duplicate source id: ${source.id}`);
      }
      sourceIds.add(source.id);
      if (source.regionId !== region.id) {
        throw new RegionsConfigError(
          `source ${source.id} regionId (${source.regionId}) does not match region ${region.id}`
        );
      }
    }
  }
  if (!cfg.regions.some((r) => r.id === cfg.defaultRegionId)) {
    throw new RegionsConfigError(
      `defaultRegionId ${cfg.defaultRegionId} does not match any region`
    );
  }
}

export function getConfig(): RegionsConfig {
  return config;
}

export function getRegions(): Region[] {
  return config.regions;
}

export function getRegion(id: string): Region | undefined {
  return config.regions.find((r) => r.id === id);
}

export function getDefaultRegion(): Region {
  const region = getRegion(config.defaultRegionId);
  if (!region) {
    throw new RegionsConfigError("default region not found in config");
  }
  return region;
}

/** All enabled sources across every region (or a single region when given). */
export function getEnabledSources(regionId?: string): ScrapeSource[] {
  const regions = regionId ? config.regions.filter((r) => r.id === regionId) : config.regions;
  return regions
    .flatMap((r) => r.sources)
    .filter((s) => s.enabled !== false);
}
