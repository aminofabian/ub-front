import { describe, expect, test } from "bun:test";

import {
  normalizeThemeBlob,
  normalizeThemeOptions,
  serializeThemeOptions,
  storefrontThemeOptionDefaults,
  storefrontThemeOptionDefs,
  themeOptionVars,
} from "@/lib/storefront-theme-options";

describe("storefront theme options", () => {
  test("defines options for the flagship themes", () => {
    expect(storefrontThemeOptionDefs("chem-lab").map((d) => d.key)).toEqual([
      "grid",
      "glow",
      "tape",
    ]);
    expect(storefrontThemeOptionDefs("milk-run").map((d) => d.key)).toEqual([
      "paper",
    ]);
    expect(storefrontThemeOptionDefs("mart")).toEqual([]);
  });

  test("defaults fill every option key", () => {
    const defaults = storefrontThemeOptionDefaults("chem-lab");
    expect(defaults).toEqual({ grid: true, glow: 1, tape: true });
  });

  test("normalize drops unknown keys and clamps ranges", () => {
    const normalized = normalizeThemeOptions("chem-lab", {
      grid: false,
      glow: 99,
      tape: "yes",
      hacked: "x",
    });
    expect(normalized).toEqual({ grid: false, glow: 2 });
  });

  test("serialize keeps only what differs from defaults", () => {
    expect(
      serializeThemeOptions("chem-lab", { grid: true, glow: 1, tape: false }),
    ).toEqual({ tape: false });
    expect(serializeThemeOptions("chem-lab", { grid: true, glow: 1, tape: true })).toBeNull();
  });

  test("round-trips through the per-theme blob", () => {
    const blob = { "chem-lab": { tape: false }, "milk-run": { paper: "rose" } };
    expect(normalizeThemeBlob(blob)).toEqual(blob);
    expect(normalizeThemeBlob({ unknown: { x: 1 } })).toBeNull();
  });

  test("themeOptionVars maps stored values to css vars only when non-default", () => {
    expect(
      themeOptionVars("chem-lab", { "chem-lab": { tape: false, glow: 0.5 } }),
    ).toEqual({ "--cl-tape": "0", "--cl-glow": "0.5" });
    expect(themeOptionVars("chem-lab", { "chem-lab": { grid: true } })).toBeUndefined();
    expect(themeOptionVars("milk-run", { "milk-run": { paper: "rose" } })).toEqual({
      "--milk-cream": "#fff3ec",
    });
  });
});
