import { describe, expect, it } from "bun:test";

import {
  formatTillSetupPinError,
  isTillPinSetupNeeded,
  tillSetupNeedsPassword,
  validateNewTillPin,
} from "@/lib/pos-till-setup";

describe("validateNewTillPin", () => {
  it("requires exactly 4 digits", () => {
    expect(validateNewTillPin("12", "12")).toBe("length");
    expect(validateNewTillPin("12345", "12345")).toBe("length");
    expect(validateNewTillPin("12ab", "12ab")).toBe("length");
  });

  it("asks to confirm before mismatch", () => {
    expect(validateNewTillPin("1234", "")).toBe("confirm-empty");
  });

  it("rejects a different confirmation", () => {
    expect(validateNewTillPin("1234", "1235")).toBe("mismatch");
  });

  it("accepts a matching 4-digit PIN", () => {
    expect(validateNewTillPin("1234", "1234")).toBeNull();
    expect(validateNewTillPin("  0812 ", "0812")).toBeNull();
  });
});

describe("formatTillSetupPinError", () => {
  it("names the recovery, not the field", () => {
    expect(formatTillSetupPinError("length")).toMatch(/4 digits/i);
    expect(formatTillSetupPinError("mismatch")).toMatch(/match/i);
  });
});

describe("tillSetupNeedsPassword", () => {
  it("only after a dead session", () => {
    expect(tillSetupNeedsPassword("session")).toBe(true);
    expect(tillSetupNeedsPassword("setup")).toBe(false);
    expect(tillSetupNeedsPassword("idle")).toBe(false);
    expect(tillSetupNeedsPassword(null)).toBe(false);
  });
});

describe("isTillPinSetupNeeded", () => {
  it("is explicit false only", () => {
    expect(isTillPinSetupNeeded(false)).toBe(true);
    expect(isTillPinSetupNeeded(true)).toBe(false);
    expect(isTillPinSetupNeeded(undefined)).toBe(false);
  });
});
