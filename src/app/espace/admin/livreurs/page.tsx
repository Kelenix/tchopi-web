"use client";

import { useEffect, useState } from "react";
import { Bike } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge, Button, Card } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatMoney } from "@/lib/format";
import { browserClient } from "@/lib/supabase";

type Status = "pending" | "approved" | "rejected" | "suspended";
type CourierRow = {
  user_id: string;
  vehicle_type: string;
  plate_number: string | null;
  photo_path: string | null;
  status: Status;
  is_online: boolean;
  updated_at: string;
  profile: { first_name: string | null; last_name: string | null; phone: string | null } | null;
  zone: { name: string } | null;
};
type Balance = { courier_id: string; first_name: string | null; last_name: string | null; phone: string | null; collected: number; remitted: number; due: number };

const tabs: [Status | "cash", string][] = [
  ["pending", "À valider"],
  ["approved", "Approuvés"],
  ["suspended", "Suspendus"],
  ["rejected", "Refusés"],
  ["cash", "Espèces à reverser"],
];
const vehicles: Record<string, string> = { motorbike: "Moto", bicycle: "Vélo", car: "Voiture", on_foot: "À pied" };

export default function AdminCouriersPage() {
  const db = browserClient();
  const [tab, setTab] = useState<Status | "cash">("pending");
  const [rows, setRows] = useState<{ tab: string; couriers: CourierRow[]; balances: Balance[] } | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    (tab === "cash"
      ? db.rpc("admin_cash_balances").then(({ data }) => ({ couriers: [], balances: (data ?? []) as Balance[] }))
      : db
          .from("couriers")
          .select("*, profile:profiles(first_name, last_name, phone), zone:zones(name)")
          .eq("status", tab)
          .order("updated_at", { ascending: false })
          .then(({ data }) => ({ couriers: (data ?? []) as unknown as CourierRow[], balances: [] }))
    ).then((r) => alive && setRows({ tab, ...r }));
    return () => {
      alive = false;
    };
  }, [db, tab, version]);

  async function setStatus(c: CourierRow, status: Status) {
    const reason = status === "approved" ? null : prompt("Motif (communiqué au livreur)")?.trim();
    if (status !== "approved" && !reason) return;
    const { error } = await db.rpc("admin_set_courier_status", { p_user_id: c.user_id, p_status: status, p_reason: reason });
    setError(error ? errorMessage(error) : null);
    setVersion((v) => v + 1);
  }

  async function showPhoto(c: CourierRow) {
    if (!c.photo_path) return;
    // Photo d'identité privée : lien temporaire (1 h), comme dans l'app mobile.
    const { data } = await db.storage.from("couriers").createSignedUrl(c.photo_path, 3600);
    if (data?.signedUrl) setPhotos((p) => ({ ...p, [c.user_id]: data.signedUrl }));
  }

  const current = rows?.tab === tab ? rows : null;

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Livreurs</h1>
      <div role="tablist" className="mt-6 flex gap-1 overflow-x-auto rounded-full bg-surface-alt p-1">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${tab === key ? "bg-surface shadow-float" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-6">
        {!current ? (
          <div className="h-48 animate-pulse rounded-card bg-surface-alt" />
        ) : tab === "cash" ? (
          <CashTable balances={current.balances} onRecorded={() => setVersion((v) => v + 1)} />
        ) : current.couriers.length === 0 ? (
          <EmptyState icon={Bike} title="Aucun livreur ici" />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {current.couriers.map((c) => (
              <li key={c.user_id}>
                <Card className="flex gap-4 p-5">
                  <button type="button" onClick={() => showPhoto(c)} className="size-20 shrink-0 overflow-hidden rounded-field bg-surface-alt text-xs text-muted" aria-label="Voir la photo">
                    {photos[c.user_id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photos[c.user_id]} alt="" className="size-full object-cover" />
                    ) : (
                      "Photo"
                    )}
                  </button>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-bold">{[c.profile?.first_name, c.profile?.last_name].filter(Boolean).join(" ") || "Sans nom"}</p>
                    <p className="text-sm text-muted">
                      {vehicles[c.vehicle_type]}
                      {c.plate_number ? ` · ${c.plate_number}` : ""} · {c.zone?.name}
                    </p>
                    <p className="text-sm">{c.profile?.phone}</p>
                    <p className="text-xs text-muted">Mis à jour {formatDateTime(c.updated_at)}</p>
                    {c.status === "approved" && <Badge tone={c.is_online ? "success" : "neutral"}>{c.is_online ? "En ligne" : "Hors ligne"}</Badge>}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {c.status !== "approved" && (
                        <Button className="h-9 px-3 text-xs" onClick={() => setStatus(c, "approved")}>
                          Approuver
                        </Button>
                      )}
                      {c.status === "pending" && (
                        <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => setStatus(c, "rejected")}>
                          Refuser
                        </Button>
                      )}
                      {c.status === "approved" && (
                        <Button variant="outline" className="h-9 px-3 text-xs text-danger" onClick={() => setStatus(c, "suspended")}>
                          Suspendre
                        </Button>
                      )}
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

function CashTable({ balances, onRecorded }: { balances: Balance[]; onRecorded: () => void }) {
  const [error, setError] = useState<string | null>(null);
  if (!balances.length) return <EmptyState icon={Bike} title="Aucune espèce à reverser" />;
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
