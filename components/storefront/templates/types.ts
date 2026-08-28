import type {
  PublicCatalogItemCard,
  PublicCategory,
  PublicDepartment,
  PublicStorefrontPayload,
} from "@/lib/public-storefront";
import type { LandingContent, StoreThemeId } from "@/lib/storefront-templates";
import type { StorefrontDesign } from "@/lib/storefront-design";

export type StoreHomeTemplateProps = {
  themeId: StoreThemeId;
  slug: string;
  currency: string;
  catalogItems: PublicCatalogItemCard[];
  nextCursor: string | null;
  totalCount?: number;
  q?: string;
  categoryId?: string;
  typeId?: string;
  categoryHeading?: string;
  categoryPathSlug?: string;
  categories: PublicCategory[];
  types: PublicDepartment[];
  featured: PublicCatalogItemCard[];
  heroTitle: string;
  announcement: string | null;
  branchHint?: string | null;
  areaLabel?: string | null;
  primaryHex: string | null;
  accentHex: string | null;
  logoUrl: string | null;
  heroBannerUrls: string[] | null;
  showcaseImage: string | null;
  storefront: PublicStorefrontPayload | null;
  /** Contact / hours CMS fields (also used by landing templates). */
  landingContent?: LandingContent | null;
  /** Merchant design overrides (photos, tokens) on top of the theme. */
  design?: StorefrontDesign | null;
};

export type LandingTemplateProps = {
  storeName: string;
  logoUrl?: string | null;
  primaryHex?: string | null;
  accentHex?: string | null;
  landingContent?: LandingContent | null;
  templateId: string;
  catalogItems?: PublicCatalogItemCard[];
  featured?: PublicCatalogItemCard[];
  categories?: PublicCategory[];
  types?: PublicDepartment[];
  currency?: string | null;
  totalCount?: number | null;
  areaLabel?: string | null;
  announcement?: string | null;
  deliveryAreaNames?: string[];
  countryCode?: string | null;
  heroFallbackUrl?: string | null;
};
