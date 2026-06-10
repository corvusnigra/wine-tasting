import { describe, expect, it } from "vitest";
import { wineTypeRu, wineTypeColor } from "@/lib/tasting/wine-type";

describe("wineTypeRu", () => {
  it("maps known types to Russian", () => {
    expect(wineTypeRu("red")).toBe("красное");
    expect(wineTypeRu("fortified")).toBe("креплёное");
    expect(wineTypeRu("orange")).toBe("оранжевое");
  });

  it("returns null for unknown / empty", () => {
    expect(wineTypeRu(null)).toBeNull();
    expect(wineTypeRu(undefined)).toBeNull();
    expect(wineTypeRu("mead")).toBeNull();
  });
});

describe("wineTypeColor", () => {
  it("returns a colour for every known type incl. fortified/orange", () => {
    for (const t of ["red", "white", "rose", "sparkling", "fortified", "orange"]) {
      expect(wineTypeColor(t)).toMatch(/^#/);
    }
  });

  it("falls back to a CSS var for unknown / empty", () => {
    expect(wineTypeColor(null)).toBe("var(--border-strong)");
    expect(wineTypeColor("mead")).toBe("var(--border-strong)");
  });
});
