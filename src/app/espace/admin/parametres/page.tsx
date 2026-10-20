"use client";

import { Drawer } from "@/components/dialog";
import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { MapPicker, type Point } from "@/components/map-picker";
import { Badge, Button, Card, Field, fieldClass } from "@/components/ui";
import type { PlatformSettings } from "@/lib/admin";
import { errorMessage } from "@/lib/errors";
import { normalizePhone } from "@/lib/phone";
import { browserClient } from "@/lib/supabase";

type Zone = { id: string; name: string; city: string; center_lat: number; center_lng: number; radius_m: number; is_active: boolean };
type Rule = {
  zone_id: string;
  service: "food" | "parcel";
  base_fee: number;
  per_km_fee: number;
  min_fee: number;
  max_fee: number;
  courier_base: number;
  courier_per_km: number;
  rounding_step: number;
  detour_factor: number;
};
const ruleFields: [keyof Rule, string][] = [
  ["base_fee", "Base"],
  ["per_km_fee", "Par km"],
  ["min_fee", "Minimum"],
  ["max_fee", "Maximum"],
  ["rounding_step", "Arrondi au"],
  ["courier_base", "Livreur : base"],
  ["courier_per_km", "Livreur : par km"],
  ["detour_factor", "Détour (secours)"],
];
// Grille par défaut (ADR-046) : 500 F + 100 F par km de route.
const defaults: Partial<Rule> = { base_fee: 500, per_km_fee: 100, min_fee: 500, max_fee: 50000, rounding_step: 5, detour_factor: 1.3 };

export default function AdminSettingsPage() {
  return (
    <>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Zones et paramètres</h1>
      <div className="mt-8 space-y-8">
        <SettingsCard />
        <Zones />
      </div>
    </>
  );
}

function SettingsCard() {
  const db = browserClient();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    db.from("settings").select().single().then(({ data }) => setSettings(data as PlatformSettings));
  }, [db]);
  if (!settings) return <div className="h-48 animate-pulse rounded-card bg-surface-alt" />;

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const minutes = (k: string) => Math.round(Number(form.get(k)) * 60);
    const rawPhone = String(form.get("support")).trim();
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    if (rawPhone && !phone) return setMessage({ ok: false, text: "Téléphone du support invalide." });
    const values = {
      restaurant_timeout_s: minutes("restaurant"),
      payment_timeout_s: minutes("payment"),
      dispatch_alert_s: minutes("alert"),
      dispatch_cancel_s: minutes("cancel"),
      support_phone: phone,
    };
    if (values.dispatch_cancel_s <= values.dispatch_alert_s) return setMessage({ ok: false, text: "L'annulation doit venir après l'alerte." });
    const { error } = await db.from("settings").update(values).eq("id", true);
    setMessage(error ? { ok: false, text: errorMessage(error) } : { ok: true, text: "Paramètres enregistrés." });
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">Délais et support</h2>
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Réponse de l'établissement (min)">
          <input name="restaurant" type="number" min={2} max={60} required defaultValue={settings.restaurant_timeout_s / 60} className={fieldClass} />
        </Field>
        <Field label="Paiement en ligne (min)">
          <input name="payment" type="number" min={5} max={60} required defaultValue={settings.payment_timeout_s / 60} className={fieldClass} />
        </Field>
        <Field label="Alerte sans livreur (min)">
          <input name="alert" type="number" min={2} max={60} required defaultValue={settings.dispatch_alert_s / 60} className={fieldClass} />
        </Field>
        {/* Annulation automatique des colis sans livreur : service colis en pause (ADR-043), valeur conservée. */}
        <input type="hidden" name="cancel" value={settings.dispatch_cancel_s / 60} />
        <Field label="Téléphone du support">
          <input name="support" type="tel" defaultValue={settings.support_phone ?? ""} className={fieldClass} />
        </Field>
        <div className="flex items-end">
          <Button type="submit">Enregistrer</Button>
        </div>
        {message && <p className={`text-sm font-medium sm:col-span-2 ${message.ok ? "text-primary" : "text-danger"}`}>{message.text}</p>}
      </form>
    </Card>
  );
}

