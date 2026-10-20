"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Bike,
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useRoles, type Roles } from "@/lib/auth";
import { browserClient } from "@/lib/supabase";
import { useSession } from "@/lib/use-session";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

type Account = { session: Session; roles: Roles };
const AccountContext = createContext<Account | null>(null);

/** Compte connecté et ses rôles, pour les pages des espaces (toujours défini sous SpaceShell). */
export function useAccount(): Account {
  const account = useContext(AccountContext);
  if (!account) throw new Error("useAccount hors de SpaceShell");
  return account;
}

type NavItem = { href: string; label: string; icon: typeof Store };

function navFor(roles: Roles): { title: string; items: NavItem[] }[] {
  const groups = [
    {
      title: "Client",
      items: [
        { href: "/espace/commandes", label: "Mes commandes", icon: ShoppingBag },
        { href: "/espace/profil", label: "Mon profil", icon: UserRound },
      ],
    },
  ];
  if (roles.restaurant_ids.length) {
    groups.push({
      title: "Établissement",
      items: [
        { href: "/espace/etablissement", label: "Tableau de bord", icon: LayoutDashboard },
        { href: "/espace/etablissement/commandes", label: "Commandes", icon: ClipboardList },
        { href: "/espace/etablissement/produits", label: "Produits", icon: Package },
        { href: "/espace/etablissement/statistiques", label: "Statistiques", icon: ChartColumn },
        { href: "/espace/etablissement/parametres", label: "Profil et horaires", icon: Settings },
      ],
    });
  }
  if (roles.courier_status) {
    groups.push({ title: "Livreur", items: [{ href: "/espace/livreur", label: "Mon activité", icon: Bike }] });
  }
  if (roles.is_admin) {
    groups.push({
      title: "Administration",
      items: [
        { href: "/espace/admin", label: "Tableau de bord", icon: ShieldCheck },
        { href: "/espace/admin/commandes", label: "Commandes", icon: ReceiptText },
        { href: "/espace/admin/etablissements", label: "Établissements", icon: Store },
        { href: "/espace/admin/livreurs", label: "Livreurs", icon: Bike },
        { href: "/espace/admin/utilisateurs", label: "Utilisateurs", icon: Users },
        { href: "/espace/admin/paiements", label: "Paiements", icon: Wallet },
        { href: "/espace/admin/parametres", label: "Zones et paramètres", icon: Settings },
      ],
    });
  }
  return groups;
}

export function SpaceShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const roles = useRoles(Boolean(session));
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (session === null) router.replace(`/connexion?suite=${encodeURIComponent(pathname)}`);
  }, [session, router, pathname]);

  if (!session || !roles) {
    return (
      <div className="grid flex-1 place-items-center p-10 text-sm text-muted" aria-busy>
        {roles === null ? "Impossible de lire votre compte. Rechargez la page." : "Chargement de votre espace…"}
      </div>
    );
  }

  const nav = navFor(roles);
  const active = (href: string) =>
    pathname === href || (href !== "/espace/etablissement" && href !== "/espace/admin" && pathname.startsWith(`${href}/`));

  const sidebar = (
    <nav aria-label="Espaces" className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      {nav.map((g) => (
        <div key={g.title}>
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-muted">{g.title}</p>
          <ul className="mt-2 space-y-1">
            {g.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-semibold transition",
                    active(item.href) ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-alt hover:text-ink",
                  )}
                >
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button
        type="button"
        onClick={async () => {
          await browserClient().auth.signOut();
          router.replace("/");
        }}
        className="mt-auto flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-semibold text-muted hover:bg-surface-alt hover:text-ink"
      >
        <LogOut className="size-4" aria-hidden /> Se déconnecter
      </button>
    </nav>
  );

  return (
    <AccountContext.Provider value={{ session, roles }}>
      <div className="flex min-h-full flex-1">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
          <div className="flex h-16 items-center px-6">
            <Logo />
          </div>
          {sidebar}
        </aside>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface">
              <div className="flex h-16 items-center justify-between px-6">
                <Logo />
                <button type="button" aria-label="Fermer" onClick={() => setOpen(false)}>
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              {sidebar}
            </aside>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass-nav sticky top-3 z-30 mx-3 mt-3 flex h-14 items-center gap-3 rounded-full px-4 sm:mx-6">
            <button type="button" className="lg:hidden" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}>
              <MenuIcon className="size-6" aria-hidden />
            </button>
            <Link href="/" className="text-sm font-semibold text-muted hover:text-ink">
              ← Retour au site
            </Link>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        </div>
      </div>
    </AccountContext.Provider>
  );
}

/** Contenu réservé à un rôle : message clair sinon (les données restent protégées par la RLS côté serveur). */
export function RequireRole({ allowed, children }: { allowed: (roles: Roles) => boolean; children: ReactNode }) {
  const { roles } = useAccount();
  return allowed(roles) ? (
    children
  ) : (
    <p className="rounded-card border border-border bg-surface p-8 text-center text-muted">Cet espace n&apos;est pas ouvert à votre compte.</p>
  );
}
