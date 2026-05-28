export type SimpleNote = {
  user_id: string;
  display_name: string | null;
  overall_score: number | null;
  descriptors: string[];
};

export type WineAggregate = {
  mean: number | null;
  std: number | null;
  outliers: string[]; // user_ids
  topDescriptors: Array<{ label: string; count: number }>;
};

export function aggregateNotes(
  notes: SimpleNote[],
  topN = 3
): WineAggregate {
  const scores = notes
    .map((n) => n.overall_score)
    .filter((s): s is number => s !== null);

  let mean: number | null = null;
  let std: number | null = null;
  if (scores.length > 0) {
    mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (scores.length > 1) {
      const variance =
        scores.reduce((a, b) => a + Math.pow(b - mean!, 2), 0) / scores.length;
      std = Math.sqrt(variance);
    } else {
      std = 0;
    }
  }

  const outliers: string[] = [];
  if (mean !== null && std !== null && std > 0) {
    for (const n of notes) {
      if (n.overall_score === null) continue;
      const z = (n.overall_score - mean) / std;
      if (Math.abs(z) > 1) outliers.push(n.user_id);
    }
  }

  const freq = new Map<string, number>();
  for (const n of notes) {
    for (const d of n.descriptors) {
      freq.set(d, (freq.get(d) ?? 0) + 1);
    }
  }
  const topDescriptors = Array.from(freq.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([label, count]) => ({ label, count }));

  return { mean, std, outliers, topDescriptors };
}

export type Badge = "best" | "controversial" | "unanimous";

export function pickBadges(
  perWine: Array<{ id: string; mean: number | null; std: number | null }>
): Map<string, Badge[]> {
  const result = new Map<string, Badge[]>();
  if (perWine.length === 0) return result;

  const withMean = perWine.filter((w) => w.mean !== null) as Array<{
    id: string;
    mean: number;
    std: number | null;
  }>;
  if (withMean.length === 0) return result;

  let bestId = withMean[0].id;
  let bestMean = withMean[0].mean;
  for (const w of withMean) {
    if (w.mean > bestMean) {
      bestMean = w.mean;
      bestId = w.id;
    }
  }
  result.set(bestId, [...(result.get(bestId) ?? []), "best"]);

  const withStd = withMean.filter((w) => w.std !== null) as Array<{
    id: string;
    mean: number;
    std: number;
  }>;
  if (withStd.length > 0) {
    let cId = withStd[0].id;
    let maxStd = withStd[0].std;
    let uId = withStd[0].id;
    let minStd = withStd[0].std;
    for (const w of withStd) {
      if (w.std > maxStd) {
        maxStd = w.std;
        cId = w.id;
      }
      if (w.std < minStd) {
        minStd = w.std;
        uId = w.id;
      }
    }
    if (maxStd > 0) result.set(cId, [...(result.get(cId) ?? []), "controversial"]);
    if (minStd >= 0 && uId === bestId && withStd.length > 1) {
      result.set(uId, [...(result.get(uId) ?? []), "unanimous"]);
    }
  }

  return result;
}
