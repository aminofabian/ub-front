import { describe, expect, it } from "bun:test";

import { applyTillPadKey } from "@/components/shifts/till-count-pad";

describe("applyTillPadKey", () => {
  it("replaces on fresh digit entry", () => {
    expect(
      applyTillPadKey(12, "3", { mode: "quantity", fresh: true }),
    ).toEqual({ value: 3, buffer: "3", fresh: false });
  });

  it("appends digits and caps at 5 for quantity", () => {
    const a = applyTillPadKey(12, "3", {
      mode: "quantity",
      fresh: false,
      buffer: "12",
    });
    expect(a).toEqual({ value: 123, buffer: "123", fresh: false });
    const b = applyTillPadKey(12345, "6", {
      mode: "quantity",
      fresh: false,
      buffer: "12345",
    });
    expect(b.value).toBe(12345);
  });

  it("supports stack-friendly clear and backspace", () => {
    expect(
      applyTillPadKey(40, "clear", { mode: "quantity", fresh: false, buffer: "40" }),
    ).toEqual({ value: 0, buffer: "0", fresh: true });
    expect(
      applyTillPadKey(40, "backspace", {
        mode: "quantity",
        fresh: false,
        buffer: "40",
      }),
    ).toEqual({ value: 4, buffer: "4", fresh: false });
  });

  it("handles decimal point and two-place money", () => {
    const withDot = applyTillPadKey(12, ".", {
      mode: "decimal",
      fresh: false,
      buffer: "12",
    });
    expect(withDot.buffer).toBe("12.");
    const cents = applyTillPadKey(12, "5", {
      mode: "decimal",
      fresh: false,
      buffer: "12.",
    });
    expect(cents).toEqual({ value: 12.5, buffer: "12.5", fresh: false });
    const capped = applyTillPadKey(12.5, "9", {
      mode: "decimal",
      fresh: false,
      buffer: "12.50",
    });
    expect(capped.buffer).toBe("12.50");
  });
});
