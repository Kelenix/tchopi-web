const grouping = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** « 1 500 F » : montant en francs CFA, comme l'app mobile (espaces insécables normalisés). */
export function formatMoney(amount: number, currency = "XOF"): string {
  const value = grouping.format(amount).replace(/[  ]/g, " ");
  return currency === "XOF" ? `${value} F` : `${value} ${currency}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}
