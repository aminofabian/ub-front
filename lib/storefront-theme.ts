import type { CSSProperties } from "react";

import {
  STOREFRONT_DENSITY_SCALE,
  STOREFRONT_RADIUS_TOKENS,
  resolveStorefrontDesign,
  type StorefrontDesign,
} from "@/lib/storefront-design";

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
    vars["--sf-surface"] = resolved.surfaceHex;
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
