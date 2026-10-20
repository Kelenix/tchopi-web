import Image from "next/image";
import Link from "next/link";
import { Clock, UtensilsCrossed } from "lucide-react";
import type { Establishment, FeaturedProduct } from "@/lib/catalog";
import { mediaUrl } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { Badge } from "./ui";

export function OpenBadge({ open }: { open: boolean }) {
  return <Badge tone={open ? "success" : "neutral"}>{open ? "Ouvert" : "Fermé"}</Badge>;
}

function Cover({ path, alt }: { path: string | null; alt: string }) {
  const url = mediaUrl(path);
  return url ? (
    <Image src={url} alt={alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
  ) : (
    <div className="grid size-full place-items-center bg-primary-soft text-primary">
      <UtensilsCrossed className="size-10" aria-hidden />
    </div>
  );
}

/** Restaurant : la photo d'abord, puis le nom, la cuisine et le quartier. */
export function EstablishmentCard({ e }: { e: Establishment }) {
  return (
    <Link href={`/etablissements/${e.id}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-surface-alt">
        <Cover path={e.cover_path} alt={e.name} />
        <div className="absolute left-3 top-3">
          <OpenBadge open={e.is_open} />
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold leading-snug group-hover:text-primary">{e.name}</h3>
          <p className="truncate text-sm text-muted">{[e.category, e.district].filter(Boolean).join(", ")}</p>
        </div>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-alt px-2.5 py-1 text-xs font-semibold text-muted">
          <Clock className="size-3.5" aria-hidden />
          {e.prep_time_min} min
        </span>
      </div>
    </Link>
  );
}

export function ProductCard({ p }: { p: FeaturedProduct }) {
  const url = mediaUrl(p.photo_path);
  return (
    <Link
      href={`/etablissements/${p.establishment_id}#produit-${p.id}`}
      className="group flex gap-4 rounded-card border border-border bg-surface p-3 transition hover:shadow-float"
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-field bg-surface-alt">
        {url && <Image src={url} alt={p.name} fill sizes="96px" className="object-cover" />}
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1">
        <h3 className="truncate font-bold">{p.name}</h3>
        <p className="truncate text-sm text-muted">{p.establishment_name}</p>
        <p className="tabular font-bold text-primary">{formatMoney(p.price)}</p>
      </div>
    </Link>
  );
}
