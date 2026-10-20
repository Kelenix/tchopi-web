/** Périodes des statistiques admin : bornes envoyées au serveur et pas de la série (heure, jour, semaine, mois). */
export type PeriodKey = "day" | "yesterday" | "week" | "month" | "this_month" | "prev_month" | "this_year" | "year" | "custom";
export type Bucket = "hour" | "day" | "week" | "month";
export type Period = { key: PeriodKey; from: string; to: string };

export const periodLabels: Record<PeriodKey, string> = {
  day: "Aujourd'hui",
  yesterday: "Hier",
  week: "7 jours",
  month: "30 jours",
  this_month: "Ce mois-ci",
  prev_month: "Mois précédent",
  this_year: "Cette année",
  year: "12 mois",
  custom: "Personnalisée",
};
/** Choix de l'administration et de l'espace établissement. */
export const adminPeriods: PeriodKey[] = ["day", "week", "month", "year", "custom"];
export const establishmentPeriods: PeriodKey[] = ["day", "yesterday", "week", "month", "this_month", "prev_month", "this_year", "custom"];

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Dates (AAAA-MM-JJ, incluses) d'une période prédéfinie (heure d'Abidjan = UTC). */
export function presetPeriod(key: Exclude<PeriodKey, "custom">, today = new Date()): Period {
  const t = isoDay(today);
  const [y, m] = [today.getUTCFullYear(), today.getUTCMonth()];
  const back = (days: number) => isoDay(new Date(today.getTime() - days * DAY));
  const range: Record<typeof key, [string, string]> = {
    day: [t, t],
    yesterday: [back(1), back(1)],
    week: [back(6), t],
    month: [back(29), t],
    this_month: [isoDay(new Date(Date.UTC(y, m, 1))), t],
    prev_month: [isoDay(new Date(Date.UTC(y, m - 1, 1))), isoDay(new Date(Date.UTC(y, m, 0)))],
    this_year: [`${y}-01-01`, t],
    year: [back(364), t],
  };
  return { key, from: range[key][0], to: range[key][1] };
}

/** Bornes UTC (heure d'Abidjan = UTC) et pas adapté à la durée : au plus ~100 points. */
export function periodRange(p: Period): { p_from: string; p_to: string; p_bucket: Bucket } {
  const from = new Date(`${p.from}T00:00:00Z`);
  const to = new Date(new Date(`${p.to}T00:00:00Z`).getTime() + DAY);
  const days = (to.getTime() - from.getTime()) / DAY;
  const p_bucket: Bucket = days <= 2 ? "hour" : days <= 92 ? "day" : days <= 730 ? "week" : "month";
  return { p_from: from.toISOString(), p_to: to.toISOString(), p_bucket };
}

/** Libellé court d'un point de série selon son pas. */
export function bucketLabel(bucket: string, step: Bucket): string {
  const d = new Date(`${bucket}:00Z`);
  const opts: Intl.DateTimeFormatOptions =
    step === "hour" ? { hour: "2-digit", minute: "2-digit" } : step === "month" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" };
  return new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone: "UTC" }).format(d);
}
