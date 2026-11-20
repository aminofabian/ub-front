import { describe, expect, it } from "vitest";

import { buildEan13, ean13CheckDigit, generateBarcodes, isValidEan13 } from "@/lib/barcode-generate";

describe("EAN-13 check digit", () => {
  it.each([
    ["400638133393", 1],
    ["616400072618", 7],
    ["590123412345", 7],
  ])("checks %s", (first12, digit) => {
    expect(ean13CheckDigit(first12)).toBe(digit);
  });

  it("validates whole codes", () => {
    expect(isValidEan13("4006381333931")).toBe(true);
    expect(isValidEan13("4006381333932")).toBe(false);
    expect(isValidEan13("400638133393")).toBe(false);
  });
});

describe("generated barcodes", () => {
  it("builds a valid 13-digit in-store code", () => {
    const code = buildEan13(42);
    expect(code).toHaveLength(13);
    expect(code.startsWith("29")).toBe(true);
    expect(isValidEan13(code)).toBe(true);
  });

  it("never repeats or reuses a taken code", () => {
    let n = 0;
    const rng = () => [0.1, 0.1, 0.2, 0.3][n++ % 4];
    const taken = new Set([buildEan13(Math.floor(0.2 * 1e10))]);
    const codes = generateBarcodes(2, taken, rng);
    expect(new Set(codes).size).toBe(2);
    expect(codes.every((c) => !taken.has(c) && isValidEan13(c))).toBe(true);
  });
});
