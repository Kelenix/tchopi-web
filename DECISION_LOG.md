# Journal de décisions (DECISION_LOG)

> ADR léger : contexte → décision → alternatives écartées → conséquences. Le plus récent en haut.

---

## ADR-W04 — Pages publiques côté serveur, espaces connectés dans le navigateur

- **Date** : 2026-10-20 · **Statut** : Accepté (mode AUTONOME) · **Décideur** : Claude (solution-architect, security-engineer)
- **Contexte** : Next.js 16 (Cache Components) ; l'app mobile lit déjà toutes ses données avec la clé publique, la
  session du compte et la RLS.
- **Décision** : accueil, fiches et recherche rendus côté serveur et mis en cache quelques minutes (fonctions
  publiques, sans session) ; espaces connectés rendus dans le navigateur avec la session Supabase et le temps réel,
  exactement comme le mobile. Aucune clé de service dans le site ; toute règle est vérifiée par la base.
- **Alternatives écartées** : session en cookie et rendu serveur des espaces (double chemin d'autorisation, aucune
  donnée supplémentaire protégée) ; Flutter web.
- **Conséquences** : la sécurité des espaces repose sur la RLS et les fonctions serveur, déjà testées (pgTAP).
- **Impact** : sécurité (moyen, mêmes garanties que le mobile), technique (réversible).

---

## ADR-W03 — Ajouts au backend commun plutôt qu'un backend web

- **Date** : 2026-10-20 · **Statut** : Accepté (fait : `../tchopi` ADR-042) · **Décideur** : Claude (solution-architect, database-architect)
- **Contexte** : magasins, options de produits, catalogue public, retour de paiement web et candidatures manquent.
- **Décision** : ajoutés dans `../tchopi/supabase` (migrations + pgTAP), utilisables par le mobile et le web ;
  catalogue public par fonctions en lecture seule exposant des colonnes sûres (pas d'accès anonyme aux tables).
- **Alternatives écartées** : API propre au web (double logique, désynchronisation) ; ouvrir les tables aux anonymes
  (exposerait commission et téléphones).
- **Impact** : technique (réversible), sécurité (moyen, couvert par tests).

## ADR-W02 — Hébergement sur le VPS (tchopi.com)

- **Date** : 2026-10-20 · **Statut** : Accepté (consigne de l'utilisateur : tout sur le VPS)
- **Décideur** : utilisateur ; mise en œuvre : Claude (devops-engineer)
- **Décision** : conteneur Next.js « standalone » sur le VPS qui héberge déjà l'API, derrière son nginx et son HTTPS ;
  déploiement par la CI comme le backend.
- **Impact** : financier (aucun coût nouveau), technique (réversible).

## ADR-W01 — Next.js séparé plutôt que la version web de l'app Flutter

- **Date** : 2026-10-20 · **Statut** : Accepté (mode AUTONOME) · **Décideur** : Claude (solution-architect, seo-engineer)
- **Contexte** : l'app Flutter se compile pour le navigateur, mais l'accueil doit être rapide et référencé, et les
  espaces de gestion pensés pour l'ordinateur.
- **Décision** : projet Next.js `tchopi-web` (rendu serveur, SEO, interface bureau), même backend et mêmes jetons de
  design que le mobile.
- **Alternatives écartées** : Flutter web (chargement lourd, référencement faible, ergonomie mobile sur grand écran).
- **Impact** : technique (deux interfaces à maintenir, logique métier unique dans la base).
