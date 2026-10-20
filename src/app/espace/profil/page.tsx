"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useAccount } from "@/components/space-shell";
import { Button, Card, Field, fieldClass } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { normalizePhone } from "@/lib/phone";
import { browserClient } from "@/lib/supabase";

type Profile = { first_name: string | null; last_name: string | null; phone: string | null; city: string | null };

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileForm />
    </Suspense>
  );
}

function ProfileForm() {
  const { session } = useAccount();
  const welcome = useSearchParams().has("bienvenue");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const db = browserClient();

  useEffect(() => {
    db.from("profiles")
      .select("first_name, last_name, phone, city")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setProfile(data ?? { first_name: null, last_name: null, phone: session.user.phone ? `+${session.user.phone}` : null, city: null }));
  }, [db, session.user]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const rawPhone = String(form.get("phone")).trim();
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    if (rawPhone && !phone) return setMessage({ ok: false, text: "Numéro de téléphone invalide." });
    const clean = (k: string) => String(form.get(k)).trim() || null;
    setBusy(true);
    const { error } = await db
      .from("profiles")
      .update({ first_name: clean("first_name"), last_name: clean("last_name"), phone, city: clean("city") })
      .eq("id", session.user.id);
    setBusy(false);
    setMessage(error ? { ok: false, text: errorMessage(error) } : { ok: true, text: "Profil enregistré." });
  }

  return (
    <>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">{welcome ? "Bienvenue sur Tchopi !" : "Mon profil"}</h1>
      <p className="mt-1 text-muted">
        {welcome ? "Complétez votre profil : le livreur pourra vous joindre à la livraison." : "Vos informations de contact."}
      </p>
      <Card className="mt-8 max-w-xl p-6">
        {!profile ? (
          <div className="h-64 animate-pulse rounded-field bg-surface-alt" />
        ) : (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom">
              <input name="first_name" defaultValue={profile.first_name ?? ""} maxLength={60} autoComplete="given-name" className={fieldClass} />
            </Field>
            <Field label="Nom">
              <input name="last_name" defaultValue={profile.last_name ?? ""} maxLength={60} autoComplete="family-name" className={fieldClass} />
            </Field>
            <Field label="Téléphone de contact" hint="Indispensable pour être joint à la livraison.">
              <input name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" className={fieldClass} />
            </Field>
            <Field label="Ville">
              <input name="city" defaultValue={profile.city ?? ""} maxLength={60} className={fieldClass} />
            </Field>
            <p className="text-sm text-muted sm:col-span-2">
              Identifiant de connexion : <strong className="text-ink">{session.user.email ?? `+${session.user.phone}`}</strong>
            </p>
            {message && (
              <p role="status" className={`text-sm font-medium sm:col-span-2 ${message.ok ? "text-primary" : "text-danger"}`}>
                {message.text}
              </p>
            )}
            <Button type="submit" disabled={busy} className="sm:col-span-2 sm:justify-self-start">
              Enregistrer
            </Button>
          </form>
        )}
      </Card>
    </>
  );
}
