import { beforeEach, describe, expect, it } from "bun:test";

import {
  STALE_OPEN_SHIFT_MS,
  STALE_SHIFT_CONTINUED_PREFIX,
  clearStaleShiftContinued,
  formatShiftOpenDuration,
  isOpenShiftStatus,
  isStaleOpenShift,
  isStaleShiftContinued,
  markStaleShiftContinued,
  resolveTillOpeningPrompt,
  shiftOpenAgeMs,
} from "@/lib/pos-till-shift-gate";

function createMemoryStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

const OPENED = "2026-09-10T08:00:00.000Z";

describe("shiftOpenAgeMs", () => {
  it("returns elapsed ms from openedAt", () => {
    const now = Date.parse("2026-09-11T08:00:00.000Z");
    expect(shiftOpenAgeMs(OPENED, now)).toBe(STALE_OPEN_SHIFT_MS);
  });

  it("returns null for missing or invalid timestamps", () => {
    expect(shiftOpenAgeMs(null, Date.now())).toBeNull();
    expect(shiftOpenAgeMs("not-a-date", Date.now())).toBeNull();
  });
});

describe("isOpenShiftStatus", () => {
  it("treats open case-insensitively", () => {
    expect(isOpenShiftStatus("open")).toBe(true);
    expect(isOpenShiftStatus("OPEN")).toBe(true);
    expect(isOpenShiftStatus("closed")).toBe(false);
    expect(isOpenShiftStatus(null)).toBe(false);
  });
});

describe("isStaleOpenShift", () => {
  it("is stale at exactly 24 hours", () => {
    const now = Date.parse(OPENED) + STALE_OPEN_SHIFT_MS;
    expect(isStaleOpenShift(OPENED, now)).toBe(true);
  });

  it("is not stale just under 24 hours", () => {
    const now = Date.parse(OPENED) + STALE_OPEN_SHIFT_MS - 1;
    expect(isStaleOpenShift(OPENED, now)).toBe(false);
  });
});

describe("formatShiftOpenDuration", () => {
  it("formats hours under two days", () => {
    const now = Date.parse(OPENED) + 26 * 60 * 60 * 1000;
    expect(formatShiftOpenDuration(OPENED, now)).toBe("26 hours");
  });

  it("formats days from 48 hours", () => {
    const now = Date.parse(OPENED) + 48 * 60 * 60 * 1000;
    expect(formatShiftOpenDuration(OPENED, now)).toBe("2 days");
  });
});

describe("resolveTillOpeningPrompt", () => {
  const base = {
    ready: true,
    canOpenShift: true,
    canCloseShift: true,
    continuedShiftIds: new Set<string>(),
    nowMs: Date.parse(OPENED) + STALE_OPEN_SHIFT_MS,
  };

  it("asks to open when no shift is open", () => {
    expect(
      resolveTillOpeningPrompt({ ...base, openShift: null }),
    ).toBe("open-shift");
  });

  it("does not prompt open without permission", () => {
    expect(
      resolveTillOpeningPrompt({
        ...base,
        canOpenShift: false,
        openShift: null,
      }),
    ).toBeNull();
  });

  it("asks to close a 24h shift that was never closed", () => {
    expect(
      resolveTillOpeningPrompt({
        ...base,
        openShift: { id: "s1", openedAt: OPENED },
      }),
    ).toBe("close-stale-shift");
  });

  it("skips close when they already continued that shift", () => {
    expect(
      resolveTillOpeningPrompt({
        ...base,
        openShift: { id: "s1", openedAt: OPENED },
        continuedShiftIds: new Set(["s1"]),
      }),
    ).toBeNull();
  });

  it("does not prompt close without permission", () => {
    expect(
      resolveTillOpeningPrompt({
        ...base,
        canCloseShift: false,
        openShift: { id: "s1", openedAt: OPENED },
      }),
    ).toBeNull();
  });

  it("does not prompt while the till is locked or still loading", () => {
    expect(
      resolveTillOpeningPrompt({
        ...base,
        ready: false,
        openShift: null,
      }),
    ).toBeNull();
  });

  it("leaves a fresh open shift alone", () => {
    expect(
      resolveTillOpeningPrompt({
        ...base,
        nowMs: Date.parse(OPENED) + 60 * 60 * 1000,
        openShift: { id: "s1", openedAt: OPENED },
      }),
    ).toBeNull();
  });
});

describe("stale shift continued storage", () => {
  beforeEach(() => {
    const local = createMemoryStorage();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: local,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        ...globalThis,
        localStorage: local,
      },
    });
    Object.defineProperty(globalThis.window, "localStorage", {
      configurable: true,
      value: local,
    });
  });

  it("round-trips continue for a shift", () => {
    expect(isStaleShiftContinued("b1", "u1", "s1")).toBe(false);
    markStaleShiftContinued("b1", "u1", "s1");
    expect(isStaleShiftContinued("b1", "u1", "s1")).toBe(true);
    expect(
      localStorage.getItem(`${STALE_SHIFT_CONTINUED_PREFIX}b1:u1:s1`),
    ).toBe("1");
    clearStaleShiftContinued("b1", "u1", "s1");
    expect(isStaleShiftContinued("b1", "u1", "s1")).toBe(false);
  });
});
