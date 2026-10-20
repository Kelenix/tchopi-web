"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { browserClient } from "./supabase";

/** Session courante (undefined pendant la lecture), mise à jour à la connexion et à la déconnexion. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const auth = browserClient().auth;
    auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = auth.onAuthStateChange((_, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}
