import type { CSSProperties } from "react";

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
] as const;

/** Apply tenant vars on `document.documentElement` for the shop session. */
export function applyStorefrontThemeToDocument(
  primaryHex?: string | null,
  accentHex?: string | null,
): () => void {
  const vars = buildStorefrontThemeVars(primaryHex, accentHex);
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

/** Overrides shadcn `--primary` (and related) for a storefront subtree. */
export function buildStorefrontThemeVars(
  primaryHex?: string | null,
  accentHex?: string | null,
): CSSProperties | undefined {
  const primary = parseStorefrontHex(primaryHex);
  if (!primary) {
    return undefined;
  }
  const accent = parseStorefrontHex(accentHex) ?? primary;

  return {
    "--primary": primary,
    "--primary-foreground": STOREFRONT_ON_PRIMARY,
    "--primary-hover": `color-mix(in srgb, ${primary} 88%, black)`,
    "--ring": `color-mix(in srgb, ${primary} 35%, transparent)`,
    "--storefront-brand": primary,
    "--storefront-accent": accent,
    "--chart-1": primary,
    "--chart-2": accent,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": STOREFRONT_ON_PRIMARY,
    "--sidebar-ring": `color-mix(in srgb, ${primary} 35%, transparent)`,
  } as CSSProperties;
}
