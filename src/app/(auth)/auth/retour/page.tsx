"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { safeNext } from "@/lib/auth";
import { browserClient } from "@/lib/supabase";

export default function OAuthReturnPage() {
  return (
    <Suspense>
      <OAuthReturn />
    </Suspense>
  );
}

/** Retour de Google : le client Supabase échange le code (PKCE) ; on attend la session puis on poursuit. */
function OAuthReturn() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("suite"));
  const failed = params.get("error_description");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (failed) return;
    const auth = browserClient().auth;
    auth.getSession().then(({ data }) => {
      if (data.session) router.replace(next);
      else setError("La connexion avec Google n'a pas abouti.");
    });
  }, [failed, next, router]);

  return (
    <div className="space-y-4 text-center">
      <h1 className="font-display text-4xl leading-tight">Connexion</h1>
      {failed || error ? (
        <>
          <p className="text-sm text-danger">{failed ?? error}</p>
          <Link href="/connexion" className="text-sm font-semibold text-primary">
            Réessayer
          </Link>
        </>
      ) : (
        <p className="text-sm text-muted">Connexion en cours…</p>
      )}
    </div>
  );
}
