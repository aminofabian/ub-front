/**
 * Storefront font pairing metadata — IDs, labels, and CSS stacks.
 *
 * Kept free of `next/font` so modules that only need the pairing id / picker
 * copy (design JSON, personality presets, theme hex helpers) do not pull every
 * storefront face into shared CSS on cashier / dashboard routes.
 *
 * Actual `@font-face` loading lives in {@link ./storefront-fonts}.
 */

export type StorefrontFontPairingId =
  | "default"
  | "classic"
  | "heritage"
  | "playful"
  | "elegant"
  | "modern"
  | "loud"
  | "clean";

export type StorefrontFontPairingMeta = {
  id: StorefrontFontPairingId;
  name: string;
  /** One-line feel description shown in the picker. */
  vibe: string;
  /**
   * CSS custom property set by the pairing's next/font `variable` class
   * (empty for theme default).
   */
  displayVar: string | null;
  bodyVar: string | null;
  displayFallback: string;
  bodyFallback: string;
};

export const STOREFRONT_FONT_PAIRING_IDS: readonly StorefrontFontPairingId[] = [
  "default",
  "classic",
  "heritage",
  "playful",
  "elegant",
  "modern",
  "loud",
  "clean",
] as const;

export const STOREFRONT_FONT_PAIRING_META: readonly StorefrontFontPairingMeta[] =
  [
    {
      id: "default",
      name: "Theme's own voice",
      vibe: "Each theme keeps its signature lettering",
      displayVar: null,
      bodyVar: null,
      displayFallback: "system-ui, sans-serif",
      bodyFallback: "system-ui, sans-serif",
    },
    {
      id: "classic",
      name: "Market Classic",
      vibe: "Tall bold capitals with a clean everyday body",
      displayVar: "--sf-font-anton",
      bodyVar: "--font-dm-sans",
      displayFallback: "Arial Black, Impact, sans-serif",
      bodyFallback: 'system-ui, "Segoe UI", sans-serif',
    },
    {
      id: "heritage",
      name: "Heritage",
      vibe: "Editorial serif headlines over a friendly sans",
      displayVar: "--sf-font-fraunces",
      bodyVar: "--font-dm-sans",
      displayFallback: 'Georgia, "Times New Roman", serif',
      bodyFallback: 'system-ui, "Segoe UI", sans-serif',
    },
    {
      id: "playful",
      name: "Playful",
      vibe: "Rounded, chubby headlines that feel like a corner shop",
      displayVar: "--sf-font-baloo",
      bodyVar: "--font-dm-sans",
      displayFallback: "Verdana, sans-serif",
      bodyFallback: 'system-ui, "Segoe UI", sans-serif',
    },
    {
      id: "elegant",
      name: "Elegant",
      vibe: "Refined high-contrast serif with a quiet geometric body",
      displayVar: "--font-cormorant",
      bodyVar: "--sf-font-jost",
      displayFallback: 'Georgia, "Times New Roman", serif',
      bodyFallback: 'system-ui, "Segoe UI", sans-serif',
    },
    {
      id: "modern",
      name: "Modern",
      vibe: "Technical grotesque with a clean professional body",
      displayVar: "--sf-font-space-grotesk",
      bodyVar: "--sf-font-manrope",
      displayFallback: 'system-ui, "Segoe UI", sans-serif',
      bodyFallback: 'system-ui, "Segoe UI", sans-serif',
    },
    {
      id: "loud",
      name: "Loud",
      vibe: "Heavy condensed capitals with a sturdy working body",
      displayVar: "--sf-font-passion",
      bodyVar: "--sf-font-archivo",
      displayFallback: "Arial Black, Impact, sans-serif",
      bodyFallback: 'system-ui, "Segoe UI", sans-serif',
    },
    {
      id: "clean",
      name: "Clean",
      vibe: "Quiet geometric display, light and modern body",
      displayVar: "--sf-font-jost",
      bodyVar: "--sf-font-manrope",
      displayFallback: 'system-ui, "Segoe UI", sans-serif',
      bodyFallback: 'system-ui, "Segoe UI", sans-serif',
    },
  ];

export function isStorefrontFontPairingId(
  value: unknown,
): value is StorefrontFontPairingId {
  return (
    typeof value === "string" &&
    (STOREFRONT_FONT_PAIRING_IDS as readonly string[]).includes(value)
  );
}

export function storefrontFontPairingMeta(
  id: string | null | undefined,
): StorefrontFontPairingMeta {
  return (
    STOREFRONT_FONT_PAIRING_META.find((p) => p.id === id) ??
    STOREFRONT_FONT_PAIRING_META[0]!
  );
}

/** CSS stacks for theme vars when the pairing's next/font classes are mounted. */
export function storefrontFontPairingCssStacks(
  id: string | null | undefined,
): { display: string; body: string } | null {
  const pairing = storefrontFontPairingMeta(id);
  if (pairing.id === "default" || !pairing.displayVar || !pairing.bodyVar) {
    return null;
  }
  return {
    display: `var(${pairing.displayVar}), ${pairing.displayFallback}`,
    body: `var(${pairing.bodyVar}), ${pairing.bodyFallback}`,
  };
}
