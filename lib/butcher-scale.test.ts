import { describe, expect, it } from "vitest";

import {
  StableWeightGate,
  formatKg,
  netWeightKg,
  parseButcherScaleLine,
  roundKg,
} from "./butcher-scale";

describe("parseButcherScaleLine", () => {
  it("parses kg with leading spaces", () => {
    expect(parseButcherScaleLine("   0.347 kg")).toEqual({
      kg: 0.347,
      hardwareStable: false,
      rawLine: "0.347 kg",
    });
  });

  it("parses grams", () => {
    expect(parseButcherScaleLine("347 g")?.kg).toBe(0.347);
  });

  it("parses stable prefix S", () => {
    const parsed = parseButcherScaleLine("S     1.250");
    expect(parsed?.kg).toBe(1.25);
    expect(parsed?.hardwareStable).toBe(true);
  });

  it("parses ST,GS style", () => {
    const parsed = parseButcherScaleLine("ST,GS,     0.456kg");
    expect(parsed?.kg).toBe(0.456);
    expect(parsed?.hardwareStable).toBe(true);
  });

  it("returns null for junk", () => {
    expect(parseButcherScaleLine("")).toBeNull();
    expect(parseButcherScaleLine("hello")).toBeNull();
  });
});

describe("StableWeightGate", () => {
  it("requires dwell time when no hardware stable flag", () => {
    const gate = new StableWeightGate(500, 0.001);
    expect(gate.feed(1.0, 0)).toBe(false);
    expect(gate.feed(1.0, 100)).toBe(false);
    expect(gate.feed(1.0, 500)).toBe(true);
  });

  it("resets when weight jumps", () => {
    const gate = new StableWeightGate(300, 0.001);
    expect(gate.feed(1.0, 0)).toBe(false);
    expect(gate.feed(1.5, 100)).toBe(false);
    expect(gate.feed(1.5, 500)).toBe(true);
  });

  it("accepts immediately on hardware stable", () => {
    const gate = new StableWeightGate(500, 0.001);
    expect(gate.feed(2.5, 0, true)).toBe(true);
  });
});

describe("tare helpers", () => {
  it("subtracts tare from gross", () => {
    expect(netWeightKg(1.5, 0.2)).toBe(1.3);
    expect(netWeightKg(0.1, 0.2)).toBe(0);
  });

  it("formats kg without trailing zeros", () => {
    expect(formatKg(1)).toBe("1");
    expect(formatKg(0.5)).toBe("0.5");
    expect(roundKg(0.3471)).toBe(0.347);
  });
});
