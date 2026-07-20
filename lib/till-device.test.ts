import { beforeEach, describe, expect, it } from "bun:test";

import {
  formatTillDeviceShortId,
  getOrCreateTillDeviceId,
  getTillDeviceLabel,
  peekTillDeviceId,
  setTillDeviceLabel,
  tillDeviceDisplayName,
  TILL_DEVICE_LABEL_KEY,
  TILL_DEVICE_STORAGE_KEY,
} from "@/lib/till-device";

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

describe("till-device", () => {
  beforeEach(() => {
    const local = createMemoryStorage();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: local,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    Object.defineProperty(globalThis.window, "localStorage", {
      configurable: true,
      value: local,
    });
  });

  it("creates a stable device id", () => {
    expect(peekTillDeviceId()).toBe("");
    const a = getOrCreateTillDeviceId();
    const b = getOrCreateTillDeviceId();
    expect(a.length).toBeGreaterThan(8);
    expect(b).toBe(a);
    expect(peekTillDeviceId()).toBe(a);
    expect(localStorage.getItem(TILL_DEVICE_STORAGE_KEY)).toBe(a);
  });

  it("formats short id and label display", () => {
    expect(formatTillDeviceShortId("a1b2c3d4-e5f6-7890")).toBe("a1b2c3d4");
    localStorage.setItem(TILL_DEVICE_STORAGE_KEY, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(tillDeviceDisplayName()).toBe("Till aaaaaaaa");
    setTillDeviceLabel("Front counter");
    expect(getTillDeviceLabel()).toBe("Front counter");
    expect(tillDeviceDisplayName()).toBe("Front counter");
    expect(localStorage.getItem(TILL_DEVICE_LABEL_KEY)).toBe("Front counter");
  });
});
