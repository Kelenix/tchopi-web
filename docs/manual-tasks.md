# Tâches manuelles (site web)

> Ce que seul vous pouvez faire. Les tâches communes avec le mobile (SMS, emails, paiements, textes juridiques) sont
> dans `../tchopi/docs/manual-tasks.md` et `../tchopi/docs/audit-mise-en-production.md`.

| # | Tâche | Pourquoi | Détail |
|---|-------|----------|--------|
| 1 | ~~Créer le dépôt GitHub `tchopi-web`~~ ✅ fait (2026-10-21) | | |
| 2 | DNS `tchopi.com` et `www` → IP du VPS | Rendre le site accessible | `docs/mise-en-ligne.md` § 1.1 |
| 3 | Secrets du dépôt (`VPS_SSH_KEY`, `VPS_HOST`, `VPS_KNOWN_HOSTS`) | Déploiement à chaque push | `docs/mise-en-ligne.md` § 1.3 |
| 4 | `.\deploy\vps.ps1 installer tchopi.com` | Première installation, HTTPS | `docs/mise-en-ligne.md` § 2 |
| 5 | Textes juridiques (CGU, confidentialité) | Pages `/conditions` et `/confidentialite` vides pour l'instant | Audit mobile B3 |
| 6 | **Emails par Resend** : domaine `tchopi.com` vérifié, clé API, puis `../tchopi/vps.ps1 email` | Inscription et récupération par email | `../tchopi/docs/mise-en-service.md` § 6 |
| 6b | **Connexion Google** : identifiants OAuth, puis `../tchopi/vps.ps1 google` | « Continuer avec Google » | `../tchopi/docs/mise-en-service.md` § 7 |
| 6c | **Logo** dans `../tchopi/assets/brand/` | En-tête, favicon, icône de l'app | `../tchopi/assets/brand/README.md` |
| 7 | Tests de validation par rôle | Avant l'ouverture | `docs/plan-de-tests.md` |
