"use client";

import { useEffect, useState } from "react";
import { Bike, Smartphone } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { RequireRole, useAccount } from "@/components/space-shell";
import { Badge, Card } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { statusLabel, statusTone, type OrderStatus } from "@/lib/orders";
import { browserClient } from "@/lib/supabase";

type Summary = { earnings_today: number; deliveries_today: number; cash_due: number };
type Mission = {
  id: string;
  number: string;
  type: "food" | "parcel";
  status: OrderStatus;
  pickup_district: string;
  dropoff_district: string;
  courier_earning: number;
  assigned_at: string;
  closed_at: string | null;
};
const statusText: Record<string, [string, "success" | "warning" | "danger" | "neutral"]> = {
  pending: ["Dossier en cours de vérification", "warning"],
  approved: ["Dossier approuvé", "success"],
  rejected: ["Dossier refusé", "danger"],
  suspended: ["Compte livreur suspendu", "danger"],
};

/** Espace livreur sur le web : suivi de l'activité. Les missions (position GPS, codes) se font dans l'app mobile. */
export default function CourierPage() {
  return (
    <RequireRole allowed={(r) => Boolean(r.courier_status)}>
      <Courier />
    </RequireRole>
  );
}

function Courier() {
  const { roles } = useAccount();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [missions, setMissions] = useState<Mission[] | null>(null);
  useEffect(() => {
    let alive = true;
    const db = browserClient();
    Promise.all([db.rpc("courier_summary"), db.rpc("courier_missions")]).then(([s, m]) => {
      if (!alive) return;
      setSummary(s.data as Summary);
      setMissions((m.data ?? []) as Mission[]);
    });
    return () => {
      alive = false;
    };
  }, []);
  const [label, tone] = statusText[roles.courier_status ?? "pending"] ?? statusText.pending;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">Mon activité</h1>
        <Badge tone={tone}>{label}</Badge>
      </div>
      <Card className="mt-6 flex items-start gap-4 p-5">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm text-muted">
          Pour passer en ligne, recevoir des commandes et les livrer (position, code de livraison), utilisez
          l&apos;application mobile Tchopi. Ici, vous suivez vos gains et votre historique.
        </p>
      </Card>
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Livraisons du jour", summary ? String(summary.deliveries_today) : "…"],
          ["Gains du jour", summary ? formatMoney(summary.earnings_today) : "…"],
          ["Espèces à reverser", summary ? formatMoney(summary.cash_due) : "…"],
        ].map(([l, v]) => (
          <Card key={l} className="p-5">
            <p className="text-sm text-muted">{l}</p>
            <p className="tabular mt-1 text-2xl font-extrabold">{v}</p>
          </Card>
        ))}
      </section>
      <h2 className="mt-10 text-xl font-extrabold">Historique des missions</h2>
      <div className="mt-4">
        {!missions ? (
          <div className="h-48 animate-pulse rounded-card bg-surface-alt" />
        ) : missions.length === 0 ? (
          <EmptyState icon={Bike} title="Aucune mission pour l'instant" />
        ) : (
          <Card className="divide-y divide-border">
            {missions.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {m.number} · {m.pickup_district} → {m.dropoff_district}
                  </span>
                  <span className="text-xs text-muted">{formatDateTime(m.assigned_at)}</span>
                </span>
                <Badge tone={statusTone(m.status)}>{statusLabel(m.status, m.type === "parcel")}</Badge>
                <span className="tabular w-24 text-right font-bold">{formatMoney(m.courier_earning)}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
