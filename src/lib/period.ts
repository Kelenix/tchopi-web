/** Périodes des statistiques admin : bornes envoyées au serveur et pas de la série (heure, jour, semaine, mois). */
export type PeriodKey = "day" | "week" | "month" | "year" | "custom";
export type Bucket = "hour" | "day" | "week" | "month";
export type Period = { key: PeriodKey; from: string; to: string };

export const periodChoices: [PeriodKey, string][] = [
  ["day", "Aujourd'hui"],
  ["week", "7 jours"],
  ["month", "30 jours"],
  ["year", "12 mois"],
  ["custom", "Personnalisée"],
];

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Dates (AAAA-MM-JJ, incluses) d'une période prédéfinie, jusqu'à aujourd'hui. */
export function presetPeriod(key: Exclude<PeriodKey, "custom">, today = new Date()): Period {
  const days = { day: 1, week: 7, month: 30, year: 365 }[key];
  return { key, from: isoDay(new Date(today.getTime() - (days - 1) * DAY)), to: isoDay(today) };
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
