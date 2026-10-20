import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, ShoppingBasket, UtensilsCrossed } from "lucide-react";
import { kindLabel, type Establishment, type FeaturedProduct } from "@/lib/catalog";
import { mediaUrl } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { Badge } from "./ui";

export function OpenBadge({ open }: { open: boolean }) {
  return <Badge tone={open ? "success" : "neutral"}>{open ? "Ouvert" : "Fermé"}</Badge>;
}

function Cover({ path, alt, kind }: { path: string | null; alt: string; kind: Establishment["kind"] }) {
  const url = mediaUrl(path);
  const Icon = kind === "shop" ? ShoppingBasket : UtensilsCrossed;
  return url ? (
    <Image src={url} alt={alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-300 group-hover:scale-105" />
  ) : (
    <div className="grid size-full place-items-center bg-primary-soft text-primary">
      <Icon className="size-10" aria-hidden />
    </div>
  );
}

export function EstablishmentCard({ e }: { e: Establishment }) {
  return (
    <Link
      href={`/etablissements/${e.id}`}
      className="group overflow-hidden rounded-card border border-border bg-surface transition hover:-translate-y-0.5 hover:shadow-float"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Cover path={e.cover_path} alt={e.name} kind={e.kind} />
        <div className="absolute left-3 top-3 flex gap-2">
          <OpenBadge open={e.is_open} />
        </div>
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold leading-snug">{e.name}</h3>
          <span className="shrink-0 text-xs font-semibold text-muted">{kindLabel[e.kind]}</span>
        </div>
        {e.category && <p className="text-sm text-muted">{e.category}</p>}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {e.district}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {e.prep_time_min} min de préparation
          </span>
        </p>
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
