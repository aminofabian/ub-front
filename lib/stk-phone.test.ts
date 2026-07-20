import { describe, expect, it } from "vitest";

import {
  buildStkPhoneNumber,
  customerPhoneMatchesStk,
  isStkPhoneValid,
  stkPhoneLookupVariants,
} from "@/lib/stk-phone";

describe("stkPhoneLookupVariants", () => {
  it("returns 254 and 0… forms for a Kenya MSISDN", () => {
    expect(stkPhoneLookupVariants("254712345678")).toEqual([
      "254712345678",
      "0712345678",
    ]);
  });

  it("returns 0… and 254 forms when given a local number", () => {
    expect(stkPhoneLookupVariants("0712345678")).toEqual([
      "0712345678",
      "254712345678",
    ]);
  });
});

describe("customerPhoneMatchesStk", () => {
  it("matches across 0… and 254… storage forms", () => {
    expect(customerPhoneMatchesStk("0712345678", "254712345678")).toBe(true);
    expect(customerPhoneMatchesStk("254712345678", "254712345678")).toBe(true);
    expect(customerPhoneMatchesStk("0712345678", "254700000000")).toBe(false);
  });
});

describe("buildStkPhoneNumber / isStkPhoneValid", () => {
  it("normalizes area + local into 254…", () => {
    expect(buildStkPhoneNumber("+254", "712345678")).toBe("254712345678");
    expect(isStkPhoneValid("+254", "712345678")).toBe(true);
    expect(isStkPhoneValid("+254", "712")).toBe(false);
  });
});
