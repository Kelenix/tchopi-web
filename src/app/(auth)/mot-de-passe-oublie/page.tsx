"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CodeStep } from "@/components/code-step";
import { Button, Field, fieldClass } from "@/components/ui";
import { parseIdentifier, passwordProblem, type Identifier } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { browserClient } from "@/lib/supabase";

/** Récupération : code par email ou SMS (comme le mobile), puis nouveau mot de passe. */
export default function ResetPage() {
  const router = useRouter();
  const auth = browserClient().auth;
  const [id, setId] = useState<Identifier | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = (target: Identifier) =>
    target.kind === "email"
      ? auth.resetPasswordForEmail(target.value)
      : auth.signInWithOtp({ phone: target.value, options: { shouldCreateUser: false } });

  async function requestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = parseIdentifier(String(new FormData(e.currentTarget).get("id")));
    if (!parsed) return setError("Email ou numéro de téléphone invalide.");
    setBusy(true);
    const { error } = await sendCode(parsed);
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setError(null);
    setId(parsed);
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    setBusy(true);
    const { error } = await auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    router.replace("/espace");
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Mot de passe oublié</h1>
      <div className="mt-6">
        {!id ? (
          <form onSubmit={requestCode} className="space-y-4">
            <Field label="Email ou téléphone du compte" error={error}>
              <input name="id" required autoComplete="username" className={fieldClass} />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Envoi…" : "Recevoir un code"}
            </Button>
          </form>
        ) : !verified ? (
          <CodeStep
            id={id}
            onVerify={async (token) => {
              const { error } =
                id.kind === "email"
                  ? await auth.verifyOtp({ email: id.value, token, type: "recovery" })
                  : await auth.verifyOtp({ phone: id.value, token, type: "sms" });
              if (error) return "Code incorrect ou expiré.";
              setVerified(true);
              setError(null);
              return null;
            }}
            onResend={async () => {
              const { error } = await sendCode(id);
              return error ? errorMessage(error) : null;
            }}
          />
        ) : (
          <form onSubmit={savePassword} className="space-y-4">
            <Field label="Nouveau mot de passe" hint="8 caractères au moins, avec des lettres et des chiffres." error={error}>
              <input name="password" type="password" required autoComplete="new-password" className={fieldClass} />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              Enregistrer
            </Button>
          </form>
        )}
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/connexion" className="font-semibold text-muted hover:text-ink">
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}
