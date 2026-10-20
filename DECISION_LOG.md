# Journal de décisions (DECISION_LOG)

> ADR léger : contexte → décision → alternatives écartées → conséquences. Le plus récent en haut.

---

## ADR-W03 — Ajouts au backend commun plutôt qu'un backend web

- **Date** : 2026-10-20 · **Statut** : Proposé (plan) · **Décideur** : Claude (solution-architect, database-architect)
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

- **Date** : 2026-10-20 · **Statut** : Proposé (plan) · **Décideur** : Claude (solution-architect, seo-engineer)
- **Contexte** : l'app Flutter se compile pour le navigateur, mais l'accueil doit être rapide et référencé, et les
  espaces de gestion pensés pour l'ordinateur.
- **Décision** : projet Next.js `tchopi-web` (rendu serveur, SEO, interface bureau), même backend et mêmes jetons de
  design que le mobile.
- **Alternatives écartées** : Flutter web (chargement lourd, référencement faible, ergonomie mobile sur grand écran).
- **Impact** : technique (deux interfaces à maintenir, logique métier unique dans la base).
