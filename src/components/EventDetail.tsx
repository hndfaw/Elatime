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
      className="pointer-events-auto absolute left-3 top-3 z-[1000] w-[min(340px,calc(100%-1.5rem))] rounded-3xl border-2 border-white bg-paper p-4 shadow-soft"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: `${color}26`, color: "#2c2a3a" }}
        >
          {CATEGORY_LABELS[event.category]}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded-full p-0.5 text-ink-soft hover:text-ink"
        >
          ✕
        </button>
      </div>

      <h2 className="mt-2 font-display text-lg font-semibold leading-snug text-ink">
        {event.title}
      </h2>
      <p className="mt-1 text-sm font-semibold text-coral">
        {formatWhen(event.startsAt, event.endsAt)}
      </p>

      {event.description && (
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {event.description}
        </p>
      )}

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-semibold text-ink-soft/70">Where</dt>
          <dd className="text-ink">
            {event.venueName}
            {event.address && (
              <span className="block text-xs text-ink-soft">{event.address}</span>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-semibold text-ink-soft/70">Ages</dt>
          <dd className="text-ink">
            {event.ageBands.map((b) => AGE_LABELS[b]).join(", ")}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-semibold text-ink-soft/70">Cost</dt>
          <dd className="text-ink">
            {event.isFree ? "Free" : event.price ?? "Ticketed"}
          </dd>
        </div>
      </dl>

      {event.url && (
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-coral px-4 py-2 text-sm font-bold text-white shadow-card transition hover:bg-coral/90"
        >
          View source ↗
        </a>
      )}
    </div>
  );
}
