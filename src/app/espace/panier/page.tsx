"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Banknote, CreditCard, MapPin, Minus, Plus, ShoppingBag, Smartphone } from "lucide-react";
import { AddressDialog } from "@/components/address-dialog";
import { EmptyState } from "@/components/empty-state";
import { useAccount } from "@/components/space-shell";
import { Button, ButtonLink, Card } from "@/components/ui";
import { cart, useCart } from "@/lib/cart";
import { env } from "@/lib/env";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import type { PaymentMethod } from "@/lib/orders";
import { browserClient } from "@/lib/supabase";

type Address = { id: string; label: string; district: string; landmark: string; zone_id: string; is_default: boolean };
type PaymentOption = { id: string; method: PaymentMethod; label: string };
type Quote = {
  items: { product_id: string; name: string; unit_price: number; quantity: number; line_total: number }[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  couriers_available?: boolean;
  issues: { issue: string; product_id?: string; name?: string }[];
};

const methodIcon = { cash: Banknote, mobile_money: Smartphone, card: CreditCard };

export default function CheckoutPage() {
  const current = useCart();
  const router = useRouter();
  const { session } = useAccount();
  const db = browserClient();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [options, setOptions] = useState<PaymentOption[]>([]);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [quote, setQuote] = useState<{ key: string; value: Quote | null; error: string | null } | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [adding, setAdding] = useState(false);
  const [phone, setPhone] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  // Même clé tant que la commande n'est pas passée : un double clic ou une coupure ne crée pas deux commandes.
  const idempotency = useRef(crypto.randomUUID());

  useEffect(() => {
    let alive = true;
    Promise.all([
      db.from("addresses").select("id, label, district, landmark, zone_id, is_default").order("is_default", { ascending: false }).order("created_at", { ascending: false }),
      db.from("payment_options").select("id, method, label").eq("is_enabled", true).order("position"),
      db.from("profiles").select("phone").eq("id", session.user.id).single(),
    ]).then(([a, p, me]) => {
      if (!alive) return;
      const list = (a.data ?? []) as Address[];
      setAddresses(list);
      setAddressId((id) => id ?? list[0]?.id ?? null);
      const opts = (p.data ?? []) as PaymentOption[];
      setOptions(opts);
      setMethod((m) => m ?? opts[0]?.method ?? null);
      setPhone(me.data?.phone ?? null);
    });
    return () => {
      alive = false;
    };
  }, [db, session.user.id, version]);

  // Centre de la carte : la ville de l'établissement.
  useEffect(() => {
    if (!current) return;
    let alive = true;
    Promise.all([db.rpc("public_establishment", { p_id: current.establishmentId }), db.rpc("public_zones")]).then(([e, z]) => {
      const zone = (z.data as { id: string; center_lat: number; center_lng: number }[] | null)?.find((x) => x.id === e.data?.zone_id);
      if (alive && zone) setCenter({ lat: zone.center_lat, lng: zone.center_lng });
    });
    return () => {
      alive = false;
    };
  }, [db, current?.establishmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(
    () => current?.lines.map((l) => ({ product_id: l.productId, quantity: l.quantity, options: l.options.map((o) => o.id) })) ?? [],
    [current],
  );
  const quoteKey = JSON.stringify([addressId, current?.establishmentId, items]);

  // Devis serveur à chaque changement du panier ou de l'adresse (prix, frais, écarts), comme le mobile.
  useEffect(() => {
    if (!current || !addressId || !items.length) return;
    let alive = true;
    db.rpc("quote_food_order", { p_restaurant_id: current.establishmentId, p_address_id: addressId, p_items: items }).then(({ data, error }) => {
      if (alive) setQuote({ key: quoteKey, value: error ? null : (data as Quote), error: error ? errorMessage(error) : null });
    });
    return () => {
      alive = false;
    };
  }, [db, quoteKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current || !current.lines.length) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Votre panier est vide"
        body="Choisissez un établissement et ajoutez des produits."
        action={<ButtonLink href="/#restaurants">Voir les restaurants</ButtonLink>}
      />
    );
  }

  const q = quote?.key === quoteKey ? quote : null;
  const blocked = !q?.value || q.value.issues.length > 0 || !method || !phone;

  async function placeOrder() {
    if (!current || !q?.value || !method || !addressId) return;
    setBusy(true);
    setError(null);
    const { data: order, error } = await db.rpc("place_food_order", {
      p_restaurant_id: current.establishmentId,
      p_address_id: addressId,
      p_items: items,
      p_payment_method: method,
      p_expected_total: q.value.total,
      p_idempotency_key: idempotency.current,
    });
    if (error || !order) {
      setBusy(false);
      setVersion((v) => v + 1);
      return setError(errorMessage(error));
    }
    const orderId = (order as { id: string }).id;
    cart.clear();
    if (method === "cash") return router.replace(`/espace/commandes/${orderId}`);
    // Paiement en ligne : page sécurisée du fournisseur, retour sur le suivi de la commande (site en production).
    const back = window.location.origin === env.siteUrl ? `${env.siteUrl}/espace/commandes/${orderId}` : undefined;
    const { data, error: payError } = await db.functions.invoke("payments-create", { body: { order_id: orderId, ...(back ? { return_to: back } : {}) } });
    if (payError || !data?.url) return router.replace(`/espace/commandes/${orderId}`);
    window.location.href = data.url;
  }

  return (
    <>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Votre commande</h1>
      <p className="mt-1 text-muted">
        Chez{" "}
        <Link href={`/etablissements/${current.establishmentId}`} className="font-semibold text-ink underline-offset-2 hover:underline">
          {current.establishmentName}
        </Link>
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-bold">Produits</h2>
            <ul className="mt-4 divide-y divide-border">
              {current.lines.map((l) => (
                <li key={l.key} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{l.name}</p>
                    {l.options.length > 0 && <p className="text-xs text-muted">{l.options.map((o) => o.name).join(", ")}</p>}
                    <p className="tabular text-sm text-muted">{formatMoney(l.unitPrice)}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-surface-alt p-1">
                    <button type="button" aria-label="Moins" onClick={() => cart.setQuantity(l.key, l.quantity - 1)} className="grid size-8 place-items-center rounded-full hover:bg-surface">
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <span className="tabular w-6 text-center text-sm font-semibold">{l.quantity}</span>
                    <button type="button" aria-label="Plus" onClick={() => cart.setQuantity(l.key, l.quantity + 1)} className="grid size-8 place-items-center rounded-full hover:bg-surface">
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Adresse de livraison</h2>
              <Button variant="soft" className="h-9 px-3 text-xs" disabled={!center} onClick={() => setAdding(true)}>
                <Plus className="size-4" aria-hidden /> Nouvelle adresse
              </Button>
            </div>
            {!addresses ? (
              <div className="mt-4 h-20 animate-pulse rounded-field bg-surface-alt" />
            ) : addresses.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Ajoutez l&apos;adresse où vous serez livré.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {addresses.map((a) => (
                  <li key={a.id}>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-field border p-3 ${addressId === a.id ? "border-primary bg-primary-soft" : "border-border"}`}>
                      <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-[var(--primary)]" />
                      <span className="text-sm">
                        <span className="font-semibold">{a.label}</span> · {a.district}
                        <span className="block text-muted">{a.landmark}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-bold">Paiement</h2>
            {options.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucun moyen de paiement n&apos;est ouvert pour le moment.</p>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {options.map((o) => {
                  const Icon = methodIcon[o.method];
                  return (
                    <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-field border p-3 text-sm font-semibold ${method === o.method ? "border-primary bg-primary-soft" : "border-border"}`}>
                      <input type="radio" name="method" checked={method === o.method} onChange={() => setMethod(o.method)} className="sr-only" />
                      <Icon className="size-5 text-primary" aria-hidden />
                      {o.method === "cash" ? "Espèces à la livraison" : o.label}
                    </label>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit space-y-4 p-5 lg:sticky lg:top-24">
          <h2 className="font-bold">Récapitulatif</h2>
          {!addressId ? (
            <p className="text-sm text-muted">Choisissez une adresse pour calculer la livraison.</p>
          ) : !q ? (
            <div className="h-24 animate-pulse rounded-field bg-surface-alt" />
          ) : q.error || !q.value ? (
            <p className="text-sm font-medium text-danger">{q.error}</p>
          ) : (
            <>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Produits</dt>
                  <dd className="tabular">{formatMoney(q.value.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Livraison</dt>
                  <dd className="tabular">{formatMoney(q.value.delivery_fee)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold">
                  <dt>Total</dt>
                  <dd className="tabular">{formatMoney(q.value.total)}</dd>
                </div>
              </dl>
              {q.value.issues.length > 0 && (
                <div className="space-y-2 rounded-field bg-danger-soft p-3 text-sm text-danger">
                  {q.value.issues.map((i, k) => (
                    <p key={k} className="flex gap-2">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {i.issue === "restaurant_closed"
                        ? "L'établissement est fermé pour le moment."
                        : i.issue === "product_unavailable"
                          ? `« ${i.name} » n'est plus disponible.`
                          : `« ${i.name} » : choix d'options à revoir.`}
                    </p>
                  ))}
                  {q.value.issues.some((i) => i.product_id) && (
                    <button type="button" className="font-semibold underline" onClick={() => cart.removeProducts(q.value!.issues.map((i) => i.product_id!).filter(Boolean))}>
                      Retirer ces produits
                    </button>
                  )}
                </div>
              )}
              {q.value.couriers_available === false && (
                <p className="rounded-field bg-surface-alt p-3 text-xs text-muted">
                  Aucun livreur en ligne pour l&apos;instant : vous pouvez commander, un livreur prendra votre commande dès qu&apos;il sera disponible.
                </p>
              )}
            </>
          )}
          {phone === null && (
            <p className="text-sm text-warning">
              Ajoutez votre téléphone dans <Link href="/espace/profil" className="font-semibold underline">votre profil</Link> : le livreur doit pouvoir vous joindre.
            </p>
          )}
          <p className="flex items-start gap-2 text-xs text-muted">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Un code à 4 chiffres vous sera donné pour confirmer la livraison.
          </p>
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <Button onClick={placeOrder} disabled={blocked || busy} className="w-full">
            {busy ? "Commande en cours…" : method && method !== "cash" ? "Commander et payer" : "Commander"}
          </Button>
        </Card>
      </div>

      {adding && center && (
        <AddressDialog
          center={center}
          onClose={() => setAdding(false)}
          onSaved={(id) => {
            setAdding(false);
            setAddressId(id);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
