"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CodeStep } from "@/components/code-step";
import { Button, Field, fieldClass } from "@/components/ui";
import { credentials, parseIdentifier, passwordProblem, type Identifier } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { browserClient } from "@/lib/supabase";

/** Inscription : identifiant + mot de passe, code de vérification, puis profil (même parcours que le mobile). */
export default function SignUpPage() {
  const router = useRouter();
  const [id, setId] = useState<Identifier | null>(null);
  const [errors, setErrors] = useState<{ id?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const auth = browserClient().auth;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = parseIdentifier(String(form.get("id")));
    const password = String(form.get("password"));
    const problem = passwordProblem(password);
    const confirmMismatch = password !== form.get("confirm");
    setErrors({
      id: parsed ? undefined : "Email ou numéro de téléphone invalide.",
      password: problem ?? (confirmMismatch ? "Les deux mots de passe diffèrent." : undefined),
    });
    if (!parsed || problem || confirmMismatch) return;
    setBusy(true);
    const { error } = await auth.signUp(credentials(parsed, password));
    setBusy(false);
    if (error) {
      setErrors({
        form: /already|registered|exists/i.test(error.message)
          ? "Un compte existe déjà avec cet identifiant : connectez-vous."
          : /signups? not allowed|disabled/i.test(error.message)
            ? "Les inscriptions ne sont pas encore ouvertes avec ce type d'identifiant."
            : errorMessage(error),
      });
      return;
    }
    setId(parsed);
  }

  if (id) {
    return (
      <>
        <h1 className="text-2xl font-extrabold tracking-tight">Vérifiez votre compte</h1>
        <div className="mt-6">
          <CodeStep
            id={id}
            onVerify={async (token) => {
              const { error } =
                id.kind === "email"
                  ? await auth.verifyOtp({ email: id.value, token, type: "signup" })
                  : await auth.verifyOtp({ phone: id.value, token, type: "sms" });
              if (error) return "Code incorrect ou expiré.";
              router.replace("/espace/profil?bienvenue=1");
              return null;
            }}
            onResend={async () => {
              const { error } =
                id.kind === "email"
                  ? await auth.resend({ type: "signup", email: id.value })
                  : await auth.resend({ type: "sms", phone: id.value });
              return error ? errorMessage(error) : null;
            }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Créer un compte</h1>
      <p className="mt-1 text-sm text-muted">Utilisable sur le site et sur l&apos;application mobile.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email ou téléphone" error={errors.id}>
          <input name="id" required autoComplete="username" placeholder="07 01 02 03 04" className={fieldClass} />
        </Field>
        <Field label="Mot de passe" hint="8 caractères au moins, avec des lettres et des chiffres." error={errors.password}>
          <input name="password" type="password" required autoComplete="new-password" className={fieldClass} />
        </Field>
        <Field label="Confirmer le mot de passe">
          <input name="confirm" type="password" required autoComplete="new-password" className={fieldClass} />
        </Field>
        {errors.form && (
          <p role="alert" className="text-sm font-medium text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Création…" : "Créer mon compte"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-primary">
          Se connecter
        </Link>
      </p>
    </>
  );
}
