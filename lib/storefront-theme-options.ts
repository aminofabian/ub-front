import type { CSSProperties } from "react";

import type { StoreThemeId } from "@/lib/storefront-templates";

/**
 * Theme personality options — the per-theme creative dials.
 *
 * Every store theme declares a small set of levers (paper tone, glow, tape,
 * frame weight…) that the merchant can pull in the design studio. Values are
 * stored in the design blob (`design.theme[<themeId>]`), survive theme
 * switches, and are applied as CSS custom properties on the theme root with
 * theme defaults as fallbacks.
 *
 * Each option controls exactly one CSS variable (`var`); the theme's own CSS
 * declares the default so an unset option is a no-op.
 */

export type ThemeOptionValue = string | number | boolean;

export type ThemeOptionDef =
  | {
      key: string;
      label: string;
      hint?: string;
      type: "toggle";
      var: string;
      default: boolean;
      /** CSS value to emit when on (default: the var is left to the theme). */
      onValue?: string;
      /** CSS value to emit when off. */
      offValue: string;
    }
  | {
      key: string;
      label: string;
      hint?: string;
      type: "select";
      var: string;
      default: string;
      values: Record<string, string>;
      options: { value: string; label: string; swatch?: string }[];
    }
  | {
      key: string;
      label: string;
      hint?: string;
      type: "range";
      var: string;
      default: number;
      min: number;
      max: number;
      step: number;
      unit?: string;
    }
  | {
      key: string;
      label: string;
      hint?: string;
      type: "color";
      var: string;
      default: string;
    }
  | {
      key: string;
      label: string;
      hint?: string;
      type: "text";
      /** Optional CSS custom property (most copy is read in JS). */
      var?: string;
      default: string;
      max?: number;
      placeholder?: string;
    };

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const STOREFRONT_THEME_OPTIONS: Partial<
  Record<StoreThemeId, readonly ThemeOptionDef[]>
