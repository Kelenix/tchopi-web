"use client";

import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { formatMoney, formatTime } from "@/lib/format";
import { actorLabel, closeReasonLabel, eventLabel, statusLabel, statusTone, type Order, type OrderEvent, type OrderItem } from "@/lib/orders";
import { Badge } from "./ui";

export function StatusBadge({ order }: { order: Pick<Order, "status" | "type"> }) {
  return <Badge tone={statusTone(order.status)}>{statusLabel(order.status, order.type === "parcel")}</Badge>;
}

/** Lignes des commandes affichées, lues en une requête et relues quand la liste change. */
export function useOrderItems(orderIds: string[]): Record<string, OrderItem[]> {
  const [items, setItems] = useState<Record<string, OrderItem[]>>({});
  const key = orderIds.join(",");
  useEffect(() => {
    if (!key) return;
    let alive = true;
    browserClient()
      .from("order_items")
      .select("id, order_id, name, unit_price, quantity, line_total, options")
      .in("order_id", key.split(","))
      .then(({ data }) => {
        if (!alive || !data) return;
        const grouped: Record<string, OrderItem[]> = {};
        for (const item of data as OrderItem[]) (grouped[item.order_id] ??= []).push(item);
        setItems((prev) => ({ ...prev, ...grouped }));
      });
    return () => {
      alive = false;
    };
  }, [key]);
  return items;
}

export function ItemLines({ items }: { items: OrderItem[] | undefined }) {
  if (!items) return <div className="h-10 animate-pulse rounded-field bg-surface-alt" />;
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((i) => (
        <li key={i.id} className="flex justify-between gap-4">
          <span>
            <strong className="tabular">{i.quantity} ×</strong> {i.name}
          </span>
          <span className="tabular shrink-0 text-muted">{formatMoney(i.line_total)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Chronologie d'une commande (acteur, heure, motif), relue à chaque changement de statut. */
export function Timeline({ orderId, version, detailed = false }: { orderId: string; version: string; detailed?: boolean }) {
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  useEffect(() => {
    browserClient()
      .from("order_events")
      .select("kind, status, actor_role, reason, created_at")
      .eq("order_id", orderId)
      .order("id")
      .then(({ data }) => setEvents((data ?? []) as OrderEvent[]));
  }, [orderId, version]);
  if (!events) return <div className="h-24 animate-pulse rounded-field bg-surface-alt" />;
  const shown = events.map((e) => ({ e, label: eventLabel(e, detailed) })).filter((x) => x.label);
  return (
    <ol className="relative space-y-4 border-l-2 border-border pl-5">
      {shown.map(({ e, label }, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[27px] top-1 size-3 rounded-full border-2 border-surface bg-primary" />
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted">
            {formatTime(e.created_at)} · {actorLabel[e.actor_role] ?? e.actor_role}
            {e.reason ? ` · ${closeReasonLabel(e.reason)}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
