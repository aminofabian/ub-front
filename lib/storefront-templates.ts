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
  | "blank-drop"
  | "pastry-case";

export type LandingTemplateId =
  | "coming-soon-editorial"
  | "coming-soon-shop"
  | "neighborhood-board"
  | "fresh-market"
  | "butchery-cut"
  | "minimart-hours"
  | "brand-poster"
  | "front-window";

export type TemplateKind = "store" | "landing";

/** Corner personality for the phone-frame "try it on" mock. */
export type ThemePhoneRadius = "sharp" | "soft" | "round";
/** Type voice for the phone-frame "try it on" mock. */
export type ThemePhoneFont = "sans" | "display" | "serif" | "mono";

/**
 * Signature composition for the try-on miniature. Two themes that a customer
 * would never confuse must not share a layout — colour alone is not enough.
 */
export type ThemePhoneLayout =
  | "aisles"
  | "hero-cut"
  | "shelf-row"
  | "cellar"
  | "editorial"
  | "scent"
  | "warehouse"
  | "pots"
  | "rail"
  | "slips"
  | "console"
  | "poster"
  | "sparse"
  | "pastry"
  | "coming-soon"
  | "noticeboard"
  | "market-stall"
  | "cuts-list"
  | "hours-map"
  | "logo-poster"
  | "shop-window"
  | "locked-shelf";

/**
 * Per-theme "try it on" skin: what a miniature of the theme looks like when
 * dressed with the merchant's own name, logo and brand colour.
 */
export type ThemePhoneSkin = {
  /** Discriminating body composition (not just a recolored supermarket). */
  layout: ThemePhoneLayout;
  /** Page / screen background. */
  surface: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  muted: string;
  /** Product card background. */
  card: string;
  /** CTA / highlight colour. */
  accent: string;
  /** Text that reads well on `accent`. */
  onAccent: string;
  radius: ThemePhoneRadius;
  font: ThemePhoneFont;
  /** Ink-bordered "hand-drawn" feel (milk run, carbon desk, butcher board…). */
  border?: boolean;
  /** Dark surface (affects overlays and tint mixes). */
  dark?: boolean;
};

export type StorefrontTemplateMeta = {
  id: string;
  kind: TemplateKind;
  name: string;
  blurb: string;
  /** Tailwind-ish preview swatch colors for gallery cards */
  previewFrom: string;
  previewTo: string;
  accent: string;
  /** Gallery filter chips this theme answers to (store themes). */
  vibes: string[];
  /** Keywords (shop name / profile) that make this a "best for you" pick. */
  matches: string[];
  /** Short editorial bullets for the try-on panel. */
  points: string[];
  /** Miniature skin for the phone-frame preview. */
  phone: ThemePhoneSkin;
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
  "pastry-case",
] as const;

export const LANDING_TEMPLATE_IDS: readonly LandingTemplateId[] = [
  "coming-soon-editorial",
  "coming-soon-shop",
  "neighborhood-board",
  "fresh-market",
  "butchery-cut",
  "minimart-hours",
  "brand-poster",
  "front-window",
] as const;

/** Gallery filter chips, in the order they appear. */
export const STORE_THEME_VIBES = [
  "Groceries",
  "Butcher",
  "Beauty",
  "Boutique & gifts",
  "Spirits",
  "Pharmacy",
  "Industrial & office",
  "Bakery",
  "Minimal",
] as const;

export type StoreThemeVibe = (typeof STORE_THEME_VIBES)[number];

