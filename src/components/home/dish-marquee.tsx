import Image from "next/image";
import Link from "next/link";
import type { FeaturedProduct } from "@/lib/catalog";
import { mediaUrl } from "@/lib/env";
import { formatMoney } from "@/lib/format";

/** Défilé continu des plats réellement proposés (photos et prix du catalogue), avec étiquettes en verre. */
export function DishMarquee({ products }: { products: FeaturedProduct[] }) {
  if (products.length < 3) return null;
  const loop = [...products, ...products];
  return (
    <div className="group relative overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <ul className="animate-marquee flex w-max gap-5 group-hover:[animation-play-state:paused]">
        {loop.map((p, i) => {
          const url = mediaUrl(p.photo_path);
          return (
            <li key={`${p.id}-${i}`} aria-hidden={i >= products.length}>
              <Link href={`/etablissements/${p.establishment_id}#produit-${p.id}`} tabIndex={i >= products.length ? -1 : 0} className="relative block h-80 w-64 overflow-hidden rounded-[28px] sm:h-96 sm:w-72">
                {url && <Image src={url} alt={p.name} fill sizes="288px" className="object-cover transition duration-700 hover:scale-105" />}
                <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="glass absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-white">
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{p.name}</span>
                    <span className="block truncate text-xs text-white/70">{p.establishment_name}</span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-bold">{formatMoney(p.price)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
