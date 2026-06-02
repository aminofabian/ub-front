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

function monogramLetter(brand: string): string {
  const trimmed = brand.trim();
  if (!trimmed) {
    return "S";
  }
  const cleaned = trimmed.replace(/^the\s+/i, "").trim();
  const match = cleaned.match(/[A-Za-z0-9\u00C0-\u024F]/);
  return (match?.[0] ?? trimmed[0]).toUpperCase();
}

function monogramInitials(brand: string): string {
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

type MarkPalette = {
  primary: string;
  primaryDeep: string;
  primaryLight: string;
  tileBorder: string;
};

function markPalette(primaryColor?: string | null): MarkPalette {
  const primary = normalizeHex(primaryColor) ?? DEFAULT_PRIMARY;
  return {
    primary,
    primaryDeep: mixHex(primary, "#000000", 0.22),
    primaryLight: mixHex(primary, "#FFFFFF", 0.2),
    tileBorder: mixHex(primary, "#000000", 0.12),
  };
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
  const colors = markPalette(input.primaryColor);
  const letterFill = "#FFFFFF";
  const bagFill = "#FFFFFF";
  const handleStroke = "#FFFFFF";
  const tagFill = colors.primaryLight;
  const fontSize =
    glyph.length > 1 ? 18 : dualMark ? 18 : 24;

  const letters = dualMark
    ? `<text x="27" y="35" text-anchor="middle" dominant-baseline="middle" fill="${letterFill}" font-size="${fontSize}" font-weight="700" font-family="Georgia, 'Times New Roman', serif" letter-spacing="-0.08em">${escapeXml(glyph[0])}</text>
<text x="37" y="35" text-anchor="middle" dominant-baseline="middle" fill="${letterFill}" font-size="${fontSize}" font-weight="700" font-family="Georgia, 'Times New Roman', serif" letter-spacing="-0.08em">${escapeXml(glyph[1])}</text>`
    : `<text x="32" y="35" text-anchor="middle" dominant-baseline="middle" fill="${letterFill}" font-size="${fontSize}" font-weight="700" font-family="Georgia, 'Times New Roman', serif" letter-spacing="-0.03em">${escapeXml(glyph)}</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${escapeXml(display)}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.primary}"/>
      <stop offset="100%" stop-color="${colors.primaryDeep}"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="62" height="62" rx="16" fill="url(#g)"/>
  <rect x="1" y="1" width="62" height="62" rx="16" fill="none" stroke="${colors.tileBorder}" stroke-width="1.25" opacity="0.2"/>
  <path d="M64 0 H46 L64 18 Z" fill="${tagFill}" opacity="0.9"/>
  <g opacity="0.22">
    <path d="M22 18 C22 12.5 42 12.5 42 18" fill="none" stroke="${handleStroke}" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>
    <path d="M16 22 H48 L45 49 C44.5 52.5 40.5 54 32 54 C23.5 54 19.5 52.5 19 49 Z" fill="${bagFill}"/>
  </g>
  ${letters}
  <circle cx="49" cy="49" r="5" fill="#FFFFFF" opacity="0.95"/>
  <circle cx="49" cy="49" r="5" fill="none" stroke="${colors.primary}" stroke-width="1.5"/>
</svg>`;
}

export { PLATFORM_FAVICON_SVG } from "@/lib/platform-logo-mark";
