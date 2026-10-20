# Plan de réalisation — Tchopi Web

> Phase 0 (rôle : AI Project Director), 2026-10-20. Source : `INTAKE.md`. Décisions : `DECISION_LOG.md`.
> Audit préalable du mobile : `../tchopi/docs/audit-mise-en-production.md`.

## 1. Compréhension du besoin

Une plateforme web sur **le même backend** que l'app mobile : visiteurs et clients commandent, restaurants et
magasins gèrent leurs produits et leurs commandes (priorité), l'administrateur pilote la plateforme. Le design est une
priorité : moderne, épuré, rapide, clair et sombre, cohérent avec le mobile.

**Ce que le mobile fait déjà et que le web reprend** (mêmes fonctions serveur, mêmes règles) : comptes téléphone /
email + mot de passe, zones et tarifs, adresses sur carte, catalogue, commande de repas, colis, paiements (espèces,
Mobile Money nyole, carte Stripe), circuit commande → préparation → « Prête » → livreur (sans blocage si aucun livreur,
ADR-037), livreurs affiliés, suivi en direct, chronologie, remboursements, statistiques, supervision sur alerte.

**Ce qui manque au backend pour la demande** (ajouts dans `../tchopi/supabase`, visibles aussi du mobile) :

| Manque | Pourquoi | Ajout prévu |
|--------|----------|-------------|
| Catalogue lisible sans compte | Accueil public : établissements et produits réels pour un visiteur | Fonctions publiques en lecture seule (colonnes sûres : ni commission, ni téléphone du gérant) |
| Magasins | Seuls des restaurants existent | Type d'établissement `restaurant` / `magasin`, même circuit de commande |
| Options de produits | Taille, suppléments | Groupes d'options et choix (prix ajouté), recopiés dans la ligne de commande et recalculés par le serveur |
| Retour de paiement vers le site | Stripe / nyole renvoient vers une page fixe | Adresse de retour par commande, limitée à `tchopi.com` |
| Candidature d'établissement | « Rejoindre la plateforme » | Demande enregistrée, validée par l'admin (qui crée l'établissement comme aujourd'hui) |
| Connexion web | Liens de vérification et de réinitialisation | `SITE_URL` et adresses de redirection pour `tchopi.com` |

## 2. Architecture cible

- **Next.js (App Router, TypeScript)**, rendu serveur pour l'accueil et les pages publiques (rapide, référencé),
  composants interactifs pour les espaces connectés ; **Tailwind + shadcn/ui** avec les jetons du design system mobile.
- **Supabase** existant via `@supabase/ssr` (session en cookie httpOnly) ; aucune clé de service côté web ; temps réel
  Supabase pour les commandes ; types TypeScript générés depuis le schéma.
- **Paiements** : la fonction serveur `payments-create` existante, identique au mobile.
- **Hébergement** : conteneur Docker sur le VPS, derrière le nginx existant, HTTPS ; `tchopi.com` (site) et
  `api.tchopi.com` (backend, inchangé).
- **Dépôt** : nouveau dépôt GitHub `tchopi-web` ; CI : lint, types, tests, build, E2E contre un Supabase local
  construit depuis les migrations de `tchopi`.

## 3. Incréments (ordonnés)

| # | Incrément | Contenu | Acceptation |
|---|-----------|---------|-------------|
| W0 | Socle | Next.js, design system (clair / sombre), polices, session Supabase, mise en page responsive, CI, image Docker | Build et CI verts ; thèmes ; page de santé |
| B1 | Backend commun | Catalogue public, magasins, options de produits, retour de paiement web, candidatures, redirections | Migrations + tests pgTAP verts dans `tchopi` ; mobile inchangé ou adapté |
| W1 | Accueil et catalogue public | Hero, ville / adresse, établissements de la zone, produits en vedette, catégories, recherche, livraison en 3 étapes, devenir partenaire, FAQ, pied de page, pages établissement, états vides, SEO | Données réelles uniquement ; Lighthouse ≥ 90 |
| W2 | Comptes | Connexion, inscription, code de vérification, mot de passe oublié, profil, choix de l'espace | Mêmes comptes que le mobile |
| W3 | **Espace établissement** | Tableau de bord, commandes en direct (alerte sonore), détail et historique, étapes, remise au livreur, profil, horaires, ouverture, catégories, produits (ajout rapide, photos, prix, options, disponibilité), paiements, statistiques, paramètres | Commande reçue sur le web, acceptée, prête, remise : visible en direct sur le mobile |
| W4 | Client | Panier, adresse sur carte, paiement (espèces, Mobile Money, carte), suivi en direct, historique, reçus, colis | Parcours complet et retour de paiement sur le site |
| W5 | Administrateur | Utilisateurs, établissements et candidatures, commandes à traiter et attribution manuelle, livreurs, transactions et remboursements, zones et tarifs, paramètres, statistiques | Accès refusé à tout non-admin (serveur + RLS) |
| W6 | Livreur | Dossier, statut, historique, gains, espèces à reverser (missions et GPS restent sur le mobile) | Données identiques au mobile |
| W7 | Qualité et mise en ligne | E2E par rôle, synchronisation mobile ↔ web, responsive, thèmes, performances, revue sécurité, configuration de production | Rapport de tests ; déploiement prêt sur tchopi.com |

## 4. Risques et parades

- **Inscription publique impossible** tant que SMS et SMTP manquent (audit B1) → même blocage pour le web ; tâches
  manuelles n° 5 / 6 du mobile.
- **Pas de Docker sur ce PC** → les tests de la base et les E2E tournent dans la CI GitHub.
- **Paiements réels non essayés** → ouverture en espèces possible ; essais réels avant activation.
- **VPS partagé** → image Next.js « standalone » légère, mémoire limitée dans le conteneur.

## 5. Tâches manuelles prévues

1. Créer le dépôt GitHub `tchopi-web` (ou autoriser `gh` sur ce PC).
2. DNS : `tchopi.com` et `www.tchopi.com` → IP du VPS.
3. Stripe et nyole : ajouter `https://tchopi.com` aux adresses de retour autorisées si leur tableau de bord le demande.
4. Firebase : notifications navigateur (optionnel, plus tard) via l'app « Tchopi Web » déjà créée.

## 6. Questions ouvertes

Aucune bloquante : les choix sont consignés dans `DECISION_LOG.md` et peuvent être contestés.
