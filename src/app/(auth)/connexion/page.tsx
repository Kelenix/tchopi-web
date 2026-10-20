"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button, Field, fieldClass } from "@/components/ui";
import { credentials, parseIdentifier, safeNext } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { browserClient } from "@/lib/supabase";

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("suite"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const id = parseIdentifier(String(form.get("id")));
    if (!id) return setError("Email ou numéro de téléphone invalide.");
    setBusy(true);
    setError(null);
    const { error } = await browserClient().auth.signInWithPassword(credentials(id, String(form.get("password"))));
    setBusy(false);
    if (error) {
      setError(error.code === "invalid_credentials" ? "Identifiant ou mot de passe incorrect." : errorMessage(error));
      return;
    }
    router.replace(next);
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Se connecter</h1>
      <p className="mt-1 text-sm text-muted">Le même compte que sur l&apos;application mobile.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email ou téléphone">
          <input name="id" required autoComplete="username" placeholder="07 01 02 03 04" className={fieldClass} />
        </Field>
        <Field label="Mot de passe">
          <input name="password" type="password" required autoComplete="current-password" className={fieldClass} />
        </Field>
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
        <Link href="/mot-de-passe-oublie" className="font-semibold text-muted hover:text-ink">
          Mot de passe oublié ?
        </Link>
        <Link href="/inscription" className="font-semibold text-primary">
          Créer un compte
        </Link>
      </div>
    </>
  );
}
