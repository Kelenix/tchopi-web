# Cahier des charges (INTAKE) — Tchopi Web

> Rempli par Claude le 2026-10-20 à partir de la demande de l'utilisateur ; hypothèses marquées « (H) ».

## 1. Vision & objectif
- **Nom du projet** : Tchopi Web (tchopi-web).
- **En une phrase** : la plateforme web de Tchopi, sur le même backend que l'app mobile, pour les clients, les
  restaurants et magasins, et l'administrateur.
- **Problème résolu** : commander depuis un ordinateur ; gérer un établissement au quotidien (produits, commandes)
  sur grand écran ; administrer la plateforme.
- **Indicateur de succès** : un établissement ajoute ses produits et traite ses commandes sur le web ; un client
  commande, paie et suit sa livraison ; tout est synchronisé avec le mobile en temps réel.

## 2. Utilisateurs
- **Cible principale** : restaurants et magasins (priorité : ajout des produits, traitement des commandes).
- **Cibles secondaires** : clients, administrateur, livreurs (fonctions utiles sur le web).
- **Rôles** : visiteur, client, membre d'établissement, livreur, administrateur (rôles existants du mobile).

## 3. Fonctionnalités
- **Indispensables** :
  1. Accueil : hero explicite + appel à l'action, choix de la ville / adresse, établissements de la zone, produits en
     vedette (données réelles), catégories, recherche, fonctionnement de la livraison, « devenir partenaire »
     (restaurant ou magasin), FAQ, pied de page complet ; états vides soignés, **aucune donnée fictive**.
  2. Espace établissement : tableau de bord (commandes, ventes, actions prioritaires) ; profil, horaires,
     disponibilité ; catégories, produits, photos, prix, **options**, disponibilités, ajout / modification rapide ;
     commandes reçues, détail, historique, étapes de préparation, remise au livreur ; attribution selon le
     fonctionnement existant ; notifications utiles ; informations de paiement ; statistiques ; paramètres.
  3. Client : établissements, commande, paiement, suivi de la livraison, historique.
  4. Administrateur : utilisateurs, établissements, commandes, livraisons, paiements, paramètres, permissions.
  5. Autres rôles du mobile (livreur) : fonctions utiles sur le web.
- **Règle convenue** : l'absence immédiate de livreur ne bloque jamais la commande auprès d'un établissement
  disponible ; l'établissement prépare puis la livraison s'organise (ADR-037 du mobile).
- **Hors périmètre** (H) : mission du livreur sur le web (position GPS en continu : reste sur le mobile).

## 4. Contenu & données
- **Entités** : celles du backend existant (comptes, zones, établissements, catégories, produits, commandes,
  paiements, livraisons) + ajouts nécessaires (type magasin, options de produits).
- **Données personnelles** : nom, téléphone, email, adresses et position (comme le mobile).
- **API tierces** : Stripe (carte), nyole (Mobile Money, https://nyole.com/docs/), OpenFreeMap / OSRM / Photon
  (cartes), Firebase (notifications).

## 5. Design & marque
- **Charte** : celle du mobile (`../tchopi/docs/design/design-system.md`) : vert `#0B5D3B`, Plus Jakarta Sans, thèmes
  clair et sombre.
- **Ton** : moderne, épuré, rapide, cohérent. **Langue** : français. **Accessibilité** (H) : WCAG 2.1 AA.

## 6. Contraintes techniques
- **Backend imposé** : Supabase auto-hébergé existant (https://api.tchopi.com), mêmes données que le mobile.
- **Domaine** : tchopi.com (déjà acheté ; l'API est sur api.tchopi.com).
- **Appareils** : ordinateur, tablette, téléphone.

## 7. Contraintes métier
- **Budget** (H) : aucun coût mensuel nouveau sans accord.
- **Réglementation** : protection des données en Côte d'Ivoire (ARTCI).

## 8. Préférences de décision
- Claude décide seul sur les choix sans impact fort : **OUI**. Pousser sur `main` une fois vérifié, sans demander.

## 9. Existant
- **Code** : `../tchopi` (app Flutter, backend `supabase/`, serveur `infra/`). Audit :
  `../tchopi/docs/audit-mise-en-production.md`.
