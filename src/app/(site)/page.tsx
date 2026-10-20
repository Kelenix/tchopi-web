import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  Bike,
  CreditCard,
  MapPinned,
  Search,
  ShoppingBasket,
  Store,
  TrendingUp,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";
import { EstablishmentCard, ProductCard } from "@/components/catalog-cards";
import { CitySelect } from "@/components/city-select";
import { EmptyState } from "@/components/empty-state";
import { Faq } from "@/components/faq";
import { PartnerForm } from "@/components/partner-form";
import { ButtonLink, SectionTitle } from "@/components/ui";
import {
  getEstablishments,
  getFeaturedProducts,
  getZones,
  pickZone,
  type Establishment,
  type Zone,
} from "@/lib/catalog";

type Search = { ville?: string; type?: string; categorie?: string };

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--primary-soft),transparent_60%)]" />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
              <Bike className="size-4" aria-hidden /> Livraison en Côte d&apos;Ivoire
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Vos repas et vos courses, livrés chez vous.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Commandez auprès des restaurants et magasins de votre ville, payez à la livraison ou en ligne, et suivez
              votre livreur en direct jusqu&apos;à votre porte.
            </p>
            <Suspense fallback={<div className="mt-8 h-[124px] max-w-xl animate-pulse rounded-card bg-surface-alt" />}>
              <HeroSearch searchParams={searchParams} />
            </Suspense>
          </div>
          <HeroSteps />
        </div>
      </section>

      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>

      <HowItWorks />

      <section id="partenaires" className="mx-auto mt-24 max-w-6xl scroll-mt-24 px-4 sm:px-6">
        {/* Bandeau toujours sombre, dans les deux thèmes. */}
        <div className="grid gap-10 overflow-hidden rounded-card bg-[#0f1412] p-6 text-white sm:p-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider opacity-70">Restaurants et magasins</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Vendez sur Tchopi</h2>
            <p className="mt-3 opacity-80">
              Un espace de gestion pensé pour le quotidien, sur ordinateur et sur téléphone.
            </p>
            <ul className="mt-6 space-y-4">
              {[
                [Store, "Vos produits en ligne en quelques minutes", "Photos, prix, options et disponibilité modifiables à tout moment."],
                [TrendingUp, "Commandes en direct et statistiques", "Alerte sonore, étapes de préparation, ventes et commission du jour."],
                [Bike, "La livraison organisée pour vous", "Votre commande est proposée aux livreurs dès qu'elle est prête."],
              ].map(([Icon, title, body]) => {
                const I = Icon as typeof Store;
                return (
                  <li key={title as string} className="flex gap-3">
                    <I className="mt-0.5 size-5 shrink-0 text-[#3dd68c]" aria-hidden />
                    <div>
                      <p className="font-semibold">{title as string}</p>
                      <p className="text-sm opacity-70">{body as string}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-card bg-surface p-5 text-ink sm:p-8">
            <h3 className="text-xl font-bold">Demande d&apos;inscription</h3>
            <p className="mb-6 mt-1 text-sm text-muted">Gratuite et sans engagement.</p>
            <Suspense fallback={<div className="h-96 animate-pulse rounded-field bg-surface-alt" />}>
              <PartnerFormLoader />
            </Suspense>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto mt-24 grid max-w-6xl scroll-mt-24 gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
        <SectionTitle eyebrow="Questions fréquentes" title="Tout savoir avant de commander" />
        <Faq />
      </section>
    </>
  );
}

async function selectedZone(searchParams: Promise<Search>): Promise<{ zones: Zone[]; zone?: Zone; params: Search }> {
  const [params, zones, jar] = await Promise.all([searchParams, getZones(), cookies()]);
  return { zones, zone: pickZone(zones, params.ville ?? jar.get("ville")?.value), params };
}

async function HeroSearch({ searchParams }: { searchParams: Promise<Search> }) {
  const { zones, zone } = await selectedZone(searchParams);
  if (!zone) return null;
  return (
    <div className="mt-8 max-w-xl rounded-card border border-border bg-surface p-2 shadow-float">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <CitySelect zones={zones} current={zone.id} />
        <form action="/recherche" className="flex h-14 items-center gap-2 rounded-field bg-surface-alt pl-4 pr-1.5">
          <input type="hidden" name="ville" value={zone.id} />
          <Search className="size-5 shrink-0 text-muted" aria-hidden />
          <label htmlFor="q" className="sr-only">
            Rechercher un plat, un produit ou un établissement
          </label>
          <input
            id="q"
            name="q"
            minLength={2}
            required
            placeholder="Garba, pain, pharmacie…"
            className="h-full min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
          />
          <button type="submit" className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary">
            Chercher
          </button>
        </form>
      </div>
    </div>
  );
}

function HeroSteps() {
  const steps = [
    [MapPinned, "Choisissez votre ville", "et l'établissement qui vous fait envie"],
    [CreditCard, "Payez comme vous voulez", "espèces, Mobile Money ou carte"],
    [Wifi, "Suivez en direct", "préparation, livreur, code de livraison"],
  ] as const;
  return (
    <ol className="relative hidden content-center gap-4 lg:grid" aria-label="Commander en 3 étapes">
      {steps.map(([Icon, title, body], i) => (
        <li
          key={title}
          className="flex items-center gap-4 rounded-card border border-border bg-surface p-5 shadow-float"
          style={{ marginLeft: `${i * 1.5}rem` }}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-on-primary">
            <Icon className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-bold text-primary">Étape {i + 1}</p>
            <p className="font-bold">{title}</p>
            <p className="text-sm text-muted">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

async function Catalog({ searchParams }: { searchParams: Promise<Search> }) {
  let data: Awaited<ReturnType<typeof selectedZone>>;
  try {
    data = await selectedZone(searchParams);
  } catch {
    return <Unavailable />;
  }
  const { zone, params } = data;
  if (!zone) {
    return (
      <Section id="etablissements" title="Bientôt dans votre ville">
        <EmptyState icon={MapPinned} title="Aucune ville desservie pour le moment" body="Tchopi ouvre ville après ville. Revenez bientôt !" />
      </Section>
    );
  }
  let establishments: Establishment[];
  let featured: Awaited<ReturnType<typeof getFeaturedProducts>>;
  try {
    [establishments, featured] = await Promise.all([getEstablishments(zone.id), getFeaturedProducts(zone.id)]);
  } catch {
    return <Unavailable />;
  }

  const kinds = { restaurant: "Restaurants", shop: "Magasins" } as const;
  const categories = [...new Set(establishments.map((e) => e.category).filter((c): c is string => Boolean(c)))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
  const shown = establishments.filter(
    (e) => (!params.type || e.kind === params.type) && (!params.categorie || e.category === params.categorie),
  );
  const openCount = establishments.filter((e) => e.is_open).length;
  const href = (extra: Search) => {
    const q = new URLSearchParams({ ville: zone.id, ...extra });
    return `/?${q}#etablissements`;
  };
  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-ink text-on-ink" : "bg-surface text-muted ring-1 ring-border hover:text-ink"}`;

  return (
    <>
      <Section
        id="etablissements"
        eyebrow={zone.city}
        title="Établissements près de chez vous"
        body={
          establishments.length
            ? `${establishments.length} établissement${establishments.length > 1 ? "s" : ""} à ${zone.city}, dont ${openCount} ouvert${openCount > 1 ? "s" : ""} en ce moment.`
            : undefined
        }
      >
        {establishments.length > 0 && (
          <nav aria-label="Catégories" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <Link href={href({})} scroll={false} className={chip(!params.type && !params.categorie)}>
              Tout
            </Link>
            {(Object.keys(kinds) as (keyof typeof kinds)[])
              .filter((k) => establishments.some((e) => e.kind === k))
              .map((k) => (
                <Link key={k} href={href({ type: k })} scroll={false} className={chip(params.type === k)}>
                  {k === "restaurant" ? <UtensilsCrossed className="mr-1.5 inline size-4" aria-hidden /> : <ShoppingBasket className="mr-1.5 inline size-4" aria-hidden />}
                  {kinds[k]}
                </Link>
              ))}
            {categories.map((c) => (
              <Link key={c} href={href({ categorie: c })} scroll={false} className={chip(params.categorie === c)}>
                {c}
              </Link>
            ))}
          </nav>
        )}
        {shown.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((e) => (
              <EstablishmentCard key={e.id} e={e} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Store}
            title={establishments.length ? "Aucun établissement dans cette catégorie" : `Pas encore d'établissement à ${zone.city}`}
            body={
              establishments.length
                ? "Essayez une autre catégorie ou affichez tous les établissements."
                : "Les premiers restaurants et magasins de la ville arrivent bientôt. Vous en tenez un ? Rejoignez Tchopi."
            }
            action={
              establishments.length ? (
                <ButtonLink href={href({})} variant="outline">
                  Tout afficher
                </ButtonLink>
              ) : (
                <ButtonLink href="#partenaires">Devenir partenaire</ButtonLink>
              )
            }
          />
        )}
      </Section>

      {featured.length > 0 && (
        <Section id="vedette" eyebrow="En vedette" title={`Les incontournables de ${zone.city}`} body="Les produits les plus commandés ces 30 derniers jours.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function Section({
  id,
  eyebrow,
  title,
  body,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto mt-20 max-w-6xl scroll-mt-24 px-4 sm:px-6">
      <SectionTitle eyebrow={eyebrow} title={title} body={body} />
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Unavailable() {
  return (
    <Section id="etablissements" title="Établissements près de chez vous">
      <EmptyState
        icon={Wifi}
        title="Catalogue momentanément indisponible"
        body="Le service ne répond pas pour le moment. Rechargez la page dans quelques instants."
      />
    </Section>
  );
}

function CatalogSkeleton() {
  return (
    <div className="mx-auto mt-20 max-w-6xl px-4 sm:px-6" aria-busy>
      <div className="h-10 w-72 animate-pulse rounded-field bg-surface-alt" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-card bg-surface-alt" />
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    [Store, "Vous commandez", "Choisissez vos produits et payez en espèces, Mobile Money ou carte. Le total, livraison comprise, est affiché avant de valider."],
    [UtensilsCrossed, "L'établissement prépare", "Il accepte votre commande et la prépare. Même si aucun livreur n'est libre à cet instant, votre commande avance."],
    [Bike, "Un livreur vous l'apporte", "Dès que la commande est prête, elle est proposée aux livreurs proches. Vous suivez le trajet en direct."],
    [CreditCard, "Remise avec un code", "Donnez au livreur le code à 4 chiffres affiché dans votre suivi : la livraison est confirmée."],
  ] as const;
  return (
    <section id="fonctionnement" className="mx-auto mt-24 max-w-6xl scroll-mt-24 px-4 sm:px-6">
      <SectionTitle eyebrow="Comment ça marche" title="De la commande à votre porte" />
      <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([Icon, title, body], i) => (
          <li key={title} className="rounded-card border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="tabular text-3xl font-extrabold text-border">{i + 1}</span>
            </div>
            <h3 className="mt-5 font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

async function PartnerFormLoader() {
  let cities: string[] = [];
  try {
    cities = [...new Set((await getZones()).map((z) => z.city))];
  } catch {
    // Liste des villes illisible : la ville est alors saisie librement.
  }
  return <PartnerForm cities={cities} />;
}
