"use client";

import { motion, useReducedMotion } from "motion/react";
import { Bike, ChefHat, KeyRound, ShoppingBag } from "lucide-react";

const steps = [
  { icon: ShoppingBag, title: "Vous commandez", body: "Choisissez vos plats et payez en espèces, Mobile Money ou carte. Le total, livraison comprise, s'affiche avant de valider." },
  { icon: ChefHat, title: "Le restaurant cuisine", body: "Il accepte en quelques minutes et prépare votre commande, même si aucun livreur n'est encore libre." },
  { icon: Bike, title: "Un livreur l'apporte", body: "Dès que c'est prêt, la commande est proposée aux livreurs proches. Vous suivez le trajet sur la carte." },
  { icon: KeyRound, title: "Remise avec un code", body: "Donnez au livreur le code à 4 chiffres affiché dans votre suivi : la livraison est confirmée." },
];

/** Les étapes d'une commande : la ligne qui les relie se dessine une fois, à l'arrivée de la section. */
export function Process() {
  const reduce = useReducedMotion();
  return (
    <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
      <motion.span
        aria-hidden
        className="absolute left-6 top-6 hidden h-0.5 origin-left bg-primary md:block"
        style={{ right: "12%" }}
        initial={{ scaleX: reduce ? 1 : 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      />
      {steps.map((s, i) => (
        <motion.li
          key={s.title}
          className="relative"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ delay: reduce ? 0 : 0.25 + i * 0.3, duration: 0.4 }}
        >
          <span className="relative z-10 grid size-12 place-items-center rounded-full bg-primary text-on-primary ring-8 ring-background">
            <s.icon className="size-5" aria-hidden />
          </span>
          <p className="tabular mt-5 text-sm font-bold text-primary">{String(i + 1).padStart(2, "0")}</p>
          <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
        </motion.li>
      ))}
    </ol>
  );
}
