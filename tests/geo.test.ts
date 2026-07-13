import { describe, it, expect } from "vitest";
import {
  project,
  withinBounds,
  haversineKm,
  lngScaleFactor,
  formatDistanceMiles,
} from "@/lib/geo";
import type { GeoBounds } from "@/lib/types";

const bounds: GeoBounds = { west: -82.28, east: -81.6, south: 26.35, north: 26.78 };
const viewport = { width: 1000, height: 750, padding: 44 };

describe("geo.project", () => {
  it("maps the center of the bounds near the viewport center", () => {
    const center = { lat: (26.35 + 26.78) / 2, lng: (-82.28 + -81.6) / 2 };
    const p = project(center, bounds, viewport);
    expect(p.x).toBeGreaterThan(viewport.width / 2 - 30);
    expect(p.x).toBeLessThan(viewport.width / 2 + 30);
    expect(p.y).toBeGreaterThan(viewport.height / 2 - 40);
    expect(p.y).toBeLessThan(viewport.height / 2 + 40);
  });

  it("places north higher (smaller y) than south", () => {
    const north = project({ lat: 26.77, lng: -81.9 }, bounds, viewport);
    const south = project({ lat: 26.36, lng: -81.9 }, bounds, viewport);
    expect(north.y).toBeLessThan(south.y);
  });

  it("places east to the right (larger x) than west", () => {
    const west = project({ lat: 26.6, lng: -82.2 }, bounds, viewport);
    const east = project({ lat: 26.6, lng: -81.65 }, bounds, viewport);
    expect(east.x).toBeGreaterThan(west.x);
  });

  it("keeps points within the padded viewport", () => {
    const p = project({ lat: 26.78, lng: -81.6 }, bounds, viewport);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(viewport.width);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeLessThanOrEqual(viewport.height);
  });

  it("returns the viewport center for degenerate bounds", () => {
    const bad: GeoBounds = { west: 0, east: 0, south: 0, north: 0 };
    const p = project({ lat: 0, lng: 0 }, bad, viewport);
    expect(p.x).toBe(viewport.width / 2);
    expect(p.y).toBe(viewport.height / 2);
  });
});

describe("geo helpers", () => {
  it("lngScaleFactor is between 0 and 1 for mid latitudes", () => {
    const k = lngScaleFactor(bounds);
    expect(k).toBeGreaterThan(0.85);
    expect(k).toBeLessThan(0.95);
  });

  it("withinBounds detects inside and outside points", () => {
    expect(withinBounds({ lat: 26.6, lng: -81.9 }, bounds)).toBe(true);
    expect(withinBounds({ lat: 27.5, lng: -81.9 }, bounds)).toBe(false);
    expect(withinBounds({ lat: 26.6, lng: -80.0 }, bounds)).toBe(false);
  });

  it("formatDistanceMiles renders friendly labels", () => {
    expect(formatDistanceMiles(0.05)).toBe("nearby");
    expect(formatDistanceMiles(3.2)).toBe("2.0 mi"); // ~1.99 mi
    expect(formatDistanceMiles(40)).toBe("25 mi");
  });

  it("haversineKm ~0 for identical points and positive otherwise", () => {
    const a = { lat: 26.6, lng: -81.9 };
    expect(haversineKm(a, a)).toBeCloseTo(0, 5);
    // Cape Coral to Fort Myers is roughly 10 km apart.
    const d = haversineKm({ lat: 26.5629, lng: -81.9495 }, { lat: 26.6406, lng: -81.8723 });
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(20);
  });
});
