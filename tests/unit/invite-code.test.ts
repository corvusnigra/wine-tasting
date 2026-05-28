import { describe, expect, it } from "vitest";
import { generateInviteCode, isValidInviteCode } from "@/lib/utils/invite-code";

describe("invite-code", () => {
  it("generates a 10-char code by default", () => {
    const c = generateInviteCode();
    expect(c).toHaveLength(10);
    expect(isValidInviteCode(c)).toBe(true);
  });

  it("uses no ambiguous chars (0, O, I, l)", () => {
    const c = generateInviteCode(20);
    for (const ch of c) {
      expect("0OIl".includes(ch)).toBe(false);
    }
  });

  it("no collisions in 10k generations", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      seen.add(generateInviteCode(10));
    }
    expect(seen.size).toBe(10_000);
  });

  it("rejects too short or invalid codes", () => {
    expect(isValidInviteCode("abc")).toBe(false);
    expect(isValidInviteCode("0OIl0OIl")).toBe(false);
  });
});
