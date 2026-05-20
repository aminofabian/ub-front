import type { CSSProperties } from "react";

import { pickReadableTextColor } from "@/lib/branding-color-presets";

const DEFAULT_PRIMARY = "#0D9488";
const DEFAULT_ACCENT = "#14B8A6";

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

function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(
    A.r + (B.r - A.r) * t,
    A.g + (B.g - A.g) * t,
    A.b + (B.b - A.b) * t,
  );
}

function lightenHex(hex: string, amount: number): string {
  return mixHex(hex, "#ffffff", amount);
}

function darkenHex(hex: string, amount: number): string {
  return mixHex(hex, "#000000", amount);
}

/** Brand-driven palette for the storefront “coming soon” landing page. */
export function buildComingSoonTheme(
  primaryHex?: string | null,
  accentHex?: string | null,
): ComingSoonTheme {
  const primary = parseHex(primaryHex) ?? DEFAULT_PRIMARY;
  const accent = parseHex(accentHex) ?? parseHex(DEFAULT_ACCENT) ?? lightenHex(primary, 0.2);
  const accentLight = lightenHex(accent, 0.28);
  const accentPale = lightenHex(accent, 0.48);
  const primaryDeep = darkenHex(primary, 0.18);
  const ink = mixHex(primary, "#141210", 0.82);
  const inkMuted = mixHex(primary, "#6b6560", 0.55);
  const surface = mixHex(primary, "#faf8f5", 0.06);
  const surfaceElevated = mixHex(primary, "#f5f2ed", 0.1);
  const darkBg = mixHex(primary, "#0c0b0a", 0.88);
  const darkBgMid = mixHex(primary, "#121110", 0.82);
  const onPrimary = pickReadableTextColor(primary);
  const onDark = "#f5f2ed";

  const heroCellBgs = [
    mixHex(primary, "#080807", 0.9),
    mixHex(primary, "#0a0908", 0.84),
    mixHex(primary, "#0c0b0a", 0.88),
    mixHex(primary, "#060605", 0.92),
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
    ["--cs-hero-glow" as string]: `${primary}40`,
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
    darkBg,
    darkBgMid,
    heroCellBgs,
    cssVars,
  };
}
