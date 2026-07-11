"use client";

import type { ElaEvent } from "@/lib/types";
import {
  AGE_LABELS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  formatWhen,
} from "@/lib/format";

interface EventDetailProps {
  event: ElaEvent | null;
  onClose: () => void;
}

/** Detail popover for the selected event. Renders nothing when unselected. */
export default function EventDetail({ event, onClose }: EventDetailProps) {
  if (!event) return null;
  const color = CATEGORY_COLORS[event.category];

  return (
    <div
      role="dialog"
      aria-label={`Details for ${event.title}`}
      className="pointer-events-auto absolute left-3 top-3 z-10 w-[min(340px,calc(100%-1.5rem))] rounded-2xl border border-white/10 bg-canvas/95 p-4 shadow-2xl backdrop-blur"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {CATEGORY_LABELS[event.category]}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded p-0.5 text-white/50 hover:text-white"
        >
          ✕
        </button>
      </div>

      <h2 className="mt-2 text-lg font-semibold leading-snug text-white">
        {event.title}
      </h2>
      <p className="mt-1 text-sm text-sky">{formatWhen(event.startsAt, event.endsAt)}</p>

      {event.description && (
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          {event.description}
        </p>
      )}

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-white/40">Where</dt>
          <dd className="text-white/80">
            {event.venueName}
            {event.address && (
              <span className="block text-xs text-white/50">{event.address}</span>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-white/40">Ages</dt>
          <dd className="text-white/80">
            {event.ageBands.map((b) => AGE_LABELS[b]).join(", ")}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-white/40">Cost</dt>
          <dd className="text-white/80">
            {event.isFree ? "Free" : event.price ?? "Ticketed"}
          </dd>
        </div>
      </dl>

      {event.url && (
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 rounded-lg bg-coral px-3 py-1.5 text-sm font-medium text-white hover:bg-coral/90"
        >
          View source ↗
        </a>
      )}
    </div>
  );
}
