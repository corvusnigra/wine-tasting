const CYRILLIC_TO_LATIN: Record<string, string> = {
  а:"a", б:"b", в:"v", г:"g", д:"d", е:"e", ё:"e", ж:"zh", з:"z",
  и:"i", й:"i", к:"k", л:"l", м:"m", н:"n", о:"o", п:"p", р:"r",
  с:"s", т:"t", у:"u", ф:"f", х:"h", ц:"ts", ч:"ch", ш:"sh", щ:"sch",
  ъ:"", ы:"y", ь:"", э:"e", ю:"yu", я:"ya",
};

const LATIN_DIACRITICS_MAP = (() => {
  // Strip combining diacritical marks (NFD normalization).
  return (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
})();

export function normalizeQuery(input: string): string {
  return LATIN_DIACRITICS_MAP(input.toLowerCase().trim());
}

export function transliterateCyrillic(input: string): string {
  let out = "";
  for (const ch of input.toLowerCase()) {
    out += CYRILLIC_TO_LATIN[ch] ?? ch;
  }
  return out;
}

export function searchCandidates(input: string): string[] {
  const normalized = normalizeQuery(input);
  if (!normalized) return [];
  const translit = transliterateCyrillic(normalized);
  const set = new Set<string>([normalized]);
  if (translit !== normalized) set.add(translit);
  return Array.from(set);
}
