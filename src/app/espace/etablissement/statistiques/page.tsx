"use client";

import { useState } from "react";
import { BarList, ColumnChart, Kpi, PeriodPicker } from "@/components/admin-charts";
import { Card } from "@/components/ui";
import { useEstablishment } from "@/lib/establishment";
import { formatMoney } from "@/lib/format";
import { paymentMethodLabel, statusLabel, type OrderStatus, type PaymentMethod } from "@/lib/orders";
import { bucketLabel, establishmentPeriods, periodRange, presetPeriod, type Period } from "@/lib/period";
import { useEstablishmentStats } from "@/lib/use-rpc";

const count = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

/** Statistiques : une seule source (restaurant_stats) pour les indicateurs, les graphiques et les tableaux de la période. */
export default function StatsPage() {
  const { id } = useEstablishment();
  const [period, setPeriod] = useState<Period>(() => presetPeriod("week"));
  const range = periodRange(period);
  const s = useEstablishmentStats(id, range);
  const points = (s?.series ?? []).map((p) => ({ label: bucketLabel(p.bucket, range.p_bucket), values: p }));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">Statistiques</h1>
        <PeriodPicker value={period} onChange={setPeriod} choices={establishmentPeriods} />
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Commandes" value={s ? count(s.orders) : "…"} sub={s && `${count(s.delivered)} livrées · ${count(s.cancelled)} annulées`} />
        <Kpi label="Ventes (produits)" value={s ? formatMoney(s.sales) : "…"} />
        <Kpi label="Commission Tchopi" value={s ? formatMoney(s.commission) : "…"} sub={s && `Net ${formatMoney(s.sales - s.commission)}`} />
        <Kpi label="Panier moyen" value={s ? formatMoney(s.average_basket) : "…"} />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ColumnChart title="Ventes" series={[{ key: "sales", label: "Ventes", color: "var(--series-1)" }]} points={points} format={formatMoney} />
        <ColumnChart title="Commandes" series={[{ key: "orders", label: "Commandes", color: "var(--series-1)" }]} points={points} format={count} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <BarList
          title="Produits les plus vendus"
          rows={(s?.top_products ?? []).map((p) => ({ label: p.name, value: p.quantity, sub: formatMoney(p.amount) }))}
          format={(n) => `× ${count(n)}`}
          empty="Aucune commande livrée sur la période."
        />
        <Card className="p-5">
          <h3 className="font-bold">Commandes par statut</h3>
          <StatTable rows={Object.entries(s?.by_status ?? {}).map(([k, n]) => [statusLabel(k as OrderStatus), n])} />
        </Card>
        <Card className="p-5">
          <h3 className="font-bold">Par moyen de paiement</h3>
          <StatTable rows={Object.entries(s?.by_method ?? {}).map(([k, n]) => [paymentMethodLabel[k as PaymentMethod], n])} />
        </Card>
      </div>
    </>
  );
}

function StatTable({ rows }: { rows: [string, number][] }) {
  if (!rows.length) return <p className="mt-3 text-sm text-muted">Aucune commande sur la période.</p>;
  return (
    <ul className="mt-3 space-y-1.5 text-sm">
      {rows
        .sort((a, b) => b[1] - a[1])
        .map(([label, n]) => (
          <li key={label} className="flex justify-between gap-3">
            <span>{label}</span>
            <span className="tabular font-semibold">{count(n)}</span>
          </li>
        ))}
    </ul>
  );
}
