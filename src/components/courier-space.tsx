"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bike, Search, UserRound } from "lucide-react";
import { PeriodPicker } from "./admin-charts";
import { dialog, orThrow } from "./dialog";
import { EmptyState } from "./empty-state";
import { Badge, Button, Card, Field, fieldClass } from "./ui";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatMoney } from "@/lib/format";
import { periodRange, presetPeriod, type Period, type PeriodKey } from "@/lib/period";
import { browserClient } from "@/lib/supabase";

const courierPeriods: PeriodKey[] = ["day", "yesterday", "week", "month", "this_month", "custom"];
const groups: [string, string][] = [
  ["", "Tous"],
  ["pending", "En attente"],
  ["in_progress", "En cours"],
  ["delivered", "Livrées"],
  ["cancelled", "Annulées"],
];
const groupTone: Record<string, "success" | "warning" | "danger" | "neutral"> = { pending: "warning", in_progress: "warning", delivered: "success", cancelled: "danger" };
type Delivery = {
  id: string;
  number: string;
  group: string;
  pickup_name: string | null;
  pickup_district: string;
  pickup_landmark: string;
  dropoff_district: string;
  dropoff_landmark: string;
  distance_m: number;
  courier_earning: number;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
};
type Page = { summary: Record<string, number>; total: number; rows: Delivery[] };
const PAGE = 20;
const km = (m: number) => `${(m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;

/** Livraisons du livreur : du jour par défaut, filtres et pages calculés par le serveur (mêmes données que le mobile). */
export function CourierDeliveries() {
  const [period, setPeriod] = useState<Period>(() => presetPeriod("day"));
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ key: string; data: Page } | null>(null);
  const { p_from, p_to } = periodRange(period);
  const key = JSON.stringify([p_from, p_to, status, query, page]);

  useEffect(() => {
    let alive = true;
    const [from, to, st, q, pg] = JSON.parse(key) as [string, string, string, string, number];
    browserClient()
      .rpc("courier_deliveries", { p_from: from, p_to: to, p_status: st || null, p_query: q.trim() || null, p_limit: PAGE, p_offset: pg * PAGE })
      .then(({ data }) => alive && data && setResult({ key, data: data as Page }));
    return () => {
      alive = false;
    };
  }, [key]);

  const current = result?.key === key ? result.data : null;
  const s = current?.summary;
  const pages = Math.max(1, Math.ceil((current?.total ?? 0) / PAGE));
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <PeriodPicker value={period} onChange={reset(setPeriod)} choices={courierPeriods} />
        <label className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted" aria-hidden />
          <span className="sr-only">Numéro de commande</span>
          <input value={query} onChange={(e) => reset(setQuery)(e.target.value)} placeholder="N° de commande" className={`${fieldClass} h-9 pl-9`} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {groups.map(([k, label]) => (
          <button key={k} onClick={() => reset(setStatus)(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${status === k ? "bg-ink text-on-ink" : "bg-surface text-muted ring-1 ring-border"}`}>
            {label}
            {s ? ` (${k ? s[k] : s.total})` : ""}
          </button>
        ))}
      </div>
      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Livraisons terminées", s ? String(s.delivered) : "…"],
          ["Gains", s ? formatMoney(s.earnings) : "…"],
          ["Distance parcourue", s ? km(s.distance_m) : "…"],
          ["Offres refusées", s ? String(s.declined ?? 0) : "…"],
        ].map(([l, v]) => (
          <Card key={l} className="p-5">
            <p className="text-sm text-muted">{l}</p>
            <p className="tabular mt-1 text-2xl font-extrabold">{v}</p>
          </Card>
        ))}
      </section>
      <div className="mt-4">
        {!current ? (
          <div className="h-48 animate-pulse rounded-card bg-surface-alt" />
        ) : current.rows.length === 0 ? (
          <EmptyState icon={Bike} title="Aucune livraison" body="Aucune livraison ne correspond à ces filtres sur la période." />
        ) : (
          <Card className="divide-y divide-border">
            {current.rows.map((d) => (
              <details key={d.id} className="group p-4">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {d.pickup_name ?? d.pickup_district} → {d.dropoff_district}
                    </span>
                    <span className="text-xs text-muted">
                      {d.number} · {formatDateTime(d.assigned_at)} · {km(d.distance_m)}
                    </span>
                  </span>
                  <Badge tone={groupTone[d.group] ?? "neutral"}>{groups.find(([k]) => k === d.group)?.[1]}</Badge>
                  <span className="tabular w-24 text-right font-bold">{formatMoney(d.courier_earning)}</span>
                </summary>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold text-muted">Retrait</dt>
                    <dd>
                      {d.pickup_name ? `${d.pickup_name}, ` : ""}
                      {d.pickup_district} · {d.pickup_landmark}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-muted">Livraison</dt>
                    <dd>
                      {d.dropoff_district} · {d.dropoff_landmark}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-muted">Prise en charge</dt>
                    <dd>{d.picked_up_at ? formatDateTime(d.picked_up_at) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-muted">Livrée</dt>
                    <dd>{d.delivered_at ? formatDateTime(d.delivered_at) : "—"}</dd>
                  </div>
                </dl>
              </details>
            ))}
          </Card>
        )}
      </div>
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" className="h-9 px-4" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Précédentes
          </Button>
          <span className="tabular text-muted">
            Page {page + 1} / {pages}
          </span>
          <Button variant="outline" className="h-9 px-4" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
            Suivantes
          </Button>
        </nav>
      )}
    </>
  );
}

