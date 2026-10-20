import Link from "next/link";
import { Logo } from "./logo";

const columns = [
  {
    title: "Commander",
    links: [
      { href: "/#etablissements", label: "Restaurants et magasins" },
      { href: "/recherche", label: "Rechercher un plat ou un produit" },
      { href: "/#fonctionnement", label: "Comment ça marche" },
      { href: "/connexion", label: "Se connecter" },
    ],
  },
  {
    title: "Partenaires",
    links: [
      { href: "/#partenaires", label: "Devenir partenaire" },
      { href: "/espace/etablissement", label: "Espace établissement" },
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

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted">
            Repas, courses et colis livrés dans votre ville, en Côte d&apos;Ivoire. Paiement en espèces, Mobile Money
            ou carte.
          </p>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <h2 className="text-sm font-bold">{c.title}</h2>
            <ul className="mt-4 space-y-3">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted transition hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted sm:px-6">
          © Tchopi · Côte d&apos;Ivoire · Prix en francs CFA (F)
        </p>
      </div>
    </footer>
  );
}
