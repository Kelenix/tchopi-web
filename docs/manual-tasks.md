# Tâches manuelles (site web)

> Ce que seul vous pouvez faire. Les tâches communes avec le mobile (SMS, emails, paiements, textes juridiques) sont
> dans `../tchopi/docs/manual-tasks.md` et `../tchopi/docs/audit-mise-en-production.md`.

| # | Tâche | Pourquoi | Détail |
|---|-------|----------|--------|
| 1 | Créer le dépôt GitHub `tchopi-web` et pousser | Sauvegarde, CI, déploiement automatique | `docs/mise-en-ligne.md` § 1.2 |
| 2 | DNS `tchopi.com` et `www` → IP du VPS | Rendre le site accessible | `docs/mise-en-ligne.md` § 1.1 |
| 3 | Secrets du dépôt (`VPS_SSH_KEY`, `VPS_HOST`, `VPS_KNOWN_HOSTS`) | Déploiement à chaque push | `docs/mise-en-ligne.md` § 1.3 |
| 4 | `.\deploy\vps.ps1 installer tchopi.com` | Première installation, HTTPS | `docs/mise-en-ligne.md` § 2 |
| 5 | Textes juridiques (CGU, confidentialité) | Pages `/conditions` et `/confidentialite` vides pour l'instant | Audit mobile B3 |
| 6 | Envoi des SMS et/ou des emails | Inscription ouverte au public (web et mobile) | Audit mobile B1 |
| 7 | Tests de validation par rôle | Avant l'ouverture | `docs/plan-de-tests.md` |
