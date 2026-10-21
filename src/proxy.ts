import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  const res = await fetch(`${env.supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: env.supabaseAnonKey, authorization: `Bearer ${env.supabaseAnonKey}`, "content-type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  }).catch(() => null);
  return res?.ok ? ((await res.json()) as T) : null;
}

/**
 * Anciennes adresses publiques (ADR-063) → redirection permanente (301) vers l'adresse lisible :
 * /etablissements/<uuid> ou un ancien nom → /etablissements/<slug actuel> ; /?ville=<uuid> → /?ville=<slug>.
 * L'ancre (#…) est conservée par le navigateur.
 */
export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  if (url.pathname.startsWith("/etablissements/")) {
    const key = decodeURIComponent(url.pathname.slice("/etablissements/".length));
    const slug = await rpc<string | null>("public_establishment_slug", { p_key: key });
    if (!slug || slug === key) return NextResponse.next();
    url.pathname = `/etablissements/${slug}`;
    return NextResponse.redirect(url, 301);
  }

  const ville = url.searchParams.get("ville");
  if (ville && uuid.test(ville)) {
    const zones = await rpc<{ id: string; slug: string }[]>("public_zones", {});
    const zone = zones?.find((z) => z.id === ville.toLowerCase());
    if (!zone) return NextResponse.next();
    url.searchParams.set("ville", zone.slug);
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/etablissements/:key", "/", "/recherche"] };