> = {
  "chem-lab": [
    {
      key: "voice",
      label: "Word choice",
      hint: "Shop uses everyday cart language. Lab keeps the reagent-bench lingo.",
      type: "select",
      var: "--cl-voice",
      default: "shop",
      values: {
        shop: "shop",
        lab: "lab",
      },
      options: [
        { value: "shop", label: "Shop" },
        { value: "lab", label: "Lab" },
      ],
    },
    {
      key: "grid",
      label: "Graph-paper grid",
      hint: "The faint engineering lines behind the bench",
      type: "toggle",
      var: "--cl-grid",
      default: true,
      offValue: "transparent",
    },
    {
      key: "glow",
      label: "Accent glow",
      hint: "How strongly the lime light blooms off the glass",
      type: "range",
      var: "--cl-glow",
      default: 1,
      min: 0.2,
      max: 2,
      step: 0.2,
    },
    {
      key: "tape",
      label: "Hazard tape",
      hint: "The striped tape on category filters",
      type: "toggle",
      var: "--cl-tape",
      default: true,
      offValue: "0",
    },
    {
      key: "cart",
      label: "Cart button",
      hint: "Header cart label — e.g. Cart or Beaker",
      type: "text",
      default: "Cart",
      max: 20,
      placeholder: "Cart",
    },
    {
      key: "dispense",
      label: "Add button",
      hint: "Add-to-cart label on every product",
      type: "text",
      default: "Add",
      max: 24,
      placeholder: "Add",
    },
    {
      key: "inventory",
      label: "Inventory heading",
      hint: "Title above the product grid",
      type: "text",
      default: "Inventory",
      max: 48,
      placeholder: "Inventory",
    },
    {
      key: "searchPrefix",
      label: "Search prefix",
      hint: "Short label on the search field — e.g. Find or CAS",
      type: "text",
      default: "Find",
      max: 12,
      placeholder: "Find",
    },
    {
      key: "searchPlaceholder",
      label: "Search placeholder",
      hint: "Hint text inside the search field",
      type: "text",
      default: "Search products…",
      max: 48,
      placeholder: "Search products…",
    },
    {
      key: "rack",
      label: "Featured rack",
      hint: "Label above the side product stack",
      type: "text",
      default: "Featured",
      max: 32,
      placeholder: "Featured",
    },
  ],
  "milk-run": [
    {
      key: "paper",
      label: "Paper tone",
      hint: "The shop-next-door's backing paper",
      type: "select",
      var: "--milk-cream",
      default: "cream",
      values: {
        cream: "#fffcf5",
        rose: "#fff3ec",
        lemon: "#fff9e4",
        mint: "#effaf3",
      },
      options: [
        { value: "cream", label: "Cream", swatch: "#fffcf5" },
        { value: "rose", label: "Rose", swatch: "#fff3ec" },
        { value: "lemon", label: "Lemon", swatch: "#fff9e4" },
        { value: "mint", label: "Mint", swatch: "#effaf3" },
      ],
    },
  ],
  oxide: [
    {
      key: "paper",
      label: "Paper tone",
      hint: "The warehouse paper behind the catalogue",
      type: "select",
      var: "--oxide-bone",
      default: "bone",
      values: {
        bone: "#edeae2",
        paper: "#f7f6f1",
        slate: "#e2e6e5",
      },
      options: [
        { value: "bone", label: "Bone", swatch: "#edeae2" },
        { value: "paper", label: "White paper", swatch: "#f7f6f1" },
        { value: "slate", label: "Slate", swatch: "#e2e6e5" },
      ],
    },
    {
      key: "grid",
      label: "Blueprint grid",
      hint: "Fine engineering lines behind the cards",
      type: "toggle",
      var: "--oxide-grid",
      default: true,
      offValue: "transparent",
    },
  ],
  "tint-lab": [
    {
      key: "paper",
      label: "Paper tone",
      hint: "The beauty counter's backing paper",
      type: "select",
      var: "--tint-paper",
      default: "paper",
      values: {
        paper: "#f6f1ea",
        porcelain: "#f2f4ef",
        blush: "#f7eef0",
      },
      options: [
        { value: "paper", label: "Kraft paper", swatch: "#f6f1ea" },
        { value: "porcelain", label: "Porcelain", swatch: "#f2f4ef" },
        { value: "blush", label: "Blush", swatch: "#f7eef0" },
      ],
    },
  ],
  "carbon-desk": [
    {
      key: "paper",
      label: "Desk tone",
      hint: "The counter wood behind the paper",
      type: "select",
      var: "--cd-desk",
      default: "walnut",
      values: {
        walnut: "#c9b896",
        oak: "#d8cba8",
        ash: "#b9bfc0",
      },
      options: [
        { value: "walnut", label: "Walnut", swatch: "#c9b896" },
        { value: "oak", label: "Oak", swatch: "#d8cba8" },
        { value: "ash", label: "Ash", swatch: "#b9bfc0" },
      ],
    },
  ],
  "beauty-edit": [
    {
      key: "paper",
      label: "Paper tone",
      hint: "The magazine page behind the products",
      type: "select",
      var: "--be-paper",
      default: "white",
      values: {
        white: "#ffffff",
        ivory: "#fbf8f2",
        smoke: "#f4f5f6",
      },
      options: [
        { value: "white", label: "Bright white", swatch: "#ffffff" },
        { value: "ivory", label: "Ivory", swatch: "#fbf8f2" },
        { value: "smoke", label: "Smoke", swatch: "#f4f5f6" },
      ],
    },
  ],
  "scent-story": [
    {
      key: "silk",
      label: "Salon silk",
      hint: "The cream paper behind bottles and copy",
      type: "select",
      var: "--ss-cream",
      default: "silk",
      values: {
        silk: "#fcf8f0",
        ivory: "#f7f1e6",
        parchment: "#f3eadc",
      },
      options: [
        { value: "silk", label: "Silk", swatch: "#fcf8f0" },
        { value: "ivory", label: "Ivory", swatch: "#f7f1e6" },
        { value: "parchment", label: "Parchment", swatch: "#f3eadc" },
      ],
    },
  ],
  "print-atelier": [
    {
      key: "sage",
      label: "Announce sage",
      hint: "The soft teal bar and Add buttons",
      type: "select",
      var: "--pa-sage",
      default: "mist",
      values: {
        mist: "#adc4c2",
        moss: "#c5d0b4",
        fern: "#a8bc8a",
      },
      options: [
        { value: "mist", label: "Mist", swatch: "#adc4c2" },
        { value: "moss", label: "Moss", swatch: "#c5d0b4" },
        { value: "fern", label: "Fern", swatch: "#a8bc8a" },
      ],
    },
  ],
  "butcher-board": [
    {
      key: "frame",
      label: "Chalk frame weight",
      hint: "Thickness of the chalk outlines around the stall",
      type: "range",
      var: "--bb-frame",
      default: 2,
      min: 1,
      max: 4,
      step: 1,
      unit: "px",
    },
  ],
};

/** Every option key across all themes — the blob-level whitelist. */
export const STOREFRONT_THEME_OPTION_KEYS: readonly string[] = Object.values(
  STOREFRONT_THEME_OPTIONS,
)
  .flatMap((defs) => defs ?? [])
  .map((def) => def.key);

export function storefrontThemeOptionDefs(
  themeId: string | null | undefined,
): readonly ThemeOptionDef[] {
  if (!themeId) return [];
  return STOREFRONT_THEME_OPTIONS[themeId as StoreThemeId] ?? [];
}

