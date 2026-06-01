import { describe, expect, it } from "vitest";
import { aggregateNotes, pickBadges, type SimpleNote } from "@/lib/tasting/aggregate";

function note(user_id: string, score: number | null, descriptors: string[] = []): SimpleNote {
  return { user_id, display_name: user_id, overall_score: score, descriptors };
}

describe("aggregateNotes", () => {
  it("empty → null mean/std, no outliers", () => {
    const a = aggregateNotes([]);
    expect(a.mean).toBeNull();
    expect(a.std).toBeNull();
    expect(a.outliers).toEqual([]);
  });

  it("single note → mean = score, std = 0", () => {
    const a = aggregateNotes([note("u1", 80)]);
    expect(a.mean).toBe(80);
    expect(a.std).toBe(0);
    expect(a.outliers).toEqual([]);
  });

  it("ignores null scores in the mean", () => {
    const a = aggregateNotes([note("u1", 80), note("u2", null)]);
    expect(a.mean).toBe(80);
  });

  it("does NOT flag outliers with fewer than 4 raters", () => {
    // 3 raters, one wildly different — must not be flagged (tiny-sample guard)
    const a = aggregateNotes([note("u1", 90), note("u2", 50), note("u3", 52)]);
    expect(a.outliers).toEqual([]);
  });

  it("flags a genuine outlier with >= 4 raters", () => {
    const a = aggregateNotes([
      note("u1", 80),
      note("u2", 82),
      note("u3", 78),
      note("u4", 20), // far below
    ]);
    expect(a.outliers).toContain("u4");
    expect(a.outliers).not.toContain("u1");
  });

  it("counts descriptor frequency, top-N sorted", () => {
    const a = aggregateNotes(
      [
        note("u1", 80, ["малина", "кожа"]),
        note("u2", 80, ["малина"]),
        note("u3", 80, ["табак"]),
      ],
      2
    );
    expect(a.topDescriptors[0]).toEqual({ label: "малина", count: 2 });
    expect(a.topDescriptors).toHaveLength(2);
  });
});

describe("pickBadges", () => {
  it("assigns 'best' to the highest mean", () => {
    const b = pickBadges([
      { id: "a", mean: 70, std: 3 },
      { id: "b", mean: 90, std: 3 },
    ]);
    expect(b.get("b")).toContain("best");
    expect(b.get("a") ?? []).not.toContain("best");
  });

  it("'controversial' requires a meaningful spread (>= 8)", () => {
    const tight = pickBadges([
      { id: "a", mean: 80, std: 2 },
      { id: "b", mean: 70, std: 3 },
    ]);
    expect([...tight.values()].flat()).not.toContain("controversial");

    const wide = pickBadges([
      { id: "a", mean: 80, std: 12 },
      { id: "b", mean: 70, std: 3 },
    ]);
    expect(wide.get("a")).toContain("controversial");
  });

  it("'unanimous' only when best wine also has a tight spread", () => {
    // best wine (b) has high std → NOT unanimous
    const notUnanimous = pickBadges([
      { id: "a", mean: 70, std: 2 },
      { id: "b", mean: 90, std: 15 },
    ]);
    expect(notUnanimous.get("b") ?? []).not.toContain("unanimous");

    // best wine (b) has the lowest, tight std → unanimous
    const unanimous = pickBadges([
      { id: "a", mean: 70, std: 10 },
      { id: "b", mean: 90, std: 2 },
    ]);
    expect(unanimous.get("b")).toContain("unanimous");
  });

  it("empty input → empty map", () => {
    expect(pickBadges([]).size).toBe(0);
  });
});
