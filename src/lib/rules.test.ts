import { describe, expect, it } from "vitest";
import { orderAlerts } from "./admin";
import { parseIdentifier, passwordProblem, safeNext } from "./auth";
import { lineKey } from "./cart";
import { pickZone, type Zone } from "./catalog";
import { errorMessage } from "./errors";
import { formatMoney } from "./format";
import { closeReasonLabel, eventLabel, paymentLine, type Order } from "./orders";
import { normalizePhone } from "./phone";

describe("téléphone (même règle que le mobile)", () => {
  it("accepte un numéro ivoirien local ou international", () => {
    expect(normalizePhone("07 01 02 03 04")).toBe("+2250701020304");
    expect(normalizePhone("+225 05.01.02.03.04")).toBe("+2250501020304");
    expect(normalizePhone("002250101020304")).toBe("+2250101020304");
  });
  it("refuse un numéro ivoirien mal formé", () => {
    expect(normalizePhone("+225 09 01 02 03 04")).toBeNull();
    expect(normalizePhone("0701")).toBeNull();
  });
});

describe("connexion", () => {
  it("distingue email et téléphone", () => {
    expect(parseIdentifier(" Awa@Exemple.CI ")).toEqual({ kind: "email", value: "awa@exemple.ci" });
    expect(parseIdentifier("0701020304")).toEqual({ kind: "phone", value: "+2250701020304" });
    expect(parseIdentifier("awa@")).toBeNull();
  });
  it("applique la règle du mot de passe du serveur", () => {
    expect(passwordProblem("court1")).not.toBeNull();
    expect(passwordProblem("seulementdeslettres")).not.toBeNull();
    expect(passwordProblem("Tchopi2026")).toBeNull();
  });
  it("ne redirige jamais vers un autre site après la connexion", () => {
    expect(safeNext("/espace/panier")).toBe("/espace/panier");
    expect(safeNext("//pirate.example")).toBe("/espace");
    expect(safeNext("https://pirate.example")).toBe("/espace");
    expect(safeNext(null)).toBe("/espace");
  });
});

describe("affichage", () => {
  it("formate les francs CFA comme le mobile", () => {
    expect(formatMoney(1500)).toBe("1 500 FCFA");
    expect(formatMoney(0)).toBe("0 FCFA");
  });
  it("rend les motifs serveur lisibles", () => {
    expect(closeReasonLabel("no_response")).toBe("Sans réponse du restaurant");
    expect(closeReasonLabel("recipient_absent · sonné deux fois")).toBe("Destinataire absent · sonné deux fois");
    expect(closeReasonLabel("Rupture de stock")).toBe("Rupture de stock");
  });
  it("ne montre les alertes de la chronologie qu'à l'admin", () => {
    const alert = { kind: "dispatch_alert", status: null, actor_role: "system", reason: null, created_at: "" };
    expect(eventLabel(alert)).toBeNull();
    expect(eventLabel(alert, true)).toBe("Alerte : toujours sans livreur");
  });
  it("décrit le paiement d'une commande", () => {
    expect(paymentLine({ payment_method: "cash", payment_status: "unpaid" })).toBe("Espèces à la livraison");
    expect(paymentLine({ payment_method: "card", payment_status: "paid" })).toBe("Carte bancaire · Payée");
  });
  it("traduit les codes d'erreur du serveur", () => {
    expect(errorMessage(new Error("already_submitted"))).toMatch(/déjà en cours/);
    expect(errorMessage({ message: "TypeError: Failed to fetch" })).toMatch(/réseau/);
  });
});

describe("panier", () => {
  it("regroupe un même produit avec les mêmes options, quel que soit leur ordre", () => {
    const a = { id: "o1", name: "Grand", group: "Taille", price_delta: 500 };
    const b = { id: "o2", name: "Œuf", group: "Suppléments", price_delta: 200 };
    expect(lineKey("p", [a, b])).toBe(lineKey("p", [b, a]));
    expect(lineKey("p", [a])).not.toBe(lineKey("p", []));
  });
});

describe("catalogue", () => {
  const zone = (id: string, city: string) => ({ id, city, name: city }) as Zone;
  it("garde la ville demandée, sinon Abidjan, sinon la première", () => {
    const zones = [zone("z1", "Bouaké"), zone("11111111-1111-1111-1111-111111111111", "Abidjan")];
    expect(pickZone(zones, "z1")?.city).toBe("Bouaké");
    expect(pickZone(zones, "inconnue")?.city).toBe("Abidjan");
    expect(pickZone([zone("z1", "Bouaké")], undefined)?.city).toBe("Bouaké");
  });
});

describe("supervision admin (ADR-040)", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  const base = {
    status: "preparing",
    courier_id: null,
    dispatch_alerted_at: null,
    code_locked_at: null,
    problem_reported_at: null,
    submitted_at: null,
    created_at: "2026-10-20T11:58:00Z",
  } as unknown as Order;
  it("ne signale que les commandes qui demandent une intervention", () => {
    expect(orderAlerts(base, null, now)).toEqual([]);
    expect(orderAlerts({ ...base, dispatch_alerted_at: "2026-10-20T11:59:00Z" }, null, now)).toEqual(["no_courier"]);
    expect(orderAlerts({ ...base, status: "pending", created_at: "2026-10-20T11:54:00Z" }, null, now)).toEqual(["restaurant_silent"]);
    expect(orderAlerts({ ...base, status: "failed", problem_reported_at: "2026-10-20T11:59:00Z" }, null, now)).toEqual(["problem"]);
  });
});
