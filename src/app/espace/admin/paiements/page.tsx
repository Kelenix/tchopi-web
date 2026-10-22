"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { ColumnChart, Kpi, PeriodPicker } from "@/components/admin-charts";
import { CashBalances } from "@/components/cash-balances";
import { EmptyState } from "@/components/empty-state";
import { PAGE, Pager } from "@/components/pager";
import { Badge, Card } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatMoney } from "@/lib/format";
import { paymentMethodLabel, paymentStatusLabel, type PaymentMethod, type PaymentStatus } from "@/lib/orders";
import { useRpc } from "@/lib/use-rpc";
import { bucketLabel, periodRange, presetPeriod, type Period } from "@/lib/period";
import { browserClient } from "@/lib/supabase";

type Option = { id: string; method: PaymentMethod; label: string; operator: string | null; provider: string | null; is_enabled: boolean };
type Transaction = {
  id: string;
  amount: number;
  method: PaymentMethod;
  provider: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | "cancelled";
  failure_reason: string | null;
  created_at: string;
  order: { number: string; status: string; payment_status: PaymentStatus } | null;
};
const filters = [
  ["all", "Toutes"],
  ["succeeded", "Réussies"],
  ["pending", "En attente"],
  ["refund_pending", "À rembourser"],
  ["refunded", "Remboursées"],
] as const;
const txStatus = { pending: "En attente", succeeded: "Réussie", failed: "Échouée", refunded: "Remboursée", cancelled: "Annulée" };