function Zones() {
  const db = browserClient();
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [editing, setEditing] = useState<Zone | "new" | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    Promise.all([db.from("zones").select("id, name, city, center_lat, center_lng, radius_m, is_active").order("city"), db.from("pricing_rules").select("*")]).then(([z, r]) => {
      if (!alive) return;
      setZones((z.data ?? []) as Zone[]);
      setRules((r.data ?? []) as Rule[]);
    });
    return () => {
      alive = false;
    };
  }, [db, version]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Villes desservies et tarifs</h2>
        <Button variant="soft" className="h-9 px-3 text-xs" onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden /> Nouvelle zone
        </Button>
      </div>
      <ul className="mt-4 divide-y divide-border">
        {zones?.map((z) => (
          <li key={z.id}>
            <button type="button" onClick={() => setEditing(z)} className="flex w-full items-center gap-3 py-3 text-left">
              <span className="flex-1">
                <span className="font-semibold">{z.name}</span>
                <span className="block text-xs text-muted">
                  {z.city} · rayon {(z.radius_m / 1000).toLocaleString("fr-FR")} km
                </span>
              </span>
              <Badge tone={z.is_active ? "success" : "neutral"}>{z.is_active ? "Active" : "Inactive"}</Badge>
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <ZoneEditor
          zone={editing === "new" ? null : editing}
          rules={editing === "new" ? [] : rules.filter((r) => r.zone_id === editing.id)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </Card>
  );
}

function ZoneEditor({ zone, rules, onClose, onSaved }: { zone: Zone | null; rules: Rule[]; onClose: () => void; onSaved: () => void }) {
  const db = browserClient();
  const [center, setCenter] = useState<Point>(zone ? { lat: zone.center_lat, lng: zone.center_lng } : { lat: 5.3364, lng: -4.0267 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rule = (service: Rule["service"]) => rules.find((r) => r.service === service);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const fields = {
      name: String(form.get("name")).trim(),
      city: String(form.get("city")).trim(),
      center_lat: center.lat,
      center_lng: center.lng,
      radius_m: Math.round(Number(form.get("radius")) * 1000),
      is_active: form.get("active") === "on",
    };
    const saved = zone
      ? await db.from("zones").update(fields).eq("id", zone.id).select("id").single()
      : await db.from("zones").insert(fields).select("id").single();
    if (saved.error) {
      setBusy(false);
      return setError(errorMessage(saved.error));
    }
    const { error } = await db.from("pricing_rules").upsert(
      (["food"] as const).map((service) => ({
        zone_id: saved.data.id,
        service,
        ...Object.fromEntries(ruleFields.map(([k]) => [k, Number(form.get(`${service}-${k}`))])),
      })),
    );
    setBusy(false);
    if (error) return setError(errorMessage(error));
    onSaved();
  }

  return (
    <Drawer title={zone ? zone.name : "Nouvelle zone"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nom">
            <input name="name" required minLength={2} maxLength={60} defaultValue={zone?.name} className={fieldClass} />
          </Field>
          <Field label="Ville">
            <input name="city" required minLength={2} maxLength={60} defaultValue={zone?.city} className={fieldClass} />
          </Field>
          <Field label="Rayon (km)">
            <input name="radius" type="number" min={0.5} max={100} step="0.5" required defaultValue={zone ? zone.radius_m / 1000 : 10} className={fieldClass} />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Centre de la zone</p>
          <MapPicker initial={center} onChange={setCenter} />
        </div>
        {(["food"] as const).map((service) => (
          <fieldset key={service} className="rounded-field border border-border p-4">
            <legend className="px-1 text-sm font-bold">Tarifs de livraison (F)</legend>
            <p className="mb-3 text-xs text-muted">
              Frais = base + distance par la route (km) × prix au km, arrondis, entre le minimum et le maximum. La distance vient du
              serveur d&apos;itinéraires ; s&apos;il ne répond pas, vol d&apos;oiseau × détour. Exemple avec 500 + 100/km : 1 km = 600 F, 5 km =
              1 000 F, 10 km = 1 500 F.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {ruleFields.map(([k, label]) => (
                <Field key={k} label={label}>
                  <input
                    name={`${service}-${k}`}
                    type="number"
                    min={k === "detour_factor" || k === "rounding_step" ? 1 : 0}
                    max={k === "detour_factor" ? 3 : undefined}
                    step={k === "detour_factor" ? 0.05 : 1}
                    required
                    defaultValue={(rule(service)?.[k] as number | undefined) ?? defaults[k] ?? ""}
                    className={fieldClass}
                  />
                </Field>
              ))}
            </div>
          </fieldset>
        ))}
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="active" defaultChecked={zone?.is_active ?? true} className="size-4 accent-[var(--primary)]" />
          Zone active (commandes possibles)
        </label>
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Enregistrement…" : "Enregistrer la zone"}
        </Button>
      </form>
    </Drawer>
  );
}
