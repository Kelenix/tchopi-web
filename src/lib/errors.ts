/** Messages des codes d'erreur métier du backend (mêmes codes que pour l'app mobile). */
const messages: Record<string, string> = {
  forbidden: "Action non autorisée pour ce compte.",
  not_found: "Élément introuvable ou supprimé.",
  invalid_transition: "Cette action n'est plus possible à ce stade.",
  already_submitted: "Une demande est déjà en cours d'examen.",
  too_many_requests: "Trop de demandes en ce moment : réessayez dans une heure.",
  cart_empty: "Votre panier est vide.",
  cart_changed: "Votre panier a changé : vérifiez-le avant de commander.",
  price_changed: "Les prix ont changé : vérifiez le nouveau total.",
  address_out_of_zone: "Cette adresse est hors de la zone de livraison de cet établissement.",
  zone_unavailable: "La livraison n'est pas encore disponible dans cette zone.",
  invalid_quantity: "Quantité invalide.",
  no_courier: "Aucun livreur n'a encore accepté cette commande.",
  already_picked_up: "La commande a déjà été récupérée.",
  already_accepted: "L'établissement a déjà accepté la commande : elle ne peut plus être annulée.",
  reason_required: "Indiquez un motif.",
  invalid_credentials: "Identifiants incorrects.",
};

export function errorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "";
  for (const [code, message] of Object.entries(messages)) {
    if (text.includes(code)) return message;
  }
  if (/fetch|network/i.test(text)) return "Connexion impossible : vérifiez votre réseau puis réessayez.";
  return "Une erreur est survenue. Réessayez dans un instant.";
}