export const STORE_THEME_META: readonly StorefrontTemplateMeta[] = [
  {
    id: "mart",
    kind: "store",
    name: "Mart aisles",
    blurb: "Like a supermarket site — a big photo on top, then products in rows.",
    previewFrom: "#F8FAF5",
    previewTo: "#DCFCE7",
    accent: "#16A34A",
    vibes: ["Groceries", "Minimal"],
    matches: [
      "mart",
      "market",
      "supermarket",
      "grocery",
      "grocer",
      "kiosk",
      "shop",
      "store",
      "retail",
      "general",
      "provision",
      "duka",
      "wholesale",
    ],
    points: [
      "A bright, familiar supermarket layout — big photo hero, products in tidy rows.",
      "Your brand colour becomes the buttons and highlights.",
      "The safest pick when most of your catalogue is everyday goods.",
    ],
    phone: {
      layout: "aisles",
      surface: "#F8FAF5",
      ink: "#1C2A1E",
      muted: "#5C6B5F",
      card: "#FFFFFF",
      accent: "#16A34A",
      onAccent: "#FFFFFF",
      radius: "soft",
      font: "sans",
    },
  },
  {
    id: "butcher-board",
    kind: "store",
    name: "Butcher board",
    blurb: "A painted butcher stall — one big product, bold red and gold.",
    previewFrom: "#0C0708",
    previewTo: "#E31C23",
    accent: "#F5C518",
    vibes: ["Butcher"],
    matches: [
      "butcher",
      "butchery",
      "meat",
      "nyama",
      "slaughter",
      "choma",
      "poultry",
      "kebab",
      "goat",
      "beef",
    ],
    points: [
      "A bold painted stall — chalk frame, one hero cut, red and gold.",
      "Rough edges and a blackboard feel; the product is the poster.",
      "Built for a shop that sells by weight and by cut.",
    ],
    phone: {
      layout: "hero-cut",
      surface: "#15090A",
      ink: "#F5C518",
      muted: "#C99A3A",
      card: "#2A1213",
      accent: "#E31C23",
      onAccent: "#FFF6E0",
      radius: "sharp",
      font: "display",
      border: true,
      dark: true,
    },
  },
  {
    id: "boutique-shelf",
    kind: "store",
    name: "Boutique shelf",
    blurb: "A gift shop on the web — dark, elegant, products in lit boxes.",
    previewFrom: "#1F1020",
    previewTo: "#DB2777",
    accent: "#C9A227",
    vibes: ["Boutique & gifts"],
    matches: [
      "boutique",
      "fashion",
      "clothes",
      "cloth",
      "jewelry",
      "jewellery",
      "handbag",
      "shoe",
      "apparel",
      "wear",
      "attire",
    ],
    points: [
      "Dark, elegant shelves with products in softly lit boxes.",
      "Gold accents against deep plum — curated, not crowded.",
      "Lovely for fashion, gifts and limited-range catalogues.",
    ],
    phone: {
      layout: "shelf-row",
      surface: "#1F1020",
      ink: "#F7E9F6",
      muted: "#B79BB5",
      card: "#2E1531",
      accent: "#C9A227",
      onAccent: "#1F1020",
      radius: "soft",
      font: "serif",
      dark: true,
    },
  },
  {
    id: "spirits-cellar",
    kind: "store",
    name: "Spirits cellar",
    blurb: "A dim cellar — bottles in niches, warm light, a quiet luxury feel.",
    previewFrom: "#14100E",
    previewTo: "#C4B5FD",
    accent: "#E8A849",
    vibes: ["Spirits"],
    matches: [
      "wine",
      "liquor",
      "spirits",
      "bar",
      "pub",
      "brew",
      "beer",
      "whisky",
      "whiskey",
      "cellar",
      "vintage",
    ],
    points: [
      "A dim cellar with bottles in warm-lit niches — quiet, premium.",
      "Warm light and unhurried spacing for higher price points.",
      "Feels like a tasting room, not a shelf.",
    ],
    phone: {
      layout: "cellar",
      surface: "#14100E",
      ink: "#EFD9B8",
      muted: "#A99684",
      card: "#201A16",
      accent: "#E8A849",
      onAccent: "#14100E",
      radius: "sharp",
      font: "serif",
      dark: true,
    },
  },
  {
    id: "beauty-edit",
    kind: "store",
    name: "Beyond",
    blurb: "A fashion magazine — masthead brand, black/white/gold edit, feature hero.",
    previewFrom: "#0E0E0E",
    previewTo: "#FAFBFB",
    accent: "#B5853A",
    vibes: ["Beauty"],
    matches: [
      "beauty",
      "salon",
      "cosmetic",
      "spa",
      "skin",
      "hair",
      "nails",
      "aesthetic",
      "studio",
      "lash",
    ],
    points: [
      "A fashion-magazine masthead — black, white and gold.",
      "One feature hero, then a tight, deliberate grid.",
      "Feels like a brand, not a shelf of products.",
    ],
    phone: {
      layout: "editorial",
      surface: "#FFFFFF",
      ink: "#111111",
      muted: "#6B6B6B",
      card: "#FAFAFB",
      accent: "#B5853A",
      onAccent: "#111111",
      radius: "sharp",
      font: "serif",
    },
  },
  {
    id: "scent-story",
    kind: "store",
    name: "Scent story",
    blurb: "A luxury fragrance house — cream silk, gold bar, full-bleed scent hero.",
    previewFrom: "#FCF8F0",
    previewTo: "#C5A04E",
    accent: "#C5A04E",
    vibes: ["Beauty"],
    matches: [
      "perfume",
      "fragrance",
      "scent",
      "cologne",
      "cosmetic",
      "luxury",
      "essential oil",
      "aroma",
      "oils",
    ],
    points: [
      "Cream silk, a gold bar, and a full-bleed scent hero.",
      "Slow, luxurious and editorial — designed to feel expensive.",
      "A natural fit for fragrance and premium gift lines.",
    ],
    phone: {
      layout: "scent",
      surface: "#FCF8F0",
      ink: "#3B2E1E",
      muted: "#8A7A62",
      card: "#FFFFFF",
      accent: "#C5A04E",
      onAccent: "#3B2E1E",
      radius: "round",
      font: "serif",
    },
  },
  {
    id: "oxide",
    kind: "store",
    name: "Oxide archive",
    blurb: "A warehouse catalogue — sharp boxes, lists, industrial paper.",
    previewFrom: "#EDEAE2",
    previewTo: "#C9C5BC",
    accent: "#FF3D1F",
    vibes: ["Industrial & office"],
    matches: [
      "hardware",
      "industrial",
      "warehouse",
      "tools",
      "electrical",
      "plumbing",
      "machinery",
      "spares",
      "iron",
      "steel",
    ],
    points: [
      "A warehouse catalogue — sharp boxes, lists, engineering paper.",
      "Mono product codes and one loud signal-red accent.",
      "Made for parts, spares and technical stock.",
    ],
    phone: {
      layout: "warehouse",
      surface: "#EDEAE2",
      ink: "#1A1A1A",
      muted: "#6E6A60",
      card: "#F7F6F1",
      accent: "#FF3D1F",
      onAccent: "#FFFFFF",
      radius: "sharp",
      font: "mono",
      border: true,
    },
  },
  {
    id: "tint-lab",
    kind: "store",
    name: "Tint Lab",
    blurb: "A beauty counter — soft paper, colour pots, round buttons.",
    previewFrom: "#F6F1EA",
    previewTo: "#F2C9BF",
    accent: "#E2432C",
    vibes: ["Beauty", "Minimal"],
    matches: [
      "beauty",
      "cosmetic",
      "makeup",
      "make-up",
      "skincare",
      "lipstick",
      "nail",
      "cream",
    ],
    points: [
      "A soft beauty counter — kraft paper, colour pots, round buttons.",
      "Friendly and tactile; products feel touchable.",
      "Great for cosmetics and personal care.",
    ],
    phone: {
      layout: "pots",
      surface: "#F6F1EA",
      ink: "#4A3B36",
      muted: "#8C7A72",
      card: "#FFFFFF",
      accent: "#E2432C",
      onAccent: "#FFFFFF",
      radius: "round",
      font: "sans",
    },
  },
  {
    id: "milk-run",
    kind: "store",
    name: "Milk Run",
    blurb: "The shop next door — cream paper, thick ink lines, friendly cards.",
    previewFrom: "#FFFCF5",
    previewTo: "#FFC53D",
    accent: "#E8412C",
    vibes: ["Groceries"],
    matches: [
      "milk",
      "dairy",
      "shop",
      "store",
      "kiosk",
      "duka",
      "corner",
      "essentials",
      "general",
      "neighborhood",
      "neighbourhood",
    ],
    points: [
      "The shop next door — cream paper, thick ink lines, friendly cards.",
      "A zigzag flap and a hand-made feel; customers say it feels personal.",
      "Ideal for essentials, dairy and everyday groceries.",
    ],
    phone: {
      layout: "rail",
      surface: "#FFFCF5",
      ink: "#2B1810",
      muted: "#8A6A4F",
      card: "#FFFFFF",
      accent: "#E8412C",
      onAccent: "#FFFCF5",
      radius: "round",
      font: "display",
      border: true,
    },
  },
  {
    id: "carbon-desk",
    kind: "store",
    name: "Carbon desk",
    blurb: "Old counter books — duplicate slips, red stamps, cream paper.",
    previewFrom: "#F5F0E4",
    previewTo: "#C9B896",
    accent: "#3D6B9E",
    vibes: ["Industrial & office"],
    matches: [
      "bookshop",
      "book",
      "office",
      "stationery",
      "print",
      "admin",
      "accounts",
      "paper",
      "library",
      "copies",
    ],
    points: [
      "Old counter books — duplicate slips, red stamps, cream paper.",
      "Carbon-copy nostalgia with blue ink accents.",
      "A measured, trustworthy pace for small offices.",
    ],
    phone: {
      layout: "slips",
      surface: "#F5F0E4",
      ink: "#26221C",
      muted: "#857B68",
      card: "#FCFAF3",
      accent: "#3D6B9E",
      onAccent: "#FFFFFF",
      radius: "sharp",
      font: "mono",
      border: true,
    },
  },
  {
    id: "chem-lab",
    kind: "store",
    name: "Chem lab",
    blurb: "A compounding console look — steel bezels, amber glass, lime accents. Use Shop wording (Cart, Add) or switch to Lab lingo.",
    previewFrom: "#0b1116",
    previewTo: "#84CC16",
    accent: "#F59E0B",
    vibes: ["Pharmacy"],
    matches: [
      "pharmacy",
      "chemist",
      "dawa",
      "drug",
      "medical",
      "lab",
      "clinic",
      "health",
      "dispensary",
      "diagnostic",
      "toner",
    ],
    points: [
      "A compounding console — steel bezels, amber glass, lime accents.",
      "Switch between everyday Shop wording and full Lab lingo.",
      "Built for pharmacies, clinics and precision stock.",
    ],
    phone: {
      layout: "console",
      surface: "#0B1116",
      ink: "#E2E8F0",
      muted: "#8FA3B3",
      card: "#131C24",
      accent: "#84CC16",
      onAccent: "#0B1116",
      radius: "sharp",
      font: "mono",
      border: true,
      dark: true,
    },
  },
  {
    id: "print-atelier",
    kind: "store",
    name: "Print atelier",
    blurb: "A clean gift gallery — sage accents, serif titles, rounded product tiles, and a filament fly-to-cart.",
    previewFrom: "#FFFFFF",
    previewTo: "#C5D0B4",
    accent: "#9AAF7C",
    vibes: ["Boutique & gifts", "Minimal"],
    matches: [
      "gift",
      "print",
      "craft",
      "art",
      "cards",
      "poster",
      "creative",
      "design",
      "curio",
      "handmade",
    ],
    points: [
      "A clean gift gallery — sage accents and serif titles.",
      "Rounded tiles and a filament fly-to-cart.",
      "Lovely for prints, gifts and small-batch goods.",
    ],
    phone: {
      layout: "poster",
      surface: "#FFFFFF",
      ink: "#24302A",
      muted: "#74806F",
      card: "#F7FAF4",
      accent: "#9AAF7C",
      onAccent: "#24302A",
      radius: "round",
      font: "serif",
    },
  },
  {
    id: "blank-drop",
    kind: "store",
    name: "Blank drop",
    blurb: "A stark white catalogue — mono product codes, sparse grid, utilitarian bag and checkout.",
    previewFrom: "#FFFFFF",
    previewTo: "#F0F0F0",
    accent: "#000000",
    vibes: ["Minimal"],
    matches: [
      "electronics",
      "gadget",
      "phone",
      "appliance",
      "computer",
      "accessories",
      "tech",
      "camera",
      "audio",
    ],
    points: [
      "A stark white catalogue — mono product codes, sparse grid.",
      "Everything recedes so the product leads.",
      "For electronics and anything best seen plainly.",
    ],
    phone: {
      layout: "sparse",
      surface: "#FFFFFF",
      ink: "#000000",
      muted: "#8A8A8A",
      card: "#F4F4F4",
      accent: "#000000",
      onAccent: "#FFFFFF",
      radius: "sharp",
      font: "mono",
    },
  },
  {
    id: "pastry-case",
    kind: "store",
    name: "Pastry case",
    blurb:
      "A cake-shop window — frosting bar, photo hero, collections, then cakes in a grid.",
    previewFrom: "#FFFBFC",
    previewTo: "#E56BA4",
    accent: "#E56BA4",
    vibes: ["Bakery"],
    matches: [
      "bakery",
      "baker",
      "pastry",
      "cakes",
      "cupcake",
      "birthday",
      "icing",
      "frosting",
      "dessert",
      "confection",
      "patisserie",
      "bento",
      "wedding cake",
      "cake shop",
    ],
    points: [
      "A cake-shop window — frosting bar, a photo hero, then collections.",
      "Your brand colour becomes the icing on the bar and buttons.",
      "Built for bakeries, birthday cakes, and same-day orders.",
    ],
    phone: {
      layout: "pastry",
      surface: "#FFFBFC",
      ink: "#2B1520",
      muted: "#6B4A58",
      card: "#FFFFFF",
      accent: "#E56BA4",
      onAccent: "#FFFFFF",
      radius: "round",
      font: "sans",
    },
  },
];

