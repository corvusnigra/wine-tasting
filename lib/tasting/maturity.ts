// Honest "drink window" guidance. We don't fabricate per-vintage scores;
// instead we combine a small curated table of well-known flagship vintages
// with a transparent maturity heuristic by wine type + age.

import type { WineType } from "./wine-type";

// Curated, broadly-accepted standout / weak years for regions we seed.
// Keyed by region name_en. Kept deliberately small and conservative.
const FLAGSHIP: Record<string, { great: number[]; weak: number[] }> = {
  Bordeaux: { great: [2005, 2009, 2010, 2015, 2016, 2018, 2019, 2020], weak: [2013, 2017] },
  Bourgogne: { great: [2005, 2010, 2015, 2019, 2020], weak: [2011, 2013, 2021] },
  "Brunello di Montalcino": { great: [2010, 2015, 2016, 2019], weak: [2014] },
  Barolo: { great: [2010, 2013, 2016, 2019], weak: [2014] },
  Barbaresco: { great: [2010, 2016, 2019], weak: [2014] },
  Rioja: { great: [2010, 2011, 2019], weak: [2013] },
  "Ribera del Duero": { great: [2010, 2011, 2019], weak: [2013] },
  Douro: { great: [2011, 2016, 2017], weak: [2014] },
  "Napa Valley": { great: [2012, 2013, 2016, 2018, 2019], weak: [2011] },
};

export type Maturity = {
  status: "young" | "ready" | "peak" | "decline";
  label: string;
  note: string | null; // flagship vintage note, if any
};

// Reds with structure age longest; whites/rosé/sparkling are mostly early-drinking.
function windowYears(type: WineType): { peakFrom: number; declineAfter: number } {
  switch (type) {
    case "red":
      return { peakFrom: 4, declineAfter: 20 };
    case "white":
      return { peakFrom: 1, declineAfter: 8 };
    case "sparkling":
      return { peakFrom: 1, declineAfter: 10 };
    case "rose":
      return { peakFrom: 0, declineAfter: 3 };
  }
}

const STATUS_LABEL: Record<Maturity["status"], string> = {
  young: "молодое — можно подождать",
  ready: "уже можно пить",
  peak: "в самом соку",
  decline: "проверьте зрелость — возможно, на спаде",
};

export function maturityFor(
  type: WineType,
  vintage: number | null,
  regionEn: string | null,
  currentYear: number
): Maturity | null {
  if (!vintage || vintage < 1900 || vintage > currentYear) return null;
  const age = currentYear - vintage;
  const { peakFrom, declineAfter } = windowYears(type);

  let status: Maturity["status"];
  if (age < Math.max(1, peakFrom - 2)) status = "young";
  else if (age < peakFrom) status = "ready";
  else if (age <= declineAfter) status = "peak";
  else status = "decline";

  let note: string | null = null;
  const flag = regionEn ? FLAGSHIP[regionEn] : undefined;
  if (flag?.great.includes(vintage)) note = "сильный год для региона";
  else if (flag?.weak.includes(vintage)) note = "год считается слабее обычного";

  return { status, label: STATUS_LABEL[status], note };
}
