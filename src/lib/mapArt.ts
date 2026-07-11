import type { Viewport } from "./geo";

/**
 * Hand-authored, stylized SVG geometry for the interactive canvas map.
 *
 * Elatime does not use map tiles — it renders a custom illustrated map with
 * SVG paths. Coordinates below live in the same local space as `geo.project`
 * (see MAP_VIEWPORT), so event markers land on the illustrated landmass.
 *
 * The art is deliberately stylized rather than survey-accurate; it exists to
 * give the plotted events a sense of place (the Caloosahatchee estuary dividing
 * Cape Coral from Fort Myers, the Gulf to the west).
 */

export const MAP_VIEWPORT: Required<Viewport> = {
  width: 1000,
  height: 750,
  padding: 44,
};

export interface CityTint {
  label: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface MapArt {
  /** Filled landmass path. */
  land: string;
  /** Subtle inner coastline highlight (stroked). */
  coast: string;
  /** River/estuary path, stroked as water cutting through the land. */
  river: string;
  /** Decorative inland water bodies. */
  lakes: Array<{ cx: number; cy: number; rx: number; ry: number }>;
  /** Soft translucent zones under the two focus cities. */
  cityTints: CityTint[];
  /** Placement of the Gulf label over open water. */
  gulfLabel: { x: number; y: number; text: string } | null;
  /** Placement + rotation of the river label. */
  riverLabel: { x: number; y: number; rotate: number; text: string } | null;
}

const LEE_COUNTY_ART: MapArt = {
  // Rounded landmass covering most of the canvas, leaving a sea margin.
  land:
    "M120,90 " +
    "C260,52 460,44 640,70 " +
    "C780,90 900,120 930,220 " +
    "C956,310 940,430 918,540 " +
    "C900,630 820,690 690,700 " +
    "C520,712 360,706 230,672 " +
    "C120,642 66,560 62,440 " +
    "C58,330 60,180 120,90 Z",
  coast:
    "M120,90 C260,52 460,44 640,70 C780,90 900,120 930,220 " +
    "C956,310 940,430 918,540 C900,630 820,690 690,700 " +
    "C520,712 360,706 230,672 C120,642 66,560 62,440 " +
    "C58,330 60,180 120,90 Z",
  // Caloosahatchee estuary: sweeps from the NE inland out to the SW Gulf.
  river:
    "M720,210 C640,250 585,262 545,296 " +
    "C500,332 452,300 402,306 " +
    "C330,314 262,352 190,420 " +
    "C150,458 110,470 74,486",
  lakes: [
    { cx: 300, cy: 560, rx: 34, ry: 18 },
    { cx: 760, cy: 470, rx: 26, ry: 16 },
    { cx: 660, cy: 590, rx: 30, ry: 15 },
  ],
  cityTints: [
    { label: "CAPE CORAL", cx: 430, cy: 420, rx: 150, ry: 110 },
    { label: "FORT MYERS", cx: 630, cy: 250, rx: 140, ry: 100 },
  ],
  gulfLabel: { x: 96, y: 610, text: "GULF OF MEXICO" },
  riverLabel: { x: 360, y: 330, rotate: -14, text: "Caloosahatchee River" },
};

/** A neutral fallback landmass for regions without bespoke art. */
const GENERIC_ART: MapArt = {
  land:
    "M120,110 C320,70 680,70 880,110 C940,150 940,600 880,640 " +
    "C680,680 320,680 120,640 C60,600 60,150 120,110 Z",
  coast:
    "M120,110 C320,70 680,70 880,110 C940,150 940,600 880,640 " +
    "C680,680 320,680 120,640 C60,600 60,150 120,110 Z",
  river: "M500,110 C480,300 520,460 500,640",
  lakes: [],
  cityTints: [],
  gulfLabel: null,
  riverLabel: null,
};

/** Return the illustrated map geometry for a region. */
export function getMapArt(regionId: string): MapArt {
  if (regionId === "lee-county-fl") return LEE_COUNTY_ART;
  return GENERIC_ART;
}
