import { Suspense } from "react";
import type { Metadata } from "next";
import { SpaceShell } from "@/components/space-shell";

export const metadata: Metadata = { title: "Mon espace", robots: { index: false } };

// Pages affichées seulement après lecture de la session dans le navigateur : rien à prérendrer, la validation
// « navigation instantanée » (développement) ne s'applique pas à ces espaces.
export const instant = false;

// Espaces connectés : rendus dans le navigateur (session et données protégées par la RLS).
export default function SpaceLayout({ children }: LayoutProps<"/espace">) {
  return (
    <Suspense fallback={<div className="grid flex-1 place-items-center p-10 text-sm text-muted">Chargement de votre espace…</div>}>
      <SpaceShell>{children}</SpaceShell>
    </Suspense>
  );
}
