import { describe, expect, it } from "bun:test";

import {
  looksLikeOwnerPhone,
  normalizeOwnerPhone,
} from "@/lib/onboarding-questionnaire";

describe("looksLikeOwnerPhone", () => {
  it("accepts Kenyan 07 and 254 mobiles", () => {
    expect(looksLikeOwnerPhone("0714282874", "KE")).toBe(true);
    expect(looksLikeOwnerPhone("+254 714 282 874", "KE")).toBe(true);
  });

  it("rejects a short Kenyan stub", () => {
    expect(looksLikeOwnerPhone("0714", "KE")).toBe(false);
    expect(looksLikeOwnerPhone("", "KE")).toBe(false);
  });

  it("accepts a long international number outside Kenya", () => {
    expect(looksLikeOwnerPhone("+256 772 123456", "UG")).toBe(true);
  });
});

describe("normalizeOwnerPhone", () => {
  it("stores Kenyan numbers as 254 MSISDN", () => {
    expect(normalizeOwnerPhone("0714282874", "KE")).toBe("254714282874");
  });
});
