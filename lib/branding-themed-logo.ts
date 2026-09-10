import {
  LANDING_TEMPLATE_META,
  STORE_THEME_META,
  normalizeLandingTemplateId,
  normalizeStoreThemeId,
  type LandingTemplateId,
  type StoreThemeId,
} from "@/lib/storefront-templates";

/** Store themes whose live chrome is a dark surface. */
export const DARK_STOREFRONT_THEME_IDS: readonly StoreThemeId[] = [
  "butcher-board",
  "boutique-shelf",
  "spirits-cellar",
  "chem-lab",
];

/** Coming-soon templates whose live chrome is a dark surface. */
export const DARK_LANDING_TEMPLATE_IDS: readonly LandingTemplateId[] = [
  "butchery-cut",
  "front-window",
];

export type BrandingLogoSurface = "light" | "dark";

export type ThemedLogoUrls = {
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
};

function trimUrl(value: string | null | undefined): string | null {
  const next = value?.trim();
  return next ? next : null;
}

/**
 * Light chrome (dashboard, Mart aisles, emails) uses {@code logoUrl}.
 * Dark chrome (Butcher board, Boutique shelf, Spirits cellar, Chem lab night)
 * uses {@code logoDarkUrl}, falling back to the light mark if missing.
 */
export function resolveThemedLogoUrl(
  urls: ThemedLogoUrls,
  surface: BrandingLogoSurface,
): string | null {
  const light = trimUrl(urls.logoUrl);
  const dark = trimUrl(urls.logoDarkUrl);
  if (surface === "dark") {
    return dark || light;
  }
  return light || dark;
}

export type HeroLogoResolution = {
  url: string | null;
  /**
   * True when only the light file exists. The hero paints a white knockout
   * so a pale plate never sits on the navy panel.
   */
  knockout: boolean;
};

/**
 * The merchant hero is always a dark brand panel, even on light storefronts
 * like Mart. Prefer the dark mark; if it is missing, knock the light file
 * out to a white silhouette instead of showing a white box on navy.
 */
export function resolveHeroLogo(urls: ThemedLogoUrls): HeroLogoResolution {
  const light = trimUrl(urls.logoUrl);
  const dark = trimUrl(urls.logoDarkUrl);
  if (dark) {
    return { url: dark, knockout: false };
  }
  if (light) {
    return { url: light, knockout: true };
  }
  return { url: null, knockout: false };
}

export function isDarkStorefrontTheme(
  themeId: string | null | undefined,
): boolean {
  return (DARK_STOREFRONT_THEME_IDS as readonly string[]).includes(
    normalizeStoreThemeId(themeId),
  );
}

export function isDarkLandingTemplate(
  templateId: string | null | undefined,
): boolean {
  return (DARK_LANDING_TEMPLATE_IDS as readonly string[]).includes(
    normalizeLandingTemplateId(templateId),
  );
}

export function resolveStorefrontLogoSurface(
  themeId: string | null | undefined,
  chemLabMode?: "light" | "dark" | null,
): BrandingLogoSurface {
  const id = normalizeStoreThemeId(themeId);
  if (id === "chem-lab" && (chemLabMode === "light" || chemLabMode === "dark")) {
    return chemLabMode;
  }
  return isDarkStorefrontTheme(id) ? "dark" : "light";
}

export function darkStorefrontThemeNames(): string[] {
  const ids = new Set<string>(DARK_STOREFRONT_THEME_IDS);
  return STORE_THEME_META.filter((meta) => ids.has(meta.id)).map(
    (meta) => meta.name,
  );
}

export function lightStorefrontThemeNames(): string[] {
  const ids = new Set<string>(DARK_STOREFRONT_THEME_IDS);
  return STORE_THEME_META.filter((meta) => !ids.has(meta.id)).map(
    (meta) => meta.name,
  );
}

export function darkLandingTemplateNames(): string[] {
  const ids = new Set<string>(DARK_LANDING_TEMPLATE_IDS);
  return LANDING_TEMPLATE_META.filter((meta) => ids.has(meta.id)).map(
    (meta) => meta.name,
  );
}

export function resolveLogoForTemplate(
  urls: ThemedLogoUrls,
  item: { id: string; kind?: string | null },
): string | null {
  const surface: BrandingLogoSurface =
    item.kind === "landing"
      ? isDarkLandingTemplate(item.id)
        ? "dark"
        : "light"
      : resolveStorefrontLogoSurface(item.id);
  return resolveThemedLogoUrl(urls, surface);
}
