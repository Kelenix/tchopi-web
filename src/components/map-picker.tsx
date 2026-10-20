"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibre } from "maplibre-gl";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { fieldClass } from "./ui";

export type Point = { lat: number; lng: number };
type Place = { name: string; detail: string; point: Point };

const styles = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

/** Recherche de lieux en Côte d'Ivoire (Photon, OpenStreetMap), comme l'app mobile ; vide si le service ne répond pas. */
async function searchPlaces(query: string, near: Point): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, lat: String(near.lat), lon: String(near.lng), bbox: "-8.61,4.34,-2.49,10.74", limit: "8" });
  try {
    const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: AbortSignal.timeout(6000) });
    const body = (await res.json()) as { features: { properties: Record<string, string>; geometry: { coordinates: [number, number] } }[] };
    return body.features
      .filter((f) => f.properties.name)
      .map((f) => ({
        name: f.properties.name,
        detail: [...new Set([f.properties.district ?? f.properties.locality, f.properties.city ?? f.properties.county].filter((x) => x && x !== f.properties.name))].join(", "),
        point: { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] },
      }));
  } catch {
    return [];
  }
}

/** Carte à épingle centrale : le point de livraison est le centre de la carte (déplacer, chercher, ma position). */
export function MapPicker({ initial, onChange }: { initial: Point; onChange: (p: Point) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const changed = useRef(onChange);
  useEffect(() => {
    changed.current = onChange;
  });

  useEffect(() => {
    let disposed = false;
    import("maplibre-gl").then(({ Map, NavigationControl }) => {
      if (disposed || !container.current) return;
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      const m = new Map({
        container: container.current,
        style: dark ? styles.dark : styles.light,
        center: [initial.lng, initial.lat],
        zoom: 15,
        attributionControl: { compact: true, customAttribution: "© OpenFreeMap © OpenMapTiles © OpenStreetMap" },
      });
      m.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
      m.on("moveend", () => {
        const c = m.getCenter();
        changed.current({ lat: c.lat, lng: c.lng });
      });
      map.current = m;
    });
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
    // La carte est créée une fois ; ses déplacements remontent par onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flyTo = (p: Point) => map.current?.flyTo({ center: [p.lng, p.lat], zoom: 16 });

  return (
    <div className="space-y-2">
      <form
        className="relative"
        onSubmit={async (e) => {
          e.preventDefault();
          if (query.trim().length < 2) return;
          const c = map.current?.getCenter();
          setPlaces(await searchPlaces(query.trim(), c ? { lat: c.lat, lng: c.lng } : initial));
        }}
      >
        <Search className="absolute left-4 top-3.5 size-4 text-muted" aria-hidden />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher un quartier, un carrefour, un commerce…" aria-label="Chercher un lieu" className={`${fieldClass} pl-10`} />
        {places && (
          <ul className="absolute inset-x-0 top-12 z-20 max-h-64 overflow-y-auto rounded-field border border-border bg-surface shadow-float">
            {places.length === 0 && <li className="px-4 py-3 text-sm text-muted">Aucun lieu trouvé : déplacez la carte jusqu&apos;au point voulu.</li>}
            {places.map((p, i) => (
              <li key={i}>
                <button type="button" onClick={() => (flyTo(p.point), setPlaces(null))} className="w-full px-4 py-2.5 text-left hover:bg-surface-alt">
                  <span className="block text-sm font-semibold">{p.name}</span>
                  {p.detail && <span className="block text-xs text-muted">{p.detail}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
      <div className="relative h-72 overflow-hidden rounded-card border border-border sm:h-80">
        <div ref={container} className="size-full" />
        <MapPin className="pointer-events-none absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-full fill-primary text-on-primary drop-shadow" aria-hidden />
        <button
          type="button"
          onClick={() => {
            setLocError(null);
            navigator.geolocation.getCurrentPosition(
              (pos) => flyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => setLocError("Position indisponible : autorisez la localisation ou déplacez la carte."),
              { enableHighAccuracy: true, timeout: 10000 },
            );
          }}
          className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-float"
        >
          <LocateFixed className="size-4 text-primary" aria-hidden /> Ma position
        </button>
      </div>
      {locError && <p className="text-xs text-danger">{locError}</p>}
      <p className="text-xs text-muted">Placez l&apos;épingle exactement sur le lieu de livraison.</p>
    </div>
  );
}
