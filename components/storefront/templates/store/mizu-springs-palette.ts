import type { CSSProperties } from "react";

import { parseStorefrontHex } from "@/lib/storefront-theme";
import {
  themeOptionVars,
  type ThemeOptionValue,
} from "@/lib/storefront-theme-options";

/** House defaults — the original Mizu Springs navy and cyan. */
export const MIZU_DEFAULT_PRIMARY = "#172554";
export const MIZU_DEFAULT_ACCENT = "#0891b2";

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function luminance(hex: string): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = rgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

/** Darken toward black until the colour holds white text (or ink on ice). */
function clampLuminance(hex: string, max: number): string {
  let out = hex;
  for (let i = 0; i < 12 && luminance(out) > max; i += 1) {
    out = mix(out, "#000000", 0.12);
  }
  return out;
}

export type MizuPalette = {
  /** Chrome, headings, primary buttons. White text sits on it. */
  primary: string;
  /** Call-to-action fill. White text sits on it. */
  accent: string;
  /** Accent as text on the light page — always readable on ice. */
  accentInk: string;
};

/**
 * Turn whatever brand colours a shop saved into a palette that keeps the
 * theme's contrast rules: white on primary ≥ 7:1, white on accent ≥ 4.5:1,
 * accent ink ≥ 4.5:1 on the ice page.
 */
export function resolveMizuPalette(
  primaryHex?: string | null,
  accentHex?: string | null,
): MizuPalette {
  const rawPrimary = parseStorefrontHex(primaryHex);
  const rawAccent = parseStorefrontHex(accentHex);

  const primary = clampLuminance(
    rawPrimary ?? rawAccent ?? MIZU_DEFAULT_PRIMARY,
    0.09,
  );
  const accentSeed =
    rawAccent && rawAccent !== rawPrimary
      ? rawAccent
      : rawPrimary
        ? mix(rawPrimary, "#ffffff", 0.18)
        : MIZU_DEFAULT_ACCENT;
  const accent = clampLuminance(accentSeed, 0.19);
  const accentInk = clampLuminance(accentSeed, 0.1);
  return { primary, accent, accentInk };
}

export function mizuPaletteStyle(
  primaryHex?: string | null,
  accentHex?: string | null,
): CSSProperties {
  const p = resolveMizuPalette(primaryHex, accentHex);
  return {
    ["--ms-navy" as string]: p.primary,
    ["--ms-accent" as string]: p.accent,
    ["--ms-accent-ink" as string]: p.accentInk,
  } as CSSProperties;
}

type ThemeBlob =
  | Partial<Record<string, Record<string, ThemeOptionValue>>>
  | null
  | undefined;

/**
 * Everything the theme root needs inline: the palette (a colour picked in the
 * studio beats the saved brand colour) plus the shape and toggle variables.
 */
export function mizuThemeStyle(
  primaryHex: string | null | undefined,
  accentHex: string | null | undefined,
  theme: ThemeBlob,
): CSSProperties {
  const own = theme?.["mizu-springs"];
  const pick = (v: ThemeOptionValue | undefined) =>
    typeof v === "string" ? parseStorefrontHex(v) : null;
  return {
    ...themeOptionVars(
      "mizu-springs",
      theme as Record<string, Record<string, ThemeOptionValue>> | null,
    ),
    ...mizuPaletteStyle(
      pick(own?.primary) ?? primaryHex,
      pick(own?.accent) ?? accentHex,
    ),
  };
}
