"use client";

import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Zone } from "@/lib/catalog";

/** Choix de la ville dans la recherche du hero (verre sur fond sombre). */
export function GlassCity({ zones, current }: { zones: Zone[]; current: string }) {
  const router = useRouter();
  return (
    <label className="flex h-12 items-center gap-2 rounded-full bg-white/10 pl-4 pr-3 sm:w-52">
      <MapPin className="size-4 shrink-0 text-[#ffb35c]" aria-hidden />
      <span className="sr-only">Ville</span>
      <select
        name="ville"
        defaultValue={current}
        onChange={(e) => {
          document.cookie = `ville=${e.target.value}; path=/; max-age=31536000; SameSite=Lax`;
          router.push(`/?ville=${e.target.value}#restaurants`, { scroll: false });
        }}
        className="w-full cursor-pointer appearance-none bg-transparent text-sm font-semibold text-white focus:outline-none [&>option]:text-black"
      >
        {zones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.city}
          </option>
        ))}
      </select>
    </label>
  );
}
