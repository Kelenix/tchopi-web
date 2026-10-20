import { ChevronDown } from "lucide-react";

// Réponses fidèles au fonctionnement réel de la plateforme (mêmes règles que l'app mobile).
const questions = [
  {
    q: "Comment se passe une commande ?",
    a: "Choisissez votre ville, un établissement ouvert et vos produits. L'établissement accepte votre commande (il a 10 minutes pour répondre), la prépare, puis un livreur la récupère et vous l'apporte. Vous suivez chaque étape en direct.",
  },
  {
    q: "Que se passe-t-il si aucun livreur n'est disponible ?",
    a: "Votre commande est quand même transmise à l'établissement, qui la prépare. Elle est proposée aux livreurs dès qu'elle est prête et reste proposée jusqu'à ce que l'un d'eux l'accepte ; vous êtes prévenu à chaque étape.",
  },
  {
    q: "Comment puis-je payer ?",
    a: "En espèces à la livraison, et par Mobile Money (Orange Money, MTN MoMo, Wave, Moov Money) ou carte bancaire lorsque ces moyens sont ouverts dans votre ville. Le total, frais de livraison compris, est affiché avant de commander.",
  },
  {
    q: "Combien coûte la livraison ?",
    a: "Les frais dépendent de la distance entre l'établissement et votre adresse, selon les tarifs de votre ville. Ils sont calculés par le serveur et affichés avant la validation de la commande.",
  },
  {
    q: "À quoi sert le code de livraison ?",
    a: "Un code à 4 chiffres s'affiche dans le suivi de votre commande. Donnez-le au livreur à la remise : il confirme que la commande vous a bien été livrée.",
  },
  {
    q: "Puis-je annuler une commande ?",
    a: "Oui, tant que l'établissement ne l'a pas acceptée, ou plus tard si aucun livreur ne l'a encore prise après un long délai d'attente. Une commande déjà payée en ligne puis annulée ou refusée est remboursée sur le même moyen de paiement.",
  },
  {
    q: "Je tiens un restaurant ou un magasin : comment rejoindre Tchopi ?",
    a: "Envoyez votre demande avec le formulaire « Devenir partenaire ». L'équipe vous contacte, crée votre établissement et vous donne l'accès à votre espace : produits, commandes, horaires et statistiques, sur ordinateur ou sur l'application mobile.",
  },
];

export function Faq() {
  return (
    <div className="divide-y divide-border rounded-card border border-border bg-surface">
      {questions.map(({ q, a }) => (
        <details key={q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
            {q}
            <ChevronDown className="size-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
        </details>
      ))}
    </div>
  );
}
