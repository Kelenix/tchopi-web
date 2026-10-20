# CLAUDE.md — Tchopi Web (Application WEB)

> Ce projet est construit avec le système de skills **AI Delivery Team**.
> Claude Code le lit automatiquement à chaque session.

## Stack du projet
Next.js (App Router, TypeScript) · Supabase existant (Postgres + Auth + Storage + RLS, https://api.tchopi.com) ·
Tailwind CSS · Zod · Vitest + Playwright · GitHub Actions · **hébergement : le VPS uniquement** (tchopi.com).

> Consigne de l'utilisateur : **tout est sur le VPS**. Ignorer toute mention d'un autre hébergeur dans les skills.

## Backend partagé avec le mobile
Le backend vit **uniquement** dans `../tchopi/supabase` (migrations, fonctions, tests pgTAP) et `../tchopi/infra`
(serveur). Ce projet n'a aucune migration : tout changement de schéma se fait dans `../tchopi`, testé et déployé par
sa CI, pour que le mobile et le web restent sur les mêmes données.

## Où se trouvent les skills
`.claude/skills/common/` et `.claude/skills/web/`.

## Au démarrage / quand je te demande de construire
1. Lis `.claude/skills/web/SKILL.md` (orchestrateur), puis
   `.claude/skills/web/skills/00-ai-project-director.md` (protocole complet).
2. Lis `.claude/skills/common/09-ai-working-rules.md` (décider seul vs me demander).
3. Lis `INTAKE.md`, `PROJECT_STATE.md` et `docs/plan-de-realisation.md`.
4. Applique le protocole : **reformulation → plan de réalisation → exécution par phases**.

## Règles permanentes (rappel — la source complète est dans `common/`)
- **Décide seul et documente** dans `DECISION_LOG.md`. Ne me pose une question QUE sur impact
  **métier / financier / fonctionnel majeur / légal / irréversible** (questions regroupées).
- **Plan d'abord** ; **chargement progressif** (un fichier de rôle par phase).
- **Sécurité** : RLS Supabase **obligatoire** sur toutes les tables ; aucun secret en clair ;
  valider et autoriser **côté serveur**.
- **Code professionnel** : propre, scalable, **minimum de code nécessaire** (sans nuire à la
  lisibilité) ; pas de sur-ingénierie, pas de TODO laissé.
- **Vérifie avant de dire « fait »** : lint + types + tests verts ; honnêteté sur les échecs
  (protocole d'erreur : `.claude/skills/common/06-error-handling.md`).
- **Suis l'avancement** dans `PROJECT_STATE.md` ; liste les **tâches manuelles** dans
  `docs/manual-tasks.md` (comptes, clés API, domaine…).
- Respecte la **Definition of Ready / Done** (`.claude/skills/common/10-definition-of-done.md`).
- Une fois le travail vérifié : commit et push sur `main` sans demander.

## Comment je lance le projet
Mode par défaut : **PLAN_PUIS_VALIDATION** (présente le plan et attends mon feu vert avant de
coder). Si j'écris **AUTONOME**, enchaîne l'implémentation sans pause, en ne m'interrompant que
sur impact fort.
