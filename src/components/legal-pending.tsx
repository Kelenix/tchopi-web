import { FileText } from "lucide-react";
import { EmptyState } from "./empty-state";
import { PageHero } from "./page-hero";

/** Textes juridiques en cours de rédaction (tâche manuelle) : rien d'inventé n'est publié à leur place. */
export function LegalPending({ title }: { title: string }) {
  return (
    <>
      <PageHero image="/hero/cover-maquis-chez-tante.jpg" title={title} />
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <EmptyState
        icon={FileText}
        title="Texte en cours de validation"
        body="Ce document est en cours de rédaction et sera publié ici avant l'ouverture du service au public."
      />
      </div>
    </>
  );
}
