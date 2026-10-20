"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge, Card } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatMoney } from "@/lib/format";
import { paymentMethodLabel, paymentStatusLabel, type PaymentMethod, type PaymentStatus } from "@/lib/orders";
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
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("all");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([
      db.from("payment_options").select("id, method, label, operator, provider, is_enabled").order("position"),
      db.from("transactions").select("*, order:orders(number, status, payment_status)").order("created_at", { ascending: false }).limit(200),
    ]).then(([o, t]) => {
      if (!alive) return;
      setOptions((o.data ?? []) as Option[]);
      setTransactions((t.data ?? []) as unknown as Transaction[]);
    });
    return () => {
      alive = false;
    };
  }, [db, version]);

  const shown = (transactions ?? []).filter((t) =>
    filter === "all" ? true : filter === "refund_pending" ? t.order?.payment_status === "refund_pending" : t.status === filter,
  );

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Paiements</h1>
      <Card className="mt-6 p-5">
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

      <div className="mt-8 flex flex-wrap gap-2">
        {filters.map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === key ? "bg-ink text-on-ink" : "bg-surface text-muted ring-1 ring-border"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {!transactions ? (
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
      </div>
    </>
  );
}
