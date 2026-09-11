import { describe, expect, it } from "bun:test";

import { compactSearchKey, textMatchesQuery } from "@/lib/text-search";

describe("textMatchesQuery", () => {
  it("matches manufacturer SKU and barcode, ignoring hyphens and case", () => {
    expect(textMatchesQuery("f11301", "Molped 14s", "F11301", null)).toBe(true);
    expect(textMatchesQuery("F-11301", "Molped 14s", "F11301", "")).toBe(true);
    expect(textMatchesQuery("6161101234567", "Soda", "SKU-1", "6161101234567")).toBe(
      true,
    );
  });

  it("still matches ordinary product names", () => {
    expect(textMatchesQuery("molped", "Molped 14's", "SKU-9")).toBe(true);
    expect(textMatchesQuery("xyzzy", "Molped 14's", "F11301")).toBe(false);
  });

  it("compacts codes for comparison", () => {
    expect(compactSearchKey("F-11301")).toBe("f11301");
  });
});
