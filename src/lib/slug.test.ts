import { describe, expect, it } from "vitest";
import { productAnchor, slugify, uniqueAnchors } from "./slug";

describe("slugify", () => {
  it("donne un nom lisible, sans accent ni ponctuation", () => {
    expect(slugify("Maquis Chez Tante")).toBe("maquis-chez-tante");
    expect(slugify("Le Délice d'Awa !")).toBe("le-delice-d-awa");
    expect(slugify("Boissons & Jus frais")).toBe("boissons-jus-frais");
    expect(slugify("!!!")).toBe("tchopi");
  });

  it("ancres de produits et doublons", () => {
    expect(productAnchor("Poulet braisé")).toBe("plat-poulet-braise");
    expect(uniqueAnchors(["Boissons", "Plats", "boissons"])).toEqual(["boissons", "plats", "boissons-2"]);
  });
});
