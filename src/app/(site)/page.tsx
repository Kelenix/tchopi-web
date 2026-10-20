import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, ChartColumn, ClipboardList, MapPinned, Search, Store, Wifi } from "lucide-react";
import { EstablishmentCard, ProductCard } from "@/components/catalog-cards";
import { CitySelect } from "@/components/city-select";
import { EmptyState } from "@/components/empty-state";
import { Faq } from "@/components/faq";
import { HeroMap } from "@/components/home/hero-map";
import { Process } from "@/components/home/process";
import { ButtonLink, SectionTitle } from "@/components/ui";
import { getEstablishments, getFeaturedProducts, getZones, pickZone, type Zone } from "@/lib/catalog";

type Search = { ville?: string; categorie?: string };

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_85%_-10%,var(--primary-soft),transparent_70%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pt-16">
          <div>
            <Suspense fallback={<p className="h-7" />}>
              <LiveCount searchParams={searchParams} />
            </Suspense>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
              Vos plats préférés, livrés chauds.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
              Garba, alloco, poulet braisé ou pizza : commandez dans les restaurants de votre ville, payez à la
              livraison ou en ligne, et suivez votre livreur sur la carte jusqu&apos;à votre porte.
            </p>
            <Suspense fallback={<div className="mt-8 h-[132px] max-w-xl animate-pulse rounded-[24px] bg-surface-alt" />}>
              <HeroSearch searchParams={searchParams} />
            </Suspense>
          </div>
          <HeroMap />
        </div>
      </section>

      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>

      <section id="fonctionnement" className="mx-auto mt-28 max-w-6xl scroll-mt-24 px-4 sm:px-6">
        <SectionTitle title="De la cuisine à votre porte" body="Chaque étape s'affiche en direct dans votre suivi, sur le site comme sur l'application." />
        <Process />
      </section>

      <Restaurateurs />

      <section id="faq" className="mx-auto mt-28 grid max-w-6xl scroll-mt-24 gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
        <SectionTitle title="Questions fréquentes" body="Paiement, livraison, annulation : l'essentiel avant de commander." />
        <Faq />
      </section>
    </>
  );
}

async function selectedZone(searchParams: Promise<Search>): Promise<{ zones: Zone[]; zone?: Zone; params: Search }> {
  const [params, zones, jar] = await Promise.all([searchParams, getZones(), cookies()]);
  return { zones, zone: pickZone(zones, params.ville ?? jar.get("ville")?.value), params };
}

/** Indicateur en direct : restaurants réellement ouverts dans la ville choisie. */
async function LiveCount({ searchParams }: { searchParams: Promise<Search> }) {
  const data = await selectedZone(searchParams)
    .then(async ({ zone }) => (zone ? { zone, open: (await getEstablishments(zone.id)).filter((e) => e.is_open).length } : null))
    .catch(() => null);
  if (!data) return null;
  const { zone, open } = data;
  return (
      <p className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold shadow-float">
        <span className="relative flex size-2.5">
          {open > 0 && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />}
          <span className={`relative inline-flex size-2.5 rounded-full ${open ? "bg-success" : "bg-muted"}`} />
        </span>
        {open ? `${open} restaurant${open > 1 ? "s" : ""} ouvert${open > 1 ? "s" : ""} à ${zone.city} en ce moment` : `Livraison à ${zone.city}`}
      </p>
  );
}

async function HeroSearch({ searchParams }: { searchParams: Promise<Search> }) {
  let data: Awaited<ReturnType<typeof selectedZone>>;
  try {
    data = await selectedZone(searchParams);
  } catch {
    return null;
  }
  const { zones, zone } = data;
  if (!zone) return null;
  return (
    <div className="mt-8 max-w-xl rounded-[24px] border border-border bg-surface p-2 shadow-float">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)]">
        <CitySelect zones={zones} current={zone.id} />
        <form action="/recherche" className="flex h-14 items-center gap-2 rounded-field bg-surface-alt pl-4 pr-1.5">
          <input type="hidden" name="ville" value={zone.id} />
          <Search className="size-5 shrink-0 text-muted" aria-hidden />
          <label htmlFor="q" className="sr-only">
            Rechercher un plat ou un restaurant
          </label>
          <input id="q" name="q" minLength={2} required placeholder="Garba, alloco, poulet braisé…" className="h-full min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
          <button type="submit" className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary transition hover:brightness-110">
            Chercher
          </button>
        </form>
      </div>
      <Link href="#restaurants" className="mt-1 flex items-center justify-between rounded-field px-4 py-3 text-sm font-semibold text-muted transition hover:bg-surface-alt hover:text-ink">
        Voir tous les restaurants de {zone.city}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

async function loadCatalog(searchParams: Promise<Search>) {
  try {
    const { zone, params } = await selectedZone(searchParams);
    if (!zone) return "no_city" as const;
    const [establishments, featured] = await Promise.all([getEstablishments(zone.id), getFeaturedProducts(zone.id)]);
    return { zone, params, establishments, featured };
  } catch {
    return "unavailable" as const;
  }
}

