"use client";

import { useState, type ReactNode } from "react";
import { Card, fieldClass } from "@/components/ui";
import { periodChoices, presetPeriod, type Period } from "@/lib/period";

/**
 * Graphiques des statistiques admin, en SVG sans dépendance : colonnes fines à bout arrondi, grille discrète, info-bulle
 * au survol (ou au toucher) et vue tableau. Une série = une couleur, sans légende ; plusieurs séries = légende.
 */
export type Series = { key: string; label: string; color: string };
export type Point = { label: string; values: Record<string, number | string> };

const W = 460;
const H = 240;
const PAD = { top: 12, right: 6, bottom: 28, left: 64 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v)!;
}

/** Colonnes (empilées s'il y a plusieurs séries). */
export function ColumnChart({ title, series, points, format }: { title: string; series: Series[]; points: Point[]; format: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const totals = points.map((p) => series.reduce((s, x) => s + (Number(p.values[x.key] ?? 0)), 0));
  const max = niceMax(Math.max(0, ...totals));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / Math.max(1, points.length);
  const barW = Math.max(2, Math.min(28, step * 0.62));
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const every = Math.ceil(points.length / 6);
  const empty = totals.every((t) => t === 0);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        <button type="button" onClick={() => setTable(!table)} className="text-xs font-semibold text-muted underline-offset-2 hover:text-ink hover:underline">
          {table ? "Voir le graphique" : "Voir le tableau"}
        </button>
      </div>
      {series.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      {table ? (
        <div className="mt-3 max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1.5">Période</th>
                {series.map((s) => (
                  <th key={s.key} className="py-1.5 text-right">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-border">
              {points.map((p) => (
                <tr key={p.label}>
                  <td className="py-1.5">{p.label}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-1.5 text-right">
                      {format(Number(p.values[s.key] ?? 0))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(max * f)} y2={y(max * f)} stroke="var(--border)" strokeWidth="1" />
                <text x={PAD.left - 8} y={y(max * f) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">
                  {format(max * f)}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const cx = PAD.left + step * i + step / 2;
              let base = 0;
              return (
                <g key={p.label} opacity={hover === null || hover === i ? 1 : 0.45}>
                  {series.map((s, k) => {
                    const v = Number(p.values[s.key] ?? 0);
                    if (!v) return null;
                    const top = y(base + v);
                    // 2 px de surface entre segments empilés ; bout arrondi seulement sur le segment du haut.
                    const h = Math.max(1, y(base) - top - (base ? 2 : 0));
                    base += v;
                    const last = series.slice(k + 1).every((n) => !Number(p.values[n.key] ?? 0));
                    const r = last ? Math.min(4, barW / 2, h) : 0;
                    return (
                      <path
                        key={s.key}
                        d={`M${cx - barW / 2},${top + h} V${top + r} q0,-${r} ${r},-${r} H${cx + barW / 2 - r} q${r},0 ${r},${r} V${top + h} Z`}
                        fill={s.color}
                      />
                    );
                  })}
                  {i % every === 0 && (
                    <text x={cx} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">
                      {p.label}
                    </text>
                  )}
                  <rect x={cx - step / 2} y={PAD.top} width={step} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
                </g>
              );
            })}
          </svg>
          {empty && <p className="absolute inset-0 grid place-items-center text-sm text-muted">Aucune donnée sur la période.</p>}
          {hover !== null && !empty && (
            <div
              className="pointer-events-none absolute top-0 z-10 min-w-36 -translate-x-1/2 rounded-field border border-border bg-surface px-3 py-2 text-xs shadow-float"
              style={{ left: `${((PAD.left + step * hover + step / 2) / W) * 100}%` }}
            >
              <p className="font-bold">{points[hover].label}</p>
              {series.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-muted">
                    {series.length > 1 && <span className="size-2 rounded-sm" style={{ background: s.color }} aria-hidden />}
                    {s.label}
                  </span>
                  <span className="tabular font-semibold">{format(Number(points[hover].values[s.key] ?? 0))}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** Barres horizontales classées (une seule mesure : une couleur), valeurs écrites à droite. */
export function BarList({ title, rows, format, empty }: { title: string; rows: { label: string; value: number; sub?: string }[]; format: (n: number) => string; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="p-5">
      <h3 className="font-bold">{title}</h3>
      {rows.length ? (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate font-semibold">{r.label}</span>
                <span className="tabular shrink-0">{format(r.value)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-surface-alt">
                <div className="h-2 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: "var(--series-1)" }} />
              </div>
              {r.sub && <p className="mt-0.5 text-xs text-muted">{r.sub}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      )}
    </Card>
  );
}

/** Chiffre clé. */
export function Kpi({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="tabular mt-1 text-2xl font-extrabold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

/** Filtre de période, au-dessus des graphiques : préréglages et dates libres. */
export function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="tablist" aria-label="Période" className="flex gap-1 overflow-x-auto rounded-full bg-surface-alt p-1">
        {periodChoices.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={value.key === key}
            onClick={() => onChange(key === "custom" ? { ...value, key } : presetPeriod(key))}
            className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold ${value.key === key ? "bg-surface shadow-float" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {value.key === "custom" && (
        <span className="flex items-center gap-2 text-sm">
          <input type="date" aria-label="Du" value={value.from} max={value.to} onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })} className={`${fieldClass} h-9 w-auto`} />
          <span className="text-muted">au</span>
          <input type="date" aria-label="Au" value={value.to} min={value.from} onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })} className={`${fieldClass} h-9 w-auto`} />
        </span>
      )}
    </div>
  );
}