type Format = { code: string; kind: "id" | "plate"; label: string; pattern: string; example: string };
type CourierRow = {
  zone_id: string;
  vehicle_type: string;
  plate_number: string | null;
  photo_path: string;
  id_type: string | null;
  id_number: string | null;
  status: string;
};
const vehicles: [string, string][] = [
  ["motorbike", "Moto"],
  ["car", "Voiture"],
  ["bicycle", "Vélo"],
  ["on_foot", "À pied"],
];
/** Même normalisation que le serveur. */
const normalize = (v: string) => v.toUpperCase().replace(/[\s.\-/]/g, "");

/**
 * Dossier livreur : zone, moyen de transport, immatriculation (véhicule) ou pièce d'identité (à pied, à vélo) vérifiées
 * automatiquement sur les formats ivoiriens, adresse, photo. Un changement sensible repasse le dossier en validation.
 */
export function CourierProfileCard({ userId, onSubmitted }: { userId: string; onSubmitted?: () => void }) {
  const db = browserClient();
  const [data, setData] = useState<{ courier: CourierRow; formats: Format[]; zones: { id: string; name: string }[] } | null>(null);
  const [vehicle, setVehicle] = useState("motorbike");
  const [idType, setIdType] = useState("cni");
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      db.from("couriers").select("zone_id, vehicle_type, plate_number, photo_path, id_type, id_number, status").eq("user_id", userId).maybeSingle(),
      db.from("identity_formats").select("code, kind, label, pattern, example").eq("is_active", true).order("label"),
      db.from("zones").select("id, name").eq("is_active", true).order("name"),
    ]).then(([c, f, z]) => {
      if (!alive) return;
      const zones = z.data ?? [];
      // Sans dossier : nouvelle candidature (photo obligatoire).
      const courier = (c.data as CourierRow | null) ?? {
        zone_id: zones[0]?.id ?? "", vehicle_type: "motorbike", plate_number: null, photo_path: "", id_type: null, id_number: null, status: "",
      };
      setVehicle(courier.vehicle_type);
      setIdType(courier.id_type ?? "cni");
      setData({ courier, formats: (f.data ?? []) as Format[], zones });
    });
    return () => {
      alive = false;
    };
  }, [db, userId]);

  if (!data) return <div className="h-64 animate-pulse rounded-card bg-surface-alt" />;
  const { courier, formats } = data;
  const needsPlate = vehicle === "motorbike" || vehicle === "car";
  const idFormat = formats.find((f) => f.code === idType);
  const matches = (kind: string, value: string, code?: string) =>
    formats.filter((f) => f.kind === kind && (!code || f.code === code)).some((f) => new RegExp(f.pattern).test(normalize(value)));

  async function save(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = new FormData(ev.currentTarget);
    const plate = String(form.get("plate") ?? "");
    const idNumber = String(form.get("id_number") ?? "");
    // Vérification immédiate ; le serveur revérifie avec les mêmes formats.
    if (needsPlate && !matches("plate", plate)) return setMessage({ ok: false, text: "Immatriculation non reconnue : format ivoirien attendu (ex. 1234 AB 01)." });
    if (!needsPlate && !matches("id", idNumber, idType)) return setMessage({ ok: false, text: `Numéro non reconnu pour cette pièce (ex. ${idFormat?.example ?? ""}).` });
    if (!photo && !courier.photo_path) return setMessage({ ok: false, text: "Ajoutez une photo de votre visage." });
    setBusy(true);
    setMessage(null);
    try {
      let photoPath = courier.photo_path;
      if (photo) {
        photoPath = `${userId}/photo-${Date.now()}.jpg`;
        const up = await db.storage.from("couriers").upload(photoPath, photo, { contentType: photo.type });
        if (up.error) throw up.error;
      }
      const { data: saved, error } = await db.rpc("submit_courier_profile", {
        p_zone_id: String(form.get("zone")),
        p_vehicle_type: vehicle,
        p_plate_number: needsPlate ? plate : null,
        p_photo_path: photoPath,
        p_id_type: needsPlate ? null : idType,
        p_id_number: needsPlate ? null : idNumber,
      });
      if (error) throw error;
      const status = (saved as CourierRow).status;
      setMessage({ ok: true, text: status === "pending" && courier.status === "approved" ? "Enregistré : modification envoyée à l'équipe Tchopi pour validation." : "Dossier enregistré." });
      setData({ ...data!, courier: saved as CourierRow });
      setPhoto(null);
      onSubmitted?.();
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    }
    setBusy(false);
  }

  return (
    <Card className="p-6">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 sm:col-span-2">
          <span className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary">
            <UserRound className="size-7" aria-hidden />
          </span>
          <div>
            <Button variant="soft" className="h-9 px-4 text-xs" onClick={() => input.current?.click()}>
              {photo ? photo.name : "Changer la photo"}
            </Button>
            <p className="mt-1 text-xs text-muted">Photo de visage nette, vérifiée par l&apos;équipe Tchopi.</p>
          </div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </div>
        <Field label="Ville et zone d'activité">
          <select name="zone" defaultValue={courier.zone_id} className={fieldClass}>
            {data.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Moyen de transport">
          <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={fieldClass}>
            {vehicles.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        {needsPlate ? (
          <Field label="Immatriculation" hint="Format ivoirien, ex. 1234 AB 01.">
            <input name="plate" required defaultValue={courier.plate_number ?? ""} className={`${fieldClass} uppercase`} />
          </Field>
        ) : (
          <>
            <Field label="Pièce d'identité" hint="À pied ou à vélo, elle est vérifiée automatiquement.">
              <select value={idType} onChange={(e) => setIdType(e.target.value)} className={fieldClass}>
                {formats
                  .filter((f) => f.kind === "id")
                  .map((f) => (
                    <option key={f.code} value={f.code}>
                      {f.label}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Numéro de la pièce" hint={idFormat ? `Exemple : ${idFormat.example}` : undefined}>
              <input name="id_number" required defaultValue={courier.id_number ?? ""} className={`${fieldClass} uppercase`} />
            </Field>
          </>
        )}
        <p className="text-sm text-muted sm:col-span-2">
          Nom, téléphone et ville : ceux de votre compte,{" "}
          <Link href="/espace/profil" className="font-semibold text-primary hover:underline">
            à modifier dans Mon profil
          </Link>
          .
        </p>
        <p className="text-xs text-muted sm:col-span-2">
          {courier.status
            ? "Changer de zone, de véhicule, de plaque ou de pièce repasse votre dossier en validation."
            : "Votre dossier est vérifié par l'équipe Tchopi ; vous êtes prévenu de la décision."}
        </p>
        {message && (
          <p role="status" className={`text-sm font-medium sm:col-span-2 ${message.ok ? "text-primary" : "text-danger"}`}>
            {message.text}
          </p>
        )}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Enregistrement…" : courier.status ? "Enregistrer le dossier" : "Envoyer ma candidature"}
          </Button>
          {courier.status && (
          <Button
            variant="outline"
            className="text-danger"
            onClick={async () => {
              const done = await dialog.confirm({
                title: "Supprimer votre profil livreur ?",
                body: "Votre compte reste actif ; missions et gains passés sont conservés. Impossible avec une mission en cours ou des espèces à reverser.",
                tone: "danger",
                confirmLabel: "Supprimer",
                action: () => orThrow(db.rpc("delete_courier_profile")),
              });
              // Rôles relus au rechargement : le compte retrouve son espace client.
              if (done) window.location.replace(`${window.location.origin}/espace`);
            }}
          >
            Supprimer mon profil livreur
          </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
