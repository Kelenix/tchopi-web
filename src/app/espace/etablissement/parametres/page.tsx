"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Copy, ImagePlus, Plus, X } from "lucide-react";
import { dialog, orThrow } from "@/components/dialog";
import { MapPicker, type Point } from "@/components/map-picker";
import { Button, Card, Field, fieldClass } from "@/components/ui";
import { useEstablishment } from "@/lib/establishment";
import { mediaUrl } from "@/lib/env";
import { errorMessage } from "@/lib/errors";
import { uploadEstablishmentImage } from "@/lib/media";
import { normalizePhone } from "@/lib/phone";
import { browserClient } from "@/lib/supabase";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
type Range = { opens_at: string; closes_at: string };

export default function SettingsPage() {
  return (
    <>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Profil et horaires</h1>
      <p className="mt-1 text-sm text-muted">Informations visibles des clients. La commission et la validation restent gérées par l&apos;équipe Tchopi.</p>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <ProfileCard />
        <div className="space-y-6">
          <HoursCard />
          <AdminInfoCard />
        </div>
      </div>
    </>
  );
}

function ImagePick({ label, current, onPick, round }: { label: string; current: string | null; onPick: (f: File) => void; round?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`relative grid place-items-center overflow-hidden border-2 border-dashed border-border bg-surface-alt text-muted hover:border-primary ${round ? "size-28 shrink-0 rounded-full" : "h-28 flex-1 rounded-card"}`}
        aria-label={`Changer : ${label}`}
      >
        {current ? <Image src={current} alt="" fill sizes="400px" className="object-cover" /> : <ImagePlus className="size-7" aria-hidden />}
        <span className="absolute bottom-2 rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink">{label}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          if (f && f.size <= 10_000_000) onPick(f);
        }}
      />
    </>
  );
}

