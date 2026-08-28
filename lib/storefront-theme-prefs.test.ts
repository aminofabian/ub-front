import { afterEach, describe, expect, test } from "bun:test";

import {
  loadThemePins,
  saveThemePins,
  type ThemePins,
} from "@/lib/storefront-theme-prefs";

const storage = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
};

const original = (globalThis as { localStorage?: unknown }).localStorage;

afterEach(() => {
  storage.clear();
});

describe("storefront theme pins persistence", () => {
  test("round-trips valid pins", () => {
    (globalThis as { localStorage?: unknown }).localStorage = fakeLocalStorage;
    saveThemePins({
      store: ["milk-run", "butcher-board"],
      landing: ["neighborhood-board"],
    });
    expect(loadThemePins()).toEqual({
      store: ["milk-run", "butcher-board"],
      landing: ["neighborhood-board"],
    });
  });

  test("drops unknown ids, dedupes, and caps at two per mode", () => {
    (globalThis as { localStorage?: unknown }).localStorage = fakeLocalStorage;
    saveThemePins({
      store: ["bogus", "mart", "mart", "oxide", "chem-lab"],
      landing: ["nope", "front-window"],
    } as ThemePins);
    expect(loadThemePins()).toEqual({
      store: ["mart", "oxide"],
      landing: ["front-window"],
    });
  });

  test("returns empty pins when storage is missing", () => {
    (globalThis as { localStorage?: unknown }).localStorage = original;
    expect(loadThemePins()).toEqual({ store: [], landing: [] });
  });
});
