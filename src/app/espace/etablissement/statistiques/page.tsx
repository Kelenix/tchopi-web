"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { counted, useEstablishment } from "@/lib/establishment";
import { formatMoney } from "@/lib/format";
import { statusLabel, type OrderStatus } from "@/lib/orders";
import { browserClient } from "@/lib/supabase";

type Sold = { name: string; quantity: number; line_total: number };
const periods = [7, 30] as const;

export default function StatsPage() {
  const { id, orders } = useEstablishment();
  const [days, setDays] = useState<(typeof periods)[number]>(7);
  const [sold, setSold] = useState<{ key: string; rows: Sold[] } | null>(null);
  const since = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1));
    return d;
  }, [days]);
  const key = `${id}-${days}`;

  // Produits vendus sur la période (commandes livrées), lus avec les droits du gérant.
  useEffect(() => {
    let alive = true;
    browserClient()
      .from("order_items")
      .select("name, quantity, line_total, orders!inner(restaurant_id, status, created_at)")
      .eq("orders.restaurant_id", id)
      .eq("orders.status", "delivered")
      .gte("orders.created_at", since.toISOString())
      .limit(5000)
      .then(({ data }) => alive && setSold({ key, rows: (data ?? []) as unknown as Sold[] }));
    return () => {
      alive = false;
    };
  }, [id, since, key]);

  const inPeriod = (orders ?? []).filter((o) => new Date(o.created_at) >= since);
  const valid = counted(inPeriod);
  const sales = valid.reduce((n, o) => n + o.subtotal, 0);
  const commission = valid.reduce((n, o) => n + o.commission_amount, 0);
  const byStatus = Object.entries(
    inPeriod.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const perDay = Array.from({ length: days }, (_, i) => {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
    const total = valid.filter((o) => new Date(o.created_at).toDateString() === d.toDateString()).reduce((n, o) => n + o.subtotal, 0);
    return { label, total };
  });
  const max = Math.max(1, ...perDay.map((d) => d.total));
  const top = Object.values(
    (sold?.key === key ? sold.rows : []).reduce<Record<string, Sold>>((acc, r) => {
      const name = r.name.replace(/ \(.*\)$/, "");
      acc[name] = { name, quantity: (acc[name]?.quantity ?? 0) + r.quantity, line_total: (acc[name]?.line_total ?? 0) + r.line_total };
      return acc;
    }, {}),
  )
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Statistiques</h1>
        <div role="tablist" aria-label="Période" className="flex gap-1 rounded-full bg-surface-alt p-1">
          {periods.map((p) => (
            <button key={p} role="tab" aria-selected={days === p} onClick={() => setDays(p)} className={`h-9 rounded-full px-4 text-sm font-semibold ${days === p ? "bg-surface shadow-float" : "text-muted"}`}>
              {p} jours
            </button>
          ))}
        </div>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Commandes", String(valid.length)],
          ["Ventes", formatMoney(sales)],
          ["Commission", formatMoney(commission)],
          ["Panier moyen", formatMoney(valid.length ? Math.round(sales / valid.length) : 0)],
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="tabular mt-1 text-2xl font-extrabold">{orders ? value : "…"}</p>
          </Card>
        ))}
      </section>

      <Card className="mt-6 p-6">
        <h2 className="font-bold">Ventes par jour</h2>
        <p className="text-sm text-muted">Montant des produits, commandes ni refusées ni annulées.</p>
        <div className="mt-6 flex h-48 items-end gap-1.5 border-b border-border" role="img" aria-label="Ventes par jour, détail dans le tableau ci-dessous">
          {perDay.map((d) => (
            <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className="rounded-t bg-primary transition-opacity group-hover:opacity-80"
                style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total ? 4 : 0 }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-chip bg-ink px-2 py-1 text-xs font-semibold text-on-ink group-hover:block">
                {d.label} · <span className="tabular">{formatMoney(d.total)}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 text-[10px] text-muted">
          {perDay.map((d, i) => (
            <span key={d.label} className="flex-1 truncate text-center">
              {days === 7 || i % 5 === 0 ? d.label : ""}
            </span>
          ))}
        </div>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold text-muted">Voir le tableau</summary>
          <table className="mt-3 w-full">
            <tbody>
              {perDay.map((d) => (
                <tr key={d.label} className="border-b border-border">
                  <td className="py-1.5">{d.label}</td>
                  <td className="tabular py-1.5 text-right">{formatMoney(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-bold">Produits les plus vendus</h2>
          <p className="text-sm text-muted">Commandes livrées sur la période.</p>
          {top.length ? (
            <ol className="mt-4 space-y-2">
              {top.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3 text-sm">
                  <span className="tabular w-5 text-muted">{i + 1}</span>
                  <span className="flex-1 truncate font-semibold">{p.name}</span>
                  <span className="tabular text-muted">× {p.quantity}</span>
                  <span className="tabular w-24 text-right">{formatMoney(p.line_total)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-muted">Aucune commande livrée sur la période.</p>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="font-bold">Commandes par statut</h2>
          {byStatus.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {byStatus.map(([status, n]) => (
                <li key={status} className="flex justify-between gap-3">
                  <span>{statusLabel(status as OrderStatus)}</span>
                  <span className="tabular font-semibold">{n}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">Aucune commande sur la période.</p>
          )}
        </Card>
      </div>
    </>
  );
}
