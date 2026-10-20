"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Bike, Store, Wallet } from "lucide-react";
import { BarList, ColumnChart, Kpi, PeriodPicker } from "@/components/admin-charts";
import { Card } from "@/components/ui";
import { orderAlerts, supervisedStatuses, useAdminRpc, type PlatformSettings } from "@/lib/admin";
import { formatMoney } from "@/lib/format";
import { paymentMethodLabel, statusLabel, type Order, type OrderStatus, type PaymentMethod } from "@/lib/orders";
import { bucketLabel, periodRange, presetPeriod, type Period } from "@/lib/period";
import { browserClient } from "@/lib/supabase";

type Dashboard = {
  users: { total: number; new: number; suspended: number };
  restaurants: { total: number; active: number; pending: number };
  couriers: { total: number; approved: number; pending: number; online: number };
  orders: { total: number; in_progress: number; delivered: number; cancelled: number; by_status: Record<string, number> };
  money: { revenue: number; subtotal: number; delivery_fees: number; commissions: number; courier_earnings: number; platform: number; average_basket: number; average_distance_m: number };
  by_method: { method: PaymentMethod; orders: number; amount: number }[];
  by_zone: { zone_id: string; city: string; name: string; orders: number; delivered: number; revenue: number }[];
  top_restaurants: { id: string; name: string; orders: number; revenue: number }[];
  series: { bucket: string; orders: number; delivered: number; cancelled: number; revenue: number }[];
  todo: { cash_to_reconcile: number; refunds_pending: number };
};

const count = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

/** Tableau de bord admin : tout est calculé par le serveur (admin_dashboard) sur les données réelles de la période. */
export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>(() => presetPeriod("week"));
  const range = periodRange(period);
  const d = useAdminRpc<Dashboard>("admin_dashboard", range);
  const alerts = useAlertCount();

  const pts = (d?.series ?? []).map((s) => ({ label: bucketLabel(s.bucket, range.p_bucket), values: s }));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">Tableau de bord</h1>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/espace/admin/commandes", icon: AlertTriangle, n: alerts, label: "commande(s) à traiter" },
          { href: "/espace/admin/etablissements?onglet=a-valider", icon: Store, n: d?.restaurants.pending, label: "restaurant(s) à valider" },
          { href: "/espace/admin/livreurs", icon: Bike, n: d?.couriers.pending, label: "livreur(s) à valider" },
          { href: "/espace/admin/paiements", icon: Wallet, n: d?.todo.refunds_pending, label: "remboursement(s) en attente" },
        ].map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className={`flex items-center gap-3 rounded-card border p-4 text-sm font-semibold transition hover:shadow-float ${t.n ? "border-warning bg-warning-soft text-warning" : "border-border bg-surface"}`}
            >
              <t.icon className="size-5 shrink-0" aria-hidden />
              <span className="tabular text-xl font-extrabold">{t.n ?? "…"}</span> {t.label}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl font-extrabold">Plateforme</h2>
      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Utilisateurs" value={d ? count(d.users.total) : "…"} sub={d && `${count(d.users.new)} nouveaux sur la période`} />
        <Kpi label="Restaurants actifs" value={d ? count(d.restaurants.active) : "…"} sub={d && `${count(d.restaurants.total)} inscrits`} />
        <Kpi label="Livreurs approuvés" value={d ? count(d.couriers.approved) : "…"} sub={d && `${count(d.couriers.total)} inscrits · ${count(d.couriers.online)} en ligne`} />
        <Kpi label="Espèces à reverser" value={d ? formatMoney(d.todo.cash_to_reconcile) : "…"} sub="Encaissées par les livreurs, dues à la plateforme" />
      </section>

      <h2 className="mt-10 text-xl font-extrabold">Commandes et chiffre d&apos;affaires</h2>
      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Commandes" value={d ? count(d.orders.total) : "…"} sub={d && `${count(d.orders.in_progress)} en cours`} />
        <Kpi label="Livrées" value={d ? count(d.orders.delivered) : "…"} sub={d && `${count(d.orders.cancelled)} annulées ou refusées`} />
        <Kpi label="Volume livré" value={d ? formatMoney(d.money.revenue) : "…"} sub={d && `Panier moyen ${formatMoney(d.money.average_basket)}`} />
        <Kpi label="Part de la plateforme" value={d ? formatMoney(d.money.platform) : "…"} sub={d && `Commissions ${formatMoney(d.money.commissions)}`} />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ColumnChart
          title="Commandes livrées et annulées"
          series={[
            { key: "delivered", label: "Livrées", color: "var(--series-1)" },
            { key: "cancelled", label: "Annulées ou refusées", color: "var(--series-2)" },
          ]}
          points={pts}
          format={count}
        />
        <ColumnChart title="Chiffre d'affaires livré" series={[{ key: "revenue", label: "Chiffre d'affaires", color: "var(--series-1)" }]} points={pts} format={formatMoney} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <BarList
          title="Par ville"
          rows={(d?.by_zone ?? []).map((z) => ({ label: z.city, value: z.orders, sub: `${count(z.delivered)} livrées · ${formatMoney(z.revenue)}` }))}
          format={count}
          empty="Aucune commande sur la période."
        />
        <BarList
          title="Par moyen de paiement (livrées)"
          rows={(d?.by_method ?? []).map((m) => ({ label: paymentMethodLabel[m.method], value: m.amount, sub: `${count(m.orders)} commande(s)` }))}
          format={formatMoney}
          empty="Aucune commande livrée sur la période."
        />
        <BarList
          title="Meilleurs restaurants"
          rows={(d?.top_restaurants ?? []).map((r) => ({ label: r.name, value: r.revenue, sub: `${count(r.orders)} commande(s) livrée(s)` }))}
          format={formatMoney}
          empty="Aucune vente sur la période."
        />
      </div>

      {d && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="font-bold">Commandes par statut</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {Object.entries(d.orders.by_status).map(([k, n]) => (
                <li key={k} className="flex justify-between">
                  <span>{statusLabel(k as OrderStatus)}</span>
                  <span className="tabular font-semibold">{count(n)}</span>
                </li>
              ))}
              {!Object.keys(d.orders.by_status).length && <li className="text-muted">Aucune commande sur la période.</li>}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-bold">Répartition du volume livré</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {(
                [
                  ["Produits", d.money.subtotal],
                  ["Frais de livraison", d.money.delivery_fees],
                  ["Rémunération des livreurs", d.money.courier_earnings],
                  ["Commissions des restaurants", d.money.commissions],
                  ["Part de la plateforme", d.money.platform],
                ] as const
              ).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="tabular font-semibold">{formatMoney(v)}</span>
                </li>
              ))}
              <li className="flex justify-between text-muted">
                <span>Distance moyenne livrée</span>
                <span className="tabular">{(d.money.average_distance_m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km</span>
              </li>
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}

/** Commandes en alerte (mêmes règles que la page Commandes). */
function useAlertCount(): number | undefined {
  const [n, setN] = useState<number>();
  useEffect(() => {
    const db = browserClient();
    let alive = true;
    Promise.all([db.from("orders").select("*").in("status", supervisedStatuses).limit(200), db.from("settings").select().single()]).then(([o, s]) => {
      if (!alive) return;
      const now = Date.now();
      setN(((o.data ?? []) as Order[]).filter((x) => orderAlerts(x, s.data as PlatformSettings, now).length).length);
    });
    return () => {
      alive = false;
    };
  }, []);
  return n;
}
