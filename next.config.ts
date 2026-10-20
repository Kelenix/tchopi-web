import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image autonome pour le conteneur du VPS (ADR-W02).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
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
