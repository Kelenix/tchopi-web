"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Bike, ShoppingBag, Store, type LucideIcon } from "lucide-react";
import { browserClient } from "@/lib/supabase";

const choices: { key: string; href: string; title: string; body: string; icon: LucideIcon }[] = [
  { key: "client", href: "/", title: "Commander des repas", body: "Les restaurants de votre ville, livrés chez vous.", icon: ShoppingBag },
  { key: "restaurant", href: "/espace/nouveau-restaurant", title: "Inscrire mon restaurant", body: "Recevez des commandes en ligne ; validation par l'équipe Tchopi.", icon: Store },
  { key: "courier", href: "/espace/devenir-livreur", title: "Devenir livreur", body: "Livrez avec votre moto, votre vélo ou à pied, aux horaires que vous choisissez.", icon: Bike },
];

/** Onboarding (ADR-054) : après l'inscription, le compte choisit son parcours. */
export default function WelcomePage() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function choose(c: (typeof choices)[number]) {
    setBusy(c.key);
    // Client : parcours terminé ; établissement et livreur : terminé à l'envoi de leur inscription.
    if (c.key === "client") await browserClient().rpc("complete_onboarding");
    // Rechargement complet pour le client : les rôles du compte sont relus.
    if (c.key === "client") window.location.replace(`${window.location.origin}/`);
    else router.push(c.href);
  }

  return (
    <div className="mx-auto max-w-3xl py-6">
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Bienvenue sur Tchopi !</h1>
      <p className="mt-2 text-muted">Que souhaitez-vous faire ? Vous pourrez changer plus tard.</p>
      <ul className="mt-8 grid gap-4">
        {choices.map((c) => (
          <li key={c.key}>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => choose(c)}
              className="flex w-full items-center gap-5 rounded-card border border-border bg-surface p-6 text-left transition hover:border-primary hover:shadow-float disabled:opacity-60"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                <c.icon className="size-7" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">{c.title}</span>
                <span className="text-sm text-muted">{c.body}</span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-muted" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
