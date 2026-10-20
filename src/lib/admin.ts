import { useEffect, useState } from "react";
import { browserClient } from "./supabase";
import type { Order } from "./orders";

export type PlatformSettings = {
  offer_timeout_s: number;
  restaurant_timeout_s: number;
  payment_timeout_s: number;
  dispatch_alert_s: number;
  dispatch_cancel_s: number;
  support_phone: string | null;
};

export type OrderAlert = "no_courier" | "restaurant_silent" | "code_locked" | "problem";

export const alertLabel: Record<OrderAlert, string> = {
  no_courier: "Sans livreur",
  restaurant_silent: "Établissement sans réponse",
  code_locked: "Code bloqué",
  problem: "Problème signalé",
};

/** Alertes de supervision (ADM-03, ADR-040), mêmes règles que l'app mobile : seules ces commandes sont « à traiter ». */
export function orderAlerts(o: Order, settings: PlatformSettings | null, now: number): OrderAlert[] {
  const closed = ["delivered", "rejected", "cancelled", "failed"].includes(o.status);
  const alerts: OrderAlert[] = [];
  if (o.dispatch_alerted_at && !o.courier_id) alerts.push("no_courier");
  if (o.status === "pending" && (now - new Date(o.submitted_at ?? o.created_at).getTime()) / 1000 > (settings?.restaurant_timeout_s ?? 600) / 2) {
    alerts.push("restaurant_silent");
  }
  if (o.code_locked_at && !closed) alerts.push("code_locked");
  if (o.problem_reported_at && (!closed || o.status === "failed")) alerts.push("problem");
  return alerts;
}

/** Statuts suivis par la supervision (commandes ouvertes, et échecs en attente de décision). */
export const supervisedStatuses = [
  "awaiting_payment",
  "pending",
  "accepted",
  "preparing",
  "ready",
  "searching_courier",
  "courier_assigned",
  "picked_up",
  "in_transit",
  "failed",
];

/** Appel d'une fonction admin de statistiques ; undefined tant que la réponse aux paramètres courants n'est pas là. */
export function useAdminRpc<T>(fn: string, args: Record<string, string>): T | undefined {
  const key = JSON.stringify(args);
  const [result, setResult] = useState<{ key: string; data: T }>();
  useEffect(() => {
    let alive = true;
    browserClient()
      .rpc(fn, JSON.parse(key))
      .then(({ data }) => alive && data && setResult({ key, data: data as T }));
    return () => {
      alive = false;
    };
  }, [fn, key]);
  return result?.key === key ? result.data : undefined;
}
