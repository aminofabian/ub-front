import { pickReadableTextColor } from "@/lib/branding-color-presets";

const DEFAULT_PRIMARY = "#0D9488";

function normalizeHex(color: string | null | undefined): string | null {
  if (!color?.trim()) {
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

function monogramLetter(brand: string): string {
  const trimmed = brand.trim();
  if (!trimmed) {
    return "S";
  }
  const cleaned = trimmed.replace(/^the\s+/i, "").trim();
  const match = cleaned.match(/[A-Za-z0-9\u00C0-\u024F]/);
  return (match?.[0] ?? trimmed[0]).toUpperCase();
}

export function monogramInitials(brand: string): string {
  const cleaned = brand.trim().replace(/^the\s+/i, "").trim();
  if (!cleaned) {
    return "S";
  }
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = words[0].match(/[A-Za-z0-9\u00C0-\u024F]/)?.[0];
    const second = words[1].match(/[A-Za-z0-9\u00C0-\u024F]/)?.[0];
    if (first && second) {
      return `${first}${second}`.toUpperCase();
    }
  }
  return monogramLetter(cleaned);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markColor(primaryColor?: string | null): string {
  return normalizeHex(primaryColor) ?? DEFAULT_PRIMARY;
}

/**
 * 32×32 SVG favicon matching the storefront monogram mark (on-light surface).
 */
export function buildTenantFaviconSvg(input: {
  displayName: string;
  primaryColor?: string | null;
}): string {
  const display = input.displayName.trim() || "Shop";
  const initials = monogramInitials(display);
  const dualMark = initials.length === 2;
  const glyph = dualMark ? initials : monogramLetter(display);
  const plate = markColor(input.primaryColor);
  const letterFill = pickReadableTextColor(plate);
  const fontSize = glyph.length > 1 ? 18 : 22;
  const letters = `<text x="32" y="33" text-anchor="middle" dominant-baseline="central" fill="${letterFill}" font-size="${fontSize}" font-weight="700" font-family="Georgia, 'Times New Roman', serif" letter-spacing="${glyph.length > 1 ? "-0.03em" : "0"}">${escapeXml(glyph)}</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${escapeXml(display)}">
  <circle cx="32" cy="32" r="30" fill="${plate}"/>
  <circle cx="32" cy="32" r="23" fill="none" stroke="${letterFill}" stroke-width="1.25" opacity="0.78"/>
  <rect x="30.5" y="4" width="3" height="5" fill="${letterFill}"/>
  <rect x="30.5" y="55" width="3" height="5" fill="${letterFill}"/>
  <rect x="4" y="30.5" width="5" height="3" fill="${letterFill}"/>
  <rect x="55" y="30.5" width="5" height="3" fill="${letterFill}"/>
  ${letters}
</svg>`;
}

export { PLATFORM_FAVICON_SVG } from "@/lib/platform-logo-mark";
