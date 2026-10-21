import Link from "next/link";
import { Suspense } from "react";
import { HeaderLogo } from "./header-logo";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { AccountButton } from "./account-button";

const links = [
  { href: "/#restaurants", label: "Restaurants" },
  { href: "/#fonctionnement", label: "Comment ça marche" },
  { href: "/#restaurateurs", label: "Restaurateurs" },
  { href: "/#faq", label: "Questions" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      {/* Pilule en verre dépoli, posée au-dessus du contenu (sur l'accueil, au-dessus de la photo). */}
      <div className="glass-nav mx-auto flex h-16 max-w-6xl items-center gap-4 rounded-full pl-4 pr-2">
        {/* Chemin de la page lu au rendu : logo affiché en attendant (pré-rendu statique des pages). */}
        <Suspense fallback={<Logo height={52} />}>
          <HeaderLogo />
        </Suspense>
        <nav aria-label="Navigation principale" className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-ink/80 transition hover:bg-ink/5 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}
