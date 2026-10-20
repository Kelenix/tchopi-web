import Link from "next/link";
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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface-alt hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}
