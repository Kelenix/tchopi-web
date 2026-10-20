/**
 * Numéro au format international (+225…), même règle que l'app mobile : en Côte d'Ivoire, 10 chiffres commençant par
 * 01, 05 ou 07 ; ailleurs, 8 à 15 chiffres avec l'indicatif. Rend null si le numéro est invalide.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.replace(/[\s.\-()]/g, "");
  let digits: string;
  if (raw.startsWith("+")) digits = raw.slice(1);
  else if (raw.startsWith("00")) digits = raw.slice(2);
  else if (/^0[157]\d{8}$/.test(raw)) digits = `225${raw}`;
  else digits = raw;
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  if (digits.startsWith("225") && !/^225(01|05|07)\d{8}$/.test(digits)) return null;
  return `+${digits}`;
}
