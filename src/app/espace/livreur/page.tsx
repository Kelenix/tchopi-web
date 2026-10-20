"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { CourierAffiliations } from "@/components/courier-affiliations";
import { CourierDeliveries, CourierProfileCard } from "@/components/courier-space";
import { RequireRole, useAccount } from "@/components/space-shell";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { browserClient } from "@/lib/supabase";

type Summary = { earnings_today: number; deliveries_today: number; cash_due: number };
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
  const { roles, session } = useAccount();
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => {
    let alive = true;
    const db = browserClient();
    db.rpc("courier_summary").then(({ data }) => alive && setSummary(data as Summary));
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
      <h2 className="mt-10 text-xl font-extrabold">Restaurants</h2>
      <div className="mt-4">
        <CourierAffiliations userId={session.user.id} approved={roles.courier_status === "approved"} />
      </div>
      <h2 className="mt-10 text-xl font-extrabold">Mes livraisons</h2>
      <div className="mt-4">
        <CourierDeliveries />
      </div>
      <h2 className="mt-10 text-xl font-extrabold">Mon dossier livreur</h2>
      <div className="mt-4">
        <CourierProfileCard userId={session.user.id} />
      </div>
    </>
  );
}
