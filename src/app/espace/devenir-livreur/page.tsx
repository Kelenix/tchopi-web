"use client";

import Link from "next/link";
import { CourierProfileCard } from "@/components/courier-space";
import { useAccount } from "@/components/space-shell";
import { browserClient } from "@/lib/supabase";

/** Candidature livreur sur le web : même dossier que l'app mobile, validé par l'équipe Tchopi. */
export default function BecomeCourierPage() {
  const { session } = useAccount();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/espace/bienvenue" className="text-sm font-semibold text-muted hover:text-ink">
        ← Retour
      </Link>
      <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">Devenir livreur</h1>
      <p className="mt-2 text-muted">
        Moto ou voiture : immatriculation. À vélo ou à pied : pièce d&apos;identité. L&apos;équipe Tchopi vérifie votre dossier
        et vous prévient de sa décision ; vous pourrez alors passer en ligne depuis l&apos;app mobile.
      </p>
      <div className="mt-8">
        <CourierProfileCard
          userId={session.user.id}
          onSubmitted={async () => {
            await browserClient().rpc("complete_onboarding");
            // Rôles relus : l'espace Livreur affiche l'état du dossier.
            window.location.replace(`${window.location.origin}/espace/livreur`);
          }}
        />
      </div>
    </div>
  );
}
