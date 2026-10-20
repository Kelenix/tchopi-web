"use client";

import { useState, type FormEvent } from "react";
import type { Identifier } from "@/lib/auth";
import { Button, Field, fieldClass } from "./ui";

/** Saisie du code à 6 chiffres reçu par SMS ou email, avec renvoi. */
export function CodeStep({
  id,
  onVerify,
  onResend,
}: {
  id: Identifier;
  onVerify: (code: string) => Promise<string | null>;
  onResend: () => Promise<string | null>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(await onVerify(String(new FormData(e.currentTarget).get("code")).trim()));
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">
        Code envoyé {id.kind === "email" ? "par email à" : "par SMS au"} <strong className="text-ink">{id.value}</strong>.
      </p>
      <Field label="Code de vérification" error={error}>
        <input
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          className={`${fieldClass} tabular text-center text-lg tracking-[0.4em]`}
        />
      </Field>
      {info && <p className="text-sm text-primary">{info}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Vérification…" : "Valider"}
      </Button>
      <button
        type="button"
        className="w-full text-sm font-semibold text-muted hover:text-ink"
        onClick={async () => {
          const problem = await onResend();
          setError(problem);
          setInfo(problem ? null : "Nouveau code envoyé.");
        }}
      >
        Renvoyer le code
      </button>
    </form>
  );
}
