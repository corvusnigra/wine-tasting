import { describe, expect, it } from "vitest";
import { denormalizeScore, normalizeScore } from "@/lib/tasting/scales";

describe("scales", () => {
  it("5stars: 0 → 0, 5 → 100, 2.5 → 50", () => {
    expect(normalizeScore({ scale: "5stars", value: 0 })).toBe(0);
    expect(normalizeScore({ scale: "5stars", value: 5 })).toBe(100);
    expect(normalizeScore({ scale: "5stars", value: 2.5 })).toBe(50);
  });

  it("20pt: 12 → 0, 20 → 100, 16 → 50", () => {
    expect(normalizeScore({ scale: "20pt", value: 12 })).toBe(0);
    expect(normalizeScore({ scale: "20pt", value: 20 })).toBe(100);
    expect(normalizeScore({ scale: "20pt", value: 16 })).toBe(50);
  });

  it("clamps out-of-range values", () => {
    expect(normalizeScore({ scale: "5stars", value: -1 })).toBe(0);
    expect(normalizeScore({ scale: "5stars", value: 10 })).toBe(100);
    expect(normalizeScore({ scale: "20pt", value: 25 })).toBe(100);
    expect(normalizeScore({ scale: "20pt", value: 5 })).toBe(0);
  });

  it("denormalize is inverse of normalize", () => {
    const cases: Array<{ scale: "5stars" | "20pt"; value: number }> = [
      { scale: "5stars", value: 3.5 },
      { scale: "20pt", value: 17.5 },
    ];
    for (const { scale, value } of cases) {
      const n = normalizeScore({ scale, value });
      const d = denormalizeScore(n, scale);
      expect(d).toBeCloseTo(value, 2);
    }
  });
});
