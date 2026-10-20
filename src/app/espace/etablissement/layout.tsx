"use client";

import Link from "next/link";
import { BellRing, CheckCircle2, Volume2 } from "lucide-react";
import { RequireRole, useAccount } from "@/components/space-shell";
import { EstablishmentProvider, useEstablishment } from "@/lib/establishment";
import { fieldClass } from "@/components/ui";

export default function EstablishmentLayout({ children }: LayoutProps<"/espace/etablissement">) {
  const { roles } = useAccount();
  return (
    <RequireRole allowed={(r) => r.restaurant_ids.length > 0}>
      <EstablishmentProvider ids={roles.restaurant_ids}>
        <Banner />
        {children}
        <Toast />
      </EstablishmentProvider>
    </RequireRole>
  );
}

function Banner() {
  const { ids, id, select, establishment, unseen, acknowledge, soundEnabled, enableSound } = useEstablishment();
  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {ids.length > 1 ? (
          <select value={id} onChange={(e) => select(e.target.value)} aria-label="Établissement" className={`${fieldClass} w-auto font-semibold`}>
            {ids.map((x) => (
              <option key={x} value={x}>
                {x === id && establishment ? establishment.name : `Établissement ${ids.indexOf(x) + 1}`}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm font-semibold text-muted">{establishment?.name ?? " "}</p>
        )}
        {!soundEnabled && (
          <button
            type="button"
            onClick={enableSound}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-warning-soft px-4 py-2 text-sm font-semibold text-warning"
          >
            <Volume2 className="size-4" aria-hidden /> Activer les alertes sonores
          </button>
        )}
      </div>
      {unseen.length > 0 && (
        <Link
          href="/espace/etablissement/commandes"
          onClick={acknowledge}
          className="flex items-center gap-3 rounded-card bg-warning-soft px-5 py-4 font-bold text-warning"
          role="alert"
        >
          <BellRing className="size-5 animate-bounce" aria-hidden />
          {unseen.length > 1 ? `${unseen.length} nouvelles commandes !` : "Nouvelle commande !"}
          <span className="ml-auto text-sm font-semibold underline">Voir</span>
        </Link>
      )}
    </div>
  );
}

function Toast() {
  const { toast } = useEstablishment();
  if (!toast) return null;
  return (
    <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-card bg-ink px-5 py-4 text-sm font-semibold text-on-ink shadow-float">
      <CheckCircle2 className="size-5 text-primary" aria-hidden /> {toast}
    </div>
  );
}
