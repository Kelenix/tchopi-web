"use client";

import { useEffect, useState } from "react";
import { normalizePhone } from "./phone";
import { browserClient } from "./supabase";

/** Identifiant de connexion : email ou téléphone (mêmes comptes que l'app mobile). */
export type Identifier = { kind: "email" | "phone"; value: string };

export function parseIdentifier(input: string): Identifier | null {
  const text = input.trim();
  if (text.includes("@")) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text) ? { kind: "email", value: text.toLowerCase() } : null;
  }
  const phone = normalizePhone(text);
  return phone ? { kind: "phone", value: phone } : null;
}

/** Règle du serveur (GOTRUE_PASSWORD_*) : 8 caractères au moins, avec des lettres et des chiffres. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "8 caractères au moins.";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Mélangez des lettres et des chiffres.";
  return null;
}

export const credentials = (id: Identifier, password: string) =>
  id.kind === "email" ? { email: id.value, password } : { phone: id.value, password };

/** Seule une adresse du site est acceptée comme page de retour (pas de redirection vers un autre site). */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/espace";
}

export type Roles = { is_admin: boolean; courier_status: string | null; restaurant_ids: string[] };

/** Rôles du compte connecté (fonction my_roles, comme le mobile). */
export function useRoles(enabled: boolean): Roles | null | undefined {
  const [roles, setRoles] = useState<Roles | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    browserClient()
      .rpc("my_roles")
      .then(({ data, error }) => alive && setRoles(error ? null : (data as Roles)));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return roles;
}
