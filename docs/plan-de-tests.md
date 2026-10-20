# Plan de tests de validation (avant ouverture)

> Automatique aujourd'hui : lint, types, 13 tests unitaires (règles communes avec le mobile), compilation ; côté
> backend, 20 tests pgTAP (`../tchopi/supabase/tests/database/web_platform.test.sql`). Vérifié à la main par Claude :
> accueil et fiches avec les vraies données, ajout au panier, redirection vers la connexion, rendu mobile sans
> débordement. **Non vérifié** : tous les parcours connectés (comptes du serveur en ligne : à faire par vous).

Comptes de test : `../tchopi/docs/donnees-de-test.md`. Ouvrir le site et l'app mobile côte à côte.

| # | Rôle | Parcours | Attendu |
|---|------|----------|---------|
| 1 | Visiteur | Accueil → changer de ville → catégorie → fiche → recherche « garba » | Données réelles ; états vides soignés pour une ville sans établissement |
| 2 | Visiteur | Formulaire « Devenir partenaire » | Message de confirmation ; candidature visible dans Admin → Établissements |
| 3 | Client | Inscription (numéro autorisé, code) → profil → panier → nouvelle adresse sur la carte → Espèces → Commander | Commande créée ; suivi en direct ; code de livraison affiché |
| 4 | Établissement (`06`) | Espace établissement → activer les alertes sonores → accepter → préparation → prête | Son et bandeau à l'arrivée ; statuts visibles en direct chez le client (web et mobile) |
| 5 | Établissement | Produits → ajouter un produit avec photo et options (Taille obligatoire, Suppléments) | Visible sur la fiche publique ; le client doit choisir la taille |
| 6 | Livreur (`05`, mobile) | Accepter → récupérer → livrer avec le code | Restaurant web : « Remise au livreur » puis message « livrée » |
| 7 | Admin (`03`) | Commandes à traiter, attribution manuelle, établissement (magasin), gérant, livreurs, paiements, zones | Actions refusées à tout autre compte |
| 8 | Tous | Thème clair / sombre, téléphone / tablette / ordinateur | Aucun débordement, contrastes lisibles |
