"use client";

import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Zone } from "@/lib/catalog";

/** Choix de la ville : mémorisé dans l'adresse de la page (partageable) et dans un cookie pour la visite suivante. */
export function CitySelect({ zones, current }: { zones: Zone[]; current: string }) {
  const router = useRouter();
  return (
    <label className="relative flex h-14 items-center gap-2 rounded-field bg-surface pl-4 pr-2 text-ink">
      <MapPin className="size-5 shrink-0 text-primary" aria-hidden />
      <span className="sr-only">Ville de livraison</span>
      <select
        value={current}
        onChange={(e) => {
          document.cookie = `ville=${e.target.value}; path=/; max-age=31536000; SameSite=Lax`;
          router.push(`/?ville=${e.target.value}#etablissements`, { scroll: false });
        }}
        className="h-full w-full cursor-pointer appearance-none bg-transparent pr-6 text-sm font-semibold focus:outline-none"
      >
        {zones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.name.startsWith(z.city) ? z.name : `${z.city} — ${z.name}`}
          </option>
        ))}
      </select>
    </label>
  );
}
