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
/**
 * Query param: unsaved design draft (serialized `StorefrontDesign` JSON).
 * Forwarded to headers by middleware; rendered instead of the saved design.
 */
export const STOREFRONT_PREVIEW_DESIGN_PARAM = "previewDesign";

/** Request headers set by middleware from the query params above. */
export const STOREFRONT_PREVIEW_THEME_HEADER = "x-ub-preview-theme";
export const STOREFRONT_PREVIEW_LANDING_HEADER = "x-ub-preview-landing";
export const STOREFRONT_PREVIEW_DESIGN_HEADER = "x-ub-preview-design";

export type StorefrontPreview = {
  themeId: StoreThemeId | null;
  landingId: LandingTemplateId | null;
  /** Raw design JSON; `null` when not previewing a draft. */
  designJson: string | null;
};

export function parseStorefrontPreview(
  themeRaw: string | null | undefined,
  landingRaw: string | null | undefined,
  designRaw?: string | null | undefined,
): StorefrontPreview {
  const theme = themeRaw?.trim() ?? "";
  const landing = landingRaw?.trim() ?? "";
  const design = designRaw?.trim() ?? "";
  return {
    themeId: isStoreThemeId(theme) ? theme : null,
    landingId: isLandingTemplateId(landing) ? landing : null,
    designJson: design.length > 0 ? design : null,
  };
}

/** Public shop URL that renders the staged look (and optional draft design) without saving it. */
export function storefrontPreviewUrl(
  shopBase: string,
  kind: "store" | "landing",
  id: string,
  opts?: { designJson?: string | null },
): string {
  const base = shopBase.replace(/\/+$/, "");
  const param =
    kind === "store"
      ? STOREFRONT_PREVIEW_THEME_PARAM
      : STOREFRONT_PREVIEW_LANDING_PARAM;
  let url = `${base}/?${param}=${encodeURIComponent(id)}`;
  const draft = opts?.designJson?.trim();
  if (draft) {
    url += `&${STOREFRONT_PREVIEW_DESIGN_PARAM}=${encodeURIComponent(draft)}`;
  }
  return url;
}
