"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import type { ElaEvent, Region } from "@/lib/types";
import { project } from "@/lib/geo";
import { getMapArt, MAP_VIEWPORT } from "@/lib/mapArt";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/format";

interface MapCanvasProps {
  region: Region;
  events: ElaEvent[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

interface Placed {
  event: ElaEvent;
  x: number;
  y: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

/**
 * The interactive illustrated map. Projects each event onto hand-drawn SVG
 * geometry and supports wheel/pinch zoom, drag-to-pan, and marker selection.
 * Markers at the same venue are fanned out slightly so none are fully hidden.
 */
export default function MapCanvas({
  region,
  events,
  selectedId,
  onSelect,
}: MapCanvasProps) {
  const art = getMapArt(region.id);
  const { width, height } = MAP_VIEWPORT;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);

  const placed = useMemo<Placed[]>(() => {
    // Spread co-located markers around a small ring so overlaps stay legible.
    const byKey = new Map<string, number>();
    return events.map((event) => {
      const base = project(event.location, region.bounds, MAP_VIEWPORT);
      const key = `${base.x.toFixed(1)},${base.y.toFixed(1)}`;
      const n = byKey.get(key) ?? 0;
      byKey.set(key, n + 1);
      if (n === 0) return { event, x: base.x, y: base.y };
      // Golden-angle fan-out for co-located markers. Radius grows with sqrt(n)
      // and is capped so dense venues (e.g. a busy library) stay a tidy cluster
      // instead of spiraling off-canvas.
      const angle = (n * 2.399963) % (Math.PI * 2);
      const radius = Math.min(8 + Math.sqrt(n) * 7, 48);
      return {
        event,
        x: base.x + Math.cos(angle) * radius,
        y: base.y + Math.sin(angle) * radius,
      };
    });
  }, [events, region.bounds]);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.12 : 0.89)));
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        panX: pan.x,
        panY: pan.y,
        moved: false,
      };
    },
    [pan]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) st.moved = true;
    setPan({ x: st.panX + dx, y: st.panY + dy });
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const st = dragState.current;
      dragState.current = null;
      // A click that didn't drag on empty canvas clears the selection.
      if (st && !st.moved && e.target === e.currentTarget) onSelect?.(null);
    },
    [onSelect]
  );

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const graticule = useMemo(() => buildGraticule(region, width, height), [
    region,
    width,
    height,
  ]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-canvas">
      <svg
        role="img"
        aria-label={`Map of kid-friendly events in ${region.name}, ${region.state}`}
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full touch-none select-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <radialGradient id="sea-grad" cx="35%" cy="30%" r="90%">
            <stop offset="0%" stopColor="#173a5c" />
            <stop offset="100%" stopColor="#0b1522" />
          </radialGradient>
          <linearGradient id="land-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22364d" />
            <stop offset="100%" stopColor="#182838" />
          </linearGradient>
          <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Sea backdrop */}
        <rect x="0" y="0" width={width} height={height} fill="url(#sea-grad)" />

        {/* Everything below zooms/pans together */}
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {/* Landmass */}
          <path d={art.land} fill="url(#land-grad)" stroke="#2c435d" strokeWidth={2} />
          <path
            d={art.coast}
            fill="none"
            stroke="#3d5a78"
            strokeWidth={1.5}
            opacity={0.6}
          />

          {/* City focus tints + labels */}
          {art.cityTints.map((t) => (
            <g key={t.label}>
              <ellipse
                cx={t.cx}
                cy={t.cy}
                rx={t.rx}
                ry={t.ry}
                fill="#4cc9f0"
                opacity={0.06}
              />
              <text
                x={t.cx}
                y={t.cy - t.ry - 6}
                textAnchor="middle"
                className="fill-sky/70"
                style={{ fontSize: 15, letterSpacing: 2, fontWeight: 600 }}
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Graticule */}
          {graticule.map((g, i) => (
            <line
              key={i}
              x1={g.x1}
              y1={g.y1}
              x2={g.x2}
              y2={g.y2}
              stroke="#ffffff"
              strokeWidth={0.5}
              opacity={0.05}
            />
          ))}

          {/* Inland lakes */}
          {art.lakes.map((l, i) => (
            <ellipse
              key={i}
              cx={l.cx}
              cy={l.cy}
              rx={l.rx}
              ry={l.ry}
              fill="#12324f"
              opacity={0.85}
            />
          ))}

          {/* River / estuary */}
          <path
            d={art.river}
            fill="none"
            stroke="#12324f"
            strokeWidth={24}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={art.river}
            fill="none"
            stroke="#1c4a6e"
            strokeWidth={10}
            strokeLinecap="round"
            opacity={0.8}
          />
          {art.riverLabel && (
            <text
              transform={`translate(${art.riverLabel.x} ${art.riverLabel.y}) rotate(${art.riverLabel.rotate})`}
              className="fill-sky/60 italic"
              style={{ fontSize: 12 }}
            >
              {art.riverLabel.text}
            </text>
          )}
          {art.gulfLabel && (
            <text
              x={art.gulfLabel.x}
              y={art.gulfLabel.y}
              className="fill-sky/40"
              style={{ fontSize: 13, letterSpacing: 3, fontWeight: 600 }}
            >
              {art.gulfLabel.text}
            </text>
          )}

          {/* Event markers */}
          {placed.map(({ event, x, y }) => {
            const selected = event.id === selectedId;
            const color = CATEGORY_COLORS[event.category] ?? "#9aa5b1";
            return (
              <g
                key={event.id}
                transform={`translate(${x} ${y})`}
                className="cursor-pointer"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(event.id);
                }}
                role="button"
                aria-label={`${event.title} — ${CATEGORY_LABELS[event.category]}`}
              >
                {selected && (
                  <circle r={13} fill={color} opacity={0.25}>
                    <animate
                      attributeName="r"
                      values="11;16;11"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  r={selected ? 8 : 6}
                  fill={color}
                  stroke="#0e1726"
                  strokeWidth={2}
                  filter="url(#marker-shadow)"
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => clampZoom(z * 1.3))}
          className="h-9 w-9 rounded-lg bg-land/90 text-lg font-bold text-white shadow hover:bg-land"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => clampZoom(z / 1.3))}
          className="h-9 w-9 rounded-lg bg-land/90 text-lg font-bold text-white shadow hover:bg-land"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Reset view"
          onClick={resetView}
          className="h-9 w-9 rounded-lg bg-land/90 text-xs font-semibold text-white shadow hover:bg-land"
        >
          ⤾
        </button>
      </div>
    </div>
  );
}

/** Build faint graticule lines across the region bounds. */
function buildGraticule(
  region: Region,
  width: number,
  height: number
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const x = (width / steps) * i;
    lines.push({ x1: x, y1: 0, x2: x, y2: height });
    const y = (height / steps) * i;
    lines.push({ x1: 0, y1: y, x2: width, y2: y });
  }
  return lines;
}
