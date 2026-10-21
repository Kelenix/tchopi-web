import type { MetadataRoute } from "next";
import { getEstablishments, getZones } from "@/lib/catalog";
import { env } from "@/lib/env";

/** Plan du site : accueil, villes et fiches des établissements actifs (données réelles du catalogue public). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [{ url: env.siteUrl, changeFrequency: "daily", priority: 1 }];
  try {
    for (const zone of await getZones()) {
      pages.push({ url: `${env.siteUrl}/?ville=${zone.slug}`, changeFrequency: "daily", priority: 0.8 });
      for (const e of await getEstablishments(zone.id)) {
        pages.push({ url: `${env.siteUrl}/etablissements/${e.slug}`, changeFrequency: "daily", priority: 0.7 });
      }
    }
  } catch {
    // Catalogue injoignable pendant la génération : seul l'accueil est listé.
  }
  return pages;
}
