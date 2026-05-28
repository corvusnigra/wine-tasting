import { describe, expect, it } from "vitest";
import {
  normalizeQuery,
  searchCandidates,
  transliterateCyrillic,
} from "@/lib/search/normalize";

describe("search/normalize", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeQuery("Côte de Beaune")).toBe("cote de beaune");
    expect(normalizeQuery("  RÍOJA  ")).toBe("rioja");
  });

  it("transliterates Russian cyrillic", () => {
    expect(transliterateCyrillic("Саперави")).toBe("saperavi");
    expect(transliterateCyrillic("Бордо")).toBe("bordo");
  });

  it("emits both cyrillic and translit candidates", () => {
    const candidates = searchCandidates("Бордо");
    expect(candidates).toContain("бордо");
    expect(candidates).toContain("bordo");
  });

  it("returns single candidate for latin-only input", () => {
    const candidates = searchCandidates("Bordeaux");
    expect(candidates).toEqual(["bordeaux"]);
  });
});
