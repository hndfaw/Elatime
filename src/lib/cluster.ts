/**
 * Grid clustering for map markers.
 *
 * Many events share a venue (e.g. dozens of library programs at one branch),
 * which would stack into an unreadable pile of markers. We group markers that
 * fall in the same small grid cell of the map's local coordinate space into a
 * single cluster, rendered as one badge with a count that expands on click.
 *
 * Pure and deterministic so it can be unit-tested without a DOM.
 */

export interface Positioned {
  x: number;
  y: number;
}

export interface Cluster<T extends Positioned> {
  /** Stable key for the grid cell. */
  key: string;
  /** Centroid of the cluster's members. */
  x: number;
  y: number;
  items: T[];
}

/**
 * Group positioned items into clusters by snapping to a grid of `cell` units.
 * The cluster position is the centroid of its members. Order is deterministic
 * (first-seen cell order).
 */
export function clusterByGrid<T extends Positioned>(
  items: T[],
  cell: number
): Cluster<T>[] {
  if (cell <= 0) {
    return items.map((it, i) => ({ key: `p${i}`, x: it.x, y: it.y, items: [it] }));
  }

  const cells = new Map<string, T[]>();
  const order: string[] = [];
  for (const it of items) {
    const gx = Math.round(it.x / cell);
    const gy = Math.round(it.y / cell);
    const key = `${gx}:${gy}`;
    let bucket = cells.get(key);
    if (!bucket) {
      bucket = [];
      cells.set(key, bucket);
      order.push(key);
    }
    bucket.push(it);
  }

  return order.map((key) => {
    const members = cells.get(key)!;
    const x = members.reduce((s, m) => s + m.x, 0) / members.length;
    const y = members.reduce((s, m) => s + m.y, 0) / members.length;
    return { key, x, y, items: members };
  });
}

/**
 * Fan members of an expanded cluster out around its centroid using the golden
 * angle, with a radius that grows slowly and is capped so it stays on-canvas.
 */
export function fanOffset(index: number, radiusCap = 60): { dx: number; dy: number } {
  if (index === 0) return { dx: 0, dy: 0 };
  const angle = (index * 2.399963) % (Math.PI * 2);
  const radius = Math.min(10 + Math.sqrt(index) * 9, radiusCap);
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
}
