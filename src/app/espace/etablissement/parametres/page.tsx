"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Copy, ImagePlus, Plus, X } from "lucide-react";
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
      <h1 className="text-3xl font-extrabold tracking-tight">Profil et horaires</h1>
      <p className="mt-1 text-sm text-muted">
        Nom, adresse, commission et activation sont gérés par l&apos;équipe Tchopi. Le reste est modifiable ici.
      </p>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <ProfileCard />
        <HoursCard />
      </div>
    </>
  );
}

function ProfileCard() {
  const { establishment: e, reload } = useEstablishment();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  if (!e) return <div className="h-96 animate-pulse rounded-card bg-surface-alt" />;
  const cover = preview ?? mediaUrl(e.cover_path);

  async function save(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!e) return;
    const form = new FormData(ev.currentTarget);
    const phone = normalizePhone(String(form.get("phone")));
    const prep = Number(form.get("prep"));
    if (!phone) return setMessage({ ok: false, text: "Téléphone invalide." });
    if (!Number.isInteger(prep) || prep < 5 || prep > 120) return setMessage({ ok: false, text: "Préparation : entre 5 et 120 minutes." });
    setBusy(true);
    try {
      const coverPath = file ? await uploadEstablishmentImage(e.id, file, "cover") : e.cover_path;
      const { error } = await browserClient()
        .from("restaurants")
        .update({
          description: String(form.get("description")).trim() || null,
          category: String(form.get("category")).trim() || null,
          cover_path: coverPath,
          phone,
          prep_time_min: prep,
        })
        .eq("id", e.id);
      if (error) throw error;
      setFile(null);
      await reload();
      setMessage({ ok: true, text: "Profil enregistré." });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    }
    setBusy(false);
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">{e.name}</h2>
      <p className="text-sm text-muted">
        {e.district} · {e.landmark}
      </p>
      <form onSubmit={save} className="mt-6 space-y-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="relative grid h-40 w-full place-items-center overflow-hidden rounded-card border-2 border-dashed border-border bg-surface-alt text-muted hover:border-primary"
          aria-label="Changer la photo de couverture"
        >
          {cover ? <Image src={cover} alt="" fill sizes="600px" className="object-cover" /> : <ImagePlus className="size-8" aria-hidden />}
          <span className="absolute bottom-3 right-3 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink">Photo de couverture</span>
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f) {
              setFile(f);
              setPreview(URL.createObjectURL(f));
            }
          }}
        />
        <Field label="Catégorie affichée" hint="Ex. Maquis ivoirien, Pâtisserie, Épicerie, Pharmacie.">
          <input name="category" defaultValue={e.category ?? ""} maxLength={40} className={fieldClass} />
        </Field>
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
        </div>
        {message && <p className={`text-sm font-medium ${message.ok ? "text-primary" : "text-danger"}`}>{message.text}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer le profil"}
        </Button>
      </form>
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
