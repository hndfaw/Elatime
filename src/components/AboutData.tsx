"use client";

/**
 * A small, honest disclosure of where the data comes from. Some sources are
 * live/real today; others are still sample data until their feeds are wired.
 * Being upfront about that matters for a public tool.
 */
export default function AboutData() {
  return (
    <details className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
      <summary className="cursor-pointer list-none font-medium text-white/70 marker:content-none">
        ⓘ About this data
      </summary>
      <div className="mt-2 space-y-2 leading-relaxed">
        <p>
          Elatime aggregates kid-friendly and toddler activities across Lee
          County, FL (Cape Coral &amp; Fort Myers).
        </p>
        <p>
          <span className="text-mint">Live sources:</span> the City of Fort Myers
          community calendar and the Lee County Library System (storytimes,
          crafts, and family programs).
        </p>
        <p>
          <span className="text-sunshine">Sample data:</span> some listed venues
          (e.g. IMAG, Cape Coral Parks, Rotary Park) currently show illustrative
          examples until their live feeds are connected.
        </p>
        <p className="text-white/40">
          Always confirm details with the event organizer before heading out.
        </p>
      </div>
    </details>
  );
}
