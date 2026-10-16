import { describe, expect, it } from "vitest";

import {
  EXAMPLE_CODE,
  LONG_CODE_LENGTH,
  MAX_CODE_LENGTH,
  assessBarcodeCode,
  barcodeFileName,
  canEncodeBarcode,
} from "@/lib/barcode-label";

describe("barcode-label", () => {
  it("treats blank input as empty", () => {
    expect(assessBarcodeCode("   ")).toEqual({ code: "", state: "empty" });
    expect(canEncodeBarcode("empty")).toBe(false);
  });

  it("accepts a normal product code", () => {
    const assessed = assessBarcodeCode(`  ${EXAMPLE_CODE}  `);
    expect(assessed).toEqual({ code: EXAMPLE_CODE, state: "ready" });
    expect(canEncodeBarcode(assessed.state)).toBe(true);
  });

  it("flags a long code without blocking it", () => {
    const assessed = assessBarcodeCode("A".repeat(LONG_CODE_LENGTH + 1));
    expect(assessed.state).toBe("long");
    expect(canEncodeBarcode(assessed.state)).toBe(true);
  });

  it("rejects codes past the shelf-label limit", () => {
    const assessed = assessBarcodeCode("B".repeat(MAX_CODE_LENGTH + 1));
    expect(assessed.state).toBe("too-long");
    expect(canEncodeBarcode(assessed.state)).toBe(false);
  });

  it("rejects characters a till scanner cannot read as Code 128", () => {
    expect(assessBarcodeCode("café").state).toBe("invalid");
    expect(assessBarcodeCode("A\nB").state).toBe("invalid");
  });

  it("builds a safe svg file name", () => {
    expect(barcodeFileName("KIOSK-001")).toBe("kiosk-kiosk-001.svg");
    expect(barcodeFileName("***")).toBe("kiosk-barcode.svg");
    expect(barcodeFileName("A".repeat(80)).length).toBeLessThan(60);
  });
});
