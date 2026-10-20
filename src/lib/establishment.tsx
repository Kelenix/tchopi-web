"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { browserClient } from "./supabase";
import type { Order } from "./orders";

/** Établissement géré (RLS : ses gérants seulement), tel que le lit l'app mobile. */
export type ManagedEstablishment = {
  id: string;
  zone_id: string;
  kind: "restaurant" | "shop";
  name: string;
  description: string | null;
  category: string | null;
  cover_path: string | null;
  phone: string;
  district: string;
  landmark: string;
  commission_rate: number;
  prep_time_min: number;
  is_active: boolean;
  is_temporarily_closed: boolean;
  is_open: boolean;
};

type Value = {
  ids: string[];
  id: string;
  select: (id: string) => void;
  establishment: ManagedEstablishment | null;
  reload: () => Promise<void>;
  orders: Order[] | null;
  /** Nouvelles commandes pas encore vues : alerte sonore répétée (ORD-08, comme le mobile). */
  unseen: string[];
  acknowledge: () => void;
  soundEnabled: boolean;
  enableSound: () => void;
  /** Message affiché quand une commande vient d'être livrée au client. */
  toast: string | null;
};

const Context = createContext<Value | null>(null);
export const useEstablishment = () => {
  const value = useContext(Context);
  if (!value) throw new Error("useEstablishment hors de EstablishmentProvider");
  return value;
};

const STORAGE = "tchopi-establishment";

export function EstablishmentProvider({ ids, children }: { ids: string[]; children: ReactNode }) {
  const db = browserClient();
  const [id, setId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE);
      return saved && ids.includes(saved) ? saved : ids[0];
    } catch {
      return ids[0];
    }
  });
  const [loaded, setLoaded] = useState<{ id: string; establishment: ManagedEstablishment | null } | null>(null);
  const [version, setVersion] = useState(0);
  // Liste rattachée à l'établissement lu : changer d'établissement affiche le chargement sans réinitialisation.
  const [ordersState, setOrdersState] = useState<{ id: string; list: Order[] } | null>(null);
  const orders = ordersState?.id === id ? ordersState.list : null;
  const establishment = loaded?.id === id ? loaded.establishment : null;
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const audio = useRef<AudioContext | null>(null);
  // Dernier statut connu de chaque commande : le temps réel ne transmet pas l'ancienne valeur.
  const known = useRef(new Map<string, string>());

  useEffect(() => {
    let alive = true;
    db.from("restaurants")
      .select("*, is_open")
      .eq("id", id)
      .single()
      .then(({ data }) => alive && setLoaded({ id, establishment: data as ManagedEstablishment | null }));
    return () => {
      alive = false;
    };
  }, [db, id, version]);
  const reload = useCallback(async () => setVersion((v) => v + 1), []);

  // Commandes des 30 derniers jours, tenues à jour en direct (mêmes droits que le mobile).
  useEffect(() => {
    let alive = true;
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    db.from("orders")
      .select("*")
      .eq("restaurant_id", id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (!alive) return;
        const list = (data ?? []) as Order[];
        known.current = new Map(list.map((o) => [o.id, o.status]));
        setOrdersState({ id, list });
        // Les commandes déjà en attente à l'ouverture sonnent aussi.
        setSeen(new Set(list.filter((o) => o.status !== "pending").map((o) => o.id)));
      });
    const channel = db
      .channel(`orders-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${id}` }, (payload) => {
        const row = payload.new as Order;
        if (!row?.id) return;
        const before = known.current.get(row.id);
        known.current.set(row.id, row.status);
        if (before && before !== "delivered" && row.status === "delivered") {
          setToast(`Commande ${row.number} livrée au client.`);
          notify("Commande livrée", `La commande ${row.number} a été livrée au client.`);
        }
        if (!before && row.status === "pending") {
          notify("Nouvelle commande", `${row.number} · à accepter dans les 10 minutes.`);
        }
        setOrdersState((s) => {
          if (!s || s.id !== id) return s;
          const others = s.list.filter((o) => o.id !== row.id);
          return { id, list: [row, ...others].sort((a, b) => b.created_at.localeCompare(a.created_at)) };
        });
      })
      .subscribe();
    return () => {
      alive = false;
      db.removeChannel(channel);
    };
  }, [db, id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const unseen = useMemo(
    () => (orders ?? []).filter((o) => o.status === "pending" && !seen.has(o.id)).map((o) => o.id),
    [orders, seen],
  );

  // Son répété toutes les 5 s tant qu'une nouvelle commande n'a pas été vue.
  useEffect(() => {
    if (!unseen.length || !soundEnabled) return;
    const ring = () => beep(audio.current);
    ring();
    const timer = setInterval(ring, 5000);
    return () => clearInterval(timer);
  }, [unseen.length, soundEnabled]);

  const value: Value = {
    ids,
    id,
    select: (next) => {
      try {
        localStorage.setItem(STORAGE, next);
      } catch {
        // Choix non mémorisé (stockage indisponible).
      }
      setId(next);
    },
    establishment,
    reload,
    orders,
    unseen,
    acknowledge: () => setSeen((s) => new Set([...s, ...unseen])),
    soundEnabled,
    toast,
    enableSound: () => {
      // Le navigateur n'autorise le son qu'après un geste de l'utilisateur.
      audio.current ??= new AudioContext();
      audio.current.resume();
      setSoundEnabled(true);
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

function beep(ctx: AudioContext | null) {
  if (!ctx) return;
  for (const [delay, freq] of [
    [0, 880],
    [0.18, 1175],
  ]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.17);
  }
}

/** Notification du navigateur quand l'onglet est en arrière-plan (si l'utilisateur l'a autorisée). */
function notify(title: string, body: string) {
  if (typeof document === "undefined" || !document.hidden) return;
  if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body });
}

/** Journée locale de la commande (statistiques et totaux du jour). */
export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

/** Ventes comptées : commandes ni refusées ni annulées (même règle que l'écran mobile). */
export const counted = (orders: Order[]) => orders.filter((o) => o.status !== "rejected" && o.status !== "cancelled" && o.status !== "awaiting_payment");
