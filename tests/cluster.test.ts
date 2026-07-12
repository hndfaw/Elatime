import { describe, it, expect } from "vitest";
import { clusterByGrid, fanOffset } from "@/lib/cluster";

interface P {
  x: number;
  y: number;
  id: string;
}

describe("clusterByGrid", () => {
  it("groups co-located points into one cluster at their centroid", () => {
    const pts: P[] = [
      { id: "a", x: 100, y: 100 },
      { id: "b", x: 104, y: 98 },
      { id: "c", x: 500, y: 500 },
    ];
    const clusters = clusterByGrid(pts, 30);
    expect(clusters).toHaveLength(2);
    const big = clusters.find((c) => c.items.length === 2)!;
    expect(big.items.map((i) => i.id).sort()).toEqual(["a", "b"]);
    expect(big.x).toBeCloseTo(102, 5);
    expect(big.y).toBeCloseTo(99, 5);
  });

  it("keeps distant points in separate single-item clusters", () => {
    const pts: P[] = [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 300, y: 0 },
      { id: "c", x: 0, y: 300 },
    ];
    const clusters = clusterByGrid(pts, 30);
    expect(clusters).toHaveLength(3);
    expect(clusters.every((c) => c.items.length === 1)).toBe(true);
  });

  it("is deterministic in first-seen order", () => {
    const pts: P[] = [
      { id: "a", x: 500, y: 500 },
      { id: "b", x: 100, y: 100 },
    ];
    const clusters = clusterByGrid(pts, 30);
    expect(clusters.map((c) => c.items[0].id)).toEqual(["a", "b"]);
  });

  it("degrades to one-per-point when cell <= 0", () => {
    const pts: P[] = [
      { id: "a", x: 1, y: 1 },
      { id: "b", x: 1, y: 1 },
    ];
    expect(clusterByGrid(pts, 0)).toHaveLength(2);
  });

  it("handles an empty input", () => {
    expect(clusterByGrid([], 30)).toEqual([]);
  });
});

describe("fanOffset", () => {
  it("puts the first member at the center", () => {
    expect(fanOffset(0)).toEqual({ dx: 0, dy: 0 });
  });
  it("spreads later members outward but within the cap", () => {
    const o = fanOffset(50, 60);
    const r = Math.hypot(o.dx, o.dy);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(60 + 1e-9);
  });
});
