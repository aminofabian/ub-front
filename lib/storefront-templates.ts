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
  | "beauty-edit"
  | "scent-story"
  | "oxide"
  | "tint-lab"
  | "milk-run"
  | "carbon-desk"
  | "chem-lab"
  | "print-atelier"
  | "blank-drop";

export type LandingTemplateId =
  | "coming-soon-editorial"
  | "neighborhood-board"
  | "fresh-market"
  | "butchery-cut"
  | "minimart-hours"
  | "brand-poster"
  | "front-window";

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
  "beauty-edit",
  "scent-story",
  "oxide",
  "tint-lab",
  "milk-run",
  "carbon-desk",
  "chem-lab",
  "print-atelier",
  "blank-drop",
] as const;

export const LANDING_TEMPLATE_IDS: readonly LandingTemplateId[] = [
  "coming-soon-editorial",
  "neighborhood-board",
  "fresh-market",
  "butchery-cut",
  "minimart-hours",
  "brand-poster",
  "front-window",
] as const;

export const STORE_THEME_META: readonly StorefrontTemplateMeta[] = [
  {
    id: "mart",
    kind: "store",
    name: "Mart aisles",
    blurb: "Like a supermarket site — a big photo on top, then products in rows.",
    previewFrom: "#F8FAF5",
    previewTo: "#DCFCE7",
    accent: "#16A34A",
  },
  {
    id: "butcher-board",
    kind: "store",
    name: "Butcher board",
    blurb: "A painted butcher stall — one big product, bold red and gold.",
    previewFrom: "#0C0708",
    previewTo: "#E31C23",
    accent: "#F5C518",
  },
  {
    id: "boutique-shelf",
    kind: "store",
    name: "Boutique shelf",
    blurb: "A gift shop on the web — dark, elegant, products in lit boxes.",
    previewFrom: "#1F1020",
    previewTo: "#DB2777",
    accent: "#C9A227",
  },
  {
    id: "spirits-cellar",
    kind: "store",
    name: "Spirits cellar",
    blurb: "A dim cellar — bottles in niches, warm light, a quiet luxury feel.",
    previewFrom: "#14100E",
    previewTo: "#C4B5FD",
    accent: "#E8A849",
  },
  {
    id: "beauty-edit",
    kind: "store",
    name: "Beyond",
    blurb: "A fashion magazine — masthead brand, black/white/gold edit, feature hero.",
    previewFrom: "#0E0E0E",
    previewTo: "#FAFBFB",
    accent: "#B5853A",
  },
  {
    id: "scent-story",
    kind: "store",
    name: "Scent story",
    blurb: "A luxury fragrance house — cream silk, gold bar, full-bleed scent hero.",
    previewFrom: "#FCF8F0",
    previewTo: "#C5A04E",
    accent: "#C5A04E",
  },
  {
    id: "oxide",
    kind: "store",
    name: "Oxide archive",
    blurb: "A warehouse catalogue — sharp boxes, lists, industrial paper.",
    previewFrom: "#EDEAE2",
    previewTo: "#C9C5BC",
    accent: "#FF3D1F",
  },
  {
    id: "tint-lab",
    kind: "store",
    name: "Tint Lab",
    blurb: "A beauty counter — soft paper, colour pots, round buttons.",
    previewFrom: "#F6F1EA",
    previewTo: "#F2C9BF",
    accent: "#E2432C",
  },
  {
    id: "milk-run",
    kind: "store",
    name: "Milk Run",
    blurb: "The shop next door — cream paper, thick ink lines, friendly cards.",
    previewFrom: "#FFFCF5",
    previewTo: "#FFC53D",
    accent: "#E8412C",
  },
  {
    id: "carbon-desk",
    kind: "store",
    name: "Carbon desk",
    blurb: "Old counter books — duplicate slips, red stamps, cream paper.",
    previewFrom: "#F5F0E4",
    previewTo: "#C9B896",
    accent: "#3D6B9E",
  },
  {
    id: "chem-lab",
    kind: "store",
    name: "Chem lab",
    blurb: "A compounding console look — steel bezels, amber glass, lime accents. Use Shop wording (Cart, Add) or switch to Lab lingo.",
    previewFrom: "#0b1116",
    previewTo: "#84CC16",
    accent: "#F59E0B",
  },
  {
    id: "print-atelier",
    kind: "store",
    name: "Print atelier",
    blurb: "A clean gift gallery — sage accents, serif titles, rounded product tiles, and a filament fly-to-cart.",
    previewFrom: "#FFFFFF",
    previewTo: "#C5D0B4",
    accent: "#9AAF7C",
  },
  {
    id: "blank-drop",
    kind: "store",
    name: "Blank drop",
    blurb: "A stark white catalogue — mono product codes, sparse grid, utilitarian bag and checkout.",
    previewFrom: "#FFFFFF",
    previewTo: "#F0F0F0",
    accent: "#000000",
  },
];

export const LANDING_TEMPLATE_META: readonly StorefrontTemplateMeta[] = [
  {
    id: "coming-soon-editorial",
    kind: "landing",
    name: "Coming soon editorial",
    blurb: "A teaser on the door — we're opening, a few promises, and a button.",
    previewFrom: "#FBF9F5",
    previewTo: "#E7E5E4",
    accent: "#0F766E",
  },
  {
    id: "neighborhood-board",
    kind: "landing",
    name: "Neighborhood board",
    blurb: "A noticeboard — hours, where you are, and WhatsApp.",
    previewFrom: "#FFFBEB",
    previewTo: "#FEF3C7",
    accent: "#B45309",
  },
  {
    id: "fresh-market",
    kind: "landing",
    name: "Fresh market",
    blurb: "A market stall photo with this week's highlights underneath.",
    previewFrom: "#ECFDF5",
    previewTo: "#BBF7D0",
    accent: "#15803D",
  },
  {
    id: "butchery-cut",
    kind: "landing",
    name: "Butchery cut",
    blurb: "A list of cuts and a call to order by phone.",
    previewFrom: "#1C1917",
    previewTo: "#44403C",
    accent: "#EA580C",
  },
  {
    id: "minimart-hours",
    kind: "landing",
    name: "Minimart hours",
    blurb: "A simple page: when you're open, the map, and how to reach you.",
    previewFrom: "#F0F9FF",
    previewTo: "#DBEAFE",
    accent: "#0369A1",
  },
  {
    id: "brand-poster",
    kind: "landing",
    name: "Brand poster",
    blurb: "Just your logo and a short line — like a poster on the door.",
    previewFrom: "#FAFAF9",
    previewTo: "#E7E5E4",
    accent: "#171717",
  },
  {
    id: "front-window",
    kind: "landing",
    name: "Front window",
    blurb: "A lit shop window — your story, what you sell, and how to visit.",
    previewFrom: "#1A1428",
    previewTo: "#FAF7F2",
    accent: "#0F766E",
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
