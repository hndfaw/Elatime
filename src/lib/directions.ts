import type { ElaEvent } from "./types";

/**
 * A universal "get directions" URL. The Google Maps directions endpoint opens
 * the native Maps app on iOS/Android and the web app on desktop, so it works
 * everywhere without an API key. We route to the exact coordinates (most
 * reliable), falling back to the address text when coordinates are absent.
 */
export function directionsUrl(event: Pick<ElaEvent, "location" | "address">): string {
  const base = "https://www.google.com/maps/dir/?api=1&destination=";
  if (event.location) {
    return `${base}${event.location.lat},${event.location.lng}`;
  }
  return `${base}${encodeURIComponent(event.address ?? "")}`;
}
