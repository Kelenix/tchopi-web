"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Check, ChefHat, Clock, MapPin, PartyPopper } from "lucide-react";
import { MapPicker, type Point } from "@/components/map-picker";
import { useAccount } from "@/components/space-shell";
import { Button, ButtonLink, Card, Field, fieldClass } from "@/components/ui";
import type { Zone } from "@/lib/catalog";
import { errorMessage } from "@/lib/errors";
import { normalizePhone } from "@/lib/phone";
import { browserClient } from "@/lib/supabase";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const cuisines = ["Maquis ivoirien", "Grillades", "Fast-food", "Pâtisserie", "Pizzeria", "Cuisine africaine", "Libanais", "Asiatique"];
type Day = { open: boolean; opens_at: string; closes_at: string };
type Draft = {
  name: string;
  category: string;
  phone: string;
  description: string;
  zoneId: string;
  point: Point | null;
  district: string;
  landmark: string;
  hours: Day[];
};
const steps = [
  { title: "Votre restaurant", icon: ChefHat },
  { title: "Emplacement", icon: MapPin },
  { title: "Horaires", icon: Clock },
  { title: "Vérification", icon: Check },
];

/** Inscription guidée d'un restaurant (ADR-044) : en attente de validation par l'équipe, carte préparable tout de suite. */
export default function NewRestaurantPage() {
  const { roles } = useAccount();
  const db = browserClient();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [zones, setZones] = useState<Zone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    name: "",
    category: "",
    phone: "",
    description: "",
    zoneId: "",
    point: null,
    district: "",
    landmark: "",
    hours: days.map(() => ({ open: true, opens_at: "08:00", closes_at: "22:00" })),
  });
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    db.rpc("public_zones").then(({ data }) => {
      const list = (data ?? []) as Zone[];
      setZones(list);
      setDraft((d) => (d.zoneId ? d : { ...d, zoneId: list.find((z) => z.city === "Abidjan")?.id ?? list[0]?.id ?? "" }));
    });
  }, [db]);

  const zone = zones.find((z) => z.id === draft.zoneId);

  function validate(): string | null {
    if (step === 0) {
      if (draft.name.trim().length < 2) return "Indiquez le nom du restaurant.";
      if (!normalizePhone(draft.phone)) return "Téléphone invalide (ex. 07 01 02 03 04).";
    }
    if (step === 1) {
      if (!draft.point) return "Placez l'épingle sur votre restaurant.";
      if (draft.district.trim().length < 2) return "Indiquez le quartier.";
      if (draft.landmark.trim().length < 3) return "Ajoutez un point de repère pour les livreurs.";
    }
    if (step === 2) {
      if (!draft.hours.some((h) => h.open)) return "Ouvrez au moins un jour.";
      if (draft.hours.some((h) => h.open && h.closes_at <= h.opens_at)) return "Chaque jour ouvert doit fermer après son ouverture.";
    }
    return null;
  }

  function next() {
    const problem = validate();
    setError(problem);
    if (!problem) setStep((s) => s + 1);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const { error } = await db.rpc("register_restaurant", {
      p_zone_id: draft.zoneId,
      p_name: draft.name,
      p_category: draft.category,
      p_description: draft.description,
      p_phone: normalizePhone(draft.phone),
      p_latitude: draft.point!.lat,
      p_longitude: draft.point!.lng,
      p_district: draft.district,
      p_landmark: draft.landmark,
      p_hours: draft.hours.flatMap((h, i) => (h.open ? [{ weekday: i + 1, opens_at: h.opens_at, closes_at: h.closes_at }] : [])),
    });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    await db.rpc("complete_onboarding");
    setDone(true);
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <PartyPopper className="mx-auto size-12 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold">Demande envoyée !</h1>
        <p className="mt-2 text-muted">
          L&apos;équipe Tchopi vérifie votre restaurant (en général sous 48 h) et vous prévient. En attendant, préparez
          votre carte : vos produits seront visibles dès la validation.
        </p>
        {/* Rechargement complet : l'espace établissement apparaît avec les nouveaux rôles du compte. */}
        <a href="/espace/etablissement/produits?nouveau=1" className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary">
          Ajouter mes premiers produits
        </a>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Inscrire mon restaurant</h1>
      <p className="mt-1 text-muted">Quatre étapes, environ 3 minutes. L&apos;inscription est gratuite.</p>
      {roles.restaurant_ids.length > 0 && (
        <p className="mt-4 rounded-field bg-surface-alt px-4 py-3 text-sm">
          Vous gérez déjà un restaurant.{" "}
          <ButtonLink href="/espace/etablissement" variant="ghost" className="h-auto px-0 text-primary">
            Ouvrir mon espace
          </ButtonLink>
        </p>
      )}

      <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Étapes">
        {steps.map((s, i) => (
          <li key={s.title} className="space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
                transition={{ duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className={`flex items-center gap-1.5 text-xs font-semibold ${i <= step ? "text-ink" : "text-muted"}`}>
              <s.icon className="size-3.5" aria-hidden /> <span className="hidden sm:inline">{s.title}</span>
            </p>
          </li>
        ))}
      </ol>

      <Card className="mt-6 overflow-hidden p-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold">{steps[step].title}</h2>
            {step === 0 && (
              <>
                <Field label="Nom du restaurant">
                  <input value={draft.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} autoFocus className={fieldClass} />
                </Field>
                <Field label="Type de cuisine">
                  <input value={draft.category} onChange={(e) => set({ category: e.target.value })} list="cuisines" maxLength={40} placeholder="Maquis ivoirien" className={fieldClass} />
                  <datalist id="cuisines">
                    {cuisines.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Téléphone du restaurant" hint="Joignable par les livreurs et l'équipe.">
                  <input value={draft.phone} onChange={(e) => set({ phone: e.target.value })} type="tel" placeholder="07 01 02 03 04" className={fieldClass} />
                </Field>
                <Field label="Présentation (facultatif)">
                  <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} maxLength={500} rows={3} placeholder="Spécialités, ambiance…" className={`${fieldClass} h-auto py-3`} />
                </Field>
              </>
            )}
            {step === 1 && (
              <>
                <Field label="Ville">
                  <select value={draft.zoneId} onChange={(e) => set({ zoneId: e.target.value, point: null })} className={fieldClass}>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {zone && (
                  <MapPicker
                    key={zone.id}
                    initial={draft.point ?? { lat: zone.center_lat, lng: zone.center_lng }}
                    onChange={(point) => set({ point })}
                  />
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Quartier">
                    <input value={draft.district} onChange={(e) => set({ district: e.target.value })} maxLength={80} placeholder="Cocody Riviera 2" className={fieldClass} />
                  </Field>
                  <Field label="Point de repère">
                    <input value={draft.landmark} onChange={(e) => set({ landmark: e.target.value })} maxLength={160} placeholder="Face à la pharmacie" className={fieldClass} />
                  </Field>
                </div>
              </>
            )}
            {step === 2 && (
              <ul className="divide-y divide-border">
                {draft.hours.map((h, i) => (
                  <li key={days[i]} className="flex flex-wrap items-center gap-3 py-3">
                    <label className="flex w-32 items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={h.open}
                        onChange={(e) => set({ hours: draft.hours.map((x, k) => (k === i ? { ...x, open: e.target.checked } : x)) })}
                        className="size-4 accent-[var(--primary)]"
                      />
                      {days[i]}
                    </label>
                    {h.open ? (
                      <span className="flex items-center gap-2">
                        {(["opens_at", "closes_at"] as const).map((k, j) => (
                          <input
                            key={k}
                            type="time"
                            value={h[k]}
                            aria-label={`${days[i]} ${j ? "fermeture" : "ouverture"}`}
                            onChange={(e) => set({ hours: draft.hours.map((x, n) => (n === i ? { ...x, [k]: e.target.value } : x)) })}
                            className={`${fieldClass} h-10 w-32`}
                          />
                        ))}
                      </span>
                    ) : (
                      <span className="text-sm text-muted">Fermé</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {step === 3 && (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Restaurant", draft.name],
                  ["Cuisine", draft.category || "—"],
                  ["Téléphone", normalizePhone(draft.phone) ?? draft.phone],
                  ["Ville", zone?.name ?? ""],
                  ["Adresse", `${draft.district} · ${draft.landmark}`],
                  ["Jours d'ouverture", draft.hours.filter((h) => h.open).length + " / 7"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-field bg-surface-alt p-3">
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
                <p className="text-muted sm:col-span-2">
                  En envoyant, vous acceptez que l&apos;équipe Tchopi vérifie ces informations. Commission appliquée sur
                  les ventes : communiquée lors de la validation.
                </p>
              </dl>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-between gap-3">
          <Button variant="ghost" onClick={() => (setError(null), setStep((s) => s - 1))} disabled={step === 0}>
            Retour
          </Button>
          {step < 3 ? (
            <Button onClick={next}>Continuer</Button>
          ) : (
            <Button onClick={submit} disabled={busy}>
              {busy ? "Envoi…" : "Envoyer ma demande"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
