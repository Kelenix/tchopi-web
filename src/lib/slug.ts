/** Nom public lisible : minuscules, sans accent, mots séparés par des tirets (même règle que `private.slugify`). */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "tchopi"
  );
}

/** Ancre d'un produit sur la fiche de son établissement (`#plat-garba`). */
export const productAnchor = (name: string) => `plat-${slugify(name)}`;

/** Ancres uniques dans une page : un doublon reçoit -2, -3… */
export function uniqueAnchors(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const base = slugify(name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n > 1 ? `${base}-${n}` : base;
  });
}
