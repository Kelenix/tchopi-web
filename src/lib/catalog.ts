import { cacheLife } from "next/cache";
import { publicClient } from "./supabase";

/** Catalogue public (fonctions public_* du backend commun, ADR-042) : mis en cache quelques minutes. */

export type Zone = {
  id: string;
  name: string;
  city: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  currency: string;
};

export type EstablishmentKind = "restaurant" | "shop";

export type Establishment = {
  id: string;
  kind: EstablishmentKind;
  name: string;
  description: string | null;
  category: string | null;
  cover_path: string | null;
  district: string;
  landmark: string;
  prep_time_min: number;
  is_open: boolean;
};

export type FeaturedProduct = {
  id: string;
  establishment_id: string;
  establishment_name: string;
  name: string;
  description: string | null;
  price: number;
  photo_path: string | null;
  is_open: boolean;
};

export type ProductOption = { id: string; name: string; price_delta: number; is_available: boolean };
export type OptionGroup = {
  id: string;
  name: string;
  min_choices: number;
  max_choices: number;
  options: ProductOption[];
};
export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  photo_path: string | null;
  is_available: boolean;
  option_groups: OptionGroup[];
};
export type EstablishmentDetail = Establishment & {
  zone_id: string;
  city: string;
  currency: string;
  hours: { weekday: number; opens_at: string; closes_at: string }[];
  categories: { id: string; name: string }[];
  products: Product[];
};

export type SearchResult = {
  result_type: "establishment" | "product";
  id: string;
  establishment_id: string;
  name: string;
  establishment_name: string;
  price: number | null;
  photo_path: string | null;
  is_open: boolean;
};

/** Zone par défaut (Abidjan), présente sur tous les serveurs (migration default_zone). */
export const DEFAULT_ZONE_ID = "11111111-1111-1111-1111-111111111111";

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await publicClient().rpc(fn, args);
  if (error) throw new Error(`${fn} : ${error.message}`);
  return data as T;
}

export async function getZones(): Promise<Zone[]> {
  "use cache";
  cacheLife("hours");
  return call<Zone[]>("public_zones");
}

export async function getEstablishments(zoneId: string): Promise<Establishment[]> {
  "use cache";
  cacheLife("minutes");
  return call<Establishment[]>("public_establishments", { p_zone_id: zoneId });
}

export async function getFeaturedProducts(zoneId: string): Promise<FeaturedProduct[]> {
  "use cache";
  cacheLife("minutes");
  return call<FeaturedProduct[]>("public_featured_products", { p_zone_id: zoneId, p_limit: 8 });
}

export async function getEstablishment(id: string): Promise<EstablishmentDetail | null> {
  "use cache";
  cacheLife("minutes");
  return call<EstablishmentDetail | null>("public_establishment", { p_id: id });
}

export async function searchCatalog(zoneId: string, query: string): Promise<SearchResult[]> {
  "use cache";
  cacheLife("minutes");
  return call<SearchResult[]>("public_search", { p_zone_id: zoneId, p_query: query });
}

/** Zone choisie (paramètre « ville ») si elle existe, sinon Abidjan, sinon la première zone active. */
export function pickZone(zones: Zone[], requested: string | undefined): Zone | undefined {
  return (
    zones.find((z) => z.id === requested) ?? zones.find((z) => z.id === DEFAULT_ZONE_ID) ?? zones[0]
  );
}

