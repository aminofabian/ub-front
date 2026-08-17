/**
 * Storefront theme + landing template registry metadata (code ids, not DB).
 * Must stay in sync with backend {@code StorefrontTemplateIds}.
 */

export const DEFAULT_STORE_THEME_ID = "mart" as const;
export const DEFAULT_LANDING_TEMPLATE_ID = "coming-soon-editorial" as const;

export type StoreThemeId =
  | "mart"
  | "butcher-board"
  | "boutique-shelf"
  | "spirits-cellar"
  | "oxide"
  | "tint-lab"
  | "milk-run"
  | "carbon-desk";

export type LandingTemplateId =
  | "coming-soon-editorial"
  | "neighborhood-board"
  | "fresh-market"
  | "butchery-cut"
  | "minimart-hours"
  | "brand-poster";

export type TemplateKind = "store" | "landing";

export type StorefrontTemplateMeta = {
  id: string;
  kind: TemplateKind;
  name: string;
  blurb: string;
  /** Tailwind-ish preview swatch colors for gallery cards */
  previewFrom: string;
  previewTo: string;
  accent: string;
};

export type LandingContent = {
  headline?: string | null;
  subheadline?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  hours?: string | null;
  address?: string | null;
  ctaLabel?: string | null;
};

export const STORE_THEME_IDS: readonly StoreThemeId[] = [
  "mart",
  "butcher-board",
  "boutique-shelf",
  "spirits-cellar",
  "oxide",
  "tint-lab",
  "milk-run",
  "carbon-desk",
] as const;

export const LANDING_TEMPLATE_IDS: readonly LandingTemplateId[] = [
  "coming-soon-editorial",
  "neighborhood-board",
  "fresh-market",
  "butchery-cut",
  "minimart-hours",
  "brand-poster",
] as const;

export const STORE_THEME_META: readonly StorefrontTemplateMeta[] = [
  {
    id: "mart",
    kind: "store",
    name: "Mart aisles",
    blurb: "Grocery-style hero, aisle grid, and classic catalog sidebar.",
    previewFrom: "#F8FAF5",
    previewTo: "#DCFCE7",
    accent: "#16A34A",
  },
  {
    id: "butcher-board",
    kind: "store",
    name: "Butcher board",
    blurb: "Painted hoarding — featured product at poster scale, gold vignette cards.",
    previewFrom: "#0C0708",
    previewTo: "#E31C23",
    accent: "#F5C518",
  },
  {
    id: "boutique-shelf",
    kind: "store",
    name: "Boutique shelf",
    blurb: "Velvet alcove — lit gift boxes, brass plaques, tissue-wrapped picks.",
    previewFrom: "#1F1020",
    previewTo: "#DB2777",
    accent: "#C9A227",
  },
  {
    id: "spirits-cellar",
    kind: "store",
    name: "Spirits cellar",
    blurb: "Dark editorial home with featured bottles and cellar chrome.",
    previewFrom: "#0F172A",
    previewTo: "#312E81",
    accent: "#C4B5FD",
  },
  {
    id: "oxide",
    kind: "store",
    name: "Oxide archive",
    blurb: "Industrial bone-and-ink layout — sharp edges, spec sheets, archive grid.",
    previewFrom: "#EDEAE2",
    previewTo: "#C9C5BC",
    accent: "#FF3D1F",
  },
  {
    id: "tint-lab",
    kind: "store",
    name: "Tint Lab",
    blurb: "Soft paper cosmetics lab — swatches, shade story, and pill CTAs.",
    previewFrom: "#F6F1EA",
    previewTo: "#F2C9BF",
    accent: "#E2432C",
  },
  {
    id: "milk-run",
    kind: "store",
    name: "Milk Run",
    blurb: "Cream paper, ink borders, flap product cards — neighborhood shop energy.",
    previewFrom: "#FFFCF5",
    previewTo: "#FFC53D",
    accent: "#E8412C",
  },
  {
    id: "carbon-desk",
    kind: "store",
    name: "Carbon desk",
    blurb: "Triplicate counter forms — carbon shadows, stamp-red pricing, manila tabs.",
    previewFrom: "#F5F0E4",
    previewTo: "#C9B896",
    accent: "#3D6B9E",
  },
];

export const LANDING_TEMPLATE_META: readonly StorefrontTemplateMeta[] = [
  {
    id: "coming-soon-editorial",
    kind: "landing",
    name: "Coming soon editorial",
    blurb: "Launch teaser with promises, category teasers, and owner setup.",
    previewFrom: "#FBF9F5",
    previewTo: "#E7E5E4",
    accent: "#0F766E",
  },
  {
    id: "neighborhood-board",
    kind: "landing",
    name: "Neighborhood board",
    blurb: "Hours, location, and WhatsApp — the shop next door.",
    previewFrom: "#FFFBEB",
    previewTo: "#FEF3C7",
    accent: "#B45309",
  },
  {
    id: "fresh-market",
    kind: "landing",
    name: "Fresh market",
    blurb: "Produce-led photo hero with weekly highlight strips.",
    previewFrom: "#ECFDF5",
    previewTo: "#BBF7D0",
    accent: "#15803D",
  },
  {
    id: "butchery-cut",
    kind: "landing",
    name: "Butchery cut",
    blurb: "Cuts list and order-by-phone CTA for meat shops.",
    previewFrom: "#1C1917",
    previewTo: "#44403C",
    accent: "#EA580C",
  },
  {
    id: "minimart-hours",
    kind: "landing",
    name: "Minimart hours",
    blurb: "Simple open hours, map pin, and contact strip.",
    previewFrom: "#F0F9FF",
    previewTo: "#DBEAFE",
    accent: "#0369A1",
  },
  {
    id: "brand-poster",
    kind: "landing",
    name: "Brand poster",
    blurb: "Logo-forward single screen with minimal copy.",
    previewFrom: "#FAFAF9",
    previewTo: "#E7E5E4",
    accent: "#171717",
  },
];

export function isStoreThemeId(value: string | null | undefined): value is StoreThemeId {
  return Boolean(value && (STORE_THEME_IDS as readonly string[]).includes(value));
}

export function isLandingTemplateId(
  value: string | null | undefined,
): value is LandingTemplateId {
  return Boolean(
    value && (LANDING_TEMPLATE_IDS as readonly string[]).includes(value),
  );
}

export function normalizeStoreThemeId(
  value: string | null | undefined,
): StoreThemeId {
  return isStoreThemeId(value) ? value : DEFAULT_STORE_THEME_ID;
}

export function normalizeLandingTemplateId(
  value: string | null | undefined,
): LandingTemplateId {
  return isLandingTemplateId(value) ? value : DEFAULT_LANDING_TEMPLATE_ID;
}

export function storeThemeMeta(id: string | null | undefined): StorefrontTemplateMeta {
  const normalized = normalizeStoreThemeId(id);
  return (
    STORE_THEME_META.find((m) => m.id === normalized) ?? STORE_THEME_META[0]!
  );
}

export function landingTemplateMeta(
  id: string | null | undefined,
): StorefrontTemplateMeta {
  const normalized = normalizeLandingTemplateId(id);
  return (
    LANDING_TEMPLATE_META.find((m) => m.id === normalized) ??
    LANDING_TEMPLATE_META[0]!
  );
}
