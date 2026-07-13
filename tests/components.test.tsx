import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EventList from "@/components/EventList";
import EventDetail from "@/components/EventDetail";
import MapExplorer from "@/components/MapExplorer";
import { getDefaultRegion } from "@/lib/regions";
import type { ElaEvent } from "@/lib/types";

function ev(overrides: Partial<ElaEvent> = {}): ElaEvent {
  return {
    id: "a",
    title: "Toddler Storytime",
    description: "Songs and rhymes for tots",
    category: "storytime",
    ageBands: ["toddler"],
    regionId: "lee-county-fl",
    sourceId: "s",
    venueName: "Lee County Library",
    address: "2050 Lee St",
    location: { lat: 26.6428, lng: -81.8723 },
    startsAt: "2026-07-12T15:00:00.000Z",
    endsAt: "2026-07-12T16:00:00.000Z",
    isFree: true,
    price: "Free",
    url: "https://example.org/e",
    tags: [],
    scrapedAt: "2026-07-11T00:00:00.000Z",
    ...overrides,
  };
}

describe("EventList", () => {
  it("renders events and fires onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<EventList events={[ev(), ev({ id: "b", title: "Dino Day" })]} onSelect={onSelect} />);
    expect(screen.getByText("Toddler Storytime")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Dino Day"));
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("shows an empty state when there are no events", () => {
    render(<EventList events={[]} />);
    expect(screen.getByText(/No events match/i)).toBeInTheDocument();
  });
});

describe("EventDetail", () => {
  it("renders nothing when no event is selected", () => {
    const { container } = render(<EventDetail event={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders details and a working close button", () => {
    const onClose = vi.fn();
    render(<EventDetail event={ev()} onClose={onClose} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Lee County Library")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close details"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("MapExplorer", () => {
  it("renders the map, count, and reacts to selecting a list item", () => {
    const region = getDefaultRegion();
    render(
      <MapExplorer
        region={region}
        events={[ev(), ev({ id: "b", title: "Dino Day", category: "museum" })]}
        generatedAt="2026-07-11T11:00:00.000Z"
      />
    );
    // Heading + count line
    expect(screen.getByText(/of 2 kid-friendly events/i)).toBeInTheDocument();
    // The map is loaded client-only (Leaflet); the placeholder renders in tests.
    expect(screen.getByText(/Loading map/i)).toBeInTheDocument();
    // Selecting from the list opens the detail dialog
    fireEvent.click(screen.getByText("Dino Day"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("filters events via the free-only toggle", () => {
    const region = getDefaultRegion();
    render(
      <MapExplorer
        region={region}
        events={[
          ev({ id: "free1", isFree: true }),
          ev({ id: "paid1", title: "Paid Museum", isFree: false }),
        ]}
        generatedAt="2026-07-11T11:00:00.000Z"
      />
    );
    expect(screen.getByText("Paid Museum")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Free events only"));
    expect(screen.queryByText("Paid Museum")).not.toBeInTheDocument();
  });

  it("shows an empty state (and no filters) when there are no events", () => {
    const region = getDefaultRegion();
    render(<MapExplorer region={region} events={[]} generatedAt="2026-07-11T11:00:00.000Z" />);
    expect(screen.getByText(/No events to show yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No events plotted yet/i)).toBeInTheDocument();
    // Filters are not rendered without data.
    expect(screen.queryByLabelText("Free events only")).not.toBeInTheDocument();
  });

  it("shows a data-problem alert when status is invalid", () => {
    const region = getDefaultRegion();
    render(
      <MapExplorer region={region} events={[]} generatedAt="" status="invalid" />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn.t read the latest event data/i);
  });

  it("warns when the data is stale", () => {
    const region = getDefaultRegion();
    // generatedAt far in the past -> stale relative to Date.now().
    render(
      <MapExplorer region={region} events={[ev()]} generatedAt="2000-01-01T00:00:00.000Z" />
    );
    expect(screen.getByRole("status")).toHaveTextContent(/may be out of date/i);
  });

  it("has a mobile Map/List toggle that switches the selected tab", () => {
    const region = getDefaultRegion();
    render(<MapExplorer region={region} events={[ev()]} generatedAt="2026-07-11T11:00:00.000Z" />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    const [mapTab, listTab] = tabs;
    // Map is the default view.
    expect(mapTab).toHaveAttribute("aria-selected", "true");
    fireEvent.click(listTab);
    expect(listTab).toHaveAttribute("aria-selected", "true");
    expect(mapTab).toHaveAttribute("aria-selected", "false");
  });

  it("jumps back to the map view when an event is picked from the list", () => {
    const region = getDefaultRegion();
    render(
      <MapExplorer
        region={region}
        events={[ev(), ev({ id: "b", title: "Dino Day" })]}
        generatedAt="2026-07-11T11:00:00.000Z"
      />
    );
    const [mapTab, listTab] = screen.getAllByRole("tab");
    fireEvent.click(listTab);
    expect(listTab).toHaveAttribute("aria-selected", "true");
    // Selecting from the list switches back to the map and opens the detail.
    fireEvent.click(screen.getByText("Dino Day"));
    expect(mapTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
