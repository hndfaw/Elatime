import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MapCanvas from "@/components/MapCanvas";
import { getDefaultRegion } from "@/lib/regions";
import type { ElaEvent } from "@/lib/types";

function ev(id: string, over: Partial<ElaEvent> = {}): ElaEvent {
  return {
    id,
    title: `Event ${id}`,
    category: "storytime",
    ageBands: ["toddler"],
    regionId: "lee-county-fl",
    sourceId: "s",
    venueName: "Library",
    location: { lat: 26.64, lng: -81.87 },
    startsAt: "2026-07-12T15:00:00.000Z",
    isFree: true,
    tags: [],
    scrapedAt: "2026-07-11T00:00:00.000Z",
    ...over,
  };
}

describe("MapCanvas clustering", () => {
  const region = getDefaultRegion();

  it("renders a count badge for co-located events", () => {
    // Three events at the exact same location -> one cluster of 3.
    render(<MapCanvas region={region} events={[ev("a"), ev("b"), ev("c")]} />);
    const cluster = screen.getByRole("button", { name: /Cluster of 3 events/i });
    expect(cluster).toBeInTheDocument();
    expect(cluster).toHaveTextContent("3");
  });

  it("expands a cluster into its members on click", () => {
    const onSelect = vi.fn();
    render(
      <MapCanvas
        region={region}
        events={[ev("a"), ev("b"), ev("c")]}
        onSelect={onSelect}
      />
    );
    // Members are not individually present while collapsed.
    expect(screen.queryByRole("button", { name: /Event a —/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Cluster of 3 events/i }));

    // After expanding, individual member markers appear and are selectable.
    const member = screen.getByRole("button", { name: /Event a —/i });
    fireEvent.click(member);
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("renders distinct events at different venues as separate markers", () => {
    render(
      <MapCanvas
        region={region}
        events={[
          ev("a", { location: { lat: 26.56, lng: -81.95 } }), // Cape Coral
          ev("b", { location: { lat: 26.64, lng: -81.62 } }), // Lehigh
        ]}
      />
    );
    expect(screen.getByRole("button", { name: /Event a —/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Event b —/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cluster of/i })).not.toBeInTheDocument();
  });
});
