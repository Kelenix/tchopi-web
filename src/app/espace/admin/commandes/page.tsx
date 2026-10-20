"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, ListChecks, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ItemLines, StatusBadge, Timeline, useOrderItems } from "@/components/order-parts";
import { Badge, Button, Card, fieldClass } from "@/components/ui";
import { alertLabel, orderAlerts, supervisedStatuses, type PlatformSettings } from "@/lib/admin";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatMoney, formatTime } from "@/lib/format";
import { closeReasonLabel, courierLabel, isClosed, paymentLine, type Order } from "@/lib/orders";
import { Drawer, dialog } from "@/components/dialog";
import { browserClient } from "@/lib/supabase";

type Candidate = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  vehicle_type: string;
  distance_m: number;
  location_age_s: number;
  busy: boolean;
  offer_pending: boolean;
};

export default function AdminOrdersPage() {
  const db = browserClient();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [found, setFound] = useState<Order[] | null>(null);

  // Commandes suivies, en direct ; l'heure avance chaque minute (alertes « sans réponse »).
  useEffect(() => {
    let alive = true;
    db.from("orders")
      .select("*")
      .in("status", supervisedStatuses)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => alive && setOrders((data ?? []) as Order[]));
    db.from("settings").select().single().then(({ data }) => alive && setSettings(data as PlatformSettings));
    const channel = db
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
        const row = p.new as Order;
        if (!row?.id) return;
        setOrders((list) => {
          const others = (list ?? []).filter((o) => o.id !== row.id);
          return supervisedStatuses.includes(row.status) ? [row, ...others] : others;
        });
        setFound((list) => list?.map((o) => (o.id === row.id ? row : o)) ?? null);
      })
      .subscribe();
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      alive = false;
      db.removeChannel(channel);
      clearInterval(timer);
    };
  }, [db]);

  const alerted = useMemo(
    () => (orders ?? []).map((o) => ({ o, alerts: orderAlerts(o, settings, now) })).filter((x) => x.alerts.length),
    [orders, settings, now],
  );
  const shown = found ?? alerted.map((x) => x.o);
  const current = [...(orders ?? []), ...(found ?? [])].find((o) => o.id === selected) ?? null;

  async function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q")).trim().toUpperCase();
    if (!q) return setFound(null);
    const { data } = await db.from("orders").select("*").ilike("number", `%${q}%`).order("created_at", { ascending: false }).limit(30);
    setFound((data ?? []) as Order[]);
  }

  return (
    <>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Commandes</h1>
      <p className="mt-1 text-sm text-muted">
        Seules les commandes qui demandent une intervention sont listées (sans livreur, établissement sans réponse, code bloqué, problème).
        Toute autre commande se retrouve par son numéro.
      </p>
      <form onSubmit={search} className="mt-6 flex max-w-md gap-2">
        <label className="relative flex-1">
          <Search className="absolute left-4 top-3.5 size-4 text-muted" aria-hidden />
          <span className="sr-only">Numéro de commande</span>
          <input name="q" placeholder="Numéro (ex. R-48K2Q)" className={`${fieldClass} pl-10`} />
        </label>
        <Button type="submit" variant="ink">
          Chercher
        </Button>
        {found && (
          <Button variant="ghost" onClick={() => setFound(null)}>
            À traiter
          </Button>
        )}
      </form>

      <div className="mt-6">
        {!orders ? (
          <div className="h-48 animate-pulse rounded-card bg-surface-alt" />
        ) : shown.length === 0 ? (
          <EmptyState icon={ListChecks} title={found ? "Aucune commande trouvée" : "Aucune commande à traiter"} body={found ? undefined : "Tout se déroule normalement."} />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {shown.map((o) => {
              const alerts = orderAlerts(o, settings, now);
              return (
                <li key={o.id}>
                  <button type="button" onClick={() => setSelected(o.id)} className="flex w-full flex-wrap items-center gap-3 p-4 text-left hover:bg-surface-alt">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {o.number} · {o.type === "parcel" ? "Colis" : o.pickup_name}
                      </span>
                      <span className="text-xs text-muted">
                        {formatTime(o.created_at)} · {o.courier_info ? courierLabel(o.courier_info) : "Aucun livreur attribué"}
                      </span>
                    </span>
                    {alerts.map((a) => (
                      <Badge key={a} tone="warning">
                        <AlertTriangle className="size-3" aria-hidden /> {alertLabel[a]}
                      </Badge>
                    ))}
                    <StatusBadge order={o} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {current && <AdminOrderPanel order={current} onClose={() => setSelected(null)} />}
    </>
  );
}

function AdminOrderPanel({ order: o, onClose }: { order: Order; onClose: () => void }) {
  const db = browserClient();
  const items = useOrderItems([o.id]);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(fn: string, args: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const { error } = await db.rpc(fn, args);
    setBusy(false);
    if (error) setError(errorMessage(error));
    return !error;
  }
  const ask = async (title: string, label = "Motif") =>
    (await dialog.prompt({ title, fields: [{ name: "v", label, required: true, type: "textarea" }] }))?.v || null;

  const canAssign = ["ready", "searching_courier", "courier_assigned", "accepted", "preparing"].includes(o.status);
  const canConfirm = o.status === "in_transit";
  const canCancel = !isClosed(o.status) && !["picked_up", "in_transit"].includes(o.status);
  const canRequestRefund = o.payment_status === "paid" && ["cancelled", "rejected", "failed"].includes(o.status);

  return (
    <Drawer title={`${o.number} · ${formatDateTime(o.created_at)}`} onClose={onClose}>
      <aside aria-label={`Commande ${o.number}`}>
        <div className="space-y-6 p-5">
          <StatusBadge order={o} />
          {o.close_reason && <p className="text-sm text-danger">Motif : {closeReasonLabel(o.close_reason)}</p>}
          <section className="grid gap-3 text-sm sm:grid-cols-2">
            <Card className="p-3">
              <p className="text-xs font-bold text-muted">Retrait</p>
              <p className="font-semibold">{o.pickup_name ?? o.pickup_district}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs font-bold text-muted">Client</p>
              <p className="font-semibold">{o.recipient_name}</p>
              {o.recipient_phone && <a href={`tel:${o.recipient_phone}`} className="text-primary">{o.recipient_phone}</a>}
            </Card>
            <Card className="p-3 sm:col-span-2">
              <p className="text-xs font-bold text-muted">Livreur</p>
              <p className="font-semibold">{o.courier_info ? courierLabel(o.courier_info) : "Aucun"}</p>
              {o.courier_info?.phone && <a href={`tel:${o.courier_info.phone}`} className="text-primary">{o.courier_info.phone}</a>}
            </Card>
          </section>
          <section>
            <ItemLines items={items[o.id]} />
            <p className="mt-3 flex justify-between border-t border-border pt-3 font-bold">
              <span>Total</span> <span className="tabular">{formatMoney(o.total)}</span>
            </p>
            <p className="text-sm text-muted">{paymentLine(o)}</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold">Actions</h3>
            {canAssign && (
              <Button
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={async () => setCandidates(((await db.rpc("admin_dispatch_candidates", { p_order_id: o.id })).data ?? []) as Candidate[])}
              >
                {o.courier_id ? "Réattribuer à un autre livreur" : "Attribuer un livreur"}
              </Button>
            )}
            {candidates && (
              <ul className="space-y-2 rounded-field bg-surface-alt p-3">
                {candidates.length === 0 && <li className="text-sm text-muted">Aucun livreur en ligne dans la zone.</li>}
                {candidates.map((c) => (
                  <li key={c.user_id} className="flex items-center gap-3 text-sm">
                    <span className="flex-1">
                      <strong>{[c.first_name, c.last_name].filter(Boolean).join(" ")}</strong>
                      <span className="block text-xs text-muted">
                        {(c.distance_m / 1000).toFixed(1).replace(".", ",")} km · position il y a {Math.round(c.location_age_s / 60)} min
                        {c.busy ? " · en mission" : ""}
                      </span>
                    </span>
                    <Button
                      className="h-9 px-3 text-xs"
                      disabled={busy}
                      onClick={async () => {
                        const reason = await ask("Motif de l'attribution manuelle");
                        if (reason && (await call("admin_assign_courier", { p_order_id: o.id, p_courier_id: c.user_id, p_reason: reason }))) setCandidates(null);
                      }}
                    >
                      Attribuer
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {canConfirm && (
              <Button
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={async () => {
                  const reason = await ask("Livraison confirmée sans code : comment a-t-elle été vérifiée ?");
                  if (reason) call("admin_confirm_delivery", { p_order_id: o.id, p_reason: reason });
                }}
              >
                Confirmer la livraison sans code
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                className="w-full text-danger"
                disabled={busy}
                onClick={async () => {
                  const reason = await ask("Motif de l'annulation");
                  if (reason) call("cancel_order", { p_order_id: o.id, p_reason: reason });
                }}
              >
                Annuler la commande
              </Button>
            )}
            {canRequestRefund && (
              <Button
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={async () => {
                  const reason = await ask("Motif du remboursement");
                  if (reason) call("admin_request_refund", { p_order_id: o.id, p_reason: reason });
                }}
              >
                Rembourser le client
              </Button>
            )}
            {o.payment_status === "refund_pending" && (
              <Button
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={async () => {
                  const reference = await ask("Marquer comme remboursée", "Référence du remboursement (opérateur, virement…)");
                  if (reference) call("admin_mark_refunded", { p_order_id: o.id, p_reference: reference });
                }}
              >
                Marquer comme remboursée
              </Button>
            )}
            {error && (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold">Chronologie complète</h3>
            <Timeline orderId={o.id} version={`${o.status}-${o.courier_id}-${o.payment_status}`} detailed />
          </section>
        </div>
      </aside>
    </Drawer>
  );
}
