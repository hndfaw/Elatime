"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { ElaEvent, Region } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/format";

interface RealMapProps {
  region: Region;
  events: ElaEvent[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

/** [south, west] – [north, east] bounds for Leaflet from a region. */
function regionBounds(region: Region): L.LatLngBoundsExpression {
  const b = region.bounds;
  return [
    [b.south, b.west],
    [b.north, b.east],
  ];
}

/** A colored teardrop divIcon per category (avoids Leaflet's image-asset icons). */
function markerIcon(event: ElaEvent): L.DivIcon {
  const color = CATEGORY_COLORS[event.category] ?? "#9aa5b1";
  return L.divIcon({
    className: "ela-marker",
    html: `<span style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/**
 * Imperatively manages a leaflet.markercluster group of event markers. Kept
 * outside React's render tree because markercluster is imperative; rebuilt when
 * the event set changes.
 */
function ClusterLayer({
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
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
    });

    for (const event of events) {
      const marker = L.marker([event.location.lat, event.location.lng], {
        icon: markerIcon(event),
        title: `${event.title} — ${CATEGORY_LABELS[event.category]}`,
        alt: event.title,
      });
      marker.on("click", () => onSelect?.(event.id));
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

/**
 * Real interactive map: OpenStreetMap raster tiles via Leaflet, with
 * zoom-aware marker clustering. Open-source and key-free.
 */
export default function RealMap({ region, events, selectedId, onSelect }: RealMapProps) {
  return (
    <MapContainer
      bounds={regionBounds(region)}
      scrollWheelZoom
      className="h-full w-full rounded-2xl"
      aria-label={`Map of kid-friendly events in ${region.name}, ${region.state}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ClusterLayer events={events} onSelect={onSelect} />
      <PanToSelected events={events} selectedId={selectedId} />
    </MapContainer>
  );
}
