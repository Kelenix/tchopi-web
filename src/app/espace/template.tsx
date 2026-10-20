"use client";

import { motion, useReducedMotion } from "motion/react";

/** Transition douce à chaque changement de page dans les espaces connectés. */
export default function SpaceTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
