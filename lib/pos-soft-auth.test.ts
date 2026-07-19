import { afterEach, describe, expect, it } from "bun:test";

import {
  __resetPosSoftAuthForTests,
  effectiveSoftAuth,
  enterPosSoftAuth,
  isPosSoftAuthActive,
  leavePosSoftAuth,
  notifyPosSessionExpired,
} from "@/lib/pos-soft-auth";

describe("pos-soft-auth", () => {
  afterEach(() => {
    __resetPosSoftAuthForTests();
  });

  it("tracks enter/leave depth", () => {
    expect(isPosSoftAuthActive()).toBe(false);
    enterPosSoftAuth();
    enterPosSoftAuth();
    expect(isPosSoftAuthActive()).toBe(true);
    leavePosSoftAuth();
    expect(isPosSoftAuthActive()).toBe(true);
    leavePosSoftAuth();
    expect(isPosSoftAuthActive()).toBe(false);
    leavePosSoftAuth();
    expect(isPosSoftAuthActive()).toBe(false);
  });

  it("effectiveSoftAuth honors explicit true and POS scope", () => {
    expect(effectiveSoftAuth()).toBe(false);
    expect(effectiveSoftAuth(true)).toBe(true);
    enterPosSoftAuth();
    expect(effectiveSoftAuth()).toBe(true);
    expect(effectiveSoftAuth(undefined)).toBe(true);
  });

  it("notifyPosSessionExpired no-ops when POS soft auth is inactive", () => {
    expect(() => notifyPosSessionExpired("should not fire")).not.toThrow();
  });
});
