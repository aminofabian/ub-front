import type { CSSProperties } from "react";

import type { BrandingRecord } from "@/lib/api";
import { BRAND_ACCENT, BRAND_PRIMARY } from "@/lib/brand-colors";

function normalizeHex(color: string | null | undefined): string | null {
  if (!color) {
    return null;
  }
  const s = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) {
    return s.toLowerCase();
  }
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    const body = s.slice(1);
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

function mixTowardWhite(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(mix(r))}${to2(mix(g))}${to2(mix(b))}`;
}

function luminanceFromHex(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function inkForOnColor(hex: string): string {
  return luminanceFromHex(hex) > 0.62 ? "#141414" : "#fafafa";
}

/**
 * When the business saved branding hex colours, use them for dashboard chrome
 * (e.g. drawer accents). Returns null if neither primary nor accent is a valid
 * hex — then fall back to theme {@code primary} utilities.
 */
export function dashboardBrandingAccentStops(
  branding: BrandingRecord | null | undefined,
): { from: string; via: string; to: string; secondary: string } | null {
  const primary =
    normalizeHex(branding?.primaryColor) ?? normalizeHex(branding?.accentColor);
  if (!primary) {
    return null;
  }
  const accentHex = normalizeHex(branding?.accentColor);
  const secondary =
    accentHex && accentHex !== primary ? accentHex : mixTowardWhite(primary, 0.3);
  return {
    from: primary,
    via: mixTowardWhite(primary, 0.14),
    to: mixTowardWhite(primary, 0.38),
    secondary,
  };
}

/**
 * CSS variables for POS / cashier chrome (scoped on a wrapper or dialog content).
 * Set on an ancestor so portaled modals receive variables when applied to {@link DialogContent}.
 */
export function posBrandThemeStyle(branding: BrandingRecord | null | undefined): CSSProperties {
  const hasTenantBrand =
    normalizeHex(branding?.primaryColor) ?? normalizeHex(branding?.accentColor);

  const primary =
    normalizeHex(branding?.primaryColor) ??
    normalizeHex(branding?.accentColor) ??
    BRAND_PRIMARY;

  const accentHex = normalizeHex(branding?.accentColor);
  const secondary =
    accentHex && accentHex !== primary
      ? accentHex
      : hasTenantBrand
        ? mixTowardWhite(primary, 0.34)
        : BRAND_ACCENT;

  return {
    "--pos-primary": primary,
    "--pos-secondary": secondary,
    "--pos-glow": mixTowardWhite(primary, 0.55),
    "--pos-primary-ink": inkForOnColor(primary),
    "--pos-secondary-ink": inkForOnColor(secondary),
  } as CSSProperties;
}
