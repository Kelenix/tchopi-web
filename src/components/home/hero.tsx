"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, Bike, Check, ChefHat, ClipboardCheck, Flame, Search } from "lucide-react";
import { Embers } from "./embers";

const words = ["Le", "goût", "d'Abidjan,"];
const accent = ["livré", "brûlant."];
const statuses = [
  { label: "Commande acceptée", icon: ClipboardCheck },
  { label: "En préparation", icon: ChefHat },
  { label: "Livreur en route", icon: Bike },
  { label: "Livrée", icon: Check },
];
const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Hero de l'accueil : photo du grill (projet Tchopi), braises animées, titre révélé mot à mot, recherche et cartes en
 * verre dépoli qui suivent légèrement la souris. Le nombre de restaurants ouverts est réel ; la carte de suivi illustre
 * le fonctionnement.
 */
export function Hero({ badge, city }: { badge: ReactNode; city: ReactNode }) {
  const reduce = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-25%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Parallaxe des cartes en verre à la souris (amortie).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const cardA = { x: useTransform(sx, (v) => v * -18), y: useTransform(sy, (v) => v * -14) };
  const cardB = { x: useTransform(sx, (v) => v * 26), y: useTransform(sy, (v) => v * 20) };

  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setStep((s) => (s + 1) % statuses.length), 2600);
    return () => clearInterval(timer);
  }, [reduce]);
  const status = statuses[reduce ? 2 : step];

  return (
    <section
      ref={section}
      onPointerMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      className="relative -mt-[4.25rem] flex min-h-[100svh] items-end overflow-hidden bg-[#0b0806] text-white"
    >
      <motion.div className="absolute inset-0" style={{ y: photoY }}>
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { scale: 1.18 }}
          animate={{ scale: 1.04 }}
          transition={{ duration: 14, ease: "easeOut" }}
        >
          <Image src="/hero/cover-grill-du-plateau.jpg" alt="" fill priority sizes="100vw" className="object-cover object-[60%_center]" />
        </motion.div>
      </motion.div>
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(100deg,rgba(11,8,6,0.94)_0%,rgba(11,8,6,0.72)_42%,rgba(11,8,6,0.15)_75%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#0b0806] to-transparent" />
      <Embers />

      <motion.div style={{ y: textY, opacity: fade }} className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-32 sm:px-6 lg:pb-24">
        <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="min-h-8">
          {badge}
        </motion.div>

        <h1 className="mt-6 max-w-3xl font-display text-[3.4rem] leading-[0.95] tracking-[-0.01em] sm:text-7xl lg:text-[6.5rem]">
          {[...words, ...accent].map((w, i) => (
            <motion.span
              key={w}
              className={`mr-[0.22em] inline-block ${i >= words.length ? "italic text-[#ffb35c]" : ""}`}
              initial={reduce ? false : { opacity: 0, y: "0.5em", filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.15 + i * 0.09, duration: 0.8, ease }}
            >
              {w}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.7, ease }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-white/75"
        >
          Garba, alloco, brochettes, poulet braisé : commandez dans les maquis et restaurants de votre ville, payez à la
          livraison ou en ligne, suivez votre livreur jusqu&apos;à votre porte.
        </motion.p>

        <motion.form
          action="/recherche"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7, ease }}
          className="glass mt-9 flex max-w-2xl flex-col gap-2 rounded-[28px] p-2 sm:flex-row sm:items-center sm:rounded-full"
        >
          {city}
          <label className="flex h-12 flex-1 items-center gap-2 px-4">
            <Search className="size-4 shrink-0 text-white/60" aria-hidden />
            <span className="sr-only">Plat ou restaurant</span>
            <input name="q" required minLength={2} placeholder="Garba, alloco, poulet braisé…" className="w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none" />
          </label>
          <button type="submit" className="h-12 rounded-full bg-[#ff8a3d] px-6 text-sm font-bold text-[#1a0d04] transition hover:brightness-110">
            Commander
          </button>
        </motion.form>

        <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/65">
          <span>Espèces, Mobile Money ou carte</span>
          <span>Suivi en direct</span>
          <Link href="#restaurateurs" className="font-semibold text-white underline-offset-4 hover:underline">
            Vous êtes restaurateur ?
          </Link>
        </motion.div>
      </motion.div>

      {/* Cartes en verre flottantes (grands écrans). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 mx-auto hidden max-w-6xl lg:block">
        <motion.div
          style={cardA}
          initial={reduce ? false : { opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.1, duration: 0.9, ease }}
          className="glass absolute right-[14%] top-[26%] w-72 rounded-3xl p-4"
        >
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={status.label}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="grid size-10 place-items-center rounded-full bg-[#3dd68c] text-[#06281a]"
              >
                <status.icon className="size-5" />
              </motion.span>
            </AnimatePresence>
            <div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p key={status.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="font-bold">
                  {status.label}
                </motion.p>
              </AnimatePresence>
              <p className="text-xs text-white/65">Suivi en direct</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {statuses.map((s, i) => (
              <span key={s.label} className={`h-1 rounded-full transition-colors duration-500 ${i <= (reduce ? 2 : step) ? "bg-[#3dd68c]" : "bg-white/20"}`} />
            ))}
          </div>
        </motion.div>

        <motion.div
          style={cardB}
          initial={reduce ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.35, duration: 0.9, ease }}
          className="glass absolute bottom-[16%] right-6 flex w-64 items-center gap-3 rounded-3xl p-3"
        >
          <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
            <Image src="/hero/brochettes-boeuf.jpg" alt="" fill sizes="64px" className="object-cover" />
          </span>
          <span>
            <span className="block text-sm font-bold">Brochettes de bœuf</span>
            <span className="mt-1 flex items-center gap-1 text-xs text-white/70">
              <Flame className="size-3.5 text-[#ffb35c]" /> Grillées à la commande
            </span>
          </span>
        </motion.div>
      </div>

      <motion.a
        href="#restaurants"
        aria-label="Voir les restaurants"
        animate={reduce ? undefined : { y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        className="glass absolute bottom-6 left-1/2 hidden size-11 -translate-x-1/2 place-items-center rounded-full sm:grid"
      >
        <ArrowDown className="size-4" />
      </motion.a>
    </section>
  );
}
