import { describe, expect, it } from "bun:test";

import {
  OPENING_LOADER_FLAG,
  isOpeningLoaderEnabled,
} from "@/lib/opening-loader-settings";

describe("isOpeningLoaderEnabled", () => {
  it("is on when the tenant has no settings yet", () => {
    expect(isOpeningLoaderEnabled(undefined)).toBe(true);
    expect(isOpeningLoaderEnabled(null)).toBe(true);
    expect(isOpeningLoaderEnabled({})).toBe(true);
  });

  it("stays on for unrelated flags", () => {
    expect(isOpeningLoaderEnabled({ "pos.cashier_drawout": false })).toBe(true);
  });

  it("is off only when the tenant switched it off", () => {
    expect(isOpeningLoaderEnabled({ [OPENING_LOADER_FLAG]: false })).toBe(false);
  });

  it("is on when the tenant switched it back on", () => {
    expect(isOpeningLoaderEnabled({ [OPENING_LOADER_FLAG]: true })).toBe(true);
  });
});
