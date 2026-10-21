"use client";

import { useEffect, useState } from "react";
import { Bike, Phone } from "lucide-react";
import { dialog, orThrow } from "@/components/dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge, Button, Card } from "@/components/ui";
import { useEstablishment } from "@/lib/establishment";
import { browserClient } from "@/lib/supabase";

type AffiliationStatus = "pending" | "approved" | "rejected" | "suspended" | "ended";
type Row = {
  courier_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  vehicle_type: string;
  zone_name: string;
  courier_status: string;
  status: AffiliationStatus;
  message: string | null;
  is_online: boolean;
  deliveries: number;
};
const vehicles: Record<string, string> = { motorbike: "Moto", bicycle: "Vélo", car: "Voiture", on_foot: "À pied" };
const affiliationLabel: Record<AffiliationStatus, [string, "success" | "warning" | "danger" | "neutral"]> = {
  pending: ["Candidature", "warning"],
  approved: ["Affilié", "success"],
  rejected: ["Refusé", "neutral"],
  suspended: ["Suspendu", "danger"],
  ended: ["Terminé", "neutral"],
};
const tabs: [string, string, AffiliationStatus[]][] = [
  ["active", "Mes livreurs", ["approved", "suspended"]],
  ["pending", "Candidatures", ["pending"]],
  ["past", "Historique", ["rejected", "ended"]],
  ["find", "Trouver des livreurs", []],
];
// Actions permises par la base (restaurant_set_affiliation) selon le statut.
const actions: Record<AffiliationStatus, [AffiliationStatus, string, boolean][]> = {
  pending: [["approved", "Accepter", false], ["rejected", "Refuser", true]],
  approved: [["suspended", "Suspendre", true], ["ended", "Mettre fin", true]],
  suspended: [["approved", "Réactiver", false], ["ended", "Mettre fin", true]],
  rejected: [],
  ended: [],
};

/**
 * Livreurs de l'établissement (ADR-050). La validation du compte livreur reste à l'équipe Tchopi ; ici, le restaurant
 * choisit avec qui il travaille. Avec au moins un affilié, ses commandes ne sont proposées qu'à ses affiliés.
 */
