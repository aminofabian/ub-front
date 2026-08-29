import type { CSSProperties } from "react";

/** Comilmart signature chrome — fixed so the live shop matches the atelier preview. */
export const COMILMART_NAVY = "#0E1B2B";
export const COMILMART_GOLD = "#FFC20C";
export const COMILMART_GOLD_DARK = "#E6AD00";
export const COMILMART_CREAM = "#F6F4EF";
/** Comilmart body copy on cream — tuned for ≥4.5:1 against #F6F4EF. */
export const COMILMART_MUTED = "#4A5568";
export const COMILMART_INK_QUIET = "#6B7280";

const HEX_6 = /^#[0-9A-Fa-f]{6}$/;

function normalizeHex(raw: string | null | undefined): string | null {
  const hex = raw?.trim();
  return hex && HEX_6.test(hex) ? hex : null;
}

/**
 * Comilmart keeps its own-world navy + gold for chrome, CTAs, and hero overlays.
 * Merchant brand colors are exposed separately as `--cm-brand` / `--cm-brand-soft`
 * for small accents (badges, links) without washing out the theme identity.
 */
export function comilmartPaletteVars(
  primaryHex?: string | null,
  accentHex?: string | null,
): CSSProperties {
  const brand = normalizeHex(primaryHex) ?? COMILMART_NAVY;
  const brandSoft = normalizeHex(accentHex) ?? COMILMART_GOLD;

  return {
    ["--cm-navy" as string]: COMILMART_NAVY,
    ["--cm-gold" as string]: COMILMART_GOLD,
    ["--cm-gold-dark" as string]: COMILMART_GOLD_DARK,
    ["--cm-brand" as string]: brand,
    ["--cm-brand-soft" as string]: brandSoft,
    ["--primary" as string]: COMILMART_NAVY,
    ["--primary-foreground" as string]: "#ffffff",
    ["--primary-hover" as string]: "#0a141f",
    ["--ring" as string]: COMILMART_GOLD,
    ["--background" as string]: "#ffffff",
    ["--foreground" as string]: COMILMART_NAVY,
    ["--storefront-brand" as string]: COMILMART_NAVY,
    ["--storefront-accent" as string]: COMILMART_GOLD,
    ["--storefront-paper" as string]: COMILMART_CREAM,
    ["--storefront-paper-elevated" as string]: "#ffffff",
    ["--storefront-rule" as string]: "color-mix(in srgb, #0e1b2b 11%, transparent)",
    ["--storefront-ink" as string]: COMILMART_NAVY,
    ["--storefront-ink-muted" as string]: COMILMART_MUTED,
    ["--storefront-ink-quiet" as string]: COMILMART_INK_QUIET,
    ["--storefront-card-border" as string]:
      "color-mix(in srgb, #0e1b2b 11%, transparent)",
    ["--storefront-card-border-hover" as string]:
      "color-mix(in srgb, #ffc20c 35%, #e4e6e4)",
  } as CSSProperties;
}
