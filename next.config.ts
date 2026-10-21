import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image autonome pour le conteneur du VPS (ADR-W02).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Validation « navigation instantanée » (développement) seulement sur les pages qui l'annoncent (instant = true) :
  // le catalogue public. Les espaces connectés s'affichent après lecture de la session dans le navigateur.
  experimental: { instantInsights: { validationLevel: "manual-warning" } },
  // Photos déjà compressées à l'envoi (2 Mo max) : pas de transformation sur le VPS partagé.
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
