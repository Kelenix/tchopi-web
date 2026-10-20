/**
 * Configuration publique (même serveur que l'app mobile). Ces valeurs sont publiques par conception : la sécurité des
 * données repose sur la RLS de la base, jamais sur leur confidentialité. Surchargeables pour un Supabase local.
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://api.tchopi.com",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkyNDE0NjA1LCJleHAiOjE5NTAwOTQ2MDV9.nclb8EOOkSElPrTlwOQXuefHArkqmaumSSDKPpDUg9k",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://tchopi.com",
};

/** Adresse publique d'un fichier du bucket « media » (photos d'établissements et de produits). */
export function mediaUrl(path: string | null | undefined): string | null {
  return path ? `${env.supabaseUrl}/storage/v1/object/public/media/${path}` : null;
}
