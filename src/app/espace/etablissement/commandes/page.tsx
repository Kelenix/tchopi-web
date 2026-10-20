"use client";

import { useEffect, useMemo, useState } from "react";
import { Bike, ClipboardList, Clock, MapPin, Search, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ItemLines, StatusBadge, Timeline, useOrderItems } from "@/components/order-parts";
import { Button, Card, fieldClass } from "@/components/ui";
import { counted, isToday, useEstablishment } from "@/lib/establishment";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatMoney, formatTime } from "@/lib/format";
import { closeReasonLabel, courierLabel, isClosed, paymentLine, type Order, type OrderStatus } from "@/lib/orders";
import { browserClient } from "@/lib/supabase";

const ANSWER_DELAY_MS = 10 * 60_000;
const tabs = ["Nouvelles", "En cours", "Terminées du jour", "Historique"] as const;
type Tab = (typeof tabs)[number];

export default function EstablishmentOrdersPage() {
  const { orders, acknowledge } = useEstablishment();
  const [tab, setTab] = useState<Tab>("Nouvelles");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
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
    const q = query.trim().toLowerCase();
    return {
      Nouvelles: all.filter((o) => o.status === "pending"),
      "En cours": all.filter((o) => !isClosed(o.status) && o.status !== "pending"),
      "Terminées du jour": all.filter((o) => isClosed(o.status) && isToday(o.created_at)),
      Historique: all.filter(
        (o) => isClosed(o.status) && (!q || o.number.toLowerCase().includes(q) || o.recipient_name.toLowerCase().includes(q)),
      ),
    } satisfies Record<Tab, Order[]>;
  }, [orders, query]);

  const shown = groups[tab];
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
            {t !== "Historique" && t !== "Terminées du jour" && groups[t].length > 0 ? ` (${groups[t].length})` : ""}
          </button>
        ))}
      </div>

      {tab === "Historique" && (
        <label className="relative mt-4 block max-w-sm">
          <Search className="absolute left-4 top-3.5 size-4 text-muted" aria-hidden />
          <span className="sr-only">Rechercher une commande</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Numéro ou client" className={`${fieldClass} pl-10`} />
        </label>
      )}

      <div className="mt-6">
        {!orders ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-card bg-surface-alt" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={{ Nouvelles: "Aucune nouvelle commande", "En cours": "Aucune commande en cours", "Terminées du jour": "Rien de terminé aujourd'hui", Historique: "Aucune commande sur 30 jours" }[tab]}
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
            onClick={() => {
              const r = prompt("Motif du refus");
              if (r?.trim()) move(order, "rejected", r.trim());
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface shadow-float" aria-label={`Commande ${o.number}`}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-xl font-extrabold">{o.number}</h2>
            <p className="text-xs text-muted">{formatDateTime(o.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid size-9 place-items-center rounded-full hover:bg-surface-alt">
            <X className="size-5" aria-hidden />
          </button>
        </div>
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
    </div>
  );
}
