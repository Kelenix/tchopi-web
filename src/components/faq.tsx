"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { useState } from "react";

// Réponses fidèles au fonctionnement réel de la plateforme (mêmes règles que l'app mobile).
const questions = [
  {
    q: "Comment se passe une commande ?",
    a: "Choisissez votre ville, un restaurant ouvert et vos plats. Le restaurant accepte votre commande (il a 10 minutes pour répondre), la prépare, puis un livreur la récupère et vous l'apporte. Vous suivez chaque étape en direct.",
  },
  {
    q: "Que se passe-t-il si aucun livreur n'est disponible ?",
    a: "Votre commande est quand même transmise au restaurant, qui la prépare. Elle est proposée aux livreurs dès qu'elle est prête et reste proposée jusqu'à ce que l'un d'eux l'accepte ; vous êtes prévenu à chaque étape.",
  },
  {
    q: "Comment puis-je payer ?",
    a: "En espèces à la livraison, et par Mobile Money (Orange Money, MTN MoMo, Wave, Moov Money) ou carte bancaire lorsque ces moyens sont ouverts dans votre ville. Le total, frais de livraison compris, est affiché avant de commander.",
  },
  {
    q: "Combien coûte la livraison ?",
    a: "Les frais dépendent de la distance entre le restaurant et votre adresse, selon les tarifs de votre ville. Ils sont calculés par le serveur et affichés avant la validation de la commande.",
  },
  {
    q: "À quoi sert le code de livraison ?",
    a: "Un code à 4 chiffres s'affiche dans le suivi de votre commande. Donnez-le au livreur à la remise : il confirme que la commande vous a bien été livrée.",
  },
  {
    q: "Puis-je annuler une commande ?",
    a: "Oui, tant que le restaurant ne l'a pas acceptée, ou plus tard si aucun livreur ne l'a encore prise après un long délai d'attente. Une commande déjà payée en ligne puis annulée ou refusée est remboursée sur le même moyen de paiement.",
  },
  {
    q: "Je tiens un restaurant : comment rejoindre Tchopi ?",
    a: "Inscrivez votre restaurant en quelques minutes avec « Inscrire mon restaurant » : compte, adresse, horaires, puis votre carte. L'équipe Tchopi valide l'inscription (en général sous 48 h) et vos plats deviennent visibles. Vous gérez ensuite commandes, carte et statistiques sur ordinateur ou sur l'application mobile.",
  },
];

/** Questions fréquentes : cartes en verre, une ouverte à la fois, ouverture animée. */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();
  return (
    <ul className="space-y-3">
      {questions.map(({ q, a }, i) => {
        const isOpen = open === i;
        return (
          <li key={q} className={`glass-nav overflow-hidden rounded-[28px] transition ${isOpen ? "ring-1 ring-[#ff8a3d]/40" : ""}`}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center gap-5 px-6 py-5 text-left"
            >
              <span className="tabular font-display text-2xl text-[#ff8a3d]">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-base font-semibold sm:text-lg">{q}</span>
              <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: reduce ? 0 : 0.25 }} className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/5">
                <Plus className="size-4" aria-hidden />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="px-6 pb-6 pl-[4.6rem] leading-relaxed text-muted">{a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
