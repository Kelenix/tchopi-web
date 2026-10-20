"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { errorMessage } from "@/lib/errors";
import { normalizePhone } from "@/lib/phone";
import { browserClient } from "@/lib/supabase";
import { Button, Field, fieldClass } from "./ui";

/** « Rejoindre la plateforme » : candidature examinée par l'équipe, qui crée l'établissement et invite le gérant. */
export function PartnerForm({ cities }: { cities: string[] }) {
  const [kind, setKind] = useState<"restaurant" | "shop">("restaurant");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const phone = normalizePhone(String(form.get("phone")));
    setPhoneError(phone ? null : "Numéro invalide (ex. 07 01 02 03 04).");
    if (!phone) return;
    setBusy(true);
    setError(null);
    const { error } = await browserClient().rpc("submit_partner_application", {
      p_kind: kind,
      p_business_name: form.get("business"),
      p_contact_name: form.get("contact"),
      p_phone: phone,
      p_email: form.get("email") || null,
      p_city: form.get("city"),
      p_message: form.get("message") || null,
    });
    setBusy(false);
    if (error) setError(errorMessage(error));
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
        <CheckCircle2 className="size-12 text-primary" aria-hidden />
        <h3 className="text-xl font-bold">Demande envoyée</h3>
        <p className="max-w-sm text-sm text-muted">
          L&apos;équipe Tchopi vous appelle pour finaliser votre inscription, puis vous recevez l&apos;accès à votre
          espace établissement.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-semibold">Vous êtes</legend>
        <div className="grid grid-cols-2 gap-2 rounded-full bg-surface-alt p-1">
          {(
            [
              ["restaurant", "Un restaurant"],
              ["shop", "Un magasin"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              className={`h-10 rounded-full text-sm font-semibold transition ${kind === value ? "bg-surface text-ink shadow-float" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Nom de l'établissement">
        <input name="business" required minLength={2} maxLength={80} className={fieldClass} />
      </Field>
      <Field label="Votre nom">
        <input name="contact" required minLength={2} maxLength={80} autoComplete="name" className={fieldClass} />
      </Field>
      <Field label="Téléphone" error={phoneError}>
        <input name="phone" required type="tel" autoComplete="tel" placeholder="07 01 02 03 04" className={fieldClass} />
      </Field>
      <Field label="Email (facultatif)">
        <input name="email" type="email" autoComplete="email" className={fieldClass} />
      </Field>
      <Field label="Ville">
        {cities.length ? (
          <select name="city" required className={fieldClass} defaultValue="">
            <option value="" disabled>
              Choisir une ville
            </option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        ) : (
          <input name="city" required minLength={2} maxLength={60} className={fieldClass} />
        )}
      </Field>
      <Field label="Message (facultatif)" hint="Spécialités, horaires, nombre de points de vente…">
        <input name="message" maxLength={1000} className={fieldClass} />
      </Field>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger sm:col-span-2">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="sm:col-span-2">
        {busy ? "Envoi…" : "Envoyer ma demande"}
      </Button>
    </form>
  );
}
