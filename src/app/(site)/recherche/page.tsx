import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Search, SearchX } from "lucide-react";
import { OpenBadge } from "@/components/catalog-cards";
import { EmptyState } from "@/components/empty-state";
import { getZones, pickZone, searchCatalog } from "@/lib/catalog";
import { mediaUrl } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { fieldClass } from "@/components/ui";

export const metadata: Metadata = { title: "Recherche" };

export default function SearchPage({ searchParams }: PageProps<"/recherche">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Rechercher</h1>
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-card bg-surface-alt" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: Promise<{ ville?: string; q?: string }> }) {
  const params = await searchParams;
  const zones = await getZones();
  const zone = pickZone(zones, params.ville);
  const q = (params.q ?? "").trim().slice(0, 60);
  const results = zone && q.length >= 2 ? await searchCatalog(zone.id, q) : [];
  const establishments = results.filter((r) => r.result_type === "establishment");
  const products = results.filter((r) => r.result_type === "product");

  return (
    <>
      <form action="/recherche" className="mt-6 grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
        <select name="ville" defaultValue={zone?.id} aria-label="Ville" className={fieldClass}>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.city}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={q} minLength={2} required placeholder="Un plat ou un restaurant" aria-label="Recherche" className={fieldClass} />
        <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary">
          <Search className="size-4" aria-hidden /> Chercher
        </button>
      </form>

      {q.length >= 2 && !results.length && (
        <div className="mt-8">
          <EmptyState icon={SearchX} title={`Aucun résultat pour « ${q} »`} body={`Essayez un autre mot ou une autre ville que ${zone?.city ?? "celle-ci"}.`} />
        </div>
      )}

      {establishments.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">Restaurants</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {establishments.map((r) => (
              <li key={r.id}>
                <Link href={`/etablissements/${r.id}`} className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 hover:shadow-float">
                  <span className="font-semibold">{r.name}</span>
                  <OpenBadge open={r.is_open} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {products.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">Plats</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {products.map((r) => {
              const url = mediaUrl(r.photo_path);
              return (
                <li key={r.id}>
                  <Link href={`/etablissements/${r.establishment_id}#produit-${r.id}`} className="flex items-center gap-4 rounded-card border border-border bg-surface p-3 hover:shadow-float">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-field bg-surface-alt">
                      {url && <Image src={url} alt={r.name} fill sizes="64px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.name}</p>
                      <p className="truncate text-sm text-muted">{r.establishment_name}</p>
                    </div>
                    {r.price != null && <span className="tabular font-bold">{formatMoney(r.price)}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