export default function AdminPaymentsPage() {
  const db = browserClient();
  const [options, setOptions] = useState<Option[]>([]);
  const [result, setResult] = useState<{ key: string; rows: Transaction[]; total: number } | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("all");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    db.from("payment_options")
      .select("id, method, label, operator, provider, is_enabled")
      .order("position")
      .then(({ data }) => alive && setOptions((data ?? []) as Option[]));
    return () => {
      alive = false;
    };
  }, [db, version]);

  // Transactions page par page, filtrées par le serveur (« À rembourser » : statut de paiement de la commande).
  const key = JSON.stringify([filter, page, version]);
  useEffect(() => {
    let alive = true;
    const [f, pg] = JSON.parse(key) as [string, number];
    let request = db
      .from("transactions")
      .select(`*, order:orders${f === "refund_pending" ? "!inner" : ""}(number, status, payment_status)`, { count: "exact" });
    if (f === "refund_pending") request = request.eq("order.payment_status", "refund_pending");
    else if (f !== "all") request = request.eq("status", f);
    request
      .order("created_at", { ascending: false })
      .range(pg * PAGE, pg * PAGE + PAGE - 1)
      .then(({ data, count }) => alive && setResult({ key, rows: (data ?? []) as unknown as Transaction[], total: count ?? 0 }));
    return () => {
      alive = false;
    };
  }, [db, key]);
  const current = result?.key === key ? result : null;
  const shown = current?.rows ?? [];

  return (
    <>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Paiements</h1>
      <PaymentStats />

      <h2 className="mt-10 text-xl font-extrabold">Espèces à reverser</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Encaissées par les livreurs à la livraison et dues à la plateforme jusqu&apos;à leur versement. Enregistrez chaque versement reçu.
      </p>
      <div className="mt-4">
        <CashBalances />
      </div>

      <Card className="mt-10 p-5">
        <h2 className="font-bold">Moyens de paiement proposés</h2>
        <p className="text-sm text-muted">N&apos;activez un paiement en ligne qu&apos;après les essais réels avec les clés du fournisseur (docs/mise-en-service.md).</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <li key={o.id}>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-field border border-border p-3 text-sm">
                <span>
                  <span className="font-semibold">{o.label}</span>
                  <span className="block text-xs text-muted">
                    {paymentMethodLabel[o.method]}
                    {o.provider ? ` · ${o.provider}` : ""}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={o.is_enabled}
                  onChange={async (e) => {
                    const { error } = await db.rpc("admin_set_payment_option", { p_id: o.id, p_enabled: e.target.checked });
                    setError(error ? errorMessage(error) : null);
                    setVersion((v) => v + 1);
                  }}
                  className="size-5 accent-[var(--primary)]"
                />
              </label>
            </li>
          ))}
        </ul>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>

      <h2 className="mt-10 text-xl font-extrabold">Transactions en ligne</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setFilter(key);
              setPage(0);
            }} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === key ? "bg-ink text-on-ink" : "bg-surface text-muted ring-1 ring-border"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {!current ? (
          <div className="h-48 animate-pulse rounded-card bg-surface-alt" />
        ) : shown.length === 0 ? (
          <EmptyState icon={Wallet} title="Aucune transaction" body="Les paiements Mobile Money et carte apparaissent ici ; les espèces sont suivies par livreur." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="p-4">Commande</th>
                  <th className="p-4">Moyen</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((t) => (
                  <tr key={t.id}>
                    <td className="p-4">
                      <span className="font-semibold">{t.order?.number}</span>
                      <span className="block text-xs text-muted">{formatDateTime(t.created_at)}</span>
                    </td>
                    <td className="p-4">
                      {paymentMethodLabel[t.method]} · {t.provider}
                    </td>
                    <td className="space-x-1 p-4">
                      <Badge tone={t.status === "succeeded" ? "success" : t.status === "pending" ? "warning" : t.status === "refunded" ? "neutral" : "danger"}>{txStatus[t.status]}</Badge>
                      {t.order?.payment_status === "refund_pending" && <Badge tone="warning">{paymentStatusLabel.refund_pending}</Badge>}
                    </td>
                    <td className="tabular p-4 text-right font-semibold">{formatMoney(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        <Pager page={page} total={current?.total ?? 0} onChange={setPage} />
      </div>
    </>
  );
}

type Stats = {
  count: number;
  amount: number;
  collected: number;
  by_outcome: Record<"succeeded" | "pending" | "failed" | "refunded", { count: number; amount: number }>;
  by_method: { method: PaymentMethod; count: number; amount: number; collected: number; succeeded: number }[];
  series: { bucket: string; cash: number; mobile_money: number; card: number }[];
  online: { attempts: number; succeeded: number; failed: number; pending: number };
  cash: { collected: number; remitted: number; outstanding: number };
};
const count = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const outcomes = [
  ["succeeded", "Réussis", "Encaissés"],
  ["pending", "En attente", "Commandes en cours"],
  ["failed", "Échoués", "Commandes non payées puis annulées"],
  ["refunded", "Remboursés", "Demandés ou effectués"],
] as const;

/** Statistiques de paiement d'une période, calculées par le serveur sur toutes les commandes (espèces comprises). */
function PaymentStats() {
  const [period, setPeriod] = useState<Period>(() => presetPeriod("month"));
  const range = periodRange(period);
  const s = useRpc<Stats>("admin_payment_stats", range);
  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          {s ? `${count(s.count)} paiement(s) · ${formatMoney(s.amount)} au total · ${formatMoney(s.collected)} encaissés` : "Chargement…"}
        </p>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>
      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {outcomes.map(([k, label, sub]) => (
          <Kpi key={k} label={label} value={s ? formatMoney(s.by_outcome[k].amount) : "…"} sub={s && `${count(s.by_outcome[k].count)} · ${sub}`} />
        ))}
      </section>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ColumnChart
          title="Montants encaissés par moyen de paiement"
          series={[
            { key: "cash", label: paymentMethodLabel.cash, color: "var(--series-1)" },
            { key: "mobile_money", label: paymentMethodLabel.mobile_money, color: "var(--series-2)" },
            { key: "card", label: paymentMethodLabel.card, color: "var(--series-3)" },
          ]}
          points={(s?.series ?? []).map((p) => ({ label: bucketLabel(p.bucket, range.p_bucket), values: p }))}
          format={formatMoney}
        />
        <Card className="p-5">
          <h3 className="font-bold">Par moyen de paiement</h3>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1.5">Moyen</th>
                <th className="py-1.5 text-right">Paiements</th>
                <th className="py-1.5 text-right">Encaissé</th>
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-border">
              {(s?.by_method ?? []).map((m) => (
                <tr key={m.method}>
                  <td className="py-2">{paymentMethodLabel[m.method]}</td>
                  <td className="py-2 text-right">
                    {count(m.succeeded)} / {count(m.count)}
                  </td>
                  <td className="py-2 text-right font-semibold">{formatMoney(m.collected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {s && (
            <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Tentatives en ligne</dt>
                <dd className="tabular">
                  {count(s.online.succeeded)} réussies · {count(s.online.failed)} échouées · {count(s.online.pending)} en attente
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Espèces encaissées / reversées</dt>
                <dd className="tabular">
                  {formatMoney(s.cash.collected)} / {formatMoney(s.cash.remitted)}
                </dd>
              </div>
            </dl>
          )}
        </Card>
      </div>
    </>
  );
}
