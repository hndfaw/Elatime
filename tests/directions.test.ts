import { describe, it, expect } from "vitest";
import { directionsUrl } from "@/lib/directions";

describe("directionsUrl", () => {
  it("routes to the event's coordinates", () => {
    const url = directionsUrl({
      location: { lat: 26.6406, lng: -81.8723 },
      address: "2200 Second St, Fort Myers, FL",
    });
    expect(url).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=26.6406,-81.8723"
    );
  });
});
