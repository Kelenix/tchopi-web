"use client";

import { useEffect, useState } from "react";
import { browserClient } from "./supabase";

/** Lecture d'une fonction de statistiques (admin ou établissement) ; undefined tant que la réponse aux paramètres courants n'est pas là. */
export function useRpc<T>(fn: string, args: Record<string, string>): T | undefined {
  const key = JSON.stringify(args);
  const [result, setResult] = useState<{ key: string; data: T }>();
  useEffect(() => {
    let alive = true;
    browserClient()
      .rpc(fn, JSON.parse(key))
      .then(({ data }) => alive && data && setResult({ key, data: data as T }));
    return () => {
      alive = false;
    };
  }, [fn, key]);
  return result?.key === key ? result.data : undefined;
}

export type EstablishmentStats = {
  orders: number;
  delivered: number;
  cancelled: number;
  sales: number;
  commission: number;
  average_basket: number;
  by_status: Record<string, number>;
  by_method: Record<string, number>;
  top_products: { name: string; quantity: number; amount: number }[];
  series: { bucket: string; orders: number; sales: number }[];
};

/** Statistiques d'un établissement sur une période (mêmes chiffres sur le tableau de bord et la page Statistiques). */
export const useEstablishmentStats = (id: string, range: Record<string, string>) =>
  useRpc<EstablishmentStats>("restaurant_stats", { p_restaurant_id: id, ...range });
