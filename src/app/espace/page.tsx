"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bike, ShieldCheck, ShoppingBag, Store, type LucideIcon } from "lucide-react";
import { useAccount } from "@/components/space-shell";

export default function SpacesHome() {
  const { roles } = useAccount();
  const router = useRouter();
  const spaces: { href: string; title: string; body: string; icon: LucideIcon }[] = [];
  // Espace Client seulement pour les comptes sans rôle professionnel (séparation des rôles, ADR-048/049).
  if (!roles.is_admin && !roles.restaurant_ids.length && !roles.courier_status) {
    spaces.push({ href: "/espace/commandes", title: "Mes commandes", body: "Suivi en direct, historique et reçus.", icon: ShoppingBag });
  }
  if (roles.restaurant_ids.length) {
    spaces.unshift({
      href: "/espace/etablissement",
      title: "Mon établissement",
      body: "Commandes du jour, produits, horaires et statistiques.",
      icon: Store,
    });
  }
  if (roles.courier_status) {
    spaces.push({ href: "/espace/livreur", title: "Espace livreur", body: "Dossier, missions passées, gains et espèces.", icon: Bike });
  }
  if (roles.is_admin) {
    spaces.splice(0, spaces.length, {
      href: "/espace/admin",
      title: "Administration",
      body: "Commandes à traiter, établissements, livreurs, paiements.",
      icon: ShieldCheck,
    });
  }
  // Un seul espace : on y va directement.
  const only = spaces.length === 1 ? spaces[0].href : null;
  useEffect(() => {
    if (only) router.replace(only);
  }, [only, router]);
  if (only) return null;

  return (
    <>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Mon espace</h1>
      <p className="mt-1 text-muted">Choisissez l&apos;espace dans lequel travailler.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {spaces.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex h-full gap-4 rounded-card border border-border bg-surface p-6 transition hover:shadow-float">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                <s.icon className="size-6" aria-hidden />
              </span>
              <span>
                <span className="block font-bold">{s.title}</span>
                <span className="mt-1 block text-sm text-muted">{s.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
