import { describe, expect, it } from "vitest";
import { maturityFor } from "@/lib/tasting/maturity";

const NOW = 2026;

describe("maturityFor", () => {
  it("returns null without a vintage", () => {
    expect(maturityFor("red", null, null, NOW)).toBeNull();
  });

  it("returns null for an impossible future vintage", () => {
    expect(maturityFor("red", 2030, null, NOW)).toBeNull();
  });

  it("young red just bottled", () => {
    const m = maturityFor("red", 2025, null, NOW);
    expect(m?.status).toBe("young");
  });

  it("red in its window", () => {
    const m = maturityFor("red", 2016, null, NOW); // 10y
    expect(m?.status).toBe("peak");
  });

  it("very old red flagged as decline", () => {
    const m = maturityFor("red", 1995, null, NOW); // 31y
    expect(m?.status).toBe("decline");
  });

  it("rosé ages fast — old rosé declines", () => {
    const m = maturityFor("rose", 2020, null, NOW); // 6y
    expect(m?.status).toBe("decline");
  });

  it("adds a flagship note for a strong Bordeaux year", () => {
    const m = maturityFor("red", 2016, "Bordeaux", NOW);
    expect(m?.note).toBe("сильный год для региона");
  });

  it("adds a weak-year note", () => {
    const m = maturityFor("red", 2013, "Bordeaux", NOW);
    expect(m?.note).toBe("год считается слабее обычного");
  });
});