async function Catalog({ searchParams }: { searchParams: Promise<Search> }) {
  const data = await loadCatalog(searchParams);
  if (data === "no_city") return <NoCity />;
  if (data === "unavailable") return <Unavailable />;
  const { zone, params, establishments, featured } = data;
  const categories = [...new Set(establishments.map((e) => e.category).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, "fr"));
  const shown = establishments.filter((e) => !params.categorie || e.category === params.categorie);
  const href = (categorie?: string) => `/?${new URLSearchParams({ ville: zone.id, ...(categorie ? { categorie } : {}) })}#restaurants`;
  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-ink text-on-ink" : "bg-surface text-muted ring-1 ring-border hover:text-ink"}`;

  return (
    <>
      <section id="restaurants" className="mx-auto mt-6 max-w-6xl scroll-mt-24 px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle title={`Restaurants à ${zone.city}`} body={establishments.length ? "Ouverts d'abord, puis ceux qui ouvrent bientôt." : undefined} />
        </div>
        {categories.length > 1 && (
          <nav aria-label="Cuisines" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <Link href={href()} scroll={false} className={chip(!params.categorie)}>
              Toutes les cuisines
            </Link>
            {categories.map((c) => (
              <Link key={c} href={href(c)} scroll={false} className={chip(params.categorie === c)}>
                {c}
              </Link>
            ))}
          </nav>
        )}
        <div className="mt-8">
          {shown.length ? (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((e) => (
                <EstablishmentCard key={e.id} e={e} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Store}
              title={establishments.length ? "Aucun restaurant pour cette cuisine" : `Les premiers restaurants de ${zone.city} arrivent`}
              body={establishments.length ? "Essayez une autre cuisine." : "Vous tenez un restaurant ici ? Inscrivez-le en quelques minutes : vous serez parmi les premiers."}
              action={
                establishments.length ? (
                  <ButtonLink href={href()} variant="outline">
                    Toutes les cuisines
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/inscription?profil=restaurant">Inscrire mon restaurant</ButtonLink>
                )
              }
            />
          )}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
          <SectionTitle title={`Les plus commandés à ${zone.city}`} body="D'après les livraisons des 30 derniers jours." />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Restaurateurs() {
  const steps = [
    ["Créez votre compte", "Par email ou avec Google."],
    ["Décrivez votre restaurant", "Adresse sur la carte, horaires, cuisine."],
    ["Ajoutez votre carte", "Photos, prix, tailles et suppléments."],
    ["Recevez vos commandes", "Dès la validation par l'équipe Tchopi."],
  ];
  return (
    <section id="restaurateurs" className="mt-28 scroll-mt-24 bg-[#0f1412] text-white">
      {/* Bandeau toujours sombre, dans les deux thèmes. */}
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Votre restaurant, ouvert à toute la ville.</h2>
          <p className="mt-4 max-w-md text-white/70">
            Inscription gratuite, commission seulement sur les ventes. Gérez tout depuis votre ordinateur ou votre
            téléphone.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            {[
              [ClipboardList, "Commandes en direct avec alerte sonore, étapes de préparation et remise au livreur."],
              [MapPinned, "Livraison organisée : la commande prête est proposée aux livreurs proches."],
              [ChartColumn, "Ventes, commission et produits les plus vendus, jour par jour."],
            ].map(([Icon, text]) => {
              const I = Icon as typeof Store;
              return (
                <li key={text as string} className="flex gap-3">
                  <I className="mt-0.5 size-5 shrink-0 text-[#3dd68c]" aria-hidden />
                  <span className="text-white/85">{text as string}</span>
                </li>
              );
            })}
          </ul>
          <Link href="/inscription?profil=restaurant" className="mt-10 inline-flex h-12 items-center gap-2 rounded-full bg-[#3dd68c] px-6 font-bold text-[#06281a] transition hover:brightness-110">
            Inscrire mon restaurant <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ol className="grid content-center gap-3">
          {steps.map(([title, body], i) => (
            <li key={title} className="flex items-center gap-4 rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
              <span className="tabular grid size-10 shrink-0 place-items-center rounded-full bg-white/10 font-bold text-[#3dd68c]">{i + 1}</span>
              <span>
                <span className="block font-bold">{title}</span>
                <span className="text-sm text-white/65">{body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function NoCity() {
  return (
    <section id="restaurants" className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
      <EmptyState icon={MapPinned} title="Aucune ville desservie pour le moment" body="Tchopi ouvre ville après ville. Revenez bientôt." />
    </section>
  );
}

function Unavailable() {
  return (
    <section id="restaurants" className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
      <EmptyState icon={Wifi} title="Les restaurants ne s'affichent pas pour le moment" body="Le service ne répond pas. Rechargez la page dans quelques instants." />
    </section>
  );
}

function CatalogSkeleton() {
  return (
    <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6" aria-busy>
      <div className="h-10 w-72 animate-pulse rounded-field bg-surface-alt" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-[22px] bg-surface-alt" />
        ))}
      </div>
    </div>
  );
}
