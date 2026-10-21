"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Bike, Check, ChevronLeft, MapPin, Plus, ShoppingBag, Star } from "lucide-react";

/**
 * Démonstration animée de l'app dans un téléphone : choisir un restaurant, ajouter un plat, valider (frais calculés sur
 * la distance par la route), suivre le livreur. Les étapes défilent seules un clic sur une étape
 * l'affiche. Illustration : prix et noms d'exemple.
 */
const SCENE_MS = 3800;
const steps = [
  { title: "Choisissez un restaurant", body: "Les restaurants ouverts de votre ville, avec leurs plats en photo." },
  { title: "Ajoutez vos plats", body: "Tailles, suppléments : le prix se met à jour à chaque choix." },
  { title: "Validez votre commande", body: "Livraison calculée sur la distance par la route, total affiché avant de payer." },
  { title: "Suivez votre livreur", body: "Sa position en direct jusqu'à votre porte, puis le code de remise." },
];
const ease = [0.22, 1, 0.36, 1] as const;

export function AppDemo() {
  const reduce = useReducedMotion();
  const [scene, setScene] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setScene((n) => (n + 1) % steps.length), SCENE_MS);
    return () => clearInterval(timer);
  }, [reduce, scene]);

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => setScene(i)}
              aria-current={scene === i}
              className={`relative w-full overflow-hidden rounded-3xl p-5 text-left transition ${scene === i ? "bg-surface shadow-float ring-1 ring-border" : "opacity-60 hover:opacity-100"}`}
            >
              <span className="flex items-start gap-4">
                <span className={`tabular grid size-10 shrink-0 place-items-center rounded-full font-bold ${scene === i ? "bg-[#ff8a3d] text-[#1a0d04]" : "bg-surface-alt text-muted"}`}>
                  {i + 1}
                </span>
                <span>
                  <span className="block text-lg font-bold">{s.title}</span>
                  <span className="text-sm text-muted">{s.body}</span>
                </span>
              </span>
              {scene === i && !reduce && (
                <motion.span
                  key={`bar-${i}`}
                  aria-hidden
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: SCENE_MS / 1000, ease: "linear" }}
                  className="absolute inset-x-0 bottom-0 h-1 origin-left bg-[#ff8a3d]"
                />
              )}
            </button>
          </li>
        ))}
      </ol>

      {/* Téléphone */}
      <div className="order-first mx-auto w-[280px] rounded-[44px] lg:order-none bg-[#0b0806] p-3 shadow-2xl ring-1 ring-black/40 sm:w-[300px]">
        <div className="relative h-[560px] overflow-hidden rounded-[34px] bg-[#f7f5f2] text-[#14110f] sm:h-[600px]">
          <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0b0806]" aria-hidden />
          <AnimatePresence initial={false}>
            <motion.div
              key={scene}
              initial={reduce ? false : { opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -40 }}
              transition={{ duration: 0.45, ease }}
              className="absolute inset-0 pt-10"
            >
              {[<Restaurants key="r" />, <Dish key="d" />, <Checkout key="c" />, <Tracking key="t" reduce={Boolean(reduce)} />][scene]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/** Doigt qui touche un élément (cercle qui grossit), après un délai. */
function Tap({ delay, className }: { delay: number; className: string }) {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1, 1.6] }}
      transition={{ delay, duration: 0.8 }}
      className={`pointer-events-none absolute z-10 size-12 rounded-full bg-[#ff8a3d]/40 ring-2 ring-[#ff8a3d] ${className}`}
    />
  );
}

