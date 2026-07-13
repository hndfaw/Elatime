"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { ElaEvent, GeoPoint, Region } from "@/lib/types";
import { CATEGORY_COLORS, formatWhen } from "@/lib/format";
import { groupByVenue, dominantCategory, type Venue } from "@/lib/venues";

interface RealMapProps {
  region: Region;
  events: ElaEvent[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  userLocation?: GeoPoint | null;
}

/** [south, west] – [north, east] bounds for Leaflet from a region. */
function regionBounds(region: Region): L.LatLngBoundsExpression {
  const b = region.bounds;
  return [
    [b.south, b.west],
    [b.north, b.east],
  ];
}

/** Minimal HTML-escape for scraped text placed into marker tooltips/popups. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A per-venue icon: a category dot for single events, a count badge otherwise. */
function venueIcon(venue: Venue): L.DivIcon {
  if (venue.events.length === 1) {
    const color = CATEGORY_COLORS[venue.events[0].category] ?? "#9aa5b1";
    return L.divIcon({
      className: "ela-marker",
      html: `<span style="background:${color}"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }
  const color = CATEGORY_COLORS[dominantCategory(venue.events)] ?? "#ff6b6b";
  const n = venue.events.length;
  const size = n < 10 ? 30 : n < 50 ? 38 : 46;
  return L.divIcon({
    className: "ela-venue",
    html: `<div style="background:${color}">${n}</div>`,
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
}

function tooltipHtml(venue: Venue): string {
  const n = venue.events.length;
  const addr = venue.address ? `<span class="ela-tip-addr">${esc(venue.address)}</span>` : "";
  return `<strong>${esc(venue.label)}</strong>${addr}<span class="ela-tip-n">${n} event${n === 1 ? "" : "s"}</span>`;
}

function popupHtml(venue: Venue): string {
  const rows = venue.events
    .map((e) => {
      const color = CATEGORY_COLORS[e.category] ?? "#9aa5b1";
      return `<button type="button" data-eid="${esc(e.id)}" class="ela-pop-row">
        <span class="ela-pop-dot" style="background:${color}"></span>
        <span class="ela-pop-body">
          <span class="ela-pop-title">${esc(e.title)}</span>
          <span class="ela-pop-when">${esc(formatWhen(e.startsAt, e.endsAt))}</span>
        </span></button>`;
    })
    .join("");
  return `<div class="ela-pop"><div class="ela-pop-head">${esc(venue.label)}</div>${rows}</div>`;
}

/**
 * Imperatively manages a leaflet.markercluster group of VENUE markers (one pin
 * per physical place). Tooltips name the place + address; popups list that
 * place's events. Rebuilt when the event set changes.
 */
function VenueLayer({
  events,
  onSelect,
}: {
  events: ElaEvent[];
  onSelect?: (id: string | null) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 46,
      spiderfyOnMaxZoom: false,
      chunkedLoading: true,
      // Cluster badge sums the events across the venues it contains.
      iconCreateFunction: (cluster) => {
        const count = cluster
          .getAllChildMarkers()
          .reduce((sum, m) => sum + ((m.options as { eventCount?: number }).eventCount ?? 1), 0);
        const size = count < 10 ? 36 : count < 50 ? 44 : 54;
        const tier =
          count < 10 ? "ela-cluster-sm" : count < 50 ? "ela-cluster-md" : "ela-cluster-lg";
        return L.divIcon({
          html: `<div>${count}</div>`,
          className: `ela-cluster ${tier}`,
          iconSize: L.point(size, size),
        });
      },
    });

    for (const venue of groupByVenue(events)) {
      const marker = L.marker([venue.location.lat, venue.location.lng], {
        icon: venueIcon(venue),
        eventCount: venue.events.length,
      } as L.MarkerOptions & { eventCount: number });

      marker.bindTooltip(tooltipHtml(venue), {
        direction: "top",
        offset: [0, -8],
        className: "ela-tip",
        opacity: 1,
      });

      if (venue.events.length === 1) {
        marker.on("click", () => onSelect?.(venue.events[0].id));
      } else {
        marker.bindPopup(popupHtml(venue), { className: "ela-popup", maxHeight: 240, minWidth: 230 });
        marker.on("popupopen", (e) => {
          const el = e.popup.getElement();
          el?.querySelectorAll<HTMLElement>("[data-eid]").forEach((node) => {
            node.addEventListener("click", () => {
              onSelect?.(node.getAttribute("data-eid"));
              marker.closePopup();
            });
          });
        });
      }
      group.addLayer(marker);
    }

    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, events, onSelect]);

  return null;
}

/** Pan to the selected event when it changes. */
function PanToSelected({
  events,
  selectedId,
}: {
  events: ElaEvent[];
  selectedId?: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const ev = events.find((e) => e.id === selectedId);
    if (!ev) return;
    map.panTo([ev.location.lat, ev.location.lng], { animate: true });
  }, [map, events, selectedId]);
  return null;
}

/** A "you are here" marker + one-time recenter when the user shares location. */
function UserLayer({ userLocation }: { userLocation?: GeoPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!userLocation) return;
    const marker = L.marker([userLocation.lat, userLocation.lng], {
      icon: L.divIcon({ className: "ela-me", html: "<span></span>", iconSize: [22, 22], iconAnchor: [11, 11] }),
      title: "You are here",
      interactive: false,
      keyboard: false,
    });
    marker.addTo(map);
    map.setView([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 11), {
      animate: true,
    });
    return () => {
      map.removeLayer(marker);
    };
  }, [map, userLocation]);
  return null;
}

/**
 * Real interactive map: OpenStreetMap raster tiles via Leaflet, with venue-level
 * markers (named places), clustering, and an optional "you are here" pin.
 * Open-source and key-free.
 */
export default function RealMap({
  region,
  events,
  selectedId,
  onSelect,
  userLocation,
}: RealMapProps) {
  return (
    <MapContainer
      bounds={regionBounds(region)}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full rounded-3xl"
      aria-label={`Map of kid-friendly events in ${region.name}, ${region.state}`}
    >
      {/* Top-right so it never collides with the event detail popover. */}
      <ZoomControl position="topright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <VenueLayer events={events} onSelect={onSelect} />
      <PanToSelected events={events} selectedId={selectedId} />
      <UserLayer userLocation={userLocation} />
    </MapContainer>
  );
}
