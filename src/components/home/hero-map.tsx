"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { loadMapLibre } from "@/lib/maplibre";
import type { GeoJSONSource, Map as MapLibre, Marker } from "maplibre-gl";
import { Bike, Check, ChefHat, ClipboardCheck, House, UtensilsCrossed } from "lucide-react";

/**
 * Démonstration du parcours d'une commande sur une vraie carte d'Abidjan : le trajet est calculé par le serveur de
 * trajets de Tchopi (Plateau → Cocody). Illustration du fonctionnement, sans commande ni restaurant réels.
 */
const FROM: [number, number] = [-4.017, 5.322];
const TO: [number, number] = [-3.987, 5.348];
const LOOP_MS = 15000;
const phases = [
  { until: 0.1, label: "Commande acceptée", icon: ClipboardCheck },
  { until: 0.3, label: "En préparation", icon: ChefHat },
  { until: 0.85, label: "En route vers vous", icon: Bike },
  { until: 1, label: "Livrée", icon: Check },
] as const;

type Line = [number, number][];

function cumulative(line: Line): number[] {
  const out = [0];
  for (let i = 1; i < line.length; i++) {
    const [x1, y1] = line[i - 1];
    const [x2, y2] = line[i];
    const dx = (x2 - x1) * Math.cos(((y1 + y2) / 2) * (Math.PI / 180));
    out.push(out[i - 1] + Math.hypot(dx, y2 - y1));
  }
  return out;
}

/** Point situé à la fraction t du trajet, et le tracé parcouru jusque-là. */
function along(line: Line, dist: number[], t: number): { point: [number, number]; done: Line } {
  const target = dist[dist.length - 1] * t;
  let i = dist.findIndex((d) => d >= target);
  if (i <= 0) return { point: line[0], done: [line[0]] };
  if (i === -1) i = line.length - 1;
  const k = (target - dist[i - 1]) / (dist[i] - dist[i - 1] || 1);
  const point: [number, number] = [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * k, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * k];
  return { point, done: [...line.slice(0, i), point] };
}

const pin = (html: string, className: string) => {
  const el = document.createElement("div");
  el.className = className;
  el.innerHTML = html;
  return el;
};

export function HeroMap() {
  const container = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(reduce ? 3 : 0);
  const [eta, setEta] = useState<number | null>(null);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let map: MapLibre | null = null;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    if (container.current) observer.observe(container.current);

    (async () => {
      const [lib, route] = await Promise.all([
        loadMapLibre(),
        fetch(`https://api.tchopi.com/route/v1/driving/${FROM.join(",")};${TO.join(",")}?overview=full&geometries=geojson`)
          .then((r) => r.json())
          .then((d) => ({ line: d.routes[0].geometry.coordinates as Line, minutes: Math.round(d.routes[0].duration / 60) }))
          .catch(() => ({ line: [FROM, TO] as Line, minutes: 10 })),
      ]);
      if (disposed || !container.current) return;
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      map = new lib.Map({
        container: container.current,
        style: `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`,
        bounds: [
          [Math.min(FROM[0], TO[0]), Math.min(FROM[1], TO[1])],
          [Math.max(FROM[0], TO[0]), Math.max(FROM[1], TO[1])],
        ],
        fitBoundsOptions: { padding: { top: 70, bottom: 150, left: 50, right: 50 } },
        interactive: false,
        attributionControl: { compact: true, customAttribution: "© OpenFreeMap © OpenStreetMap" },
      });
      const { line, minutes } = route;
      const dist = cumulative(line);
      const primary = dark ? "#3dd68c" : "#0b5d3b";

      map.on("load", () => {
        if (!map) return;
        map.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line } } });
        map.addSource("done", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [line[0]] } } });
        map.addLayer({ id: "route", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": primary, "line-width": 5, "line-opacity": 0.18 } });
        map.addLayer({ id: "done", type: "line", source: "done", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": primary, "line-width": 5 } });

        const icon = (svg: string) => `<div class="grid size-11 place-items-center rounded-full bg-[var(--surface)] text-[var(--ink)] shadow-lg ring-4 ring-[var(--surface)]/60">${svg}</div>`;
        const svg = (path: string) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
        new lib.Marker({ element: pin(icon(svg('<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/>')), "") })
          .setLngLat(line[0])
          .addTo(map);
        new lib.Marker({ element: pin(icon(svg('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>')), "") })
          .setLngLat(line[line.length - 1])
          .addTo(map);
        const courier: Marker = new lib.Marker({
          element: pin(
            `<div class="grid size-12 place-items-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] shadow-xl ring-4 ring-[var(--primary)]/25">${svg('<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>')}</div>`,
            "",
          ),
        })
          .setLngLat(line[0])
          .addTo(map);

        const show = (t: number) => {
          // Trajet entre 30 % et 85 % de la boucle ; immobile chez le restaurant avant, chez le client après.
          const travel = Math.min(1, Math.max(0, (t - 0.3) / 0.55));
          const eased = travel < 0.5 ? 2 * travel * travel : 1 - (-2 * travel + 2) ** 2 / 2;
          const { point, done } = along(line, dist, eased);
          courier.setLngLat(point);
          (map!.getSource("done") as GeoJSONSource).setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: done } });
          setPhase(phases.findIndex((p) => t <= p.until));
          setEta(t > 0.3 && t < 0.85 ? Math.max(1, Math.round(minutes * (1 - eased))) : null);
        };

        if (reduce) return show(1);
        const start = performance.now();
        let paused = 0;
        let last = start;
        const tick = (now: number) => {
          if (!visible) paused += now - last;
          last = now;
          if (visible) show((((now - start - paused) % LOOP_MS) + LOOP_MS) % LOOP_MS / LOOP_MS);
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      });
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      map?.remove();
    };
  }, [reduce]);

  const current = phases[Math.max(0, phase)];

  return (
    <div className="relative h-[380px] overflow-hidden rounded-[28px] border border-border bg-surface-alt shadow-float sm:h-[480px] lg:h-[540px]">
      <div ref={container} className="absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-surface/90 to-transparent" />
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold shadow-float backdrop-blur">
        <UtensilsCrossed className="size-3.5 text-primary" aria-hidden /> Plateau
        <span className="text-muted" aria-hidden>
          →
        </span>
        <House className="size-3.5 text-primary" aria-hidden /> Cocody
      </div>
      <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-surface/95 p-4 shadow-float backdrop-blur sm:right-auto sm:w-80" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current.label}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-on-primary"
            >
              <current.icon className="size-5" aria-hidden />
            </motion.span>
          </AnimatePresence>
          <div className="min-w-0">
            <p className="font-bold">{current.label}</p>
            <p className="text-xs text-muted">{eta ? `Arrivée dans environ ${eta} min` : "Suivi en direct, étape par étape"}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {phases.map((p, i) => (
            <span key={p.label} className={`h-1 rounded-full transition-colors duration-500 ${i <= phase ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
