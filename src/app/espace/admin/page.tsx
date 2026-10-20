"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Bike, Store } from "lucide-react";
import { Card } from "@/components/ui";
import { orderAlerts, supervisedStatuses, type PlatformSettings } from "@/lib/admin";
import { formatMoney } from "@/lib/format";
import { statusLabel, type Order, type OrderStatus } from "@/lib/orders";
import { browserClient } from "@/lib/supabase";

type Stats = {
  orders: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  revenue: number;
  delivery_fees: number;
  commissions: number;
  courier_earnings: number;
  platform: number;
  cash_to_reconcile: number;
  refunds_pending: number;
  couriers_online: number;
};
const periods = [
  [1, "Aujourd'hui"],
  [7, "7 jours"],
  [30, "30 jours"],
] as const;

export default function AdminDashboard() {
  const db = browserClient();
  const [days, setDays] = useState<1 | 7 | 30>(1);
  const [stats, setStats] = useState<{ days: number; value: Stats | null } | null>(null);
  const [todo, setTodo] = useState<{ alerts: number; partners: number; couriers: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));
    db.rpc("admin_stats", { p_from: from.toISOString(), p_to: new Date(Date.now() + 60_000).toISOString() }).then(
      ({ data }) => alive && setStats({ days, value: data as Stats | null }),
    );
    return () => {
      alive = false;
    };
  }, [db, days]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      db.from("orders").select("*").in("status", supervisedStatuses).limit(200),
      db.from("settings").select().single(),
      db.from("restaurants").select("id", { count: "exact", head: true }).eq("review_status", "pending"),
      db.from("couriers").select("user_id", { count: "exact", head: true }).eq("status", "pending"),
    ]).then(([o, s, p, c]) => {
      if (!alive) return;
      const now = Date.now();
      const alerts = ((o.data ?? []) as Order[]).filter((x) => orderAlerts(x, s.data as PlatformSettings, now).length).length;
      setTodo({ alerts, partners: p.count ?? 0, couriers: c.count ?? 0 });
    });
    return () => {
      alive = false;
    };
  }, [db]);

  const s = stats?.days === days ? stats.value : null;

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Administration</h1>
      <ul className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          { href: "/espace/admin/commandes", icon: AlertTriangle, n: todo?.alerts, label: "commande(s) à traiter" },
          { href: "/espace/admin/etablissements?onglet=a-valider", icon: Store, n: todo?.partners, label: "restaurant(s) à valider" },
          { href: "/espace/admin/livreurs", icon: Bike, n: todo?.couriers, label: "livreur(s) à valider" },
        ].map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className={`flex items-center gap-3 rounded-card border p-4 font-semibold transition hover:shadow-float ${t.n ? "border-warning bg-warning-soft text-warning" : "border-border bg-surface"}`}
            >
              <t.icon className="size-5" aria-hidden />
              <span className="tabular text-xl font-extrabold">{t.n ?? "…"}</span> {t.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold">Indicateurs</h2>
        <div role="tablist" aria-label="Période" className="flex gap-1 rounded-full bg-surface-alt p-1">
          {periods.map(([d, label]) => (
            <button key={d} role="tab" aria-selected={days === d} onClick={() => setDays(d)} className={`h-9 rounded-full px-4 text-sm font-semibold ${days === d ? "bg-surface shadow-float" : "text-muted"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Commandes", s ? String(s.orders) : "…"],
            ["Chiffre d'affaires", s ? formatMoney(s.revenue) : "…"],
            ["Frais de livraison", s ? formatMoney(s.delivery_fees) : "…"],
            ["Commissions", s ? formatMoney(s.commissions) : "…"],
            ["Rémunération livreurs", s ? formatMoney(s.courier_earnings) : "…"],
            ["Part de la plateforme", s ? formatMoney(s.platform) : "…"],
            ["Espèces à rapprocher", s ? formatMoney(s.cash_to_reconcile) : "…"],
            ["Livreurs en ligne", s ? String(s.couriers_online) : "…"],
          ] as const
        ).map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="tabular mt-1 text-2xl font-extrabold">{value}</p>
          </Card>
        ))}
      </section>
      {s && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="font-bold">Commandes par statut</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {Object.entries(s.by_status).map(([k, n]) => (
                <li key={k} className="flex justify-between">
                  <span>{statusLabel(k as OrderStatus)}</span>
                  <span className="tabular font-semibold">{n}</span>
                </li>
              ))}
              {!Object.keys(s.by_status).length && <li className="text-muted">Aucune commande sur la période.</li>}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-bold">Remboursements</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li className="flex justify-between">
                <span>Remboursements en attente</span>
                <span className="tabular font-semibold">{s.refunds_pending}</span>
              </li>
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
