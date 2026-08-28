import type { CSSProperties } from "react";

export const BRANDING_LOGO_SCALE_MIN = 0.5;
export const BRANDING_LOGO_SCALE_MAX = 2.5;
export const BRANDING_LOGO_SCALE_STEP = 0.05;
export const BRANDING_LOGO_SCALE_DEFAULT = 1;

/** CSS custom property consumed by storefront header marks. */
export const STOREFRONT_LOGO_SCALE_VAR = "--storefront-logo-scale";

const LOGO_BASE = {
  sm: { h: "2.5rem", w: "min(180px, 45vw)" },
  md: { h: "3rem", w: "min(220px, 48vw)" },
  lg: { h: "3.5rem", w: "min(260px, 52vw)" },
} as const;

export function clampBrandingLogoScale(raw: unknown): number {
  if (raw == null || raw === "") {
    return BRANDING_LOGO_SCALE_DEFAULT;
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) {
    return BRANDING_LOGO_SCALE_DEFAULT;
  }
  const stepped =
    Math.round(n / BRANDING_LOGO_SCALE_STEP) * BRANDING_LOGO_SCALE_STEP;
  return Math.min(
    BRANDING_LOGO_SCALE_MAX,
    Math.max(BRANDING_LOGO_SCALE_MIN, Number(stepped.toFixed(2))),
  );
}

export function brandingLogoScaleCss(raw?: number | null): string {
  return String(clampBrandingLogoScale(raw ?? BRANDING_LOGO_SCALE_DEFAULT));
}

/** Set `--storefront-logo-scale` on a preview subtree so the mark resizes live. */
export function storefrontLogoScaleVarStyle(
  raw?: number | null,
): CSSProperties {
  return {
    [STOREFRONT_LOGO_SCALE_VAR]: brandingLogoScaleCss(raw),
  } as CSSProperties;
}

/** Header mark size that follows `--storefront-logo-scale` (default 1). */
export function storefrontLogoImageStyle(
  size: keyof typeof LOGO_BASE = "md",
): CSSProperties {
  const { h, w } = LOGO_BASE[size];
  const s = `var(${STOREFRONT_LOGO_SCALE_VAR}, 1)`;
  return {
    height: `calc(${h} * ${s})`,
    maxHeight: `calc(${h} * ${s})`,
    maxWidth: `calc(${w} * ${s})`,
    width: "auto",
  };
}