export const LANDING_TEMPLATE_META: readonly StorefrontTemplateMeta[] = [
  {
    id: "coming-soon-editorial",
    kind: "landing",
    name: "Coming soon editorial",
    blurb: "A teaser on the door, dressed with your products and your place.",
    previewFrom: "#FBF9F5",
    previewTo: "#E7E5E4",
    accent: "#0F766E",
    vibes: [],
    matches: ["coming", "soon", "opening", "teaser", "launch", "preview"],
    points: [
      "A teaser on the door, dressed with your products and your place.",
      "Lets you collect attention before the shop opens.",
    ],
    phone: {
      layout: "coming-soon",
      surface: "#FBF9F5",
      ink: "#1C1917",
      muted: "#857F76",
      card: "#FFFFFF",
      accent: "#0F766E",
      onAccent: "#FFFFFF",
      radius: "soft",
      font: "serif",
    },
  },
  {
    id: "coming-soon-shop",
    kind: "landing",
    name: "Coming soon shop",
    blurb: "A closed online shop you can still browse. Prices are up. The bag is locked.",
    previewFrom: "#F3F3F0",
    previewTo: "#171717",
    accent: "#0F766E",
    vibes: [],
    matches: [
      "ecommerce",
      "e-commerce",
      "online shop",
      "online store",
      "webshop",
      "web shop",
      "catalog",
      "checkout",
      "order online",
    ],
    points: [
      "A closed online shop you can still browse. Prices are up. The bag is locked.",
      "Shoppers pick a product to watch, then leave an email for opening day.",
    ],
    phone: {
      layout: "locked-shelf",
      surface: "#F3F3F0",
      ink: "#141414",
      muted: "#6B6B64",
      card: "#FFFFFF",
      accent: "#0F766E",
      onAccent: "#FFFFFF",
      radius: "sharp",
      font: "sans",
    },
  },
  {
    id: "neighborhood-board",
    kind: "landing",
    name: "Neighborhood board",
    blurb: "A noticeboard — hours, where you are, and WhatsApp.",
    previewFrom: "#FFFBEB",
    previewTo: "#FEF3C7",
    accent: "#B45309",
    vibes: [],
    matches: [
      "neighborhood",
      "neighbourhood",
      "notice",
      "hours",
      "community",
      "board",
    ],
    points: [
      "A noticeboard pinned to the door — hours, location and WhatsApp.",
      "Practical and instantly familiar.",
    ],
    phone: {
      layout: "noticeboard",
      surface: "#FFFBEB",
      ink: "#78350F",
      muted: "#A16207",
      card: "#FFFFFF",
      accent: "#B45309",
      onAccent: "#FFFFFF",
      radius: "soft",
      font: "sans",
      border: true,
    },
  },
  {
    id: "fresh-market",
    kind: "landing",
    name: "Fresh market",
    blurb: "A market stall photo with this week's highlights underneath.",
    previewFrom: "#ECFDF5",
    previewTo: "#BBF7D0",
    accent: "#15803D",
    vibes: [],
    matches: ["fresh", "market", "produce", "grocery", "fruit", "green"],
    points: [
      "A market-stall photo with this week's highlights underneath.",
      "Warm, green and full of life.",
    ],
    phone: {
      layout: "market-stall",
      surface: "#ECFDF5",
      ink: "#14532D",
      muted: "#4A8563",
      card: "#FFFFFF",
      accent: "#15803D",
      onAccent: "#FFFFFF",
      radius: "soft",
      font: "sans",
    },
  },
  {
    id: "butchery-cut",
    kind: "landing",
    name: "Butchery cut",
    blurb: "A list of cuts and a call to order by phone.",
    previewFrom: "#1C1917",
    previewTo: "#44403C",
    accent: "#EA580C",
    vibes: [],
    matches: ["butcher", "butchery", "meat", "nyama", "cut", "choma"],
    points: [
      "A dark list of cuts and a call to order by phone.",
      "Serious, appetizing and direct.",
    ],
    phone: {
      layout: "cuts-list",
      surface: "#1C1917",
      ink: "#F5F0EB",
      muted: "#A8A29E",
      card: "#292524",
      accent: "#EA580C",
      onAccent: "#FFFFFF",
      radius: "sharp",
      font: "display",
      dark: true,
    },
  },
  {
    id: "minimart-hours",
    kind: "landing",
    name: "Minimart hours",
    blurb: "A simple page: when you're open, the map, and how to reach you.",
    previewFrom: "#F0F9FF",
    previewTo: "#DBEAFE",
    accent: "#0369A1",
    vibes: [],
    matches: ["mart", "hours", "kiosk", "duka", "convenience", "map"],
    points: [
      "When you're open, the map, and how to reach you.",
      "Calm, clear and trustworthy.",
    ],
    phone: {
      layout: "hours-map",
      surface: "#F0F9FF",
      ink: "#0C4A6E",
      muted: "#5C86A5",
      card: "#FFFFFF",
      accent: "#0369A1",
      onAccent: "#FFFFFF",
      radius: "soft",
      font: "sans",
    },
  },
  {
    id: "brand-poster",
    kind: "landing",
    name: "Brand poster",
    blurb: "Just your logo and a short line — like a poster on the door.",
    previewFrom: "#FAFAF9",
    previewTo: "#E7E5E4",
    accent: "#171717",
    vibes: [],
    matches: ["brand", "logo", "poster", "minimal", "simple"],
    points: [
      "Just your logo and a short line — like a poster on the door.",
      "The quietest, most confident option.",
    ],
    phone: {
      layout: "logo-poster",
      surface: "#FAFAF9",
      ink: "#171717",
      muted: "#78716C",
      card: "#FFFFFF",
      accent: "#171717",
      onAccent: "#FFFFFF",
      radius: "sharp",
      font: "serif",
    },
  },
  {
    id: "front-window",
    kind: "landing",
    name: "Front window",
    blurb: "A lit shop window — your story, what you sell, and how to visit.",
    previewFrom: "#1A1428",
    previewTo: "#FAF7F2",
    accent: "#0F766E",
    vibes: [],
    matches: ["window", "boutique", "story", "visit", "shop front"],
    points: [
      "A lit shop window — your story, what you sell, how to visit.",
      "A little dramatic, a little personal.",
    ],
    phone: {
      layout: "shop-window",
      surface: "#1A1428",
      ink: "#FAF7F2",
      muted: "#A99FC4",
      card: "#241B36",
      accent: "#0F766E",
      onAccent: "#FFFFFF",
      radius: "soft",
      font: "serif",
      dark: true,
    },
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

export type ThemeRecommendationInput = {
  name?: string | null;
  profile?: {
    storeType?: string | null;
    storeTypes?: string[] | null;
  } | null;
  /** Category and product names from the live catalogue. */
  catalog?: readonly string[] | null;
};

function recommendationHaystack(
  input?: ThemeRecommendationInput | null,
): string {
  return [
    input?.name ?? "",
    input?.profile?.storeType ?? "",
    ...(input?.profile?.storeTypes ?? []),
    ...(input?.catalog ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function scoreMatches(haystack: string, matches: readonly string[]): number {
  return matches.reduce(
    (acc, keyword) =>
      acc + (haystack.includes(keyword) ? (keyword.length >= 6 ? 2 : 1) : 0),
    0,
  );
}

function rankTemplates(
  items: readonly StorefrontTemplateMeta[],
  haystack: string,
): StorefrontTemplateMeta[] {
  return [...items].sort((a, b) => {
    const delta = scoreMatches(haystack, b.matches) - scoreMatches(haystack, a.matches);
    if (delta !== 0) return delta;
    return items.indexOf(a) - items.indexOf(b);
  });
}

/**
 * Pick the store theme most likely to suit a business, by matching its name,
 * profile store-type labels, and catalogue category/product names against each
 * theme's keywords. Longer keywords weigh more (a shop called "Kamau Butchery"
 * shouldn't be pulled to "mart" by a generic word). Falls back to the default
 * theme when nothing matches.
 */
export function recommendStoreThemeId(
  input?: ThemeRecommendationInput | null,
): StoreThemeId {
  return rankTemplates(STORE_THEME_META, recommendationHaystack(input))[0]
    ?.id as StoreThemeId ?? DEFAULT_STORE_THEME_ID;
}

export function recommendLandingTemplateId(
  input?: ThemeRecommendationInput | null,
): LandingTemplateId {
  return rankTemplates(LANDING_TEMPLATE_META, recommendationHaystack(input))[0]
    ?.id as LandingTemplateId ?? DEFAULT_LANDING_TEMPLATE_ID;
}

/**
 * Three looks for first-run: the best match, a different vibe, then a
 * contrasting light aisle (usually Mart) so the merchant can tell them apart.
 */
export function shortlistStoreThemeIds(
  input?: ThemeRecommendationInput | null,
  count = 3,
): StoreThemeId[] {
  return shortlistFrom(
    STORE_THEME_META,
    recommendationHaystack(input),
    DEFAULT_STORE_THEME_ID,
    count,
  ) as StoreThemeId[];
}

export function shortlistLandingTemplateIds(
  input?: ThemeRecommendationInput | null,
  count = 3,
): LandingTemplateId[] {
  return shortlistFrom(
    LANDING_TEMPLATE_META,
    recommendationHaystack(input),
    DEFAULT_LANDING_TEMPLATE_ID,
    count,
  ) as LandingTemplateId[];
}

function shortlistFrom(
  items: readonly StorefrontTemplateMeta[],
  haystack: string,
  contrastId: string,
  count: number,
): string[] {
  const ranked = rankTemplates(items, haystack);
  const picked: StorefrontTemplateMeta[] = [];
  const first = ranked[0];
  if (first) picked.push(first);

  const second = ranked.find(
    (meta) =>
      !picked.some((p) => p.id === meta.id) &&
      (meta.vibes[0] ?? "") !== (first?.vibes[0] ?? ""),
  ) ?? ranked.find((meta) => !picked.some((p) => p.id === meta.id));
  if (second) picked.push(second);

  const contrast =
    items.find(
      (meta) => meta.id === contrastId && !picked.some((p) => p.id === meta.id),
    ) ??
    ranked.find(
      (meta) => !meta.phone.dark && !picked.some((p) => p.id === meta.id),
    ) ??
    ranked.find((meta) => !picked.some((p) => p.id === meta.id));
  if (contrast) picked.push(contrast);

  while (picked.length < count) {
    const next = ranked.find((meta) => !picked.some((p) => p.id === meta.id));
    if (!next) break;
    picked.push(next);
  }

  return picked.slice(0, count).map((meta) => meta.id);
}

/** The unique vibes a set of themes covers, in gallery order. */
export function storeThemeVibes(items: readonly StorefrontTemplateMeta[]): string[] {
  return STORE_THEME_VIBES.filter((vibe) =>
    items.some((item) => item.vibes.includes(vibe)),
  );
}
