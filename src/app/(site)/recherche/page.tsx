import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Search, SearchX, Store } from "lucide-react";
import { EstablishmentCard, OpenBadge, ProductCard } from "@/components/catalog-cards";
import { PageHero } from "@/components/page-hero";
import { EmptyState } from "@/components/empty-state";
import { getEstablishments, getFeaturedProducts, getZones, pickZone, searchCatalog } from "@/lib/catalog";
import { mediaUrl } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { productAnchor } from "@/lib/slug";
import { fieldClass } from "@/components/ui";

// Navigation instantanée vérifiée en développement (catalogue public).
export const instant = true;

export const metadata: Metadata = { title: "Recherche" };

export default function SearchPage({ searchParams }: PageProps<"/recherche">) {
  return (
    <>
      <PageHero image="/hero/brochettes-boeuf.jpg" embers title={<>Une envie ? <span className="italic text-[#ffb35c]">Cherchez.</span></>} subtitle="Un plat, une cuisine ou un restaurant de votre ville.">
        <Suspense fallback={<div className="h-14 max-w-3xl rounded-full bg-white/15" />}>
          <SearchForm searchParams={searchParams} />
        </Suspense>
      </PageHero>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-card bg-surface-alt" />}>
        <Results searchParams={searchParams} />
      </Suspense>
      </div>
    </>
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

  // Sans recherche : la ville se présente d'elle-même (plats en vedette, puis tous ses restaurants).
  if (zone && q.length < 2) {
    const [all, featured] = await Promise.all([getEstablishments(zone.id), getFeaturedProducts(zone.id)]);
    if (!all.length) {
      return <EmptyState icon={Store} title={`Pas encore de restaurant à ${zone.city}`} body="Choisissez une autre ville ou revenez bientôt." />;
    }
    return (
      <>
        {featured.length > 0 && (
          <section>
            <h2 className="text-lg font-bold">Plats à découvrir à {zone.city}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {featured.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        )}
        <section className={featured.length ? "mt-10" : ""}>
          <h2 className="text-lg font-bold">Restaurants à {zone.city}</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {all.map((e) => (
              <EstablishmentCard key={e.id} e={e} />
            ))}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
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
                <Link href={`/etablissements/${r.establishment_slug}`} className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 hover:shadow-float">
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
                  <Link href={`/etablissements/${r.establishment_slug}#${productAnchor(r.name)}`} className="flex items-center gap-4 rounded-card border border-border bg-surface p-3 hover:shadow-float">
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

/** Barre de recherche, posée dans le bandeau : ville et mot recherché. */
async function SearchForm({ searchParams }: { searchParams: Promise<{ ville?: string; q?: string }> }) {
  const params = await searchParams;
  const zones = await getZones();
  const zone = pickZone(zones, params.ville);
  const q = (params.q ?? "").trim().slice(0, 60);
  return (
    <form action="/recherche" className="grid max-w-3xl gap-2 rounded-[28px] bg-surface p-2 shadow-float sm:grid-cols-[12rem_1fr_auto] sm:rounded-full">
      <select name="ville" defaultValue={zone?.slug} aria-label="Ville" className={`${fieldClass} rounded-full border-transparent bg-surface-alt`}>
        {zones.map((z) => (
          <option key={z.id} value={z.slug}>
            {z.city}
          </option>
        ))}
      </select>
      <input name="q" defaultValue={q} minLength={2} required placeholder="Un plat ou un restaurant" aria-label="Recherche" className={`${fieldClass} rounded-full border-transparent bg-surface-alt`} />
      <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary">
        <Search className="size-4" aria-hidden /> Chercher
      </button>
    </form>
  );
}
