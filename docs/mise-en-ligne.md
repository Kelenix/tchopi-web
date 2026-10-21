# Mise en ligne sur tchopi.com (VPS)

> Tout est sur le VPS qui héberge déjà l'API (ADR-W02). Le site tourne dans le conteneur `tchopi-web`
> (Node, port local 3010), derrière le nginx de l'hôte, en HTTPS. L'API (api.tchopi.com) n'est pas modifiée.

## 1. Avant la première mise en ligne (à faire par vous)

1. **DNS** (hPanel Hostinger → Domaines → tchopi.com → DNS) : enregistrements **A** `@` et `www` vers l'adresse IP
   du VPS (la même que `api`). Compter jusqu'à quelques heures de propagation.
2. **Dépôt GitHub** `tchopi-web` (privé), puis depuis ce dossier :
   ```bash
   git remote add origin https://github.com/Kelenix/tchopi-web.git
   ```
   ```bash
   git push -u origin main
   ```
3. **Accès de GitHub Actions au VPS** (une fois, depuis ce PC, GitHub CLI connecté par `gh auth login`) :
   ```bash
   .\deploy\vps.ps1 ci
   ```
   Crée une clé réservée à GitHub, l'autorise sur le VPS, enregistre les secrets `VPS_SSH_KEY`, `VPS_HOST` et
   `VPS_KNOWN_HOSTS` du dépôt (la clé ne s'affiche jamais), puis lance la CI. Sans eux, la CI vérifie sans déployer.

## 2. Première mise en ligne

Faite par GitHub Actions : après l'installation de la version, le job crée le site nginx (`tchopi.com`, `www` →
`tchopi.com`) et le certificat HTTPS au premier passage, puis se contente de les vérifier. Domaine modifiable par la
variable de dépôt `WEB_DOMAIN`. Sans GitHub : `.\deploy\vps.ps1 installer tchopi.com` (pnpm requis sur ce PC).

## 3. Ensuite

Chaque push sur `main` : lint, types, tests, compilation, puis mise en ligne automatique (3 versions gardées sur le
serveur pour un retour arrière). Manuellement : `.\deploy\vps.ps1 deployer`.

## 4. Configuration liée au domaine

| Élément | Valeur | Où |
|---------|--------|-----|
| Adresse du site | `https://tchopi.com` | `NEXT_PUBLIC_SITE_URL` (défaut) |
| API | `https://api.tchopi.com` | `NEXT_PUBLIC_SUPABASE_URL` (défaut) |
| Retour après paiement | pages de `https://tchopi.com` uniquement | fonction `payments-create`, `WEB_ORIGIN` (défaut) |
| Webhooks Stripe / nyole | inchangés : `https://api.tchopi.com/functions/v1/payments-webhook-…` | tableaux de bord des fournisseurs |
| Connexion | codes par SMS / email (pas de lien) : aucun réglage d'adresse de retour nécessaire | — |

Les paiements en ligne restent désactivés dans l'administration tant que les essais réels ne sont pas faits
(`../tchopi/docs/mise-en-service.md`).

## 5. Vérifier après la mise en ligne

- https://tchopi.com affiche les établissements d'Abidjan ; https://www.tchopi.com redirige vers tchopi.com.
- Connexion avec un compte de test, commande en espèces, suivi : la commande apparaît en direct sur le mobile du
  restaurant (et inversement).
- Retour arrière : `ls /opt/tchopi-web/releases`, puis relier `current` à la version précédente et relancer
  `docker compose -f /opt/tchopi-web/deploy/compose.yml -p tchopi-web up -d --force-recreate`.
