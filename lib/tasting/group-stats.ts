import { modeOf } from "./aggregate";
import { tasteLean } from "./taste-profile";

// Rows come from a single nested query (see /groups/[id]/stats):
// revealed wines_in_session of the group, with their wine + notes.
export type StatNote = {
  user_id: string;
  overall_score: number | null;
  palate: {
    sweetness?: string;
    acidity?: string;
    tannin?: string;
    body?: string;
  } | null;
};
export type StatWine = {
  wisId: string;
  sessionId: string;
  name: string;
  vintage: number | null;
  wineType: string;
  grapeIds: string[];
  regionName: string | null;
  notes: StatNote[];
};

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export type GroupStats = {
  eveningsCount: number;
  winesCount: number;
  ratingsCount: number;
  topWines: Array<{ wisId: string; name: string; vintage: number | null; avg: number }>;
  topGrapes: Array<{ id: string; count: number }>;
  topRegions: Array<{ name: string; avg: number; count: number }>;
  groupPalate: {
    sweetness: string | null;
    acidity: string | null;
    tannin: string | null;
    body: string | null;
  };
  members: Array<{
    userId: string;
    avg: number | null;
    ratings: number;
    lean: string | null;
  }>;
};

export function computeGroupStats(wines: StatWine[]): GroupStats {
  const sessions = new Set(wines.map((w) => w.sessionId));
  let ratingsCount = 0;

  const topWines = wines
    .map((w) => {
      const scores = w.notes
        .map((n) => n.overall_score)
        .filter((s): s is number => s !== null);
      ratingsCount += scores.length;
      const avg = mean(scores);
      return avg === null
        ? null
        : { wisId: w.wisId, name: w.name, vintage: w.vintage, avg };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  // grapes by frequency across tasted wines
  const grapeFreq = new Map<string, number>();
  for (const w of wines) {
    for (const g of w.grapeIds) grapeFreq.set(g, (grapeFreq.get(g) ?? 0) + 1);
  }
  const topGrapes = Array.from(grapeFreq.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // regions by avg score
  const regionAgg = new Map<string, number[]>();
  for (const w of wines) {
    if (!w.regionName) continue;
    const scores = w.notes
      .map((n) => n.overall_score)
      .filter((s): s is number => s !== null);
    const arr = regionAgg.get(w.regionName) ?? [];
    arr.push(...scores);
    regionAgg.set(w.regionName, arr);
  }
  const topRegions = Array.from(regionAgg.entries())
    .map(([name, scores]) => ({ name, avg: mean(scores) ?? 0, count: scores.length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  // group palate — most common value per dimension across all notes
  const allNotes = wines.flatMap((w) => w.notes);
  const groupPalate = {
    sweetness: modeOf(allNotes.map((n) => n.palate?.sweetness)),
    acidity: modeOf(allNotes.map((n) => n.palate?.acidity)),
    tannin: modeOf(allNotes.map((n) => n.palate?.tannin)),
    body: modeOf(allNotes.map((n) => n.palate?.body)),
  };

  // per-member: avg score given + count + taste lean
  const byUser = new Map<string, StatNote[]>();
  for (const w of wines) {
    for (const n of w.notes) {
      const arr = byUser.get(n.user_id) ?? [];
      arr.push(n);
      byUser.set(n.user_id, arr);
    }
  }
  const members = Array.from(byUser.entries())
    .map(([userId, notes]) => {
      const scores = notes
        .map((n) => n.overall_score)
        .filter((s): s is number => s !== null);
      return {
        userId,
        avg: mean(scores),
        ratings: scores.length,
        lean: tasteLean(notes),
      };
    })
    .sort((a, b) => b.ratings - a.ratings);

  return {
    eveningsCount: sessions.size,
    winesCount: wines.length,
    ratingsCount,
    topWines,
    topGrapes,
    topRegions,
    groupPalate,
    members,
  };
}
