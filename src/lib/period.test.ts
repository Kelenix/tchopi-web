import { describe, expect, it } from "vitest";
import { periodRange, presetPeriod } from "./period";

describe("périodes des statistiques admin", () => {
  const today = new Date("2026-10-20T15:00:00Z");

  it("7 jours : du 14 au 20 inclus, un point par jour", () => {
    const p = presetPeriod("week", today);
    expect(p).toMatchObject({ from: "2026-10-14", to: "2026-10-20" });
    expect(periodRange(p)).toEqual({ p_from: "2026-10-14T00:00:00.000Z", p_to: "2026-10-21T00:00:00.000Z", p_bucket: "day" });
  });

  it("mois précédent et hier", () => {
    expect(presetPeriod("prev_month", today)).toMatchObject({ from: "2026-09-01", to: "2026-09-30" });
    expect(presetPeriod("yesterday", today)).toMatchObject({ from: "2026-10-19", to: "2026-10-19" });
  });

  it("le pas suit la durée : heure, jour, semaine, mois", () => {
    expect(periodRange(presetPeriod("day", today)).p_bucket).toBe("hour");
    expect(periodRange(presetPeriod("year", today)).p_bucket).toBe("week");
    expect(periodRange({ key: "custom", from: "2023-01-01", to: "2026-10-20" }).p_bucket).toBe("month");
  });
});
