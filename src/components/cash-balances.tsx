"use client";

import { useEffect, useState } from "react";
import { Bike } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button, Card } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { browserClient } from "@/lib/supabase";

type Balance = { courier_id: string; first_name: string | null; last_name: string | null; phone: string | null; collected: number; remitted: number; due: number };

/**
 * Espèces à reverser (ADR-047) : montants encaissés en espèces par chaque livreur à la livraison, moins ses versements.
 * Argent réellement dû à la plateforme (qui reverse ensuite restaurants et livreurs) : suivi financier conservé.
 */
export function CashBalances() {
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    browserClient()
      .rpc("admin_cash_balances")
      .then(({ data }) => alive && setBalances((data ?? []) as Balance[]));
    return () => {
      alive = false;
    };
  }, [version]);
  if (!balances) return <div className="h-32 animate-pulse rounded-card bg-surface-alt" />;
  return <CashTable balances={balances} onRecorded={() => setVersion((v) => v + 1)} />;
}

function CashTable({ balances, onRecorded }: { balances: Balance[]; onRecorded: () => void }) {
  const [error, setError] = useState<string | null>(null);
  if (!balances.length) return <EmptyState icon={Bike} title="Aucune espèce à reverser" body="Les espèces encaissées par les livreurs apparaissent ici jusqu'à leur versement." />;
  async function record(b: Balance) {
    const amount = Number(prompt(`Montant versé par ${b.first_name ?? "le livreur"} (F)`, String(b.due))?.replace(/\s/g, ""));
    if (!Number.isInteger(amount) || amount <= 0) return;
    const reference = prompt("Référence du versement (facultatif)")?.trim() || null;
    const { error } = await browserClient().rpc("admin_record_cash_remittance", { p_courier_id: b.courier_id, p_amount: amount, p_reference: reference });
    setError(error ? errorMessage(error) : null);
    onRecorded();
  }
  return (
    <Card className="overflow-x-auto">
      {error && <p className="p-4 text-sm text-danger">{error}</p>}
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="p-4">Livreur</th>
            <th className="p-4 text-right">Encaissé</th>
            <th className="p-4 text-right">Reversé</th>
            <th className="p-4 text-right">Dû</th>
            <th className="p-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {balances.map((b) => (
            <tr key={b.courier_id}>
              <td className="p-4">
                <span className="font-semibold">{[b.first_name, b.last_name].filter(Boolean).join(" ")}</span>
                <span className="block text-xs text-muted">{b.phone}</span>
              </td>
              <td className="tabular p-4 text-right">{formatMoney(b.collected)}</td>
              <td className="tabular p-4 text-right">{formatMoney(b.remitted)}</td>
              <td className="tabular p-4 text-right font-bold">{formatMoney(b.due)}</td>
              <td className="p-4 text-right">
                <Button variant="soft" className="h-9 px-3 text-xs" disabled={b.due <= 0} onClick={() => record(b)}>
                  Enregistrer un versement
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
