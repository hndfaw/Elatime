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
    // Map is present
    expect(screen.getByRole("img", { name: /Map of kid-friendly events/i })).toBeInTheDocument();
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
});
