# État du projet — PROJECT_STATE (Tchopi Web)

> Mis à jour par Claude à chaque phase. Lire avant d'agir.

## Snapshot

- **Phase courante** : 5 — Qualité ; plateforme complète, prête à déployer (tâches manuelles : `docs/manual-tasks.md`)
- **Dernière mise à jour** : 2026-10-20
- **Plan** : `docs/plan-de-realisation.md` · Décisions : `DECISION_LOG.md` · Backend : `../tchopi/supabase`
- **Prochaine action** : dépôt GitHub, DNS, première installation (`docs/mise-en-ligne.md`), puis tests de validation (`docs/plan-de-tests.md`)

## Avancement

| Incrément | État |
|-----------|------|
| W0 Socle | ✅ |
| B1 Backend commun | ✅ |
| W1 Accueil et catalogue public | ✅ |
| W2 Comptes | ✅ |
| W3 Espace établissement | ✅ |
| W4 Client | ✅ |
| W5 Administrateur | ✅ |
| W6 Livreur | ✅ |
| W7 Qualité et mise en ligne | 🟡 tests unitaires, CI et déploiement prêts ; tests E2E par rôle et mise en ligne à faire |

## Tâches manuelles

Voir `docs/plan-de-realisation.md` § 5.

## Journal

- 2026-10-20 — AUTONOME : W0 à W6 livrés (accueil, comptes, établissement, client, admin, livreur) ; backend commun
  étendu (`../tchopi` ADR-042, 20 tests pgTAP verts en CI) ; CI et déploiement VPS prêts. Non vérifié : parcours
  connectés de bout en bout (comptes du serveur en ligne).
- 2026-10-20 — Projet créé (`new-project.ps1 -Platform web`), INTAKE rempli depuis la demande, audit du mobile,
  plan et décisions W01 à W03.
