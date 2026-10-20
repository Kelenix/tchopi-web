"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { loadMapLibre } from "@/lib/maplibre";
import type { Map as MapLibre, Marker } from "maplibre-gl";
import type { Point } from "./map-picker";

/** Position du livreur (mise à jour en direct) et point de livraison. */
export function CourierMap({ courier, dropoff }: { courier: Point | null; dropoff: Point | null }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const markers = useRef<{ courier?: Marker; dropoff?: Marker }>({});
  const lib = useRef<typeof import("maplibre-gl") | null>(null);

  const place = () => {
    const m = lib.current;
    if (!m || !map.current) return;
    for (const [key, point, color] of [
      ["courier", courier, "#16a34a"],
      ["dropoff", dropoff, "#0f1412"],
    ] as const) {
      if (!point) continue;
      markers.current[key] ??= new m.Marker({ color }).setLngLat([point.lng, point.lat]).addTo(map.current);
      markers.current[key]!.setLngLat([point.lng, point.lat]);
    }
    if (courier && dropoff) {
      map.current.fitBounds(
        [
          [Math.min(courier.lng, dropoff.lng), Math.min(courier.lat, dropoff.lat)],
          [Math.max(courier.lng, dropoff.lng), Math.max(courier.lat, dropoff.lat)],
        ],
        { padding: 60, maxZoom: 16, duration: 600 },
      );
    }
  };

  useEffect(() => {
    let disposed = false;
    loadMapLibre().then((m) => {
      if (disposed || !container.current) return;
      lib.current = m;
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      const start = courier ?? dropoff ?? { lat: 5.3364, lng: -4.0267 };
      map.current = new m.Map({
        container: container.current,
        style: `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`,
        center: [start.lng, start.lat],
        zoom: 14,
        attributionControl: { compact: true, customAttribution: "© OpenFreeMap © OpenMapTiles © OpenStreetMap" },
      });
      place();
    });
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(place);

  return <div ref={container} className="h-64 w-full overflow-hidden rounded-card border border-border" role="img" aria-label="Carte du livreur et du point de livraison" />;
}
