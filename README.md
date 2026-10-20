# Tchopi Web

Plateforme web de Tchopi (clients, restaurants et magasins, administrateur, livreurs) sur **le même backend que
l'application mobile** (`../tchopi`, Supabase sur https://api.tchopi.com).

## Lancer

```bash
pnpm install
pnpm dev
```

Le site s'ouvre sur http://localhost:3000 et lit le serveur en ligne par défaut. Pour un Supabase local, définir
`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env.local`.

## Vérifier

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Organisation

| Dossier | Contenu |
|---------|---------|
| `src/app/(site)` | Accueil, fiches d'établissement, recherche, pages légales (rendu serveur, mis en cache) |
| `src/app/(auth)` | Connexion, inscription avec code, mot de passe oublié |
| `src/app/espace` | Espaces connectés : client, établissement, livreur, administration (navigateur + RLS) |
| `src/lib` | Données (catalogue public, commandes, panier), règles communes avec le mobile |
| `deploy` | Mise en ligne sur le VPS : conteneur Node, site nginx, scripts |

Le schéma de la base n'est **jamais** modifié ici : migrations et tests dans `../tchopi/supabase`.

Mise en ligne : `docs/mise-en-ligne.md`. Plan : `docs/plan-de-realisation.md`. Décisions : `DECISION_LOG.md`.
