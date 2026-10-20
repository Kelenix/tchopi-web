"use client";

import { useSyncExternalStore } from "react";

/**
 * Panier (un seul établissement à la fois, comme l'app mobile), gardé dans le navigateur. Les prix affichés sont
 * indicatifs : le serveur recalcule tout au devis et à la commande.
 */
export type CartOption = { id: string; name: string; group: string; price_delta: number };
export type CartLine = {
  key: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  options: CartOption[];
};
export type Cart = { establishmentId: string; establishmentName: string; lines: CartLine[] };

const KEY = "tchopi-cart";
const listeners = new Set<() => void>();
let cached: { raw: string | null; cart: Cart | null } = { raw: null, cart: null };

function read(): Cart | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw !== cached.raw) {
    try {
      cached = { raw, cart: raw ? (JSON.parse(raw) as Cart) : null };
    } catch {
      cached = { raw, cart: null };
    }
  }
  return cached.cart;
}

function write(cart: Cart | null) {
  try {
    if (cart && cart.lines.length) localStorage.setItem(KEY, JSON.stringify(cart));
    else localStorage.removeItem(KEY);
  } catch {
    // Stockage indisponible (navigation privée) : le panier ne survit pas au rechargement.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): Cart | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function lineKey(productId: string, options: CartOption[]): string {
  return [productId, ...options.map((o) => o.id).sort()].join(":");
}

export const cart = {
  /** Ajoute une ligne ; un panier d'un autre établissement est remplacé (l'appelant a demandé confirmation). */
  add(establishment: { id: string; name: string }, line: Omit<CartLine, "key">) {
    const current = read();
    const base: Cart =
      current && current.establishmentId === establishment.id
        ? current
        : { establishmentId: establishment.id, establishmentName: establishment.name, lines: [] };
    const key = lineKey(line.productId, line.options);
    const existing = base.lines.find((l) => l.key === key);
    const lines = existing
      ? base.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l))
      : [...base.lines, { ...line, key }];
    write({ ...base, lines });
  },
  setQuantity(key: string, quantity: number) {
    const current = read();
    if (!current) return;
    write({
      ...current,
      lines: current.lines
        .map((l) => (l.key === key ? { ...l, quantity: Math.min(50, quantity) } : l))
        .filter((l) => l.quantity > 0),
    });
  },
  removeProducts(productIds: string[]) {
    const current = read();
    if (current) write({ ...current, lines: current.lines.filter((l) => !productIds.includes(l.productId)) });
  },
  clear() {
    write(null);
  },
};

export function cartCount(c: Cart | null): number {
  return c?.lines.reduce((n, l) => n + l.quantity, 0) ?? 0;
}

export function cartSubtotal(c: Cart | null): number {
  return c?.lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0) ?? 0;
}