function Restaurants() {
  const items = [
    ["Maquis Chez Tante", "Garba, alloco", "/hero/cover-maquis-chez-tante.jpg", "4,8"],
    ["Grill du Plateau", "Brochettes, poulet", "/hero/cover-grill-du-plateau.jpg", "4,6"],
  ];
  return (
    <div className="px-4">
      <p className="text-xs text-[#6b645e]">Livraison à Cocody</p>
      <p className="text-lg font-extrabold">Restaurants ouverts</p>
      <div className="mt-3 space-y-3">
        {items.map(([name, kind, src, rate], i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, scale: i === 0 ? [1, 1, 0.97, 1] : 1 }}
            transition={{ delay: 0.15 * i, duration: i === 0 ? 2.2 : 0.4, times: i === 0 ? [0, 0.7, 0.8, 1] : undefined }}
            className="relative overflow-hidden rounded-2xl bg-white shadow-sm"
          >
            <div className="relative h-28">
              <Image src={src} alt="" fill sizes="280px" className="object-cover" />
            </div>
            <div className="flex items-center justify-between p-3">
              <span>
                <span className="block text-sm font-bold">{name}</span>
                <span className="text-xs text-[#6b645e]">{kind} · 25-35 min</span>
              </span>
              <span className="flex items-center gap-1 text-xs font-bold">
                <Star className="size-3.5 fill-[#ffb35c] text-[#ffb35c]" /> {rate}
              </span>
            </div>
            {i === 0 && <Tap delay={1.4} className="left-1/2 top-12 -translate-x-1/2" />}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Dish() {
  const [added, setAdded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAdded(true), 1700);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div>
      <div className="relative h-44">
        <Image src="/hero/garba.jpg" alt="" fill sizes="280px" className="object-cover" />
        <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-full bg-white/90">
          <ChevronLeft className="size-4" />
        </span>
      </div>
      <div className="px-4 pt-3">
        <p className="text-lg font-extrabold">Garba</p>
        <p className="text-xs text-[#6b645e]">Attiéké, thon frit, piment et oignons</p>
        <p className="mt-3 text-xs font-bold uppercase text-[#6b645e]">Taille</p>
        {[
          ["Normal", "1 500 FCFA"],
          ["Grand", "+ 500 FCFA"],
        ].map(([label, price], i) => (
          <div key={label} className="mt-2 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ backgroundColor: i === 1 && added ? "#ff8a3d" : i === 0 && !added ? "#ff8a3d" : "#ffffff" }}
                className="size-4 rounded-full ring-2 ring-[#ff8a3d]"
              />
              {label}
            </span>
            <span className="text-xs text-[#6b645e]">{price}</span>
          </div>
        ))}
        <Tap delay={1.2} className="right-16 top-[300px]" />
        <motion.div
          animate={{ scale: added ? [1, 1.06, 1] : 1 }}
          transition={{ delay: 0.9 }}
          className="relative mt-5 flex items-center justify-between rounded-full bg-[#c2410c] px-4 py-3 text-sm font-bold text-white"
        >
          <span className="flex items-center gap-2">
            <Plus className="size-4" /> Ajouter
          </span>
          <span className="tabular">{added ? "2 000 FCFA" : "1 500 FCFA"}</span>
          <AnimatePresence>
            {added && (
              <motion.span
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: -40 }}
                transition={{ delay: 0.6, duration: 1.1 }}
                className="absolute -top-2 right-6 flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-[#c2410c] shadow"
              >
                <ShoppingBag className="size-3" /> +1
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function Checkout() {
  const rows = [
    ["Garba (Grand) × 1", "2 000 FCFA"],
    ["Bissap × 2", "1 000 FCFA"],
    ["Distance par la route", "3,2 km"],
    ["Livraison", "820 FCFA"],
  ];
  return (
    <div className="px-4">
      <p className="text-lg font-extrabold">Votre commande</p>
      <div className="mt-3 rounded-2xl bg-white p-3 text-sm">
        {rows.map(([k, v], i) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 * i }}
            className="flex justify-between py-1.5"
          >
            <span className="text-[#6b645e]">{k}</span>
            <span className="tabular font-semibold">{v}</span>
          </motion.div>
        ))}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-1 flex justify-between border-t border-[#eee8e2] pt-2 font-extrabold">
          <span>Total</span>
          <span className="tabular">3 820 FCFA</span>
        </motion.div>
      </div>
      <p className="mt-4 text-xs font-bold uppercase text-[#6b645e]">Paiement</p>
      {["Espèces à la livraison", "Mobile Money"].map((m, i) => (
        <div key={m} className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm">
          <span className={`size-4 rounded-full ring-2 ring-[#ff8a3d] ${i === 1 ? "bg-[#ff8a3d]" : ""}`} />
          {m}
        </div>
      ))}
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1, 0.96, 1] }}
          transition={{ duration: 2.4, times: [0, 0.75, 0.85, 1] }}
          className="mt-5 rounded-full bg-[#c2410c] py-3 text-center text-sm font-bold text-white"
        >
          Commander · 3 820 FCFA
        </motion.div>
        <Tap delay={1.7} className="left-1/2 top-1 -translate-x-1/2" />
      </div>
    </div>
  );
}

function Tracking({ reduce }: { reduce: boolean }) {
  const path = "M40 250 C 90 220, 70 160, 130 140 S 200 90, 230 40";
  return (
    <div>
      <div className="relative mx-4 h-64 overflow-hidden rounded-2xl bg-[#e9efe9]">
        <svg viewBox="0 0 270 280" className="absolute inset-0 size-full" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M${-20 + i * 45} -10 L${30 + i * 45} 300`} stroke="#fff" strokeWidth="8" opacity="0.8" />
          ))}
          <path d={path} fill="none" stroke="#c2410c" strokeOpacity="0.25" strokeWidth="6" strokeLinecap="round" />
          <motion.path
            d={path}
            fill="none"
            stroke="#c2410c"
            strokeWidth="6"
            strokeLinecap="round"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
          />
        </svg>
        <span className="absolute bottom-6 left-6 grid size-8 place-items-center rounded-full bg-white shadow">
          <ShoppingBag className="size-4 text-[#c2410c]" />
        </span>
        <span className="absolute right-6 top-5 grid size-8 place-items-center rounded-full bg-[#14110f] shadow">
          <MapPin className="size-4 text-white" />
        </span>
        <motion.span
          className="absolute grid size-10 place-items-center rounded-full bg-[#ff8a3d] shadow-lg ring-4 ring-white"
          style={{ offsetPath: `path("${path}")`, offsetRotate: "0deg", left: -20, top: -20 }}
          initial={{ offsetDistance: reduce ? "100%" : "0%" }}
          animate={{ offsetDistance: "100%" }}
          transition={{ duration: 3, ease: "easeInOut" }}
        >
          <Bike className="size-5 text-[#1a0d04]" />
        </motion.span>
      </div>
      <div className="mx-4 mt-3 rounded-2xl bg-white p-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-[#ffe8d6] font-bold text-[#c2410c]">K</span>
          <span className="flex-1">
            <span className="block text-sm font-bold">Koffi arrive</span>
            <span className="text-xs text-[#6b645e]">Moto · environ 6 min</span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="h-1 rounded-full"
              initial={{ backgroundColor: "#eee8e2" }}
              animate={{ backgroundColor: i < 3 ? "#c2410c" : "#eee8e2" }}
              transition={{ delay: 0.3 * i }}
            />
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-[#6b645e]">
          <Check className="size-4 text-[#16a34a]" /> Code de remise : <span className="font-mono font-bold tracking-widest text-[#14110f]">4 8 2 7</span>
        </p>
      </div>
    </div>
  );
}
