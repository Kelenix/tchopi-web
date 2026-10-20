"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { UserRound } from "lucide-react";
import { dialog, orThrow } from "@/components/dialog";
import { useAccount } from "@/components/space-shell";
import { Button, Card, Field, fieldClass } from "@/components/ui";
import { passwordProblem } from "@/lib/auth";
import { mediaUrl } from "@/lib/env";
import { errorMessage } from "@/lib/errors";
import { uploadAvatar } from "@/lib/media";
import { normalizePhone } from "@/lib/phone";
import { browserClient } from "@/lib/supabase";

type Profile = { first_name: string | null; last_name: string | null; phone: string | null; city: string | null; avatar_path: string | null };

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
      .select("first_name, last_name, phone, city, avatar_path")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) =>
        setProfile(data ?? { first_name: null, last_name: null, phone: session.user.phone ? `+${session.user.phone}` : null, city: null, avatar_path: null }),
      );
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
            <Avatar userId={session.user.id} path={profile.avatar_path} onChange={(avatar_path) => setProfile({ ...profile, avatar_path })} />
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
              Identifiant de connexion : <strong className="text-ink">{session.user.email || `+${session.user.phone}`}</strong>
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
      <SecurityCard email={session.user.email || null} phone={session.user.phone ? `+${session.user.phone}` : null} />
    </>
  );
}

/** Photo de profil : réduite dans le navigateur, déposée dans le dossier du titulaire (RLS), visible tout de suite. */
function Avatar({ userId, path, onChange }: { userId: string; path: string | null; onChange: (path: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const url = mediaUrl(path);
  return (
    <div className="flex items-center gap-4 sm:col-span-2">
      <button type="button" onClick={() => input.current?.click()} aria-label="Changer la photo de profil" className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-primary">
        {url ? <Image src={url} alt="" fill sizes="80px" className="object-cover" /> : <UserRound className="size-8" aria-hidden />}
      </button>
      <div>
        <Button variant="soft" className="h-9 px-4 text-xs" onClick={() => input.current?.click()}>
          Changer la photo
        </Button>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            onChange(await uploadAvatar(userId, file));
            setError(null);
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      />
    </div>
  );
}

/** E-mail, mot de passe (mot de passe actuel exigé : identité confirmée) et suppression du compte. */
function SecurityCard({ email, phone }: { email: string | null; phone: string | null }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const db = browserClient();

  async function change(e: FormEvent<HTMLFormElement>, kind: "email" | "password") {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const value = String(data.get(kind)).trim();
    if (kind === "password" && passwordProblem(value)) return setMessage({ ok: false, text: passwordProblem(value)! });
    const password = String(data.get("current"));
    const check = await db.auth.signInWithPassword(email ? { email, password } : { phone: phone ?? "", password });
    if (check.error) return setMessage({ ok: false, text: "Mot de passe actuel incorrect." });
    const { error } = await db.auth.updateUser(kind === "email" ? { email: value } : { password: value });
    if (!error) form.reset();
    setMessage(
      error
        ? { ok: false, text: errorMessage(error) }
        : { ok: true, text: kind === "email" ? "Lien de confirmation envoyé à la nouvelle adresse." : "Mot de passe modifié." },
    );
  }

  const current = (
    <Field label="Mot de passe actuel">
      <input name="current" type="password" required autoComplete="current-password" className={fieldClass} />
    </Field>
  );

  return (
    <Card className="mt-6 max-w-xl space-y-6 p-6">
      <h2 className="text-lg font-bold">Sécurité</h2>
      <form onSubmit={(e) => change(e, "email")} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nouvelle adresse e-mail">
          <input name="email" type="email" required placeholder={email ?? "vous@exemple.ci"} autoComplete="email" className={fieldClass} />
        </Field>
        {current}
        <Button type="submit" variant="soft" className="sm:col-span-2 sm:justify-self-start">
          Changer l&apos;e-mail
        </Button>
      </form>
      <form onSubmit={(e) => change(e, "password")} className="grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
        <Field label="Nouveau mot de passe" hint="8 caractères au moins, lettres et chiffres.">
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={fieldClass} />
        </Field>
        {current}
        <Button type="submit" variant="soft" className="sm:col-span-2 sm:justify-self-start">
          Changer le mot de passe
        </Button>
      </form>
      {message && (
        <p role="status" className={`text-sm font-medium ${message.ok ? "text-primary" : "text-danger"}`}>
          {message.text}
        </p>
      )}
      <div className="rounded-field border border-danger/40 p-4">
        <p className="text-sm font-semibold">Supprimer mon compte</p>
        <p className="mt-1 text-xs text-muted">
          Vos données personnelles sont effacées et vous êtes déconnecté. L&apos;historique des commandes est conservé sans votre nom
          (obligations comptables). Impossible avec une commande en cours.
        </p>
        <Button
          variant="outline"
          className="mt-3 h-9 px-4 text-xs text-danger"
          onClick={async () => {
            const done = await dialog.confirm({
              title: "Supprimer définitivement votre compte ?",
              body: "Cette action est irréversible.",
              tone: "danger",
              confirmLabel: "Supprimer mon compte",
              action: () => orThrow(db.functions.invoke("account-delete", { body: {} })),
            });
            if (done) {
              await db.auth.signOut();
              window.location.replace(window.location.origin);
            }
          }}
        >
          Supprimer mon compte…
        </Button>
      </div>
    </Card>
  );
}