/** Default values for a theme's options (empty when the theme has none). */
export function storefrontThemeOptionDefaults(
  themeId: string | null | undefined,
): Record<string, ThemeOptionValue> {
  const out: Record<string, ThemeOptionValue> = {};
  for (const def of storefrontThemeOptionDefs(themeId)) {
    out[def.key] = def.default;
  }
  return out;
}

function normalizeValue(
  def: ThemeOptionDef,
  value: unknown,
): ThemeOptionValue | null {
  switch (def.type) {
    case "toggle":
      return typeof value === "boolean" ? value : null;
    case "range": {
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      return Math.min(def.max, Math.max(def.min, value));
    }
    case "color": {
      if (typeof value !== "string") return null;
      const hex = value.trim().toLowerCase();
      return HEX_RE.test(hex) ? hex : null;
    }
    case "select": {
      return typeof value === "string" && value in def.values ? value : null;
    }
    case "text": {
      if (typeof value !== "string") return null;
      const s = value.trim().slice(0, def.max ?? 80);
      return s.length > 0 ? s : null;
    }
  }
}

/** Strict per-theme whitelist of a `design.theme[themeId]` payload. */
export function normalizeThemeOptions(
  themeId: string | null | undefined,
  raw: unknown,
): Record<string, ThemeOptionValue> | null {
  const defs = storefrontThemeOptionDefs(themeId);
  if (defs.length === 0 || !raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const out: Record<string, ThemeOptionValue> = {};
  for (const def of defs) {
    const value = o[def.key];
    if (value === undefined || value === null) continue;
    const normalized = normalizeValue(def, value);
    if (normalized !== null) out[def.key] = normalized;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Normalize the whole `design.theme` blob (per-theme keyed). */
export function normalizeThemeBlob(
  raw: unknown,
): Record<string, Record<string, ThemeOptionValue>> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: Record<string, Record<string, ThemeOptionValue>> = {};
  for (const themeId of Object.keys(o) as StoreThemeId[]) {
    if (!(themeId in STOREFRONT_THEME_OPTIONS)) continue;
    const normalized = normalizeThemeOptions(themeId, o[themeId]);
    if (normalized) out[themeId] = normalized;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Serialize a theme's options for storage (only what differs from defaults). */
export function serializeThemeOptions(
  themeId: string | null | undefined,
  values: Record<string, ThemeOptionValue> | null | undefined,
): Record<string, ThemeOptionValue> | null {
  const defs = storefrontThemeOptionDefs(themeId);
  if (defs.length === 0 || !values) return null;
  const out: Record<string, ThemeOptionValue> = {};
  for (const def of defs) {
    const value = values[def.key];
    if (value === undefined || value === null || value === def.default) continue;
    if (def.type === "text" && String(value).trim() === "") continue;
    out[def.key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * CSS custom properties for a theme's stored options. Values the merchant
 * left at their defaults are skipped so the theme's own palette wins.
 */
export function themeOptionVars(
  themeId: string | null | undefined,
  theme:
    | Record<string, Record<string, ThemeOptionValue>>
    | null
    | undefined,
): CSSProperties | undefined {
  const defs = storefrontThemeOptionDefs(themeId);
  if (defs.length === 0) return undefined;
  const stored = theme?.[themeId ?? ""] ?? {};
  const out: Record<string, string> = {};
  for (const def of defs) {
    const value = stored[def.key];
    if (value === undefined || value === null || value === def.default) continue;
    if (def.type === "toggle") {
      if (value === true) {
        if (def.onValue) out[def.var] = def.onValue;
      } else {
        out[def.var] = def.offValue;
      }
    } else if (def.type === "range") {
      out[def.var] = `${value}${def.unit ?? ""}`;
    } else if (def.type === "color") {
      out[def.var] = String(value);
    } else if (def.type === "text") {
      if (def.var) out[def.var] = String(value);
    } else {
      out[def.var] = def.values[String(value)];
    }
  }
  return Object.keys(out).length > 0 ? (out as CSSProperties) : undefined;
}

/**
 * Resolved string for a theme text option (stored value, else the default).
 * Empty / missing / wrong type fall back to the option's default copy.
 */
export function themeOptionString(
  themeId: string | null | undefined,
  theme:
    | Record<string, Record<string, ThemeOptionValue>>
    | null
    | undefined,
  key: string,
): string {
  const def = storefrontThemeOptionDefs(themeId).find((d) => d.key === key);
  if (!def || def.type !== "text") return "";
  const stored = theme?.[themeId ?? ""]?.[key];
  if (typeof stored === "string" && stored.trim()) return stored.trim();
  return def.default;
}
