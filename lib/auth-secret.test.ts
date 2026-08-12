import { describe, expect, it } from "bun:test";

import { looksLikeStaffPin } from "@/lib/auth-secret";

describe("looksLikeStaffPin", () => {
  it("accepts 4–6 digit PINs", () => {
    expect(looksLikeStaffPin("1234")).toBe(true);
    expect(looksLikeStaffPin("12345")).toBe(true);
    expect(looksLikeStaffPin("123456")).toBe(true);
    expect(looksLikeStaffPin(" 9988 ")).toBe(true);
  });

  it("rejects passwords and short codes", () => {
    expect(looksLikeStaffPin("123")).toBe(false);
    expect(looksLikeStaffPin("1234567")).toBe(false);
    expect(looksLikeStaffPin("secret12")).toBe(false);
    expect(looksLikeStaffPin("12ab")).toBe(false);
    expect(looksLikeStaffPin("")).toBe(false);
  });
});
