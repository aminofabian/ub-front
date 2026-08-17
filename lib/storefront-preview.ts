import {
  isLandingTemplateId,
  isStoreThemeId,
  type LandingTemplateId,
  type StoreThemeId,
} from "@/lib/storefront-templates";

/** Query param: merchant “Open live” preview of a store theme. */
export const STOREFRONT_PREVIEW_THEME_PARAM = "previewTheme";
/** Query param: merchant “Open live” preview of a coming-soon landing. */
export const STOREFRONT_PREVIEW_LANDING_PARAM = "previewLanding";

/** Request headers set by middleware from the query params above. */
export const STOREFRONT_PREVIEW_THEME_HEADER = "x-ub-preview-theme";
export const STOREFRONT_PREVIEW_LANDING_HEADER = "x-ub-preview-landing";

export type StorefrontPreview = {
  themeId: StoreThemeId | null;
  landingId: LandingTemplateId | null;
};

export function parseStorefrontPreview(
  themeRaw: string | null | undefined,
  landingRaw: string | null | undefined,
): StorefrontPreview {
  const theme = themeRaw?.trim() ?? "";
  const landing = landingRaw?.trim() ?? "";
  return {
    themeId: isStoreThemeId(theme) ? theme : null,
    landingId: isLandingTemplateId(landing) ? landing : null,
  };
}

/** Public shop URL that renders the staged look without saving it. */
export function storefrontPreviewUrl(
  shopBase: string,
  kind: "store" | "landing",
  id: string,
): string {
  const base = shopBase.replace(/\/+$/, "");
  const param =
    kind === "store"
      ? STOREFRONT_PREVIEW_THEME_PARAM
      : STOREFRONT_PREVIEW_LANDING_PARAM;
  return `${base}/?${param}=${encodeURIComponent(id)}`;
}