function ProfileCard() {
  const { establishment: e, reload } = useEstablishment();
  const [files, setFiles] = useState<{ cover?: File; logo?: File }>({});
  const [previews, setPreviews] = useState<{ cover?: string; logo?: string }>({});
  const [point, setPoint] = useState<Point | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!e) return <div className="h-96 animate-pulse rounded-card bg-surface-alt" />;
  const pick = (kind: "cover" | "logo") => (f: File) => {
    setFiles((x) => ({ ...x, [kind]: f }));
    setPreviews((x) => ({ ...x, [kind]: URL.createObjectURL(f) }));
  };

  async function save(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!e) return;
    const form = new FormData(ev.currentTarget);
    const text = (k: string) => String(form.get(k) ?? "").trim();
    const phone = normalizePhone(text("phone"));
    const prep = Number(form.get("prep"));
    // Mêmes règles que la base, qui revérifie tout.
    if (text("name").length < 2) return setMessage({ ok: false, text: "Nom : 2 caractères au moins." });
    if (!phone) return setMessage({ ok: false, text: "Téléphone invalide." });
    if (!Number.isInteger(prep) || prep < 5 || prep > 120) return setMessage({ ok: false, text: "Préparation : entre 5 et 120 minutes." });
    if (text("district").length < 2 || text("landmark").length < 3) return setMessage({ ok: false, text: "Indiquez le quartier et un repère." });
    setBusy(true);
    setMessage(null);
    try {
      const db = browserClient();
      if (files.cover || files.logo) {
        const images = {
          cover_path: files.cover ? await uploadEstablishmentImage(e.id, files.cover, "cover") : e.cover_path,
          logo_path: files.logo ? await uploadEstablishmentImage(e.id, files.logo, "logo") : e.logo_path,
        };
        const { error } = await db.from("restaurants").update(images).eq("id", e.id);
        if (error) throw error;
      }
      const at = point ?? { lat: e.latitude, lng: e.longitude };
      const { error } = await db.rpc("restaurant_update_profile", {
        p_id: e.id,
        p_name: text("name"),
        p_description: text("description"),
        p_category: text("category"),
        p_phone: phone,
        p_district: text("district"),
        p_landmark: text("landmark"),
        p_latitude: at.lat,
        p_longitude: at.lng,
        p_prep_time_min: prep,
      });
      if (error) throw error;
      setFiles({});
      await reload();
      setMessage({ ok: true, text: "Profil enregistré : visible des clients immédiatement." });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    }
    setBusy(false);
  }

  return (
    <Card className="p-6">
      <form onSubmit={save} className="space-y-4">
        <div className="flex gap-4">
          <ImagePick label="Logo" round current={previews.logo ?? mediaUrl(e.logo_path)} onPick={pick("logo")} />
          <ImagePick label="Couverture" current={previews.cover ?? mediaUrl(e.cover_path)} onPick={pick("cover")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom commercial">
            <input name="name" required minLength={2} maxLength={80} defaultValue={e.name} className={fieldClass} />
          </Field>
          <Field label="Catégorie affichée" hint="Ex. Maquis ivoirien, Pâtisserie, Grillades.">
            <input name="category" defaultValue={e.category ?? ""} maxLength={40} className={fieldClass} />
          </Field>
        </div>
        <Field label="Description">
          <textarea name="description" defaultValue={e.description ?? ""} maxLength={500} rows={3} className={`${fieldClass} h-auto py-3`} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Téléphone de l'établissement">
            <input name="phone" type="tel" required defaultValue={e.phone} className={fieldClass} />
          </Field>
          <Field label="Préparation moyenne (min)">
            <input name="prep" type="number" min={5} max={120} required defaultValue={e.prep_time_min} className={fieldClass} />
          </Field>
          <Field label="Quartier">
            <input name="district" required minLength={2} maxLength={80} defaultValue={e.district} className={fieldClass} />
          </Field>
          <Field label="Repère" hint="Ce qui aide le livreur à vous trouver.">
            <input name="landmark" required minLength={3} maxLength={160} defaultValue={e.landmark} className={fieldClass} />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Position (retrait des commandes)</p>
          <MapPicker initial={{ lat: e.latitude, lng: e.longitude }} onChange={setPoint} />
        </div>
        {message && (
          <p role="status" className={`text-sm font-medium ${message.ok ? "text-primary" : "text-danger"}`}>
            {message.text}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer le profil"}
        </Button>
      </form>
    </Card>
  );
}

/** Statut et informations administratives ; désactivation demandée par le responsable (historique conservé). */
function AdminInfoCard() {
  const { establishment: e, reload } = useEstablishment();
  if (!e) return null;
  const status = e.review_status === "pending" ? "En cours de validation" : e.review_status === "rejected" ? "Refusé" : e.is_active ? "Actif" : "Désactivé";
  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">Informations administratives</h2>
      <dl className="mt-4 space-y-2 text-sm">
        {(
          [
            ["Statut", status],
            ["Type", e.kind === "shop" ? "Commerce" : "Restaurant"],
            ["Commission Tchopi", `${e.commission_rate} % des produits`],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-muted">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {e.is_active && (
        <div className="mt-6 rounded-field border border-danger/40 p-4">
          <p className="text-sm font-semibold">Désactiver l&apos;établissement</p>
          <p className="mt-1 text-xs text-muted">
            Il disparaît des clients ; commandes et paiements passés sont conservés. Impossible tant qu&apos;une commande est en cours.
            Pour une réouverture ou une suppression définitive, contactez l&apos;équipe Tchopi.
          </p>
          <Button
            variant="outline"
            className="mt-3 h-9 px-4 text-xs text-danger"
            onClick={async () => {
              const done = await dialog.prompt({
                title: `Désactiver ${e.name} ?`,
                body: "Les clients ne verront plus votre carte. Seule l'équipe Tchopi peut la réactiver.",
                tone: "danger",
                confirmLabel: "Désactiver",
                fields: [{ name: "reason", label: "Motif (facultatif)", type: "textarea" }],
                action: (v) => orThrow(browserClient().rpc("restaurant_request_deactivation", { p_id: e.id, p_reason: v.reason || null })),
              });
              if (done) await reload();
            }}
          >
            Désactiver…
          </Button>
        </div>
      )}
    </Card>
  );
}

function HoursCard() {
  const { id } = useEstablishment();
  const [hours, setHours] = useState<Range[][] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    browserClient()
      .from("opening_hours")
      .select("weekday, opens_at, closes_at")
      .eq("restaurant_id", id)
      .order("weekday")
      .order("opens_at")
      .then(({ data }) => {
        if (!alive) return;
        const week: Range[][] = days.map(() => []);
        for (const h of data ?? []) week[h.weekday - 1].push({ opens_at: h.opens_at.slice(0, 5), closes_at: h.closes_at.slice(0, 5) });
        setHours(week);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (!hours) return <div className="h-96 animate-pulse rounded-card bg-surface-alt" />;
  const set = (day: number, ranges: Range[]) => setHours(hours.map((r, i) => (i === day ? ranges : r)));

  async function save() {
    if (!hours) return;
    const invalid = hours.some((ranges) => ranges.some((r) => !r.opens_at || !r.closes_at || r.closes_at <= r.opens_at));
    if (invalid) return setMessage({ ok: false, text: "Chaque plage doit fermer après son ouverture (même jour)." });
    setBusy(true);
    const { error } = await browserClient().rpc("save_opening_hours", {
      p_restaurant_id: id,
      p_hours: hours.flatMap((ranges, i) => ranges.map((r) => ({ weekday: i + 1, opens_at: r.opens_at, closes_at: r.closes_at }))),
    });
    setBusy(false);
    setMessage(error ? { ok: false, text: errorMessage(error) } : { ok: true, text: "Horaires enregistrés." });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Horaires d&apos;ouverture</h2>
        <Button variant="soft" className="h-9 px-3 text-xs" onClick={() => setHours(hours.map(() => hours[0].map((r) => ({ ...r }))))}>
          <Copy className="size-3.5" aria-hidden /> Lundi pour toute la semaine
        </Button>
      </div>
      <ul className="mt-6 divide-y divide-border">
        {days.map((day, i) => (
          <li key={day} className="flex flex-wrap items-start gap-3 py-3">
            <span className="w-24 pt-2 text-sm font-semibold">{day}</span>
            <div className="flex-1 space-y-2">
              {hours[i].length === 0 && <p className="pt-2 text-sm text-muted">Fermé</p>}
              {hours[i].map((r, j) => (
                <div key={j} className="flex items-center gap-2">
                  <input type="time" value={r.opens_at} aria-label={`${day} ouverture`} onChange={(e) => set(i, hours[i].map((x, k) => (k === j ? { ...x, opens_at: e.target.value } : x)))} className={`${fieldClass} h-10 w-32`} />
                  <span className="text-muted">–</span>
                  <input type="time" value={r.closes_at} aria-label={`${day} fermeture`} onChange={(e) => set(i, hours[i].map((x, k) => (k === j ? { ...x, closes_at: e.target.value } : x)))} className={`${fieldClass} h-10 w-32`} />
                  <button type="button" aria-label="Retirer la plage" onClick={() => set(i, hours[i].filter((_, k) => k !== j))} className="grid size-9 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => set(i, [...hours[i], { opens_at: "08:00", closes_at: "22:00" }])} className="inline-flex items-center gap-1 pt-2 text-sm font-semibold text-primary">
              <Plus className="size-4" aria-hidden /> Plage
            </button>
          </li>
        ))}
      </ul>
      {message && <p className={`mt-4 text-sm font-medium ${message.ok ? "text-primary" : "text-danger"}`}>{message.text}</p>}
      <Button onClick={save} disabled={busy} className="mt-4">
        {busy ? "Enregistrement…" : "Enregistrer les horaires"}
      </Button>
    </Card>
  );
}
