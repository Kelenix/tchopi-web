"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import {
  Banknote,
  BatteryFull,
  Bike,
  Check,
  ChevronLeft,
  Clock,
  CreditCard,
  House,
  MapPin,
  Minus,
  Phone,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Signal,
  Smartphone,
  Star,
  UserRound,
  Wifi,
} from "lucide-react";

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
          <StatusBar />
          <AnimatePresence initial={false}>
            <motion.div
              key={scene}
              initial={reduce ? false : { opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -40 }}
              transition={{ duration: 0.45, ease }}
              className="absolute inset-x-0 bottom-0 top-9 flex flex-col pt-2"
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

const muted = "text-[#6b645e]";

/** Barre d'état du téléphone (heure, réseau, batterie). */
function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[11px] font-bold" aria-hidden>
      <span>12:30</span>
      <span className="flex items-center gap-1">
        <Signal className="size-3" /> <Wifi className="size-3" /> <BatteryFull className="size-4" />
      </span>
    </div>
  );
}

/** Barre de navigation de l'app. */
function TabBar({ active }: { active: number }) {
  const tabs = [
    [House, "Accueil"],
    [Search, "Recherche"],
    [ReceiptText, "Commandes"],
    [UserRound, "Compte"],
  ] as const;
  return (
    <div className="mt-auto grid grid-cols-4 border-t border-[#eee8e2] bg-white px-2 pb-4 pt-2">
      {tabs.map(([Icon, label], i) => (
        <span key={label} className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${i === active ? "text-[#c2410c]" : muted}`}>
          <Icon className="size-4" />
          {label}
        </span>
      ))}
    </div>
  );
}

function Restaurants() {
  const items = [
    ["Maquis Chez Tante", "Garba, alloco", "/hero/cover-maquis-chez-tante.jpg", "4,8", "20-30"],
    ["Grill du Plateau", "Brochettes, poulet", "/hero/cover-grill-du-plateau.jpg", "4,6", "25-35"],
    ["Chez Aya", "Kedjenou, poulet DG", "/hero/kedjenou-poulet.jpg", "4,7", "30-40"],
  ];
  return (
    <>
      <div className="px-4">
        <p className={`flex items-center gap-1 text-[11px] ${muted}`}>
          <MapPin className="size-3 text-[#c2410c]" /> Livraison à <b className="text-[#14110f]">Cocody, Riviera 2</b>
        </p>
        <p className="mt-0.5 text-lg font-extrabold">Ce soir, on mange quoi ?</p>
        <div className={`mt-2 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs ${muted}`}>
          <Search className="size-3.5" /> Garba, brochettes, poulet…
        </div>
        <div className="mt-2 flex gap-1.5 overflow-hidden text-[11px] font-semibold">
          {["Tout", "Maquis", "Grillades", "Poulet", "Boissons"].map((c, i) => (
            <span key={c} className={`shrink-0 rounded-full px-3 py-1 ${i === 0 ? "bg-[#14110f] text-white" : "bg-white"}`}>
              {c}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-2 px-4">
        {items.map(([name, kind, src, rate, time], i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, scale: i === 0 ? [1, 1, 0.97, 1] : 1 }}
            transition={{ delay: 0.12 * i, duration: i === 0 ? 2.4 : 0.4, times: i === 0 ? [0, 0.7, 0.8, 1] : undefined }}
            className="relative flex gap-3 overflow-hidden rounded-2xl bg-white p-2 shadow-sm"
          >
            <span className="relative size-[68px] shrink-0 overflow-hidden rounded-xl">
              <Image src={src} alt="" fill sizes="68px" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1 py-0.5">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold">{name}</span>
                <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold">
                  <Star className="size-3 fill-[#ffb35c] text-[#ffb35c]" /> {rate}
                </span>
              </span>
              <span className={`block text-[11px] ${muted}`}>{kind}</span>
              <span className={`mt-1 flex items-center gap-2 text-[11px] ${muted}`}>
                <Clock className="size-3" /> {time} min
                <Bike className="size-3" /> 600 FCFA
              </span>
            </span>
            {i === 0 && <Tap delay={1.5} className="left-1/2 top-3 -translate-x-1/2" />}
          </motion.div>
        ))}
      </div>
      <TabBar active={0} />
    </>
  );
}

function Dish() {
  const [added, setAdded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAdded(true), 1600);
    return () => clearTimeout(timer);
  }, []);
  const option = (label: string, price: string, on: boolean) => (
    <div key={label} className="mt-1.5 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs">
      <span className="flex items-center gap-2">
        <motion.span animate={{ backgroundColor: on ? "#ff8a3d" : "#ffffff" }} className="size-3.5 rounded-full ring-2 ring-[#ff8a3d]" />
        {label}
      </span>
      <span className={muted}>{price}</span>
    </div>
  );
  return (
    <>
      <div className="relative mx-4 h-36 overflow-hidden rounded-2xl">
        <Image src="/hero/garba.jpg" alt="" fill sizes="280px" className="object-cover" />
        <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-white/90">
          <ChevronLeft className="size-4" />
        </span>
      </div>
      <div className="relative px-4 pt-2">
        <div className="flex items-start justify-between">
          <span>
            <p className="text-base font-extrabold">Garba</p>
            <p className={`text-[11px] ${muted}`}>Attiéké, thon frit, piment, oignons</p>
          </span>
          <span className="text-sm font-bold">1 500 FCFA</span>
        </div>
        <p className={`mt-2 text-[10px] font-bold uppercase ${muted}`}>Taille · obligatoire</p>
        {option("Normal", "inclus", !added)}
        {option("Grand", "+ 500 FCFA", added)}
        <p className={`mt-2 text-[10px] font-bold uppercase ${muted}`}>Suppléments</p>
        {option("Œuf", "+ 200 FCFA", false)}
        {option("Piment en plus", "gratuit", false)}
        <Tap delay={1.2} className="right-10 top-[96px]" />
      </div>
      <div className="mt-auto flex items-center gap-3 border-t border-[#eee8e2] bg-white px-4 pb-5 pt-3">
        <span className="flex items-center gap-2 rounded-full bg-[#f7f5f2] px-2 py-1.5 text-sm font-bold">
          <Minus className="size-3.5" /> 1 <Plus className="size-3.5" />
        </span>
        <motion.span
          animate={{ scale: added ? [1, 1.06, 1] : 1 }}
          transition={{ delay: 0.9 }}
          className="relative flex flex-1 items-center justify-between rounded-full bg-[#c2410c] px-4 py-2.5 text-xs font-bold text-white"
        >
          Ajouter
          <span className="tabular">{added ? "2 000 FCFA" : "1 500 FCFA"}</span>
          <AnimatePresence>
            {added && (
              <motion.span
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: -36 }}
                transition={{ delay: 0.6, duration: 1.1 }}
                className="absolute -top-2 right-6 flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] text-[#c2410c] shadow"
              >
                <ShoppingBag className="size-3" /> +1
              </motion.span>
            )}
          </AnimatePresence>
        </motion.span>
      </div>
    </>
  );
}

function Checkout() {
  const lines = [
    ["Garba (Grand)", "× 1", "2 000"],
    ["Bissap glacé", "× 2", "1 000"],
  ];
  return (
    <>
      <div className="flex items-center gap-2 px-4">
        <ChevronLeft className="size-4" />
        <p className="text-base font-extrabold">Votre commande</p>
      </div>
      <div className="mt-2 px-4">
        <div className="flex items-center gap-2 rounded-2xl bg-white p-2.5 text-xs">
          <span className="grid size-8 place-items-center rounded-full bg-[#ffe8d6]">
            <MapPin className="size-4 text-[#c2410c]" />
          </span>
          <span>
            <b className="block">Riviera 2, près de la pharmacie</b>
            <span className={muted}>Cocody · 3,2 km par la route</span>
          </span>
        </div>
        <div className="mt-2 rounded-2xl bg-white p-3 text-xs">
          <p className="font-bold">Maquis Chez Tante</p>
          {lines.map(([n, q, p], i) => (
            <motion.div key={n} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 * i }} className="mt-1.5 flex justify-between">
              <span>
                {n} <span className={muted}>{q}</span>
              </span>
              <span className="tabular">{p} FCFA</span>
            </motion.div>
          ))}
          <div className={`mt-2 space-y-1 border-t border-[#eee8e2] pt-2 ${muted}`}>
            <div className="flex justify-between">
              <span>Produits</span>
              <span className="tabular">3 000 FCFA</span>
            </div>
            <div className="flex justify-between">
              <span>Livraison (3,2 km)</span>
              <span className="tabular">820 FCFA</span>
            </div>
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 flex justify-between text-sm font-extrabold">
            <span>Total</span>
            <span className="tabular">3 820 FCFA</span>
          </motion.div>
        </div>
        <p className={`mt-3 text-[10px] font-bold uppercase ${muted}`}>Paiement</p>
        {[
          [Banknote, "Espèces à la livraison"],
          [Smartphone, "Mobile Money"],
          [CreditCard, "Carte bancaire"],
        ].map(([Icon, m], i) => {
          const I = Icon as typeof Banknote;
          return (
            <div key={m as string} className="mt-1.5 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs">
              <I className="size-4 text-[#c2410c]" />
              <span className="flex-1">{m as string}</span>
              <motion.span
                initial={{ backgroundColor: "#ffffff" }}
                animate={{ backgroundColor: i === 1 ? "#ff8a3d" : "#ffffff" }}
                transition={{ delay: 0.9 }}
                className="size-3.5 rounded-full ring-2 ring-[#ff8a3d]"
              />
            </div>
          );
        })}
      </div>
      <div className="relative mt-auto bg-white px-4 pb-5 pt-3">
        <motion.div
          animate={{ scale: [1, 1, 0.96, 1] }}
          transition={{ duration: 2.4, times: [0, 0.75, 0.85, 1] }}
          className="rounded-full bg-[#c2410c] py-2.5 text-center text-sm font-bold text-white"
        >
          Commander · 3 820 FCFA
        </motion.div>
        <Tap delay={1.7} className="left-1/2 top-2 -translate-x-1/2" />
      </div>
    </>
  );
}

function Tracking({ reduce }: { reduce: boolean }) {
  const path = "M40 190 C 90 170, 70 120, 130 105 S 200 70, 230 30";
  const timeline = ["Commande acceptée", "Repas préparé", "Livreur en route", "Livrée"];
  return (
    <>
      <div className="flex items-center justify-between px-4">
        <p className="text-base font-extrabold">Commande R-48K2Q</p>
        <span className="rounded-full bg-[#ffe8d6] px-2 py-0.5 text-[10px] font-bold text-[#c2410c]">≈ 6 min</span>
      </div>
      <div className="relative mx-4 mt-2 min-h-44 flex-1 overflow-hidden rounded-2xl bg-[#e9efe9]">
        <svg viewBox="0 0 270 210" className="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M${-20 + i * 45} -10 L${30 + i * 45} 230`} stroke="#fff" strokeWidth="8" opacity="0.8" />
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
        <span className="absolute bottom-3 left-5 grid size-7 place-items-center rounded-full bg-white shadow">
          <ShoppingBag className="size-3.5 text-[#c2410c]" />
        </span>
        <span className="absolute right-5 top-3 grid size-7 place-items-center rounded-full bg-[#14110f] shadow">
          <House className="size-3.5 text-white" />
        </span>
        <motion.span
          className="absolute grid size-9 place-items-center rounded-full bg-[#ff8a3d] shadow-lg ring-4 ring-white"
          style={{ offsetPath: `path("${path}")`, offsetRotate: "0deg", left: -18, top: -18 }}
          initial={{ offsetDistance: reduce ? "100%" : "0%" }}
          animate={{ offsetDistance: "88%" }}
          transition={{ duration: 3, ease: "easeInOut" }}
        >
          <Bike className="size-4 text-[#1a0d04]" />
        </motion.span>
      </div>
      <div className="mx-4 mt-2 flex items-center gap-3 rounded-2xl bg-white p-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-[#ffe8d6] text-sm font-bold text-[#c2410c]">K</span>
        <span className="flex-1">
          <span className="block text-sm font-bold">Koffi · Moto</span>
          <span className={`text-[11px] ${muted}`}>4,9 ★ · 1 240 livraisons</span>
        </span>
        <span className="grid size-8 place-items-center rounded-full bg-[#16a34a] text-white">
          <Phone className="size-4" />
        </span>
      </div>
      <ol className="mx-4 mt-2 rounded-2xl bg-white p-3 text-xs">
        {timeline.map((t, i) => (
          <motion.li
            key={t}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: i < 3 ? 1 : 0.45 }}
            transition={{ delay: 0.35 * i }}
            className="flex items-center gap-2 py-0.5"
          >
            <span className={`grid size-4 place-items-center rounded-full ${i < 3 ? "bg-[#16a34a] text-white" : "bg-[#eee8e2]"}`}>
              {i < 3 && <Check className="size-3" />}
            </span>
            <span className={i === 2 ? "font-bold" : ""}>{t}</span>
          </motion.li>
        ))}
      </ol>
      <div className="mx-4 mb-4 mt-2 rounded-2xl bg-[#14110f] p-3 text-center text-[11px] text-white">
        Code de remise <span className="ml-1 font-mono text-sm font-bold tracking-[0.35em] text-[#ffb35c]">4827</span>
      </div>
    </>
  );
}
