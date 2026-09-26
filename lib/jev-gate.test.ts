import { describe, expect, test } from "bun:test";

import { gateFromToolGuardDecision } from "@/lib/jev-gate";

describe("gateFromToolGuardDecision", () => {
  test("allow → proceed", () => {
    expect(gateFromToolGuardDecision("allow")).toBe("proceed");
    expect(gateFromToolGuardDecision("ALLOW")).toBe("proceed");
  });

  test("confirm/review → require_confirmation", () => {
    expect(gateFromToolGuardDecision("confirm")).toBe("require_confirmation");
    expect(gateFromToolGuardDecision("review")).toBe("require_confirmation");
  });

  test("deny → block", () => {
    expect(gateFromToolGuardDecision("deny")).toBe("block");
  });

  test("unknown → require_confirmation (fail closed on signal)", () => {
    expect(gateFromToolGuardDecision(null)).toBe("require_confirmation");
    expect(gateFromToolGuardDecision("")).toBe("require_confirmation");
    expect(gateFromToolGuardDecision("maybe")).toBe("require_confirmation");
  });
});
