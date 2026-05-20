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

/** Default Kiosk platform favicon (matches legacy app/icon.svg). */
export const PLATFORM_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" role="img" aria-label="Kiosk shop counter">
  <defs>
    <linearGradient id="bg" x1="8" y1="2" x2="26" y2="30" gradientUnits="userSpaceOnUse">
      <stop stop-color="#45D078"/>
      <stop offset="0.5" stop-color="#28A745"/>
      <stop offset="1" stop-color="#186B30"/>
    </linearGradient>
    <linearGradient id="shine" x1="16" y1="0" x2="16" y2="18" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1.1" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="32" height="32" rx="9" fill="url(#bg)"/>
  <rect width="32" height="14" rx="9" fill="url(#shine)"/>
  <path d="M3 12.2C9.8 8.1 12.2 7.5 16 7.5C19.8 7.5 22.2 8.1 29 12.2V14.1H3V12.2Z" fill="#FFFFFF" fill-opacity="0.98"/>
  <rect x="5.5" y="14.8" width="21" height="12.8" rx="2.6" fill="#FFFFFF" fill-opacity="0.96"/>
  <rect x="7.8" y="17" width="1.2" height="4.2" rx="0.6" fill="#1A7A34" fill-opacity="0.55"/>
  <rect x="9.4" y="17" width="1.2" height="6.2" rx="0.6" fill="#1A7A34" fill-opacity="0.72"/>
  <rect x="11" y="17" width="1.2" height="3.4" rx="0.6" fill="#1A7A34" fill-opacity="0.42"/>
  <rect x="12.6" y="17" width="1.2" height="5.4" rx="0.6" fill="#1A7A34" fill-opacity="0.62"/>
  <path d="M16.2 17.4H23.4M16.2 19.6H22.2M16.2 21.8H23" stroke="#1A7A34" stroke-opacity="0.45" stroke-width="1.05" stroke-linecap="round"/>
  <circle cx="22" cy="24.6" r="2.5" fill="#32B85A" filter="url(#glow)"/>
  <circle cx="22" cy="24.6" r="1.5" fill="#FFFFFF" fill-opacity="0.95"/>
  <path d="M21.1 24.55L21.75 25.2L23.15 23.65" stroke="#1A7A34" stroke-width="0.95" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14.8 15.8V17.4M14.8 15.8H16.4" stroke="#45D078" stroke-width="1.05" stroke-linecap="round"/>
</svg>`;
