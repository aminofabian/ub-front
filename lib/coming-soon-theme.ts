import type { CSSProperties } from "react";

import { pickReadableTextColor } from "@/lib/branding-color-presets";

const DEFAULT_PRIMARY = "#0D9488";
const DEFAULT_ACCENT = "#14B8A6";

/** Fixed neutrals — body copy and surfaces stay readable on any brand primary. */
const NEUTRAL_INK = "#1a1814";
const NEUTRAL_INK_MUTED = "#5c574f";
const NEUTRAL_SURFACE = "#faf8f6";
const NEUTRAL_SURFACE_ELEVATED = "#f3efe8";
const NEUTRAL_DARK = "#121110";
const NEUTRAL_DARK_MID = "#1c1a17";

export type ComingSoonTheme = {
  primary: string;
  accent: string;
  accentLight: string;
  accentPale: string;
  primaryDeep: string;
  ink: string;
  inkMuted: string;
  surface: string;
  surfaceElevated: string;
  onPrimary: string;
  onDark: string;
  onDarkMuted: string;
  darkBg: string;
  darkBgMid: string;
  heroCellBgs: readonly [string, string, string, string];
  cssVars: CSSProperties;
};

function parseHex(value?: string | null): string | null {
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
  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${c(r).toString(16).padStart(2, "0")}${c(g).toString(16).padStart(2, "0")}${c(b).toString(16).padStart(2, "0")}`;
}

/** Blend `amount` of `tint` into `base` (0 = base only, 1 = full tint). */
function tintHex(base: string, tint: string, amount: number): string {
  const A = hexToRgb(base);
  const B = hexToRgb(tint);
  return rgbToHex(
    A.r + (B.r - A.r) * amount,
    A.g + (B.g - A.g) * amount,
    A.b + (B.b - A.b) * amount,
  );
}

function lightenHex(hex: string, amount: number): string {
  return tintHex(hex, "#ffffff", amount);
}

function darkenHex(hex: string, amount: number): string {
  return tintHex(hex, "#000000", amount);
}

/** Brand accents on a neutral editorial layout (primary never floods surfaces). */
export function buildComingSoonTheme(
  primaryHex?: string | null,
  accentHex?: string | null,
): ComingSoonTheme {
  const primary = parseHex(primaryHex) ?? DEFAULT_PRIMARY;
  const accent = parseHex(accentHex) ?? parseHex(DEFAULT_ACCENT) ?? lightenHex(primary, 0.2);
  const accentLight = lightenHex(accent, 0.32);
  const accentPale = lightenHex(accent, 0.5);
  const primaryDeep = darkenHex(primary, 0.2);

  const ink = NEUTRAL_INK;
  const inkMuted = tintHex(NEUTRAL_INK_MUTED, primary, 0.08);
  const surface = tintHex(NEUTRAL_SURFACE, primary, 0.04);
  const surfaceElevated = tintHex(NEUTRAL_SURFACE_ELEVATED, primary, 0.06);
  const darkBg = tintHex(NEUTRAL_DARK, primary, 0.2);
  const darkBgMid = tintHex(NEUTRAL_DARK_MID, primary, 0.16);
  const onPrimary = pickReadableTextColor(primary);
  const onDark = "#f7f4ef";
  const onDarkMuted = tintHex("#c8c2b8", primary, 0.1);

  const heroCellBgs = [
    tintHex("#1a1917", primary, 0.12),
    tintHex("#1e1d1a", primary, 0.08),
    tintHex("#171614", primary, 0.14),
    tintHex("#141312", primary, 0.1),
  ] as const;

  const cssVars: CSSProperties = {
    ["--cs-brand-primary" as string]: primary,
    ["--cs-brand-accent" as string]: accent,
    ["--cs-brand-accent-light" as string]: accentLight,
    ["--cs-brand-accent-pale" as string]: accentPale,
    ["--cs-brand-primary-deep" as string]: primaryDeep,
    ["--cs-brand-ink" as string]: ink,
    ["--cs-brand-ink-muted" as string]: inkMuted,
    ["--cs-brand-surface" as string]: surface,
    ["--cs-brand-surface-elevated" as string]: surfaceElevated,
    ["--cs-brand-dark" as string]: darkBg,
    ["--cs-brand-dark-mid" as string]: darkBgMid,
    ["--cs-brand-on-primary" as string]: onPrimary,
    ["--cs-brand-on-dark" as string]: onDark,
    ["--cs-brand-on-dark-muted" as string]: onDarkMuted,
    ["--cs-hero-glow" as string]: `${primary}22`,
  };

  return {
    primary,
    accent,
    accentLight,
    accentPale,
    primaryDeep,
    ink,
    inkMuted,
    surface,
    surfaceElevated,
    onPrimary,
    onDark,
    onDarkMuted,
    darkBg,
    darkBgMid,
    heroCellBgs,
    cssVars,
  };
}
