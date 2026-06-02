// Per-member taste lean: within a member's own notes, does a higher
// perceived level of a characteristic go with a higher score? A positive
// correlation means they reward that trait. Gated on sample size + strength
// so we never over-claim from three data points.

import { BODY, LEVEL_5, SWEETNESS } from "./sat-vocabulary";

const LEVEL_INDEX: Record<string, Record<string, number>> = {
  acidity: Object.fromEntries(LEVEL_5.map((v, i) => [v, i])),
  tannin: Object.fromEntries(LEVEL_5.map((v, i) => [v, i])),
  body: Object.fromEntries(BODY.map((v, i) => [v, i])),
  sweetness: Object.fromEntries(SWEETNESS.map((v, i) => [v, i])),
};

const LEAN_LABEL: Record<string, string> = {
  acidity: "кислотное",
  tannin: "танинное",
  body: "плотное",
  sweetness: "сладкое",
};

export type TasteNote = {
  overall_score: number | null;
  palate: {
    sweetness?: string;
    acidity?: string;
    tannin?: string;
    body?: string;
  } | null;
};

const MIN_PAIRS = 5;
const MIN_R = 0.35;

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < MIN_PAIRS) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

/** Returns the characteristic the member rewards most, or null if unclear. */
export function tasteLean(notes: TasteNote[]): string | null {
  const dims = ["tannin", "acidity", "body", "sweetness"] as const;
  let bestLabel: string | null = null;
  let bestR = MIN_R;

  for (const dim of dims) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const n of notes) {
      const raw = n.palate?.[dim];
      const idx = raw != null ? LEVEL_INDEX[dim][raw] : undefined;
      if (idx === undefined || n.overall_score === null) continue;
      xs.push(idx);
      ys.push(n.overall_score);
    }
    const r = pearson(xs, ys);
    if (r !== null && r > bestR) {
      bestR = r;
      bestLabel = LEAN_LABEL[dim];
    }
  }

  return bestLabel;
}
