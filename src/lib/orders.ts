/** Commandes : types et libellés identiques à l'app mobile (mêmes statuts et motifs serveur). */

export type OrderStatus =
  | "awaiting_payment"
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "searching_courier"
  | "courier_assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "rejected"
  | "cancelled"
  | "failed";

export type PaymentMethod = "cash" | "mobile_money" | "card";
export type PaymentStatus = "unpaid" | "paid" | "refund_pending" | "refunded";

export type CourierInfo = { first_name: string; vehicle_type: string; plate_number: string | null; phone?: string | null };

export type Order = {
  id: string;
  number: string;
  type: "food" | "parcel";
  status: OrderStatus;
  customer_id: string;
  restaurant_id: string | null;
  zone_id: string;
  currency: string;
  pickup_name: string | null;
  pickup_district: string;
  recipient_name: string;
  recipient_phone: string | null;
  dropoff_district: string;
  dropoff_landmark: string;
  dropoff_instructions: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  commission_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  courier_id: string | null;
  courier_info: CourierInfo | null;
  close_reason: string | null;
  dispatch_alerted_at: string | null;
  code_locked_at: string | null;
  problem_reported_at: string | null;
  created_at: string;
  submitted_at: string | null;
  delivered_at: string | null;
  closed_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  options: { group: string; name: string; price_delta: number }[];
};

export type OrderEvent = {
  kind: string | null;
  status: OrderStatus | null;
  actor_role: string;
  reason: string | null;
  created_at: string;
};

export const closedStatuses: OrderStatus[] = ["delivered", "rejected", "cancelled", "failed"];
export const isClosed = (s: OrderStatus) => closedStatuses.includes(s);

export function statusLabel(status: OrderStatus, parcel = false): string {
  return {
    awaiting_payment: "Paiement en attente",
    pending: "En attente de confirmation",
    accepted: "Acceptée",
    preparing: "En préparation",
    ready: "Prête",
    searching_courier: "Recherche d'un livreur",
    courier_assigned: parcel ? "Livreur en route vers le retrait" : "Livreur en route vers le restaurant",
    picked_up: "Récupérée",
    in_transit: "En route",
    delivered: "Livrée",
    rejected: "Refusée",
    cancelled: "Annulée",
    failed: "Échec de livraison",
  }[status];
}

export function statusTone(status: OrderStatus): "success" | "warning" | "danger" | "neutral" {
  if (status === "delivered") return "success";
  if (status === "rejected" || status === "cancelled" || status === "failed") return "danger";
  if (status === "pending" || status === "awaiting_payment") return "warning";
  return "neutral";
}

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: "Espèces",
  mobile_money: "Mobile Money",
  card: "Carte bancaire",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: "À payer",
  paid: "Payée",
  refund_pending: "Remboursement en cours",
  refunded: "Remboursée",
};

const problems: Record<string, string> = {
  customer_unreachable: "Client injoignable",
  address_not_found: "Adresse introuvable",
  recipient_absent: "Destinataire absent",
  other: "Autre",
};

/** Motif lisible (« motif · commentaire ») ; un motif saisi à la main s'affiche tel quel. */
export function closeReasonLabel(reason: string): string {
  const [code, ...rest] = reason.split(" · ");
  const label =
    {
      no_response: "Sans réponse du restaurant",
      cancelled_by_customer: "Annulée par le client",
      no_courier: "Aucun livreur disponible",
      payment_timeout: "Paiement non reçu à temps",
      late_payment: "Paiement reçu après l'annulation",
    }[code] ??
    problems[code] ??
    code;
  return [label, ...rest].join(" · ");
}

export const actorLabel: Record<string, string> = {
  customer: "Client",
  restaurant: "Établissement",
  courier: "Livreur",
  admin: "Admin",
  system: "Système",
};

/** Étape de la chronologie ; alertes, codes faux et problèmes ne sont détaillés qu'à l'admin. */
export function eventLabel(e: OrderEvent, detailed = false): string | null {
  switch (e.kind) {
    case "courier_assigned":
      return "Livreur attribué";
    case "courier_released":
      return detailed ? "Livreur retiré" : "Le livreur a dû annuler, un autre est recherché";
    case "dispatch_alert":
      return detailed ? "Alerte : toujours sans livreur" : null;
    case "code_failed":
      return detailed ? "Code incorrect" : null;
    case "code_locked":
      return detailed ? "Code bloqué" : null;
    case "problem_reported":
      return detailed ? "Problème signalé" : null;
    case "refund_pending":
      return "Remboursement en cours";
    case "refunded":
      return "Remboursement effectué";
    default:
      return e.status ? statusLabel(e.status) : null;
  }
}

const vehicles: Record<string, string> = { motorbike: "Moto", bicycle: "Vélo", car: "Voiture", on_foot: "À pied" };

export function courierLabel(c: CourierInfo): string {
  return [c.first_name, vehicles[c.vehicle_type] ?? c.vehicle_type, c.plate_number].filter(Boolean).join(" · ");
}

export function paymentLine(o: Pick<Order, "payment_method" | "payment_status">): string {
  return o.payment_method === "cash"
    ? "Espèces à la livraison"
    : `${paymentMethodLabel[o.payment_method]} · ${paymentStatusLabel[o.payment_status]}`;
}
