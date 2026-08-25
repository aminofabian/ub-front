import { describe, expect, test } from "bun:test";

import {
  chemLabCopyString,
  chemLabVoiceFromTheme,
  resolveChemLabCopy,
} from "@/lib/chem-lab-copy";
import {
  normalizeThemeBlob,
  normalizeThemeOptions,
  serializeThemeOptions,
  storefrontThemeOptionDefaults,
  storefrontThemeOptionDefs,
  themeOptionString,
  themeOptionVars,
} from "@/lib/storefront-theme-options";

describe("storefront theme options", () => {
  test("defines options for the flagship themes", () => {
    expect(storefrontThemeOptionDefs("chem-lab").map((d) => d.key)).toEqual([
      "voice",
      "grid",
      "glow",
      "tape",
      "cart",
      "dispense",
      "inventory",
      "searchPrefix",
      "searchPlaceholder",
      "rack",
    ]);
    expect(storefrontThemeOptionDefs("milk-run").map((d) => d.key)).toEqual([
      "paper",
    ]);
    expect(storefrontThemeOptionDefs("mart")).toEqual([]);
  });

  test("defaults fill every option key", () => {
    const defaults = storefrontThemeOptionDefaults("chem-lab");
    expect(defaults).toEqual({
      voice: "shop",
      grid: true,
      glow: 1,
      tape: true,
      cart: "Cart",
      dispense: "Add",
      inventory: "Inventory",
      searchPrefix: "Find",
      searchPlaceholder: "Search products…",
      rack: "Featured",
    });
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

  test("text options round-trip and fall back to defaults", () => {
    const normalized = normalizeThemeOptions("chem-lab", {
      inventory: "  Stock room  ",
      dispense: "",
    });
    expect(normalized).toEqual({ inventory: "Stock room" });
    expect(
      themeOptionString("chem-lab", { "chem-lab": { inventory: "Stock room" } }, "inventory"),
    ).toBe("Stock room");
    expect(themeOptionString("chem-lab", null, "dispense")).toBe("Add");
    expect(
      serializeThemeOptions("chem-lab", {
        inventory: "Inventory",
        dispense: "Buy",
      }),
    ).toEqual({ dispense: "Buy" });
    expect(
      serializeThemeOptions("chem-lab", { inventory: "", dispense: "   " }),
    ).toBeNull();
  });
});

describe("chem-lab copy voice packs", () => {
  test("defaults to shop voice with ecommerce labels", () => {
    expect(chemLabVoiceFromTheme(null)).toBe("shop");
    const copy = resolveChemLabCopy(null);
    expect(copy.cart).toBe("Cart");
    expect(copy.dispense).toBe("Add");
    expect(copy.inventory).toBe("Inventory");
    expect(copy.searchPrefix).toBe("Find");
    expect(copy.assay).toBe("");
  });

  test("lab voice restores reagent-bench lingo", () => {
    const theme = { "chem-lab": { voice: "lab" } };
    expect(chemLabVoiceFromTheme(theme)).toBe("lab");
    expect(chemLabCopyString(theme, "cart")).toBe("Beaker");
    expect(chemLabCopyString(theme, "dispense")).toBe("Dispense");
    expect(chemLabCopyString(theme, "coaTitle")).toBe("Certificate of analysis");
    expect(chemLabCopyString(theme, "assay")).toBe("Assay pass");
  });

  test("stored text overrides win over the voice pack", () => {
    const theme = {
      "chem-lab": { voice: "lab", cart: "Basket", dispense: "Grab" },
    };
    expect(chemLabCopyString(theme, "cart")).toBe("Basket");
    expect(chemLabCopyString(theme, "dispense")).toBe("Grab");
    expect(chemLabCopyString(theme, "inventory")).toBe("Reagent inventory");
  });
});
