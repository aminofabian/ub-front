import { cn } from "@/lib/utils";

/** No lift — hairline only. */
export const CATALOG_SHADOW = "shadow-none";

export const CATALOG_EDGE =
  "border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_8%,transparent)]";

/** Panels, rails, sheets — never rounded. */
export const CATALOG_SURFACE = cn(
  "overflow-hidden rounded-none border bg-[var(--catalog-slip,#fff)]",
  CATALOG_EDGE,
  CATALOG_SHADOW,
);

/** Interactive controls — sharp to match the desk. */
export const CATALOG_BTN =
  "rounded-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--catalog-primary,#1D4B3B)_28%,transparent)]";

export const CATALOG_BTN_OUTLINE = cn(
  CATALOG_BTN,
  "h-8 gap-1 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_12%,transparent)] bg-[var(--catalog-shelf,#FCFAF5)] px-2.5 text-[12px] shadow-none",
  "text-[var(--catalog-ink,#121A16)] hover:border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_22%,transparent)] hover:bg-[var(--catalog-shelf,#FCFAF5)]",
);

export const CATALOG_BTN_PRIMARY = cn(
  CATALOG_BTN,
  "h-8 gap-1.5 bg-[var(--catalog-primary,#1D4B3B)] px-3 text-[12px] text-white shadow-none",
  "hover:bg-[color-mix(in_srgb,var(--catalog-primary,#1D4B3B)_88%,#000)]",
);

export const CATALOG_BTN_GHOST = cn(
  CATALOG_BTN,
  "h-8 gap-1 px-2 text-[12px] shadow-none",
  "text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_58%,transparent)] hover:bg-[color-mix(in_srgb,var(--catalog-ink,#121A16)_4%,transparent)] hover:text-[var(--catalog-ink,#121A16)]",
);

export const CATALOG_CHIP = cn(
  CATALOG_BTN,
  "inline-flex h-7 items-center gap-1 border px-2 text-[11px]",
);
