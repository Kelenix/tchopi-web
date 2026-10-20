"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bike, Check, ChefHat, ClipboardCheck, House, UtensilsCrossed } from "lucide-react";

/**
 * Parcours d'une commande, en vectoriel (aucune dépendance au navigateur : ni WebGL, ni tuiles) : le tracé est le vrai
 * itinéraire routier Plateau → Cocody calculé par le serveur de trajets de Tchopi. Illustration du fonctionnement.
 */
const FROM: [number, number] = [-4.017, 5.322];
const TO: [number, number] = [-3.987, 5.348];
const W = 640;
const H = 460;
const LOOP_MS = 14000;
const phases = [
  { until: 0.1, label: "Commande acceptée", icon: ClipboardCheck },
  { until: 0.28, label: "En préparation", icon: ChefHat },
  { until: 0.86, label: "En route vers vous", icon: Bike },
  { until: 1, label: "Livrée", icon: Check },
] as const;

type Line = [number, number][];

type Pt = [number, number];

/** Trajet géographique → points dans le cadre SVG (même échelle sur les deux axes, marges). */
function project(line: Line): Pt[] {
  const xs = line.map((p) => p[0]);
  const ys = line.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = 70;
  const k = Math.min((W - 2 * pad) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
  const ox = (W - (maxX - minX) * k) / 2;
  const oy = (H - (maxY - minY) * k) / 2;
  return line.map(([x, y]) => [ox + (x - minX) * k, oy + (maxY - y) * k]);
}

const toD = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Point situé à la fraction f de la longueur du tracé. */
function pointAt(pts: Pt[], f: number): { x: number; y: number } {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let left = seg.reduce((a, b) => a + b, 0) * f;
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i] || i === seg.length - 1) {
      const k = seg[i] ? Math.min(1, left / seg[i]) : 0;
      return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k };
    }
    left -= seg[i];
  }
  return { x: pts[0][0], y: pts[0][1] };
}

// Trajet de démonstration si le serveur de trajets ne répond pas.
const FALLBACK: Pt[] = [[90, 370], [180, 340], [250, 260], [300, 190], [380, 165], [470, 130], [560, 80]];

// Rues décoratives (fixes) pour évoquer la ville autour du trajet.
const streets = Array.from({ length: 16 }, (_, i) => {
  const t = i / 15;
  return i % 2
    ? `M${-20},${(t * H).toFixed(0)} C${W * 0.3},${(t * H + 40).toFixed(0)} ${W * 0.7},${(t * H - 30).toFixed(0)} ${W + 20},${(t * H + 10).toFixed(0)}`
    : `M${(t * W).toFixed(0)},-20 C${(t * W + 50).toFixed(0)},${H * 0.4} ${(t * W - 40).toFixed(0)},${H * 0.6} ${(t * W + 20).toFixed(0)},${H + 20}`;
});

export function RouteShowcase() {
  const reduce = useReducedMotion();
  const [pts, setPts] = useState<Pt[]>(FALLBACK);
  const [minutes, setMinutes] = useState(12);
  const [t, setT] = useState(reduce ? 1 : 0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`https://api.tchopi.com/route/v1/driving/${FROM.join(",")};${TO.join(",")}?overview=full&geometries=geojson`)
      .then((r) => r.json())
      .then((data) => {
        setPts(project(data.routes[0].geometry.coordinates as Line));
        setMinutes(Math.max(5, Math.round(data.routes[0].duration / 60)));
      })
      .catch(() => {
        // Trajet de démonstration conservé si le serveur ne répond pas.
      });
  }, []);

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    let visible = true;
    const observer = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (box.current) observer.observe(box.current);
    let elapsed = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (visible) elapsed += now - last;
      last = now;
      if (visible) setT((elapsed % LOOP_MS) / LOOP_MS);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reduce]);

  const travel = Math.min(1, Math.max(0, (t - 0.28) / 0.58));
  const eased = travel < 0.5 ? 2 * travel * travel : 1 - (-2 * travel + 2) ** 2 / 2;
  const phase = phases.findIndex((p) => t <= p.until);
  const current = phases[Math.max(0, phase)];
  const d = useMemo(() => toD(pts), [pts]);
  const pos = pointAt(pts, eased);
  const ends = { a: pointAt(pts, 0), b: pointAt(pts, 1) };

  return (
    <div ref={box} className="relative overflow-hidden rounded-[32px] bg-[radial-gradient(120%_90%_at_70%_10%,#173326,#0b0f0d_70%)] ring-1 ring-white/10">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Trajet d'un livreur du restaurant au client">
        <defs>
          <linearGradient id="route" x1="0" x2="1">
            <stop offset="0" stopColor="#3dd68c" />
            <stop offset="1" stopColor="#ffb35c" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {streets.map((s, i) => (
          <path key={i} d={s} fill="none" stroke="white" strokeOpacity={i % 3 ? 0.05 : 0.09} strokeWidth={i % 3 ? 6 : 10} strokeLinecap="round" />
        ))}
        <path d={d} fill="none" stroke="white" strokeOpacity="0.14" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <motion.path
          d={d}
          fill="none"
          stroke="url(#route)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          style={{ pathLength: eased }}
        />
        {ends && (
          <>
            {[ends.a, ends.b].map((p, i) => (
              <g key={i} transform={`translate(${p.x},${p.y})`}>
                <circle r="22" fill={i ? "#ffb35c" : "#3dd68c"} opacity="0.18">
                  {!reduce && <animate attributeName="r" values="16;30;16" dur="2.4s" repeatCount="indefinite" />}
                </circle>
                <circle r="11" fill={i ? "#ffb35c" : "#3dd68c"} stroke="#0b0f0d" strokeWidth="3" />
              </g>
            ))}
          </>
        )}
        {pos && (
          <g transform={`translate(${pos.x},${pos.y})`} filter="url(#glow)">
            <circle r="17" fill="#3dd68c" />
            <path d="M-7 4a3 3 0 1 0 0.1 0M7 4a3 3 0 1 0 0.1 0M-1 4V0l-3-3 4-3 2 3h2" fill="none" stroke="#06281a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>

      <div className="glass absolute left-4 top-4 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white">
        <UtensilsCrossed className="size-3.5 text-[#3dd68c]" aria-hidden /> Plateau
        <span className="text-white/50" aria-hidden>
          →
        </span>
        <House className="size-3.5 text-[#ffb35c]" aria-hidden /> Cocody
      </div>
      <div className="glass absolute inset-x-4 bottom-4 rounded-3xl p-4 text-white sm:left-auto sm:w-80" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current.label}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="grid size-10 place-items-center rounded-full bg-[#3dd68c] text-[#06281a]"
            >
              <current.icon className="size-5" aria-hidden />
            </motion.span>
          </AnimatePresence>
          <div>
            <p className="font-bold">{current.label}</p>
            <p className="text-xs text-white/65">
              {t > 0.28 && t < 0.86 ? `Arrivée dans environ ${Math.max(1, Math.round(minutes * (1 - eased)))} min` : "Suivi en direct, étape par étape"}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {phases.map((p, i) => (
            <span key={p.label} className={`h-1 rounded-full transition-colors duration-500 ${i <= phase ? "bg-[#3dd68c]" : "bg-white/20"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
