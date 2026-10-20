"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Bike, ChefHat, ClipboardCheck, Package, Plus, Power } from "lucide-react";
import { Badge, Button, ButtonLink, Card } from "@/components/ui";
import { ColumnChart, Kpi, PeriodPicker } from "@/components/admin-charts";
import { useEstablishment } from "@/lib/establishment";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { isClosed } from "@/lib/orders";
import { bucketLabel, establishmentPeriods, periodRange, presetPeriod, type Period } from "@/lib/period";
import { browserClient } from "@/lib/supabase";
import { useEstablishmentStats } from "@/lib/use-rpc";

export default function EstablishmentDashboard() {
  const { establishment: e, orders, reload } = useEstablishment();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<Period>(() => presetPeriod("day"));
  const range = periodRange(period);
  const stats = useEstablishmentStats(e?.id ?? "", range);
  const active = (orders ?? []).filter((o) => !isClosed(o.status));
  const priorities = [
    { n: active.filter((o) => o.status === "pending").length, label: "à accepter", icon: ClipboardCheck, tone: "warning" as const },
    { n: active.filter((o) => o.status === "accepted" || o.status === "preparing").length, label: "en préparation", icon: ChefHat, tone: "neutral" as const },
    { n: active.filter((o) => (o.status === "ready" || o.status === "courier_assigned") && o.courier_id).length, label: "à remettre au livreur", icon: Bike, tone: "success" as const },
    { n: active.filter((o) => o.status === "ready" && !o.courier_id && o.dispatch_alerted_at).length, label: "toujours sans livreur", icon: AlertTriangle, tone: "danger" as const },
  ];

  async function toggleClosed() {
    if (!e) return;
    setBusy(true);
    setError(null);
    const { error } = await browserClient().from("restaurants").update({ is_temporarily_closed: !e.is_temporarily_closed }).eq("id", e.id);
    if (error) setError(errorMessage(error));
    await reload();
    setBusy(false);
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">Tableau de bord</h1>
          <p className="mt-1 text-muted">{e?.name}</p>
        </div>
        <ButtonLink href="/espace/etablissement/produits?nouveau=1">
          <Plus className="size-4" aria-hidden /> Ajouter un produit
        </ButtonLink>
      </div>

      {e && (
        <Card className="mt-6 flex flex-wrap items-center gap-4 p-5">
          <span className={`grid size-12 place-items-center rounded-2xl ${e.is_open ? "bg-primary-soft text-primary" : "bg-surface-alt text-muted"}`}>
            <Power className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">
              {e.is_open ? "Ouvert : vous recevez des commandes" : e.is_temporarily_closed ? "Fermé temporairement" : "Fermé (hors horaires)"}
            </p>
            <p className="text-sm text-muted">
              {e.is_temporarily_closed
                ? "Les clients voient votre carte mais ne peuvent pas commander."
                : "Fermez temporairement en cas d'affluence ou de rupture : les horaires restent inchangés."}
            </p>
            {error && <p className="mt-1 text-sm text-danger">{error}</p>}
          </div>
          <Button variant={e.is_temporarily_closed ? "primary" : "outline"} disabled={busy} onClick={toggleClosed}>
            {e.is_temporarily_closed ? "Rouvrir" : "Fermer temporairement"}
          </Button>
        </Card>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold">Activité</h2>
        <PeriodPicker value={period} onChange={setPeriod} choices={establishmentPeriods} />
      </div>
      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Commandes" value={stats ? String(stats.orders) : "…"} sub={stats && `${stats.delivered} livrées`} />
        <Kpi label="Ventes" value={stats ? formatMoney(stats.sales) : "…"} />
        <Kpi label={`Commission (${e?.commission_rate ?? "…"} %)`} value={stats ? formatMoney(stats.commission) : "…"} />
        <Kpi label="Net" value={stats ? formatMoney(stats.sales - stats.commission) : "…"} sub={stats && `Panier moyen ${formatMoney(stats.average_basket)}`} />
      </section>
      <div className="mt-4">
        <ColumnChart
          title="Ventes sur la période"
          series={[{ key: "sales", label: "Ventes", color: "var(--series-1)" }]}
          points={(stats?.series ?? []).map((p) => ({ label: bucketLabel(p.bucket, range.p_bucket), values: p }))}
          format={formatMoney}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-extrabold">Actions prioritaires</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {priorities.map((p) => (
            <li key={p.label}>
              <Link href="/espace/etablissement/commandes" className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 transition hover:shadow-float">
                <p.icon className="size-5 text-muted" aria-hidden />
                <span className="flex-1 font-semibold">
                  <span className="tabular">{p.n}</span> commande{p.n > 1 ? "s" : ""} {p.label}
                </span>
                {p.n > 0 && <Badge tone={p.tone}>À traiter</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <Package className="size-5 text-primary" aria-hidden />
          <h2 className="mt-3 font-bold">Livraison</h2>
          <p className="mt-1 text-sm text-muted">
            Dès qu&apos;une commande est « Prête », elle est proposée aux livreurs disponibles de la zone, ou
            seulement à vos livreurs affiliés si l&apos;équipe en a défini. Le livreur attribué s&apos;affiche sur la
            commande ; vous déclarez la remise quand il est au comptoir.
          </p>
        </Card>
        <Card className="p-5">
          <ClipboardCheck className="size-5 text-primary" aria-hidden />
          <h2 className="mt-3 font-bold">Paiements</h2>
          <p className="mt-1 text-sm text-muted">
            Chaque commande indique son moyen de paiement (espèces encaissées par le livreur, Mobile Money ou carte
            payés en ligne). Commission Tchopi : {e?.commission_rate ?? "…"} % du montant des produits.
          </p>
        </Card>
      </section>
    </>
  );
}
