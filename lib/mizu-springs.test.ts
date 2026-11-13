import { describe, expect, test } from "bun:test";

import { resolveMizuTheme } from "@/components/storefront/templates/store/mizu-springs-copy";
import { MIZU_TEXT_FIELDS } from "@/lib/mizu-springs-options";
import { resolveMizuPalette } from "@/components/storefront/templates/store/mizu-springs-palette";

function luminance(hex: string): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return 0.2126 * lin(n(1)) + 0.7152 * lin(n(3)) + 0.0722 * lin(n(5));
}

const contrastOnWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

describe("mizu palette", () => {
  test("falls back to the house navy and a readable cyan", () => {
    const p = resolveMizuPalette(null, null);
    expect(p.primary).toBe("#172554");
    // The house cyan is nudged darker so white button text clears 4.5:1.
    expect(contrastOnWhite(p.accent)).toBeGreaterThanOrEqual(4.5);
  });

  test("keeps white text readable on any saved brand colour", () => {
    for (const hex of ["#facc15", "#ffffff", "#f97316", "#16a34a", "#000000"]) {
      const p = resolveMizuPalette(hex, hex);
      expect(contrastOnWhite(p.primary)).toBeGreaterThanOrEqual(7);
      expect(contrastOnWhite(p.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrastOnWhite(p.accentInk)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("a primary-only shop still gets a distinct accent", () => {
    const p = resolveMizuPalette("#7c2d12", null);
    expect(p.accent).not.toBe(p.primary);
  });
});

describe("mizu copy", () => {
  const theme = (
    shopName: string,
    categoryNames: string[] = [],
    options: Record<string, string | boolean> | null = null,
  ) => resolveMizuTheme({ shopName, categoryNames, options });

  test("auto voice reads the shop name and categories", () => {
    expect(theme("Maji Safi", ["Bottled Water"]).kind).toBe("water");
    expect(theme("Tiliapia Hub", ["Fresh Fish"]).kind).toBe("food");
    expect(theme("Zuri", ["Dresses"]).kind).toBe("style");
    expect(theme("Palmart", ["Stationery"]).kind).toBe("general");
  });

  test("a chosen voice beats detection", () => {
    expect(theme("Maji Safi", ["Bottled Water"], { voice: "style" }).kind).toBe(
      "style",
    );
  });

  test("non-water voices make no water claims or service promises", () => {
    for (const voice of ["general", "food", "style"]) {
      const m = theme("Shop", [], { voice });
      expect(Object.values(m.t).join(" ").toLowerCase()).not.toMatch(
        /water|bottle|purif|refill/,
      );
      expect(m.t.turnaroundValue).toBe("");
    }
  });

  test("the shop's own wording wins, then landing content, then the voice", () => {
    const m = resolveMizuTheme({
      shopName: "Palmart",
      landing: { ctaLabel: "Order today", storyBody: "Family-run since 2009." },
      options: { heroPrimary: "Buy now", aboutTitle: "Meet {shop}" },
    });
    expect(m.t.heroPrimary).toBe("Buy now");
    expect(m.t.aboutLead).toBe("Family-run since 2009.");
    expect(m.t.aboutTitle).toBe("Meet Palmart");
  });

  test("a dash hides a line and toggles hide sections", () => {
    const m = theme("Shop", [], { faq2Q: "-", showFaq: false, wave: false });
    expect(m.t.faq2Q).toBe("");
    expect(m.show.faq).toBe(false);
    expect(m.show.wave).toBe(false);
    expect(m.show.about).toBe(true);
  });

  test("every preset line has a matching studio field", () => {
    const keys = new Set(MIZU_TEXT_FIELDS.map((f) => f.key));
    for (const key of Object.keys(theme("Shop").t)) {
      expect(keys.has(key)).toBe(true);
    }
    expect(Object.keys(theme("Shop").t).length).toBe(keys.size);
  });
});
