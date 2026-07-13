import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EventDetail from "@/components/EventDetail";
import Filters from "@/components/Filters";
import MapExplorer from "@/components/MapExplorer";
import { EMPTY_FILTERS } from "@/lib/filters";
import { getDefaultRegion } from "@/lib/regions";
import type { ElaEvent } from "@/lib/types";

function ev(over: Partial<ElaEvent> = {}): ElaEvent {
  return {
    id: "a",
    title: "Toddler Storytime",
    category: "storytime",
    ageBands: ["toddler"],
    regionId: "lee-county-fl",
    sourceId: "s",
    venueName: "Lee County Library",
    address: "519 Chiquita Blvd. N., Cape Coral, FL, 33993, US",
    location: { lat: 26.6623, lng: -82.0063 },
    startsAt: "2026-07-20T15:00:00.000Z",
    endsAt: "2026-07-20T16:00:00.000Z",
    isFree: true,
    tags: [],
    scrapedAt: "2026-07-11T00:00:00.000Z",
    ...over,
  };
}

describe("EventDetail — directions + distance", () => {
  it("shows a Get directions link to the event coordinates", () => {
    render(<EventDetail event={ev()} onClose={() => {}} />);
    const link = screen.getByRole("link", { name: /Get directions/i });
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=26.6623,-82.0063"
    );
  });

  it("shows a distance when a user location is provided", () => {
    render(
      <EventDetail event={ev()} onClose={() => {}} userLocation={{ lat: 26.56, lng: -81.95 }} />
    );
    expect(screen.getByText(/mi away/i)).toBeInTheDocument();
  });
});

describe("Filters — date presets", () => {
  it("marks a preset active and emits after/before on click", () => {
    const onChange = vi.fn();
    render(<Filters events={[ev()]} filters={EMPTY_FILTERS} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next.datePreset).toBe("today");
    expect(next.after).toBeTruthy();
    expect(next.before).toBeTruthy();
  });
});

describe("MapExplorer — near me", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows distance badges after sharing location", () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({ coords: { latitude: 26.56, longitude: -81.95 } } as GeolocationPosition)
    );
    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: { getCurrentPosition },
      configurable: true,
    });

    render(
      <MapExplorer
        region={getDefaultRegion()}
        events={[ev(), ev({ id: "b", title: "Baby Rhyme Time" })]}
        generatedAt="2026-07-11T11:00:00.000Z"
      />
    );

    // No distance badges until location is shared.
    expect(screen.queryByText(/mi$/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Near me/i }));
    expect(getCurrentPosition).toHaveBeenCalled();
    // Distance badges now render in the list.
    expect(screen.getAllByText(/mi$/i).length).toBeGreaterThan(0);
  });
});
