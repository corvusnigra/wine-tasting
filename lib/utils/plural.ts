/**
 * Russian plural picker. `forms` = [one, few, many]:
 *   plural(1, ["вечер", "вечера", "вечеров"])  → "вечер"
 *   plural(3, ["вечер", "вечера", "вечеров"])  → "вечера"
 *   plural(5, ["вечер", "вечера", "вечеров"])  → "вечеров"
 */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
