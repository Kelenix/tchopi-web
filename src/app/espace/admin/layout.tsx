"use client";

import { RequireRole } from "@/components/space-shell";

/** Espace réservé aux administrateurs ; chaque action est de plus vérifiée par le serveur (fonctions admin_*, RLS). */
export default function AdminLayout({ children }: LayoutProps<"/espace/admin">) {
  return <RequireRole allowed={(r) => r.is_admin}>{children}</RequireRole>;
}
