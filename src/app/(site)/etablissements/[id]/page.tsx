import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Clock, MapPin, PackageOpen } from "lucide-react";
import { OpenBadge } from "@/components/catalog-cards";
import { EmptyState } from "@/components/empty-state";
import { Menu } from "@/components/menu";
import { PageHero } from "@/components/page-hero";
import { getEstablishment } from "@/lib/catalog";
import { mediaUrl } from "@/lib/env";

const days = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const hhmm = (t: string) => t.slice(0, 5).replace(":", " h ");

export async function generateMetadata({ params }: PageProps<"/etablissements/[id]">): Promise<Metadata> {
  const e = await getEstablishment((await params).id).catch(() => null);
  return e
    ? { title: `${e.name} à ${e.city}`, description: e.description ?? `Restaurant à ${e.city} : commandez en ligne avec Tchopi.` }
    : { title: "Établissement" };
}

export default function EstablishmentPage({ params }: PageProps<"/etablissements/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-10 h-72 max-w-6xl animate-pulse rounded-card bg-surface-alt" />}>
      <Establishment params={params} />
    </Suspense>
  );
}

async function Establishment({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const e = await getEstablishment(id);
  if (!e) notFound();
  const cover = mediaUrl(e.cover_path);

  return (
    <>
      <PageHero
        image={cover ?? "/hero/cover-grill-du-plateau.jpg"}
        tall
        title={e.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-3">
            <OpenBadge open={e.is_open} />
            {e.category && <span>{e.category}</span>}
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden /> {e.district}
            </span>
          </span>
        }
      >
        <div className="flex flex-wrap items-stretch gap-3">
          <Link href={`/?ville=${e.zone_id}#restaurants`} className="glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold">
            <ArrowLeft className="size-4" aria-hidden /> Restaurants de {e.city}
          </Link>
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm">
            <Clock className="size-4" aria-hidden /> Prêt en {e.prep_time_min} min environ
          </span>
          {e.hours.length > 0 && (
            <details className="glass rounded-3xl px-4 py-2.5 text-sm">
              <summary className="cursor-pointer font-semibold">Horaires</summary>
              <ul className="mt-2 min-w-56 space-y-1 text-white/75">
                {e.hours.map((h) => (
                  <li key={`${h.weekday}-${h.opens_at}`} className="flex justify-between gap-4">
                    <span>{days[h.weekday]}</span>
                    <span className="tabular">
                      {hhmm(h.opens_at)} – {hhmm(h.closes_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </PageHero>
      <div className="mx-auto max-w-6xl px-4 pb-32 sm:px-6">
      {e.description && <p className="mt-10 max-w-2xl text-lg text-muted">{e.description}</p>}
      {!e.is_open && (
        <p className="mt-6 rounded-field bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          Ce restaurant est fermé pour le moment : consultez sa carte et commandez dès son ouverture.
        </p>
      )}
      <div className="mt-8">
        {e.products.length ? (
          <Menu establishment={e} />
        ) : (
          <EmptyState icon={PackageOpen} title="La carte arrive bientôt" body="Ce restaurant prépare sa carte. Revenez bientôt." />
        )}
      </div>
      </div>
    </>
  );
}
