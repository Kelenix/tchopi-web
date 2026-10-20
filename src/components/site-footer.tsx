import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./logo";

const columns = [
  {
    title: "Commander",
    links: [
      { href: "/#restaurants", label: "Restaurants" },
      { href: "/recherche", label: "Rechercher un plat" },
      { href: "/#fonctionnement", label: "Comment ça marche" },
      { href: "/connexion", label: "Se connecter" },
    ],
  },
  {
    title: "Restaurateurs",
    links: [
      { href: "/inscription?profil=restaurant", label: "Inscrire mon restaurant" },
      { href: "/espace/etablissement", label: "Espace restaurant" },
      { href: "/espace/livreur", label: "Espace livreur" },
    ],
  },
  {
    title: "Aide",
    links: [
      { href: "/#faq", label: "Questions fréquentes" },
      { href: "/conditions", label: "Conditions d'utilisation" },
      { href: "/confidentialite", label: "Confidentialité" },
    ],
  },
];

/** Pied de page toujours sombre : appel à commander sur photo, liens, grande signature « Tchopi ». */
export function SiteFooter() {
  return (
    <footer className="relative mt-28 overflow-hidden bg-[#0b0806] text-white">
      <div className="relative mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <div className="relative overflow-hidden rounded-[36px]">
          <Image src="/hero/brochettes-boeuf.jpg" alt="" fill sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(100deg,rgba(11,8,6,0.92)_20%,rgba(11,8,6,0.45))]" />
          <div className="relative flex flex-col items-start gap-6 p-8 sm:p-14 md:flex-row md:items-end md:justify-between">
            <p className="max-w-xl font-display text-4xl leading-[1.02] sm:text-6xl">
              Une petite faim ? <span className="italic text-[#ffb35c]">On s&apos;en occupe.</span>
            </p>
            <Link href="/#restaurants" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#ff8a3d] px-6 font-bold text-[#1a0d04] transition hover:brightness-110">
              Commander maintenant <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="grid gap-10 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <span className="glass inline-flex rounded-full py-1.5 pl-2 pr-4">
              <Logo />
            </span>
            <p className="max-w-xs text-sm text-white/60">
              Les restaurants de votre ville, livrés chez vous en Côte d&apos;Ivoire. Espèces, Mobile Money ou carte.
            </p>
          </div>
          {columns.map((c) => (
            <div key={c.title}>
              <h2 className="text-sm font-bold text-[#ffb35c]">{c.title}</h2>
              <ul className="mt-4 space-y-3">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/70 transition hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <p aria-hidden className="pointer-events-none select-none text-center font-display text-[24vw] leading-[0.78] tracking-[-0.04em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.12)]">
        Tchopi
      </p>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-white/50 sm:px-6">© Tchopi, Côte d&apos;Ivoire. Prix en francs CFA.</p>
      </div>
    </footer>
  );
}
