"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Embers } from "./home/embers";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * En-tête des pages du site, même langage que l'accueil : photo sombre avec zoom lent, titre éditorial révélé,
 * contenu en verre dépoli. Passe sous la barre de navigation (marge négative).
 */
export function PageHero({
  image,
  title,
  subtitle,
  children,
  tall = false,
  embers = false,
}: {
  image: string | null;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  tall?: boolean;
  embers?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <section className={`relative -mt-[4.25rem] flex items-end overflow-hidden bg-[#0b0806] text-white ${tall ? "min-h-[64svh]" : "min-h-[42svh]"}`}>
      {image && (
        <motion.div className="absolute inset-0" initial={reduce ? false : { scale: 1.15 }} animate={{ scale: 1.03 }} transition={{ duration: 12, ease: "easeOut" }}>
          <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />
        </motion.div>
      )}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,8,6,0.55)_0%,rgba(11,8,6,0.35)_40%,rgba(11,8,6,0.92)_100%)]" />
      {embers && <Embers count={40} />}
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-28 sm:px-6">
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease }}
          className="max-w-4xl font-display text-5xl leading-[0.98] sm:text-7xl"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease }}
            className="mt-4 max-w-2xl text-white/75"
          >
            {subtitle}
          </motion.div>
        )}
        {children && (
          <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7, ease }} className="mt-7">
            {children}
          </motion.div>
        )}
      </div>
    </section>
  );
}
