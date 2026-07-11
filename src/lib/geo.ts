import type { GeoBounds, GeoPoint } from "./types";

/**
 * Elatime plots events on a hand-built SVG canvas rather than a tiled map.
 * These helpers project WGS84 lat/lng into the SVG's local coordinate space.
 *
 * We use a simple equirectangular projection corrected for latitude so that,
 * over a county-sized area, horizontal and vertical scales stay visually
 * consistent. That correction matters at Lee County's latitude (~26.6°N),
 * where a degree of longitude is noticeably shorter than a degree of latitude.
 */

export interface Viewport {
  width: number;
  height: number;
  /** Uniform inner padding so markers never touch the SVG edge. */
  padding?: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
}

const DEG2RAD = Math.PI / 180;

/**
 * Aspect ratio (map-units-per-degree-lng / map-units-per-degree-lat) for a
 * bounding box, using the cosine of the box's center latitude.
 */
export function lngScaleFactor(bounds: GeoBounds): number {
  const centerLat = (bounds.north + bounds.south) / 2;
  return Math.cos(centerLat * DEG2RAD);
}

/**
 * Project a geographic point into SVG coordinates for the given bounds and
 * viewport. The projection preserves aspect ratio and centers the content,
 * so a marker at the exact center of `bounds` lands at the viewport center.
 */
export function project(
  point: GeoPoint,
  bounds: GeoBounds,
  viewport: Viewport
): ProjectedPoint {
  const padding = viewport.padding ?? 0;
  const innerW = Math.max(0, viewport.width - padding * 2);
  const innerH = Math.max(0, viewport.height - padding * 2);

  const kx = lngScaleFactor(bounds);
  const spanLng = (bounds.east - bounds.west) * kx;
  const spanLat = bounds.north - bounds.south;

  if (spanLng <= 0 || spanLat <= 0) {
    return { x: viewport.width / 2, y: viewport.height / 2 };
  }

  // Uniform scale that fits the bounds inside the padded viewport.
  const scale = Math.min(innerW / spanLng, innerH / spanLat);

  const usedW = spanLng * scale;
  const usedH = spanLat * scale;
  const offsetX = padding + (innerW - usedW) / 2;
  const offsetY = padding + (innerH - usedH) / 2;

  const nx = (point.lng - bounds.west) * kx;
  // Latitude increases upward, but SVG y increases downward: flip it.
  const ny = bounds.north - point.lat;

  return {
    x: offsetX + nx * scale,
    y: offsetY + ny * scale,
  };
}

/** True when a point lies inside (or on) the bounds. */
export function withinBounds(point: GeoPoint, bounds: GeoBounds): boolean {
  return (
    point.lng >= bounds.west &&
    point.lng <= bounds.east &&
    point.lat >= bounds.south &&
    point.lat <= bounds.north
  );
}

/** Great-circle distance between two points, in kilometers (Haversine). */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * DEG2RAD;
  const dLng = (b.lng - a.lng) * DEG2RAD;
  const lat1 = a.lat * DEG2RAD;
  const lat2 = b.lat * DEG2RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
