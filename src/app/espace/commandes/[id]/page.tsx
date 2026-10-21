"use client";

import { dialog } from "@/components/dialog";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Bike, Check, KeyRound, Phone } from "lucide-react";
import { CourierMap } from "@/components/courier-map";
import { ItemLines, StatusBadge, Timeline, useOrderItems } from "@/components/order-parts";
import { RateCourier } from "@/components/rate-courier";
import { useAccount } from "@/components/space-shell";
import { Button, Card } from "@/components/ui";
import { env } from "@/lib/env";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatMoney } from "@/lib/format";
import { closeReasonLabel, courierLabel, isClosed, paymentLine, type Order, type OrderStatus } from "@/lib/orders";
import { browserClient } from "@/lib/supabase";

const foodSteps: [OrderStatus[], string][] = [
  [["pending"], "Envoyée"],
  [["accepted", "preparing"], "En préparation"],
  [["ready", "searching_courier", "courier_assigned"], "Prête"],
  [["picked_up", "in_transit"], "En route"],
  [["delivered"], "Livrée"],
];

export default function TrackingPage({ params }: PageProps<"/espace/commandes/[id]">) {
  const { id } = use(params);
  const { session } = useAccount();
  const db = browserClient();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [code, setCode] = useState<string | null>(null);
  const [courier, setCourier] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = useOrderItems(order ? [order.id] : []);

  // Commande en direct (statut, livreur, paiement) et code de livraison, lisible par le seul client.
  useEffect(() => {
    let alive = true;
    db.from("orders").select("*").eq("id", id).eq("customer_id", session.user.id).maybeSingle().then(({ data }) => alive && setOrder(data as Order | null));
    db.from("delivery_codes").select("code").eq("order_id", id).maybeSingle().then(({ data }) => alive && setCode(data?.code ?? null));
    const channel = db
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, (p) => setOrder(p.new as Order))
      .subscribe();
    return () => {
      alive = false;
      db.removeChannel(channel);
    };
  }, [db, id, session.user.id]);

  // Position du livreur, visible du client une fois la commande attribuée.
  const courierId = order?.courier_id && !isClosed(order.status) ? order.courier_id : null;
  useEffect(() => {
    if (!courierId) return;
    let alive = true;
    const read = (row: { latitude: number; longitude: number } | null) => alive && setCourier(row ? { lat: row.latitude, lng: row.longitude } : null);
    db.from("courier_locations").select("latitude, longitude").eq("courier_id", courierId).maybeSingle().then(({ data }) => read(data));
    const channel = db
      .channel(`courier-${courierId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "courier_locations", filter: `courier_id=eq.${courierId}` }, (p) => read(p.new as { latitude: number; longitude: number }))
      .subscribe();
    return () => {
      alive = false;
      db.removeChannel(channel);
    };
  }, [db, courierId]);

  if (order === undefined) return <div className="h-96 animate-pulse rounded-card bg-surface-alt" />;
  if (order === null) return <p className="text-muted">Commande introuvable.</p>;

  const o = order;
  const stepIndex = foodSteps.findIndex(([statuses]) => statuses.includes(o.status));
  const cancellable =
    ["pending", "awaiting_payment", "searching_courier"].includes(o.status) ||
    (o.type === "parcel" && o.status === "courier_assigned") ||
    (["accepted", "preparing", "ready", "courier_assigned"].includes(o.status) && Boolean(o.dispatch_alerted_at) && !o.courier_id);

  async function cancel() {
    if (!(await dialog.confirm({ title: "Annuler cette commande ?", body: "Le restaurant et le livreur éventuel sont prévenus.", tone: "danger", confirmLabel: "Annuler la commande" }))) return;
    setBusy(true);
    const { error } = await db.rpc("cancel_order", { p_order_id: o.id, p_reason: null });
    setBusy(false);
    setError(error ? errorMessage(error) : null);
  }

  async function pay() {
    setBusy(true);
    const back = window.location.origin === env.siteUrl ? `${env.siteUrl}/espace/commandes/${o.id}` : undefined;
    const { data, error } = await db.functions.invoke("payments-create", { body: { order_id: o.id, ...(back ? { return_to: back } : {}) } });
    setBusy(false);
    if (data?.url) window.location.href = data.url;
    else setError(error ? "Paiement indisponible pour le moment. Réessayez dans un instant." : null);
  }

  return (
    <>
      <Link href="/espace/commandes" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Mes commandes
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">{o.type === "parcel" ? "Colis" : o.pickup_name}</h1>
        <StatusBadge order={o} />
      </div>
      <p className="mt-1 text-sm text-muted">
        {o.number} · {formatDateTime(o.created_at)}
      </p>

      {o.type === "food" && !isClosed(o.status) && stepIndex >= 0 && (
        <ol className="mt-8 grid grid-cols-5 gap-2" aria-label="Étapes de la commande">
          {foodSteps.map(([, label], i) => (
            <li key={label} className="text-center">
              <span className={`mx-auto grid size-9 place-items-center rounded-full text-sm font-bold ${i <= stepIndex ? "bg-primary text-on-primary" : "bg-surface-alt text-muted"}`}>
                {i < stepIndex ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <span className={`mt-2 block text-xs font-semibold ${i <= stepIndex ? "text-ink" : "text-muted"}`}>{label}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {o.status === "delivered" && o.courier_id && <RateCourier orderId={o.id} courierName={o.courier_info?.first_name ?? "votre livreur"} />}
          {o.status === "awaiting_payment" && (
            <Card className="border-warning bg-warning-soft p-5">
              <p className="font-bold text-warning">Paiement en attente</p>
              <p className="mt-1 text-sm text-warning">La commande est transmise à l&apos;établissement dès la confirmation du paiement.</p>
              <Button onClick={pay} disabled={busy} className="mt-4">
                Payer maintenant
              </Button>
            </Card>
          )}
          {code && !isClosed(o.status) && o.status !== "awaiting_payment" && (
            <Card className="flex items-center gap-4 p-5">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <KeyRound className="size-6" aria-hidden />
              </span>
              <div>
                <p className="text-sm text-muted">Code de livraison, à donner au livreur à la remise</p>
                <p className="tabular text-3xl font-extrabold tracking-[0.3em]">{code}</p>
              </div>
            </Card>
          )}
          {courierId && (
            <Card className="space-y-4 p-5">
              {o.courier_info && (
                <div className="flex flex-wrap items-center gap-3">
                  <Bike className="size-5 text-primary" aria-hidden />
                  <p className="flex-1 font-semibold">{courierLabel(o.courier_info)}</p>
                  {o.courier_info.phone && (
                    <a href={`tel:${o.courier_info.phone}`} className="inline-flex items-center gap-2 rounded-full bg-surface-alt px-4 py-2 text-sm font-semibold">
                      <Phone className="size-4" aria-hidden /> Appeler
                    </a>
                  )}
                </div>
              )}
              <CourierMap courier={courier} dropoff={{ lat: o.dropoff_lat, lng: o.dropoff_lng }} />
            </Card>
          )}
          <Card className="p-5">
            <h2 className="mb-4 font-bold">Suivi</h2>
            <Timeline orderId={o.id} version={`${o.status}-${o.payment_status}-${o.courier_id}`} />
          </Card>
        </div>

        <Card className="h-fit space-y-4 p-5">
          <h2 className="font-bold">Détail</h2>
          <ItemLines items={items[o.id]} />
          <dl className="space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Produits</dt>
              <dd className="tabular">{formatMoney(o.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Livraison</dt>
              <dd className="tabular">{formatMoney(o.delivery_fee)}</dd>
            </div>
            <div className="flex justify-between text-base font-extrabold">
              <dt>Total</dt>
              <dd className="tabular">{formatMoney(o.total)}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted">{paymentLine(o)}</p>
          <p className="text-sm">
            Livraison : {o.dropoff_district} · {o.dropoff_landmark}
          </p>
          {o.close_reason && isClosed(o.status) && <p className="text-sm text-danger">Motif : {closeReasonLabel(o.close_reason)}</p>}
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          {cancellable && (
            <Button variant="outline" onClick={cancel} disabled={busy} className="w-full text-danger">
              Annuler la commande
            </Button>
          )}
        </Card>
      </div>
    </>
  );
}
