import { describe, it, expect } from "vitest";
import { locateLeeBranch } from "@/lib/scraper/leeBranches";
import { withinBounds } from "@/lib/geo";
import { getDefaultRegion } from "@/lib/regions";

describe("locateLeeBranch", () => {
  it("resolves known branches to distinct, in-bounds coordinates", () => {
    const cape = locateLeeBranch("Cape Coral-Lee County Public Library");
    const lakes = locateLeeBranch("Lakes Regional Library");
    expect(cape).toBeDefined();
    expect(lakes).toBeDefined();
    // Different branches map to different points.
    expect(cape).not.toEqual(lakes);
    const bounds = getDefaultRegion().bounds;
    expect(withinBounds(cape!, bounds)).toBe(true);
    expect(withinBounds(lakes!, bounds)).toBe(true);
  });

  it("prefers the more specific match (north fort myers over fort myers)", () => {
    const north = locateLeeBranch("North Fort Myers Library");
    const downtown = locateLeeBranch("Downtown Fort Myers Regional Library");
    expect(north).not.toEqual(downtown);
  });

  it("returns undefined for unknown locations", () => {
    expect(locateLeeBranch("Somewhere Else, NY")).toBeUndefined();
    expect(locateLeeBranch(undefined)).toBeUndefined();
  });
});
