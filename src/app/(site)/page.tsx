import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, ChartColumn, ClipboardList, MapPinned, Store, Wifi } from "lucide-react";
import { EstablishmentCard } from "@/components/catalog-cards";
import { EmptyState } from "@/components/empty-state";
import { Faq } from "@/components/faq";
import { DishMarquee } from "@/components/home/dish-marquee";
import { GlassCity } from "@/components/home/glass-city";
import { Hero } from "@/components/home/hero";
import { RouteShowcase } from "@/components/home/route-showcase";
import { Process } from "@/components/home/process";
import { ButtonLink, SectionTitle } from "@/components/ui";
import { getEstablishments, getFeaturedProducts, getZones, pickZone, type Zone } from "@/lib/catalog";

// Navigation instantanée vérifiée en développement (catalogue public).
export const instant = true;

type Search = { ville?: string; categorie?: string };

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Hero
        badge={
          <Suspense>
            <LiveBadge searchParams={searchParams} />
          </Suspense>
        }
        city={
          <Suspense>
            <HeroCity searchParams={searchParams} />
          </Suspense>
        }
      />

      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>

      <section className="mx-auto mt-28 grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <SectionTitle title="Suivez votre livreur, rue par rue" body="Dès qu'il récupère votre commande, sa position s'affiche sur la carte avec l'heure d'arrivée estimée. À la porte, un code à 4 chiffres confirme la remise." />
          <ul className="mt-6 space-y-3 text-sm text-muted">
            <li>Trajets calculés sur les vraies routes de votre ville</li>
            <li>Notification à chaque étape, sur le site et sur l&apos;application</li>
            <li>Livreur joignable d&apos;un appui</li>
          </ul>
        </div>
        <RouteShowcase />
      </section>

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
async function LiveBadge({ searchParams }: { searchParams: Promise<Search> }) {
  const data = await selectedZone(searchParams)
    .then(async ({ zone }) => (zone ? { zone, open: (await getEstablishments(zone.id)).filter((e) => e.is_open).length } : null))
    .catch(() => null);
  return (
    <p className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#3dd68c] opacity-70 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-[#3dd68c]" />
      </span>
      {data?.open
        ? `${data.open} restaurant${data.open > 1 ? "s" : ""} ouvert${data.open > 1 ? "s" : ""} à ${data.zone.city} en ce moment`
        : "Livraison de repas en Côte d'Ivoire"}
    </p>
  );
}

async function HeroCity({ searchParams }: { searchParams: Promise<Search> }) {
  const data = await selectedZone(searchParams).catch(() => null);
  return data?.zone ? <GlassCity zones={data.zones} current={data.zone.id} /> : null;
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
      {featured.length >= 3 && (
        <section className="bg-[#0b0806] pb-24 pt-4 text-white">
          <div className="mx-auto mb-10 flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 sm:px-6">
            <h2 className="font-display text-4xl leading-tight sm:text-6xl">
              Ce soir, on mange <span className="italic text-[#ffb35c]">quoi ?</span>
            </h2>
            <p className="max-w-xs text-sm text-white/60">Les plats les plus commandés à {zone.city} ces 30 derniers jours.</p>
          </div>
          <DishMarquee products={featured} />
        </section>
      )}
      <section id="restaurants" className="mx-auto mt-24 max-w-6xl scroll-mt-24 px-4 sm:px-6">
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
    <section id="restaurateurs" className="relative mt-28 scroll-mt-24 overflow-hidden bg-[#0b0806] text-white">
      {/* Bandeau toujours sombre, dans les deux thèmes : photo d'un maquis sous un voile, étapes en verre. */}
      <Image src="/hero/cover-maquis-chez-tante.jpg" alt="" fill sizes="100vw" className="object-cover opacity-45" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,#0b0806_15%,rgba(11,8,6,0.7)_55%,rgba(11,8,6,0.4))]" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="font-display text-4xl leading-[1.05] sm:text-6xl">Votre restaurant, ouvert à <span className="italic text-[#ffb35c]">toute la ville.</span></h2>
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
            <li key={title} className="glass flex items-center gap-4 rounded-3xl p-5">
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
