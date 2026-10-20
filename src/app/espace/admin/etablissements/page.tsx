"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Check, Plus, Store, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MapPicker, type Point } from "@/components/map-picker";
import { Badge, Button, Card, Field, fieldClass } from "@/components/ui";
import { parseIdentifier } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { browserClient } from "@/lib/supabase";

type Zone = { id: string; name: string; city: string; center_lat: number; center_lng: number };
type Establishment = {
  id: string;
  zone_id: string;
  kind: "restaurant" | "shop";
  name: string;
  description: string | null;
  category: string | null;
  phone: string;
  latitude: number;
  longitude: number;
  district: string;
  landmark: string;
  commission_rate: number;
  is_active: boolean;
  is_open: boolean;
  review_status: "pending" | "approved" | "rejected";
  created_at: string;
};
type Application = {
  id: string;
  kind: "restaurant" | "shop";
  business_name: string;
  contact_name: string;
  phone: string;
  email: string | null;
  city: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function AdminEstablishmentsPage() {
  return (
    <Suspense>
      <Establishments />
    </Suspense>
  );
}

function Establishments() {
  const db = browserClient();
  const [tab, setTab] = useState<"list" | "pending" | "applications">(useSearchParams().get("onglet") === "a-valider" ? "pending" : "list");
  const [items, setItems] = useState<Establishment[] | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [apps, setApps] = useState<Application[] | null>(null);
  const [editing, setEditing] = useState<Establishment | "new" | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([
      db.from("restaurants").select("*, is_open").order("name"),
      db.from("zones").select("id, name, city, center_lat, center_lng").order("city"),
      db.from("partner_applications").select("*").order("created_at", { ascending: false }).limit(100),
    ]).then(([r, z, a]) => {
      if (!alive) return;
      setItems((r.data ?? []) as Establishment[]);
      setZones((z.data ?? []) as Zone[]);
      setApps((a.data ?? []) as Application[]);
    });
    return () => {
      alive = false;
    };
  }, [db, version]);

  const pending = apps?.filter((a) => a.status === "pending").length ?? 0;
  const toReview = items?.filter((e) => e.review_status === "pending") ?? [];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">Restaurants</h1>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden /> Nouveau restaurant
        </Button>
      </div>
      <div role="tablist" className="mt-6 flex w-fit gap-1 rounded-full bg-surface-alt p-1">
        {(
          [
            ["list", `Restaurants${items ? ` (${items.length})` : ""}`],
            ["pending", `À valider${toReview.length ? ` (${toReview.length})` : ""}`],
            ["applications", `Anciennes candidatures${pending ? ` (${pending})` : ""}`],
          ] as const
        ).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`h-10 rounded-full px-4 text-sm font-semibold ${tab === key ? "bg-surface shadow-float" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "pending" ? (
          <PendingRestaurants items={toReview} zones={zones} onChange={() => setVersion((v) => v + 1)} />
        ) : tab === "list" ? (
          !items ? (
            <div className="h-48 animate-pulse rounded-card bg-surface-alt" />
          ) : items.length === 0 ? (
            <EmptyState icon={Store} title="Aucun établissement" />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
              {items.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => setEditing(e)} className="flex w-full flex-wrap items-center gap-3 p-4 text-left hover:bg-surface-alt">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{e.name}</span>
                      <span className="text-xs text-muted">
                        {zones.find((z) => z.id === e.zone_id)?.city} · {e.district} · commission {e.commission_rate} %
                      </span>
                    </span>
                    {e.review_status === "pending" ? (
                      <Badge tone="warning">À valider</Badge>
                    ) : !e.is_active ? <Badge tone="danger">Désactivé</Badge> : <Badge tone={e.is_open ? "success" : "neutral"}>{e.is_open ? "Ouvert" : "Fermé"}</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <Applications apps={apps} onChange={() => setVersion((v) => v + 1)} />
        )}
      </div>

      {editing && zones.length > 0 && (
        <EstablishmentEditor
          establishment={editing === "new" ? null : editing}
          zones={zones}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </>
  );
}

/** Restaurants inscrits par leur gérant (ADR-044) : validation avec la commission, ou refus motivé. */
function PendingRestaurants({ items, zones, onChange }: { items: Establishment[]; zones: Zone[]; onChange: () => void }) {
  const [error, setError] = useState<string | null>(null);
  if (!items.length) return <EmptyState icon={Store} title="Aucun restaurant à valider" body="Les inscriptions faites sur le site arrivent ici." />;
  async function review(e: Establishment, approved: boolean) {
    const commission = approved ? Number(prompt(`Commission pour ${e.name} (%)`, "15")) : null;
    if (approved && (!Number.isFinite(commission) || commission! < 0 || commission! > 100)) return;
    const reason = approved ? null : prompt("Motif du refus (communiqué au gérant)")?.trim();
    if (!approved && !reason) return;
    const { error } = await browserClient().rpc("admin_review_restaurant", {
      p_id: e.id,
      p_approved: approved,
      p_commission_rate: commission,
      p_reason: reason,
    });
    setError(error ? errorMessage(error) : null);
    onChange();
  }
  return (
    <>
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      <ul className="grid gap-4 lg:grid-cols-2">
        {items.map((e) => (
          <li key={e.id}>
            <Card className="space-y-2 p-5">
              <p className="font-bold">{e.name}</p>
              <p className="text-sm text-muted">
                {e.category ?? "Cuisine non précisée"} · {zones.find((z) => z.id === e.zone_id)?.city} · {e.district}
              </p>
              <p className="text-sm">
                <a href={`tel:${e.phone}`} className="text-primary">
                  {e.phone}
                </a>{" "}
                · inscrit le {formatDateTime(e.created_at)}
              </p>
              {e.description && <p className="text-sm text-muted">{e.description}</p>}
              <div className="flex gap-2 pt-2">
                <Button className="h-9 px-3 text-xs" onClick={() => review(e, true)}>
                  <Check className="size-4" aria-hidden /> Valider
                </Button>
                <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => review(e, false)}>
                  Refuser
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

function Applications({ apps, onChange }: { apps: Application[] | null; onChange: () => void }) {
  const [error, setError] = useState<string | null>(null);
  if (!apps) return <div className="h-48 animate-pulse rounded-card bg-surface-alt" />;
  if (!apps.length) return <EmptyState icon={Store} title="Aucune candidature" body="Les demandes envoyées depuis la page d'accueil arrivent ici." />;
  async function review(id: string, status: "approved" | "rejected") {
    const { error } = await browserClient().rpc("admin_review_partner_application", { p_id: id, p_status: status });
    setError(error ? errorMessage(error) : null);
    onChange();
  }
  return (
    <>
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      <ul className="grid gap-4 lg:grid-cols-2">
        {apps.map((a) => (
          <li key={a.id}>
            <Card className="space-y-2 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{a.business_name}</p>
                  <p className="text-xs text-muted">
                    {a.city} · {formatDateTime(a.created_at)}
                  </p>
                </div>
                <Badge tone={a.status === "pending" ? "warning" : a.status === "approved" ? "success" : "danger"}>
                  {{ pending: "À examiner", approved: "Acceptée", rejected: "Refusée" }[a.status]}
                </Badge>
              </div>
              <p className="text-sm">
                {a.contact_name} ·{" "}
                <a href={`tel:${a.phone}`} className="text-primary">
                  {a.phone}
                </a>
                {a.email && ` · ${a.email}`}
              </p>
              {a.message && <p className="text-sm text-muted">{a.message}</p>}
              {a.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button className="h-9 px-3 text-xs" onClick={() => review(a.id, "approved")}>
                    <Check className="size-4" aria-hidden /> Accepter
                  </Button>
                  <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => review(a.id, "rejected")}>
                    Refuser
                  </Button>
                </div>
              )}
              {a.status === "approved" && <p className="text-xs text-muted">Créez l&apos;établissement puis invitez son gérant avec ce numéro.</p>}
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

function EstablishmentEditor({
  establishment: e,
  zones,
  onClose,
  onSaved,
}: {
  establishment: Establishment | null;
  zones: Zone[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const db = browserClient();
  const [zoneId, setZoneId] = useState(e?.zone_id ?? zones[0].id);
  const zone = zones.find((z) => z.id === zoneId)!;
  const [point, setPoint] = useState<Point>(e ? { lat: e.latitude, lng: e.longitude } : { lat: zone.center_lat, lng: zone.center_lng });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = new FormData(ev.currentTarget);
    const phone = normalizePhone(String(form.get("phone")));
    if (!phone) return setError("Téléphone invalide.");
    setBusy(true);
    const { error } = await db.rpc("admin_save_restaurant", {
      p_id: e?.id ?? null,
      p_zone_id: zoneId,
      p_name: form.get("name"),
      p_description: form.get("description"),
      p_category: form.get("category"),
      p_phone: phone,
      p_latitude: point.lat,
      p_longitude: point.lng,
      p_district: form.get("district"),
      p_landmark: form.get("landmark"),
      p_commission_rate: Number(form.get("commission")),
      p_is_active: form.get("active") === "on",
    });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative h-full w-full max-w-2xl overflow-y-auto bg-surface shadow-float">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-xl font-extrabold">{e ? e.name : "Nouvel établissement"}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid size-9 place-items-center rounded-full hover:bg-surface-alt">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Nom">
            <input name="name" required minLength={2} maxLength={80} defaultValue={e?.name} className={fieldClass} />
          </Field>
          <Field label="Catégorie">
            <input name="category" maxLength={40} defaultValue={e?.category ?? ""} className={fieldClass} />
          </Field>
          <Field label="Téléphone">
            <input name="phone" required defaultValue={e?.phone} className={fieldClass} />
          </Field>
          <Field label="Description">
            <input name="description" maxLength={500} defaultValue={e?.description ?? ""} className={fieldClass} />
          </Field>
          <Field label="Commission (%)">
            <input name="commission" type="number" min={0} max={100} step="0.5" required defaultValue={e?.commission_rate ?? 15} className={fieldClass} />
          </Field>
          <Field label="Ville / zone">
            <select value={zoneId} onChange={(ev) => setZoneId(ev.target.value)} className={fieldClass}>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quartier">
            <input name="district" required minLength={2} maxLength={80} defaultValue={e?.district} className={fieldClass} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Point de repère">
              <input name="landmark" required minLength={3} maxLength={160} defaultValue={e?.landmark} className={fieldClass} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-semibold">Position (retrait des commandes)</p>
            <MapPicker key={zoneId} initial={e && e.zone_id === zoneId ? point : { lat: zone.center_lat, lng: zone.center_lng }} onChange={setPoint} />
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2">
            <input type="checkbox" name="active" defaultChecked={e?.is_active ?? true} className="size-4 accent-[var(--primary)]" />
            Actif (visible des clients)
          </label>
          {error && <p className="text-sm font-medium text-danger sm:col-span-2">{error}</p>}
          <Button type="submit" disabled={busy} className="sm:col-span-2">
            {busy ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
        {e && (
          <div className="space-y-6 border-t border-border p-5">
            <Members establishmentId={e.id} />
            <AffiliatedCouriers establishmentId={e.id} zoneId={e.zone_id} />
          </div>
        )}
      </div>
    </div>
  );
}

function Members({ establishmentId }: { establishmentId: string }) {
  const db = browserClient();
  const [members, setMembers] = useState<{ id: string; user_id: string | null; login_email: string | null; login_phone: string | null }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    db.from("restaurant_members")
      .select("id, user_id, login_email, login_phone")
      .eq("restaurant_id", establishmentId)
      .then(({ data }) => alive && setMembers(data ?? []));
    return () => {
      alive = false;
    };
  }, [db, establishmentId, version]);

  async function invite(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const target = ev.currentTarget;
    const id = parseIdentifier(String(new FormData(target).get("login")));
    if (!id) return setError("Email ou téléphone invalide.");
    const { error } = await db.rpc("admin_invite_member", {
      p_restaurant_id: establishmentId,
      p_email: id.kind === "email" ? id.value : null,
      p_phone: id.kind === "phone" ? id.value : null,
    });
    setError(error ? errorMessage(error) : null);
    if (!error) target.reset();
    setVersion((v) => v + 1);
  }

  return (
    <section>
      <h3 className="font-bold">Gérants</h3>
      <p className="text-xs text-muted">Le gérant se connecte avec cet email ou ce numéro (accès relié dès que le compte existe).</p>
      <ul className="mt-3 space-y-2">
        {members?.map((m) => (
          <li key={m.id} className="flex items-center gap-3 text-sm">
            <span className="flex-1">{m.login_email ?? m.login_phone}</span>
            <Badge tone={m.user_id ? "success" : "warning"}>{m.user_id ? "Compte relié" : "Invitation en attente"}</Badge>
            <button
              type="button"
              aria-label="Retirer ce gérant"
              onClick={async () => {
                if (!confirm("Retirer l'accès de ce gérant ?")) return;
                const { error } = await db.rpc("admin_remove_member", { p_member_id: m.id });
                setError(error ? errorMessage(error) : null);
                setVersion((v) => v + 1);
              }}
              className="grid size-8 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={invite} className="mt-3 flex gap-2">
        <input name="login" required placeholder="Email ou téléphone du gérant" aria-label="Email ou téléphone du gérant" className={fieldClass} />
        <Button type="submit" variant="ink">
          Inviter
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}

function AffiliatedCouriers({ establishmentId, zoneId }: { establishmentId: string; zoneId: string }) {
  const db = browserClient();
  const [couriers, setCouriers] = useState<{ user_id: string; profile: { first_name: string | null; last_name: string | null } | null }[]>([]);
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([
      db.from("couriers").select("user_id, profile:profiles(first_name, last_name)").eq("zone_id", zoneId).eq("status", "approved"),
      db.from("restaurant_couriers").select("courier_id").eq("restaurant_id", establishmentId),
    ]).then(([c, a]) => {
      if (!alive) return;
      setCouriers((c.data ?? []) as unknown as typeof couriers);
      setSelected(new Set((a.data ?? []).map((x) => x.courier_id as string)));
    });
    return () => {
      alive = false;
    };
  }, [db, establishmentId, zoneId]);
  if (!selected) return null;
  return (
    <section>
      <h3 className="font-bold">Livreurs affiliés</h3>
      <p className="text-xs text-muted">Cochés : seuls eux reçoivent les commandes de l&apos;établissement. Aucun coché : tous les livreurs de la zone.</p>
      {couriers.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Aucun livreur approuvé dans cette zone.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {couriers.map((c) => (
            <li key={c.user_id}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(c.user_id)}
                  onChange={(ev) => {
                    const next = new Set(selected);
                    if (ev.target.checked) next.add(c.user_id);
                    else next.delete(c.user_id);
                    setSelected(next);
                  }}
                  className="size-4 accent-[var(--primary)]"
                />
                {[c.profile?.first_name, c.profile?.last_name].filter(Boolean).join(" ") || "Livreur"}
              </label>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="soft"
        className="mt-3 h-9 px-3 text-xs"
        onClick={async () => {
          const { error } = await db.rpc("admin_set_restaurant_couriers", { p_restaurant_id: establishmentId, p_courier_ids: [...selected] });
          setMessage(error ? errorMessage(error) : "Livreurs affiliés enregistrés.");
        }}
      >
        Enregistrer les livreurs affiliés
      </Button>
      {message && <p className="mt-2 text-sm text-muted">{message}</p>}
    </section>
  );
}
