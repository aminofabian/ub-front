/**
 * Canonical Kiosk platform logomark (square till tile: awning, barcode, receipt).
 * Used for favicons, PWA icons, OG images, and {@link KioskLogoMark}.
 */

export const PLATFORM_LOGO_GRADIENT = {
  light: "#32B85A",
  mid: "#28A745",
  deep: "#1F8A38",
} as const;

/** Unique id prefix for SVG defs (avoids clashes when multiple marks mount). */
export function platformLogoMarkSvg(idPrefix = "kiosk-mark"): string {
  const bg = `${idPrefix}-bg`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" role="img" aria-label="Kiosk">
  <defs>
    <linearGradient id="${bg}" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
      <stop stop-color="${PLATFORM_LOGO_GRADIENT.mid}"/>
      <stop offset="1" stop-color="${PLATFORM_LOGO_GRADIENT.deep}"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" fill="url(#${bg})"/>
  <path d="M3.5 12.4L16 7.2L28.5 12.4V14H3.5V12.4Z" fill="#FFFFFF"/>
  <rect x="5.5" y="14" width="21" height="13" fill="#FFFFFF"/>
  <rect x="7.8" y="16.2" width="1.15" height="4.4" fill="#186B30" fill-opacity="0.55"/>
  <rect x="9.5" y="16.2" width="1.15" height="6.4" fill="#186B30" fill-opacity="0.78"/>
  <rect x="11.2" y="16.2" width="1.15" height="3.5" fill="#186B30" fill-opacity="0.45"/>
  <rect x="12.9" y="16.2" width="1.15" height="5.5" fill="#186B30" fill-opacity="0.68"/>
  <rect x="14.6" y="16.2" width="1.15" height="4.1" fill="#186B30" fill-opacity="0.5"/>
  <rect x="19.8" y="21.4" width="5" height="6.2" fill="${PLATFORM_LOGO_GRADIENT.mid}"/>
  <rect x="20.55" y="22.5" width="3.5" height="0.7" fill="#FFFFFF" fill-opacity="0.95"/>
  <rect x="20.55" y="23.7" width="2.6" height="0.7" fill="#FFFFFF" fill-opacity="0.7"/>
  <rect x="20.55" y="24.9" width="3.1" height="0.7" fill="#FFFFFF" fill-opacity="0.85"/>
</svg>`;
}

/** Default platform favicon / `/icon` when no tenant is mapped. */
export const PLATFORM_FAVICON_SVG = platformLogoMarkSvg("kiosk-favicon");

/** Data URL for embedding in `next/og` ImageResponse. */
export function platformLogoMarkDataUrl(idPrefix = "kiosk-og"): string {
  const svg = platformLogoMarkSvg(idPrefix);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
