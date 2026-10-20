import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Clock, MapPin, PackageOpen } from "lucide-react";
import { OpenBadge } from "@/components/catalog-cards";
import { EmptyState } from "@/components/empty-state";
import { Menu } from "@/components/menu";
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
    <div className="mx-auto max-w-6xl px-4 pb-32 sm:px-6">
      <Link href={`/?ville=${e.zone_id}#restaurants`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Restaurants de {e.city}
      </Link>
      <header className="mt-4 overflow-hidden rounded-card border border-border bg-surface">
        <div className="relative h-48 bg-primary-soft sm:h-64">
          {cover && <Image src={cover} alt={e.name} fill priority sizes="100vw" className="object-cover" />}
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">{e.name}</h1>
              <OpenBadge open={e.is_open} />
            </div>
            {e.category && <p className="mt-1 text-muted">{e.category}</p>}
            {e.description && <p className="mt-3 max-w-2xl text-sm">{e.description}</p>}
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden /> {e.district} · {e.landmark}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden /> Préparation : environ {e.prep_time_min} min
              </span>
            </p>
          </div>
          {e.hours.length > 0 && (
            <details className="self-start rounded-field bg-surface-alt px-4 py-3 text-sm md:min-w-60">
              <summary className="cursor-pointer font-semibold">Horaires</summary>
              <ul className="mt-2 space-y-1 text-muted">
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
      </header>
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
  );
}
