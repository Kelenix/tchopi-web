"use client";

import { Drawer, dialog } from "@/components/dialog";
import { useEffect, useMemo, useState } from "react";
import { Bike, ClipboardList, Clock, MapPin, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Pager } from "@/components/pager";
import { ItemLines, StatusBadge, Timeline, useOrderItems } from "@/components/order-parts";
import { Button, Card, fieldClass } from "@/components/ui";
import { PeriodPicker } from "@/components/admin-charts";
import { counted, isToday, useEstablishment } from "@/lib/establishment";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatMoney, formatTime } from "@/lib/format";
import { closeReasonLabel, courierLabel, isClosed, paymentLine, type Order, type OrderStatus } from "@/lib/orders";
import { establishmentPeriods, periodRange, presetPeriod, type Period } from "@/lib/period";
import { browserClient } from "@/lib/supabase";

const ANSWER_DELAY_MS = 10 * 60_000;
const tabs = ["Nouvelles", "En cours", "Historique"] as const;
type Tab = (typeof tabs)[number];

export default function EstablishmentOrdersPage() {
  const { id: establishmentId, orders, acknowledge } = useEstablishment();
  const [tab, setTab] = useState<Tab>("Nouvelles");
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Comptes à rebours rafraîchis ; la page ouverte vaut accusé de réception des nouvelles commandes.
  useEffect(() => {
    acknowledge();
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders?.length]);

  const groups = useMemo(() => {
    const all = (orders ?? []).filter((o) => o.status !== "awaiting_payment");
    return {
      Nouvelles: all.filter((o) => o.status === "pending"),
      "En cours": all.filter((o) => !isClosed(o.status) && o.status !== "pending"),
    };
  }, [orders]);

  const shown = tab === "Historique" ? [] : groups[tab];
  const items = useOrderItems(shown.map((o) => o.id));
  const current = orders?.find((o) => o.id === selected) ?? null;
  const today = counted((orders ?? []).filter((o) => isToday(o.created_at)));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">Commandes</h1>
          <p className="mt-1 text-sm text-muted">
            Aujourd&apos;hui : {today.length} commande{today.length > 1 ? "s" : ""} ·{" "}
            <span className="tabular">{formatMoney(today.reduce((n, o) => n + o.subtotal, 0))}</span> de ventes
          </p>
        </div>
      </div>

      <div role="tablist" className="mt-6 flex gap-1 overflow-x-auto rounded-full bg-surface-alt p-1">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${tab === t ? "bg-surface text-ink shadow-float" : "text-muted"}`}
          >
            {t}
            {t !== "Historique" && groups[t].length > 0 ? ` (${groups[t].length})` : ""}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Historique" ? (
          <History establishmentId={establishmentId} now={now} />
        ) : !orders ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-card bg-surface-alt" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={tab === "Nouvelles" ? "Aucune nouvelle commande" : "Aucune commande en cours"}
            body={tab === "Nouvelles" ? "Les commandes arrivent ici en direct, avec une alerte sonore." : undefined}
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((o) => (
              <li key={o.id}>
                <OrderCard order={o} items={items[o.id]} now={now} onOpen={() => setSelected(o.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {current && <OrderPanel order={current} items={items[current.id]} onClose={() => setSelected(null)} />}
    </>
  );
}

const PAGE = 24;
const statusFilters: [string, string, OrderStatus[] | null][] = [
  ["all", "Tous les statuts", null],
  ["pending", "En attente", ["pending"]],
  ["accepted", "Acceptées", ["accepted"]],
  ["preparing", "En préparation", ["preparing"]],
  ["ready", "Prêtes", ["ready"]],
  ["delivery", "En livraison", ["courier_assigned", "picked_up", "in_transit"]],
  ["delivered", "Livrées", ["delivered"]],
  ["cancelled", "Annulées ou refusées", ["rejected", "cancelled", "failed"]],
];

/** Historique complet, filtré et paginé par le serveur (RLS : seulement les commandes de l'établissement). */
function History({ establishmentId, now }: { establishmentId: string; now: number }) {
  const [period, setPeriod] = useState<Period>(() => presetPeriod("day"));
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ key: string; rows: Order[]; total: number } | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const { p_from, p_to } = periodRange(period);
  const key = JSON.stringify([establishmentId, p_from, p_to, status, query, page]);

  useEffect(() => {
    let alive = true;
    const [, from, to, st, q, pg] = JSON.parse(key) as [string, string, string, string, string, number];
    let request = browserClient()
      .from("orders")
      .select("*", { count: "exact" })
      .eq("restaurant_id", establishmentId)
      .neq("status", "awaiting_payment")
      .gte("created_at", from)
      .lt("created_at", to);
    const statuses = statusFilters.find(([k]) => k === st)?.[2];
    if (statuses) request = request.in("status", statuses);
    const number = q.trim().replace(/[%,()]/g, "");
    if (number) request = request.ilike("number", `%${number}%`);
    request
      .order("created_at", { ascending: false })
      .range(pg * PAGE, pg * PAGE + PAGE - 1)
      .then(({ data, count }) => alive && setResult({ key, rows: (data ?? []) as Order[], total: count ?? 0 }));
    return () => {
      alive = false;
    };
  }, [establishmentId, key]);

  const current = result?.key === key ? result : null;
  const items = useOrderItems((current?.rows ?? []).map((o) => o.id));
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <PeriodPicker value={period} onChange={reset(setPeriod)} choices={establishmentPeriods} />
        <select value={status} onChange={(e) => reset(setStatus)(e.target.value)} aria-label="Statut" className={`${fieldClass} h-9 w-auto`}>
          {statusFilters.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <label className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted" aria-hidden />
          <span className="sr-only">Numéro de commande</span>
          <input value={query} onChange={(e) => reset(setQuery)(e.target.value)} placeholder="N° de commande" className={`${fieldClass} h-9 pl-9`} />
        </label>
      </div>
      <p className="mt-4 text-sm text-muted">{current ? `${current.total} commande${current.total > 1 ? "s" : ""}` : "Chargement…"}</p>
      <div className="mt-3">
        {!current ? (
          <div className="h-56 animate-pulse rounded-card bg-surface-alt" />
        ) : current.rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Aucune commande" body="Aucune commande ne correspond à ces filtres sur la période." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {current.rows.map((o) => (
              <li key={o.id}>
                <OrderCard order={o} items={items[o.id]} now={now} onOpen={() => setSelected(o)} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <Pager page={page} total={current?.total ?? 0} size={PAGE} onChange={setPage} />
      {selected && <OrderPanel order={selected} items={items[selected.id]} onClose={() => setSelected(null)} />}
    </>
  );
}

function useTransition() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function move(order: Order, to: OrderStatus, reason?: string) {
    setBusy(true);
    setError(null);
    const { error } = await browserClient().rpc("transition_order", { p_order_id: order.id, p_to_status: to, p_reason: reason ?? null });
    setBusy(false);
    if (error) setError(errorMessage(error));
  }
  return { busy, error, move };
}

function Actions({ order }: { order: Order }) {
  const { busy, error, move } = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const reasons = ["Produit indisponible", "Fermeture de l'établissement", "Trop de commandes"];
  let content: React.ReactNode = null;
  if (order.status === "pending") {
    content = rejecting ? (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Motif du refus</p>
        <div className="flex flex-wrap gap-2">
          {reasons.map((r) => (
            <Button key={r} variant="outline" disabled={busy} onClick={() => move(order, "rejected", r)} className="h-9 px-3 text-xs">
              {r}
            </Button>
          ))}
          <Button
            variant="ghost"
            disabled={busy}
            className="h-9 px-3 text-xs"
            onClick={async () => {
              const r = await dialog.prompt({ title: "Refuser la commande", tone: "danger", confirmLabel: "Refuser", fields: [{ name: "v", label: "Motif (communiqué au client)", type: "textarea", required: true }] });
              if (r?.v) move(order, "rejected", r.v);
            }}
          >
            Autre motif…
          </Button>
        </div>
        <Button variant="ghost" onClick={() => setRejecting(false)} className="h-9 px-3 text-xs">
          Annuler
        </Button>
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={busy} onClick={() => setRejecting(true)} className="text-danger">
          Refuser
        </Button>
        <Button disabled={busy} onClick={() => move(order, "accepted")}>
          Accepter
        </Button>
      </div>
    );
  } else if (order.status === "accepted") {
    content = (
      <Button disabled={busy} onClick={() => move(order, "preparing")} className="w-full">
        Commencer la préparation
      </Button>
    );
  } else if (order.status === "preparing") {
    content = (
      <Button disabled={busy} onClick={() => move(order, "ready")} className="w-full">
        Marquer prête
      </Button>
    );
  } else if ((order.status === "ready" || order.status === "courier_assigned") && order.courier_id) {
    // Remise déclarée par l'établissement une fois le livreur arrivé (ORD-10).
    content = (
      <Button disabled={busy} onClick={() => move(order, "picked_up")} className="w-full">
        Remise au livreur
      </Button>
    );
  }
  if (!content) return null;
  return (
    <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
      {content}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function OrderCard({ order: o, items, now, onOpen }: { order: Order; items: Parameters<typeof ItemLines>[0]["items"]; now: number; onOpen: () => void }) {
  const left = ANSWER_DELAY_MS - (now - new Date(o.submitted_at ?? o.created_at).getTime());
  return (
    <Card className="flex h-full flex-col p-5">
      <button type="button" onClick={onOpen} className="flex items-start justify-between gap-3 text-left" aria-label={`Détail de la commande ${o.number}`}>
        <span>
          <span className="block font-bold">{o.number}</span>
          <span className="text-xs text-muted">{formatTime(o.created_at)} · {o.recipient_name}</span>
        </span>
        <StatusBadge order={o} />
      </button>
      <div className="mt-4 flex-1">
        <ItemLines items={items} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3">
        <span className="text-xs text-muted">{paymentLine(o)}</span>
        <span className="tabular font-bold">{formatMoney(o.subtotal)}</span>
      </div>
      {o.status === "pending" && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-warning">
          <Clock className="size-4" aria-hidden /> Répondre sous {Math.max(1, Math.ceil(left / 60_000))} min
        </p>
      )}
      {o.courier_info && !isClosed(o.status) ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Bike className="size-4" aria-hidden /> {courierLabel(o.courier_info)}
        </p>
      ) : (
        o.status === "ready" && (
          <p className={`mt-2 text-sm font-semibold ${o.dispatch_alerted_at ? "text-warning" : "text-muted"}`}>
            {o.dispatch_alerted_at
              ? "Toujours sans livreur : l'équipe est prévenue et la commande reste proposée."
              : "Proposée aux livreurs, en attente d'acceptation."}
          </p>
        )
      )}
      {o.close_reason && isClosed(o.status) && <p className="mt-2 text-sm text-danger">Motif : {closeReasonLabel(o.close_reason)}</p>}
      <Actions order={o} />
    </Card>
  );
}

function OrderPanel({ order: o, items, onClose }: { order: Order; items: Parameters<typeof ItemLines>[0]["items"]; onClose: () => void }) {
  return (
    <Drawer title={`${o.number} · ${formatDateTime(o.created_at)}`} onClose={onClose}>
      <aside className="flex flex-col" aria-label={`Commande ${o.number}`}>
        <div className="space-y-6 p-5">
          <StatusBadge order={o} />
          <section>
            <h3 className="mb-2 text-sm font-bold">Contenu</h3>
            <ItemLines items={items} />
            <div className="mt-3 flex justify-between border-t border-border pt-3 font-bold">
              <span>Sous-total</span>
              <span className="tabular">{formatMoney(o.subtotal)}</span>
            </div>
            <p className="mt-1 flex justify-between text-sm text-muted">
              <span>Commission Tchopi</span>
              <span className="tabular">− {formatMoney(o.commission_amount)}</span>
            </p>
            <p className="mt-1 text-sm text-muted">{paymentLine(o)}</p>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-bold">Livraison</h3>
            <p className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              {o.dropoff_district} · {o.dropoff_landmark}
            </p>
            {o.courier_info && <p className="mt-2 text-sm text-primary">Livreur : {courierLabel(o.courier_info)}</p>}
          </section>
          <section>
            <h3 className="mb-3 text-sm font-bold">Chronologie</h3>
            <Timeline orderId={o.id} version={o.status} />
          </section>
          <Actions order={o} />
        </div>
      </aside>
    </Drawer>
  );
}
