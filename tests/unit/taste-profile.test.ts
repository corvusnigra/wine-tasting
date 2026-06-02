import { describe, expect, it } from "vitest";
import { tasteLean, type TasteNote } from "@/lib/tasting/taste-profile";

function note(score: number, tannin: string): TasteNote {
  return { overall_score: score, palate: { tannin } };
}

describe("tasteLean", () => {
  it("returns null with too few notes", () => {
    expect(tasteLean([note(90, "high"), note(60, "low")])).toBeNull();
  });

  it("detects a tannin lean when high-tannin wines score higher", () => {
    const notes = [
      note(95, "high"),
      note(90, "high"),
      note(88, "medium-plus"),
      note(60, "low"),
      note(55, "low"),
      note(62, "medium-minus"),
    ];
    expect(tasteLean(notes)).toBe("танинное");
  });

  it("returns null when scores don't track any characteristic", () => {
    const flat = [
      note(80, "low"),
      note(80, "medium"),
      note(80, "high"),
      note(80, "low"),
      note(80, "high"),
    ];
    expect(tasteLean(flat)).toBeNull();
  });

  it("ignores notes missing score or palate", () => {
    const notes: TasteNote[] = [
      { overall_score: null, palate: { tannin: "high" } },
      { overall_score: 90, palate: null },
      note(90, "high"),
      note(60, "low"),
    ];
    // only 2 usable pairs → below MIN_PAIRS → null
    expect(tasteLean(notes)).toBeNull();
  });
});
