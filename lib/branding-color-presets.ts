/** Curated primary + accent pairs for storefront branding. */
export type BrandingColorPreset = {
  name: string;
  primary: string;
  accent: string;
};

export const BRANDING_COLOR_PRESETS: BrandingColorPreset[] = [
  { name: "Fresh Green", primary: "#28A745", accent: "#20863B" },
  { name: "Royal Blue", primary: "#1565C0", accent: "#90CAF9" },
  { name: "Sunset Orange", primary: "#EF6C00", accent: "#FFCC80" },
  { name: "Modern Purple", primary: "#6A1B9A", accent: "#CE93D8" },
  { name: "Bold Red", primary: "#C62828", accent: "#EF9A9A" },
  { name: "Teal Ocean", primary: "#00695C", accent: "#80CBC4" },
  { name: "Golden Yellow", primary: "#F9A825", accent: "#FFE082" },
  { name: "Deep Indigo", primary: "#283593", accent: "#9FA8DA" },
  { name: "Berry Pink", primary: "#AD1457", accent: "#F48FB1" },
  { name: "Earth Brown", primary: "#5D4037", accent: "#BCAAA4" },
  { name: "Slate Gray", primary: "#37474F", accent: "#B0BEC5" },
  { name: "Emerald", primary: "#00897B", accent: "#80CBC4" },
  { name: "Coral", primary: "#E64A19", accent: "#FFAB91" },
  { name: "Lavender", primary: "#7B1FA2", accent: "#E1BEE7" },
  { name: "Sky Blue", primary: "#0288D1", accent: "#81D4FA" },
  { name: "Olive", primary: "#827717", accent: "#DCE775" },
  { name: "Mint", primary: "#00796B", accent: "#B2DFDB" },
  { name: "Crimson", primary: "#B71C1C", accent: "#FFCDD2" },
  { name: "Amber", primary: "#FF8F00", accent: "#FFE082" },
  { name: "Charcoal", primary: "#263238", accent: "#CFD8DC" },
  { name: "Forest", primary: "#1B5E20", accent: "#C8E6C9" },
  { name: "Navy Gold", primary: "#0D47A1", accent: "#FFC107" },
  { name: "Wine", primary: "#880E4F", accent: "#F48FB1" },
  { name: "Ocean", primary: "#01579B", accent: "#4FC3F7" },
  { name: "Copper", primary: "#BF360C", accent: "#FFAB91" },
  { name: "Plum", primary: "#4A148C", accent: "#E1BEE7" },
  { name: "Palmart Teal", primary: "#0D9488", accent: "#5EEAD4" },
];

export const BRANDING_PRIMARY_TOOLTIP =
  "Primary — your main brand color. Used on headers, navigation bars, and key highlights shoppers see first.";

export const BRANDING_ACCENT_TOOLTIP =
  "Secondary (accent) — supports the primary. Used on buttons, links, badges, and call-to-action elements.";

const HEX_6 = /^#[0-9A-Fa-f]{6}$/;

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.trim();
  if (!HEX_6.test(s)) {
    return null;
  }
  return {
    r: Number.parseInt(s.slice(1, 3), 16),
    g: Number.parseInt(s.slice(3, 5), 16),
    b: Number.parseInt(s.slice(5, 7), 16),
  };
}

function relativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) {
    return null;
  }
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  if (l1 == null || l2 == null) {
    return null;
  }
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function normalizeHexColor(raw: string): string | null {
  const s = raw.trim();
  if (HEX_6.test(s)) {
    return s.toUpperCase();
  }
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    const body = s.slice(1);
    return (
      "#" +
      body
        .split("")
        .map((c) => c + c)
        .join("")
    ).toUpperCase();
  }
  return null;
}

/** #FFFFFF or #111827 — whichever reads better on the given background. */
export function pickReadableTextColor(backgroundHex: string): "#FFFFFF" | "#111827" {
  const vsWhite = contrastRatio(backgroundHex, "#FFFFFF");
  const vsBlack = contrastRatio(backgroundHex, "#111827");
  if (vsWhite == null || vsBlack == null) {
    return "#FFFFFF";
  }
  return vsWhite >= vsBlack ? "#FFFFFF" : "#111827";
}

const MIN_PRIMARY_ACCENT_CONTRAST = 3;
const MIN_ON_COLOR_CONTRAST = 4.5;

/**
 * Ensures primary/accent work together and both support light/dark text on buttons
 * and headers (preview + storefront patterns).
 */
export function meetsBrandingContrast(
  primary: string,
  accent: string,
): boolean {
  const p = normalizeHexColor(primary);
  const a = normalizeHexColor(accent);
  if (!p || !a) {
    return false;
  }
  const pair = contrastRatio(p, a);
  if (pair == null || pair < MIN_PRIMARY_ACCENT_CONTRAST) {
    return false;
  }
  for (const bg of [p, a]) {
    const onWhite = contrastRatio(bg, "#FFFFFF");
    const onBlack = contrastRatio(bg, "#111827");
    const best =
      onWhite != null && onBlack != null ? Math.max(onWhite, onBlack) : 0;
    if (best < MIN_ON_COLOR_CONTRAST) {
      return false;
    }
  }
  return true;
}

export function getContrastSafeBrandingPresets(): BrandingColorPreset[] {
  return BRANDING_COLOR_PRESETS.filter((preset) =>
    meetsBrandingContrast(preset.primary, preset.accent),
  );
}

export function brandingPresetMatches(
  preset: BrandingColorPreset,
  primaryColor: string,
  accentColor: string,
): boolean {
  return (
    normalizeHexColor(primaryColor) === normalizeHexColor(preset.primary) &&
    normalizeHexColor(accentColor) === normalizeHexColor(preset.accent)
  );
}
