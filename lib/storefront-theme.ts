import type { CSSProperties } from "react";

import {
  STOREFRONT_DENSITY_SCALE,
  STOREFRONT_RADIUS_TOKENS,
  resolveStorefrontDesign,
  type StorefrontDesign,
} from "@/lib/storefront-design";
import { storefrontFontPairing } from "@/lib/storefront-fonts";

/** Label on solid primary buttons (always white per storefront UX). */
export const STOREFRONT_ON_PRIMARY = "#ffffff";

export function parseStorefrontHex(value?: string | null): string | null {
  const raw = value?.trim() ?? "";
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return raw.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const body = raw.slice(1);
    return (
      "#" +
      body
        .split("")
        .map((c) => c + c)
        .join("")
    ).toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return (
      "#" +
      raw
        .split("")
        .map((c) => c + c)
        .join("")
    ).toLowerCase();
  }
  return null;
}

const THEME_VAR_KEYS = [
  "--primary",
  "--primary-foreground",
  "--primary-hover",
  "--ring",
  "--storefront-brand",
  "--storefront-accent",
  "--chart-1",
  "--chart-2",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-ring",
  // Design overrides (make-it-yours layer)
  "--sf-surface",
  "--sf-ink",
  "--sf-muted",
  "--sf-line",
  "--sf-paper-elevated",
  "--sf-line-strong",
  "--sf-font-display",
  "--sf-font-body",
  "--sf-card-radius",
  "--sf-button-radius",
  "--sf-control-radius",
  "--sf-density",
] as const;

/**
 * Apply tenant vars on `document.documentElement` for the shop session.
 * Returns a cleanup that restores the previous values.
 */
export function applyStorefrontThemeToDocument(
  primaryHex?: string | null,
  accentHex?: string | null,
  design?: StorefrontDesign | null,
): () => void {
  const vars = buildStorefrontThemeVars(primaryHex, accentHex, design);
  if (!vars) {
    return () => {};
  }
  const root = document.documentElement;
  const previous = new Map<string, string>();
  for (const key of THEME_VAR_KEYS) {
    const value = vars[key as keyof typeof vars];
    if (typeof value !== "string") continue;
    previous.set(key, root.style.getPropertyValue(key));
    root.style.setProperty(key, value);
  }
  return () => {
    for (const key of THEME_VAR_KEYS) {
      const prev = previous.get(key);
      if (prev) {
        root.style.setProperty(key, prev);
      } else {
        root.style.removeProperty(key);
      }
    }
  };
}

/**
 * Overrides shadcn `--primary` (and related) plus design tokens for a
 * storefront subtree. Returns `undefined` when there is nothing to apply so
 * callers can skip the style entirely.
 */
export function buildStorefrontThemeVars(
  primaryHex?: string | null,
  accentHex?: string | null,
  design?: StorefrontDesign | null,
): CSSProperties | undefined {
  const primary = parseStorefrontHex(primaryHex);
  const resolved = resolveStorefrontDesign(design);
  const vars: Record<string, string> = {};

  if (primary) {
    const accent = parseStorefrontHex(accentHex) ?? primary;
    vars["--primary"] = primary;
    vars["--primary-foreground"] = STOREFRONT_ON_PRIMARY;
    vars["--primary-hover"] = `color-mix(in srgb, ${primary} 88%, black)`;
    vars["--ring"] = `color-mix(in srgb, ${primary} 35%, transparent)`;
    vars["--storefront-brand"] = primary;
    vars["--storefront-accent"] = accent;
    vars["--chart-1"] = primary;
    vars["--chart-2"] = accent;
    vars["--sidebar-primary"] = primary;
    vars["--sidebar-primary-foreground"] = STOREFRONT_ON_PRIMARY;
    vars["--sidebar-ring"] = `color-mix(in srgb, ${primary} 35%, transparent)`;
  }

  if (resolved.surfaceHex) {
    const surface = resolved.surfaceHex;
    vars["--sf-surface"] = surface;
    const tokens = deriveSurfaceTokens(surface);
    vars["--sf-ink"] = tokens.ink;
    vars["--sf-muted"] = tokens.muted;
    vars["--sf-line"] = tokens.line;
    vars["--sf-paper-elevated"] = tokens.elevated;
    vars["--sf-line-strong"] = tokens.lineStrong;
  }

  const pairing = storefrontFontPairing(resolved.fontPairingId);
  if (pairing.id !== "default" && pairing.display && pairing.body) {
    vars["--sf-font-display"] = pairing.display.style.fontFamily;
    vars["--sf-font-body"] = pairing.body.style.fontFamily;
  }

  vars["--sf-card-radius"] = STOREFRONT_RADIUS_TOKENS[resolved.radius].card;
  vars["--sf-button-radius"] = STOREFRONT_RADIUS_TOKENS[resolved.radius].button;
  vars["--sf-control-radius"] = STOREFRONT_RADIUS_TOKENS[resolved.radius].control;
  vars["--sf-density"] = String(STOREFRONT_DENSITY_SCALE[resolved.density]);

  if (Object.keys(vars).length === 0) {
    return undefined;
  }
  return vars as CSSProperties;
}

/* ------------------------------------------------------------------ */
/* Auto-contrast surface tokens: any page background the merchant picks  */
/* gets a readable ink / muted / line pair derived from its lightness.  */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h.length === 6 ? h : "";
  if (!full) return null;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const channel = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function rgbRelativeLuminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Blend two hex colors; `weightB` is how much of `b` to mix in (0–1). */
function mixHex(a: string, b: string, weightB: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return a;
  const w = Math.max(0, Math.min(1, weightB));
  return rgbToHex([
    ra[0] + (rb[0] - ra[0]) * w,
    ra[1] + (rb[1] - ra[1]) * w,
    ra[2] + (rb[2] - ra[2]) * w,
  ]);
}

export type SurfaceTokens = {
  ink: string;
  muted: string;
  line: string;
  elevated: string;
  lineStrong: string;
};

export function deriveSurfaceTokens(hex: string): SurfaceTokens {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return {
      ink: "#141816",
      muted: "#5c6560",
      line: "#e4e6e4",
      elevated: "#ffffff",
      lineStrong: "#c8cdc8",
    };
  }
  const light = rgbRelativeLuminance(rgb) >= 0.35;
  if (light) {
    return {
      ink: mixHex(hex, "#101418", 0.82),
      muted: mixHex(hex, "#101418", 0.55),
      line: mixHex(hex, "#101418", 0.12),
      elevated: mixHex(hex, "#ffffff", 0.6),
      lineStrong: mixHex(hex, "#101418", 0.2),
    };
  }
  return {
    ink: mixHex(hex, "#f5f7f8", 0.86),
    muted: mixHex(hex, "#f5f7f8", 0.6),
    line: mixHex(hex, "#f5f7f8", 0.16),
    elevated: mixHex(hex, "#f5f7f8", 0.12),
    lineStrong: mixHex(hex, "#f5f7f8", 0.26),
  };
}
