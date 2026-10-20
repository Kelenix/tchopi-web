import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Client « visiteur » côté serveur : catalogue public uniquement (fonctions public_*). Aucune session, aucune clé de
 * service : le web n'a jamais plus de droits que le navigateur.
 */
export function publicClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let browser: SupabaseClient | undefined;

/**
 * Client du navigateur, avec la session de l'utilisateur (mêmes comptes que l'app mobile). Les données des espaces
 * connectés sont protégées par la RLS de la base, comme sur le mobile.
 */
export function browserClient(): SupabaseClient {
  browser ??= createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "tchopi-auth" },
  });
  return browser;
}