export default function CouriersPage() {
  const { id } = useEstablishment();
  const [tab, setTab] = useState("active");
  const [rows, setRows] = useState<{ id: string; list: Row[] } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    browserClient()
      .rpc("restaurant_couriers_list", { p_restaurant_id: id })
      .then(({ data }) => alive && setRows({ id, list: (data ?? []) as Row[] }));
    return () => {
      alive = false;
    };
  }, [id, version]);

  const list = rows?.id === id ? rows.list : null;
  const statuses = tabs.find(([k]) => k === tab)![2];
  const shown = (list ?? []).filter((r) => statuses.includes(r.status));
  const name = (r: Row) => [r.first_name, r.last_name].filter(Boolean).join(" ") || "Livreur";

  async function decide(r: Row, to: AffiliationStatus, label: string, danger: boolean) {
    const done = await dialog.confirm({
      title: `${label} : ${name(r)} ?`,
      body: to === "approved" ? "Il recevra vos commandes prêtes. Il est prévenu." : "Le livreur est prévenu.",
      tone: danger ? "danger" : "default",
      confirmLabel: label,
      action: () => orThrow(browserClient().rpc("restaurant_set_affiliation", { p_restaurant_id: id, p_courier_id: r.courier_id, p_status: to })),
    });
    if (done) setVersion((v) => v + 1);
  }

  return (
    <>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Mes livreurs</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Les livreurs validés par Tchopi postulent depuis leur espace. Avec au moins un livreur affilié, vos commandes prêtes ne sont
        proposées qu&apos;à eux ; sans affilié, à tous les livreurs disponibles de votre ville.
      </p>
      <div role="tablist" className="mt-6 flex w-fit gap-1 overflow-x-auto rounded-full bg-surface-alt p-1">
        {tabs.map(([k, label, st]) => {
          const n = st.length ? (list ?? []).filter((r) => st.includes(r.status)).length : 0;
          return (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${tab === k ? "bg-surface shadow-float" : "text-muted"}`}>
              {label}
              {n ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>
      <div className="mt-6">
        {tab === "find" ? (
          <FindCouriers establishmentId={id} onAdded={() => setVersion((v) => v + 1)} />
        ) : !list ? (
          <div className="h-48 animate-pulse rounded-card bg-surface-alt" />
        ) : shown.length === 0 ? (
          <EmptyState icon={Bike} title={tab === "pending" ? "Aucune candidature" : tab === "active" ? "Aucun livreur affilié" : "Aucun historique"} />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {shown.map((r) => (
              <li key={r.courier_id}>
                <Card className="flex gap-4 p-5">
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft text-lg font-extrabold text-primary" aria-hidden>
                    {name(r).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{name(r)}</p>
                      <Badge tone={affiliationLabel[r.status][1]}>{affiliationLabel[r.status][0]}</Badge>
                      {r.status === "approved" && <Badge tone={r.is_online ? "success" : "neutral"}>{r.is_online ? "En ligne" : "Hors ligne"}</Badge>}
                    </div>
                    <p className="text-sm text-muted">
                      {vehicles[r.vehicle_type] ?? r.vehicle_type} · {r.zone_name} · {r.deliveries} livraison{r.deliveries > 1 ? "s" : ""} pour vous
                    </p>
                    {r.phone && (
                      <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 text-sm text-primary">
                        <Phone className="size-3.5" aria-hidden /> {r.phone}
                      </a>
                    )}
                    {r.message && <p className="rounded-field bg-surface-alt px-3 py-2 text-sm">« {r.message} »</p>}
                    {r.courier_status !== "approved" && <p className="text-xs text-danger">Compte livreur non validé ou suspendu par Tchopi.</p>}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {actions[r.status].map(([to, label, danger]) => (
                        <Button key={to} variant={danger ? "outline" : "primary"} className={`h-9 px-3 text-xs ${danger ? "text-danger" : ""}`} onClick={() => decide(r, to, label, danger)}>
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

type Available = {
  courier_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  vehicle_type: string;
  zone_name: string;
  is_online: boolean;
  deliveries: number;
  affiliation: string | null;
};

/** Annuaire : livreurs validés par Tchopi dans la ville du restaurant, à contacter ou à ajouter à ses livreurs. */
function FindCouriers({ establishmentId, onAdded }: { establishmentId: string; onAdded: () => void }) {
  const [rows, setRows] = useState<{ key: string; list: Available[] } | null>(null);
  const [version, setVersion] = useState(0);
  const key = `${establishmentId}-${version}`;
  useEffect(() => {
    let alive = true;
    browserClient()
      .rpc("restaurant_available_couriers", { p_restaurant_id: establishmentId })
      .then(({ data }) => alive && setRows({ key, list: (data ?? []) as Available[] }));
    return () => {
      alive = false;
    };
  }, [establishmentId, key]);
  const list = rows?.key === key ? rows.list : null;
  const name = (r: Available) => [r.first_name, r.last_name].filter(Boolean).join(" ") || "Livreur";

  async function add(r: Available) {
    const done = await dialog.confirm({
      title: `Ajouter ${name(r)} à vos livreurs ?`,
      body: "Il recevra vos commandes prêtes et il est prévenu. Vous pourrez suspendre ou mettre fin à l'affiliation à tout moment.",
      confirmLabel: "Ajouter",
      action: () => orThrow(browserClient().rpc("restaurant_add_courier", { p_restaurant_id: establishmentId, p_courier_id: r.courier_id })),
    });
    if (done) {
      setVersion((v) => v + 1);
      onAdded();
    }
  }

  if (!list) return <div className="h-48 animate-pulse rounded-card bg-surface-alt" />;
  if (!list.length) return <EmptyState icon={Bike} title="Aucun autre livreur validé dans votre ville" body="Les nouveaux livreurs validés par Tchopi apparaîtront ici." />;
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {list.map((r) => (
        <li key={r.courier_id}>
          <Card className="flex gap-4 p-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft text-lg font-extrabold text-primary" aria-hidden>
              {name(r).slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{name(r)}</p>
                <Badge tone={r.is_online ? "success" : "neutral"}>{r.is_online ? "En ligne" : "Hors ligne"}</Badge>
                {r.affiliation === "pending" && <Badge tone="warning">A postulé chez vous</Badge>}
              </div>
              <p className="text-sm text-muted">
                {vehicles[r.vehicle_type] ?? r.vehicle_type} · {r.zone_name} · {r.deliveries} livraison{r.deliveries > 1 ? "s" : ""} sur Tchopi
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {r.phone && (
                  <a href={`tel:${r.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold hover:bg-surface-alt">
                    <Phone className="size-3.5" aria-hidden /> {r.phone}
                  </a>
                )}
                <Button className="h-9 px-3 text-xs" onClick={() => add(r)}>
                  Ajouter à mes livreurs
                </Button>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
