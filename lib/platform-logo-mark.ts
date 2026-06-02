/**
 * Canonical Kiosk platform logomark (green kiosk tile: awning, till, barcode, payment).
 * Used for favicons, PWA icons, OG images, and {@link KioskLogoMark}.
 */

export const PLATFORM_LOGO_GRADIENT = {
  light: "#45D078",
  mid: "#28A745",
  deep: "#186B30",
} as const;

/** Unique id prefix for SVG defs (avoids clashes when multiple marks mount). */
export function platformLogoMarkSvg(idPrefix = "kiosk-mark"): string {
  const bg = `${idPrefix}-bg`;
  const shine = `${idPrefix}-shine`;
  const deep = `${idPrefix}-deep`;
  const glow = `${idPrefix}-glow`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" role="img" aria-label="Kiosk">
  <defs>
    <linearGradient id="${bg}" x1="6" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
      <stop stop-color="${PLATFORM_LOGO_GRADIENT.light}"/>
      <stop offset="0.52" stop-color="${PLATFORM_LOGO_GRADIENT.mid}"/>
      <stop offset="1" stop-color="${PLATFORM_LOGO_GRADIENT.deep}"/>
    </linearGradient>
    <linearGradient id="${shine}" x1="16" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF" stop-opacity="0.44"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${deep}" x1="16" y1="14" x2="16" y2="32" gradientUnits="userSpaceOnUse">
      <stop stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.2"/>
    </linearGradient>
    <filter id="${glow}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="32" height="32" rx="9" fill="url(#${bg})"/>
  <rect width="32" height="32" rx="9" fill="url(#${deep})"/>
  <rect width="32" height="15" rx="9" fill="url(#${shine})"/>
  <path d="M3 12.2C9.8 8.1 12.2 7.5 16 7.5C19.8 7.5 22.2 8.1 29 12.2V14.1H3V12.2Z" fill="#FFFFFF" fill-opacity="0.98"/>
  <rect x="5.5" y="14.8" width="21" height="12.8" rx="2.6" fill="#FFFFFF" fill-opacity="0.96"/>
  <rect x="7.8" y="17" width="1.2" height="4.2" rx="0.6" fill="#1A7A34" fill-opacity="0.55"/>
  <rect x="9.4" y="17" width="1.2" height="6.2" rx="0.6" fill="#1A7A34" fill-opacity="0.72"/>
  <rect x="11" y="17" width="1.2" height="3.4" rx="0.6" fill="#1A7A34" fill-opacity="0.42"/>
  <rect x="12.6" y="17" width="1.2" height="5.4" rx="0.6" fill="#1A7A34" fill-opacity="0.62"/>
  <circle cx="22" cy="24.6" r="2.5" fill="#32B85A" filter="url(#${glow})"/>
  <circle cx="22" cy="24.6" r="1.55" fill="#FFFFFF" fill-opacity="0.96"/>
  <path d="M21.1 24.55L21.75 25.2L23.15 23.65" stroke="#1A7A34" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

/** Default platform favicon / `/icon` when no tenant is mapped. */
export const PLATFORM_FAVICON_SVG = platformLogoMarkSvg("kiosk-favicon");

/** Data URL for embedding in `next/og` ImageResponse. */
export function platformLogoMarkDataUrl(idPrefix = "kiosk-og"): string {
  const svg = platformLogoMarkSvg(idPrefix);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
