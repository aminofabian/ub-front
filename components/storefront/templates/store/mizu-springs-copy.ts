import type { LandingContent } from "@/lib/storefront-templates";
import type { ThemeOptionValue } from "@/lib/storefront-theme-options";

/**
 * Mizu Springs began as one bottled-water brand. A shop now picks a "voice"
 * (or lets the theme read its name and categories) and can then rewrite any
 * single line, in the design studio or by clicking the text on the page.
 *
 * Order of precedence for every line:
 *   the shop's own wording → its landing content → the chosen voice.
 */
export type MizuKind = "water" | "general" | "food" | "style";

const WATER_RE =
  /\b(water|spring|springs|mizu|bottled|bottle|bottles|hydration|purified|mineral|refill|refills|dispenser|aqua)\b/i;
const FOOD_RE =
  /\b(food|foods|fish|tilapia|meat|butcher|butchery|bakery|bread|cake|cakes|grocer|grocery|groceries|vegetable|vegetables|fruit|fruits|fresh|dairy|milk|cafe|kitchen|restaurant|snack|snacks|spice|spices|cereal|cereals)\b/i;
const STYLE_RE =
  /\b(fashion|clothing|clothes|wear|boutique|beauty|cosmetic|cosmetics|salon|hair|wig|wigs|skincare|perfume|perfumes|jewel|jewellery|jewelry|shoe|shoes|bag|bags|dress|dresses)\b/i;

export function detectMizuKind(
  shopName: string,
  categoryNames: readonly string[] = [],
): MizuKind {
  const haystack = [shopName, ...categoryNames.slice(0, 24)].join(" ");
  if (WATER_RE.test(haystack)) return "water";
  if (FOOD_RE.test(haystack)) return "food";
  if (STYLE_RE.test(haystack)) return "style";
  return "general";
}

/** Flat wording, keyed exactly like the theme's text options. */
export type MizuWording = Record<string, string>;

type Preset = {
  headline: string;
  subcopy: string;
  passTitleIn: string;
  passLeadIn: string;
  fallbackFeature1: string;
  fallbackFeature2: string;
  t: MizuWording;
};

const GENERAL: Preset = {
  headline: "Everything you need, one tap away.",
  subcopy: "Browse the range, fill your bag, and send your order in a few taps.",
  passTitleIn: "You are signed in",
  passLeadIn: "Review past orders and reorder in a couple of taps.",
  fallbackFeature1: "Popular right now",
  fallbackFeature2: "More to explore",
  t: {
    heroPrimary: "Shop now",
    heroSecondary: "Bulk orders",
    navCustom: "Bulk orders",
    aboutTitle: "About {shop}",
    aboutLead:
      "{shop} is open online. Browse what is in stock, order from your phone, and message the shop whenever you need a hand.",
    pillar1Title: "Browse the range",
    pillar1Copy:
      "See the full catalogue with photos and prices, with new stock showing as it arrives.",
    pillar2Title: "Order in a few taps",
    pillar2Copy: "Add items to your bag and check out without a phone call.",
    pillar3Title: "Ask the shop",
    pillar3Copy:
      "Message us about availability, substitutions, or anything you cannot find.",
    collectionTitle: "Shop the collection",
    collectionTagline: "Start with what shoppers pick first.",
    feature1Badge: "Popular",
    feature1Copy:
      "A quick way into the range. Open it to see every product in this group.",
    feature1Chips: "",
    feature2Badge: "Explore",
    feature2Copy: "More to explore. Open it to see every product in this group.",
    feature2Chips: "",
    catalogTitle: "Shop the range",
    customTitle: "Need more than usual?",
    customLead:
      "Planning an event, stocking an office, or buying for a big week? Tell us what you need and we will confirm availability and a price.",
    customCta: "Ask for a quote",
    customItem1: "Event orders",
    customItem2: "Office supply",
    customItem3: "Regular repeat orders",
    customItem4: "Special requests",
    turnaroundValue: "",
    turnaroundLabel: "",
    passTitle: "Create your account",
    passLead: "Keep your orders in one place and check out faster next time.",
    faqTitle: "Frequently asked questions",
    faqLead: "Quick answers about ordering.",
    faq1Q: "How do I order?",
    faq1A:
      "Add items to your bag and check out. You can also message the shop on WhatsApp.",
    faq2Q: "Do you deliver?",
    faq2A:
      "Delivery depends on where you are. Check the delivery areas at checkout, or message us to confirm.",
    faq3Q: "Can I order in bulk or for an event?",
    faq3A:
      "Yes. Message us with what you need and we will confirm availability and pricing.",
    faq4Q: "How do I track my order?",
    faq4A: "Create an account to see your orders and past purchases in one place.",
    faq5Q: "How do I reach the shop?",
    faq5A: "Use the contact details at the bottom of this page.",
    footerBlurb: "Browse the range and order online, any time.",
    footerSign: "Thank you for shopping with us.",
  },
};

const WATER: Preset = {
  headline: "Make every sip unforgettable.",
  subcopy:
    "Pure, premium water crafted for everyday moments and the occasions that matter most.",
  passTitleIn: "Your spring pass is active",
  passLeadIn: "Track refills, custom bottles, and delivery notes in one place.",
  fallbackFeature1: "Personal hydration",
  fallbackFeature2: "Refills & bulk supply",
  t: {
    ...GENERAL.t,
    heroPrimary: "Order delivery",
    heroSecondary: "Custom branding",
    navCustom: "Custom",
    aboutLead:
      "From our station to custom-branded bottled water for weddings, funerals, graduations, and corporate functions, {shop} is committed to purity, consistency, and professionalism.",
    pillar1Title: "Homes & offices",
    pillar1Copy:
      "Reliable deliveries of everyday refreshment, from small grab-and-go bottles to large family refills.",
    pillar2Title: "Custom events",
    pillar2Copy:
      "We design and print custom-branded packages tailored to your event size.",
    pillar3Title: "Strict purity",
    pillar3Copy:
      "Purified to strict standards so it is consistently clean, safe, and refreshing.",
    collectionTitle: "Our collection",
    collectionTagline: "Refined, versatile, always premium.",
    feature1Badge: "Grab & go",
    feature1Copy:
      "For everyday refreshment, the gym, or the office. Available in single units or cases.",
    feature1Chips: "300 ml, 500 ml, 1 L, 1.5 L",
    feature2Badge: "Home & office",
    feature2Copy:
      "Large formats for families, dispensers, and events that need high volume.",
    feature2Chips: "5 L, 10 L, 20 L, 2,500 L",
    customTitle: "Your brand, our pure water",
    customLead:
      "Elevate weddings, corporate meetings, or family gatherings with custom labels. We handle everything from design to door-step delivery.",
    customCta: "Get a custom quote",
    customItem1: "Weddings & anniversaries",
    customItem2: "Corporate functions",
    customItem3: "Funeral services",
    customItem4: "Graduation parties",
    turnaroundValue: "24–48h",
    turnaroundLabel: "Typical turnaround",
    passTitle: "Get your spring pass",
    passLead:
      "Save orders, speed up WhatsApp checkout, and never lose a refill schedule.",
    faqLead: "Everything you need to know about our water and delivery.",
    faq1Q: "Do you deliver?",
    faq1A:
      "Yes, we deliver bottled water and refills. Message us or check the delivery areas at checkout.",
    faq2Q: "Can I order custom-branded bottles in small quantities?",
    faq2A:
      "Yes. We create packages tailored to your event size, from family gatherings to corporate functions.",
    faq3Q: "What makes your water different?",
    faq3A:
      "It is purified to strict standards so it stays consistently clean, safe, and refreshing.",
    faq4Q: "How soon should I order custom branding?",
    faq4A:
      "Order at least 1–2 days ahead so we can design, print, and deliver your bottles in time.",
    faq5Q: "Do you handle large bulk orders?",
    faq5A: "Yes. We supply bulk water for homes, offices, and events.",
    footerBlurb:
      "Purified drinking water, delivered to your home, office, or special event.",
    footerSign: "Bottled with precision.",
  },
};

const FOOD: Preset = {
  headline: "Good food, ordered in minutes.",
  subcopy: "See what is in stock today, fill your bag, and send your order.",
  passTitleIn: "You are signed in",
  passLeadIn: "Reorder your usual basket in a couple of taps.",
  fallbackFeature1: "Today's picks",
  fallbackFeature2: "Stock up",
  t: {
    ...GENERAL.t,
    heroPrimary: "Order now",
    heroSecondary: "Large orders",
    navCustom: "Large orders",
    pillar1Title: "See what is in stock",
    pillar1Copy: "The catalogue follows the shop's shelves, with photos and prices.",
    pillar2Title: "Order for today or later",
    pillar2Copy: "Fill your bag now and tell us when you need it.",
    pillar3Title: "Ask before you buy",
    pillar3Copy: "Message us about sizes, cuts, substitutions, or what is coming in.",
    collectionTitle: "On the shelves",
    collectionTagline: "Start with what shoppers pick first.",
    feature1Badge: "Today",
    feature2Badge: "Stock up",
    customTitle: "Feeding a crowd?",
    customLead:
      "Events, restaurants, and big family weekends. Tell us what you need and when, and we will confirm availability and a price.",
    customItem1: "Events & parties",
    customItem2: "Restaurants & cafes",
    customItem3: "Weekly standing orders",
    customItem4: "Special cuts & sizes",
    passLead: "Save your usual order and check out faster next time.",
    footerBlurb: "Order from the shop online, any time.",
  },
};

const STYLE: Preset = {
  headline: "Find your next favourite.",
  subcopy: "New pieces, shop favourites, and easy ordering from your phone.",
  passTitleIn: "You are signed in",
  passLeadIn: "See your orders and pick up where you left off.",
  fallbackFeature1: "New in",
  fallbackFeature2: "Shop favourites",
  t: {
    ...GENERAL.t,
    heroPrimary: "Shop the edit",
    heroSecondary: "Special requests",
    navCustom: "Requests",
    pillar1Title: "See the full range",
    pillar1Copy: "Every piece with photos and prices, updated as stock arrives.",
    pillar2Title: "Order from your phone",
    pillar2Copy: "Add what you like to your bag and check out in a few taps.",
    pillar3Title: "Ask for advice",
    pillar3Copy: "Message us about sizes, shades, or what would suit the occasion.",
    collectionTitle: "The edit",
    collectionTagline: "Start with what shoppers pick first.",
    feature1Badge: "New in",
    feature2Badge: "Favourites",
    customTitle: "Looking for something specific?",
    customLead:
      "A size, a shade, a gift, or an order for a group. Tell us what you have in mind and we will confirm what we can do.",
    customCta: "Send a request",
    customItem1: "Gifts & sets",
    customItem2: "Group & event orders",
    customItem3: "Sizes & shades on request",
    customItem4: "Pre-orders",
    passLead: "Save your details and keep your orders in one place.",
    footerBlurb: "Shop the range online, any time.",
  },
};

const PRESETS: Record<MizuKind, Preset> = {
  water: WATER,
  general: GENERAL,
  food: FOOD,
  style: STYLE,
};

/** The stock wording of one line in a given voice (for studio placeholders). */
export function mizuPresetText(kind: MizuKind, key: string): string {
  return PRESETS[kind].t[key] ?? "";
}

export type MizuStoredOptions = Record<string, ThemeOptionValue> | null | undefined;

/** A lone dash hides a line (an FAQ, a checklist item, a badge). */
const HIDE = /^[-–—]$/;

export type MizuTheme = {
  kind: MizuKind;
  headline: string;
  subcopy: string;
  passTitleIn: string;
  passLeadIn: string;
  fallbackFeatureTitles: readonly [string, string];
  /** Final wording for every editable line. Empty string = hidden. */
  t: MizuWording;
  chips: readonly [readonly string[], readonly string[]];
  show: {
    about: boolean;
    custom: boolean;
    pass: boolean;
    faq: boolean;
    wave: boolean;
    motion: boolean;
  };
};

export function resolveMizuTheme(input: {
  shopName: string;
  categoryNames?: readonly string[];
  landing?: LandingContent | null;
  options?: MizuStoredOptions;
}): MizuTheme {
  const { shopName, categoryNames = [], landing, options } = input;
  const voice = typeof options?.voice === "string" ? options.voice : "auto";
  const kind: MizuKind =
    voice === "water" || voice === "general" || voice === "food" || voice === "style"
      ? voice
      : detectMizuKind(shopName, categoryNames);
  const preset = PRESETS[kind];

  const trimmed = (v?: string | null) => v?.trim() || null;
  const fromLanding: MizuWording = {};
  const put = (key: string, v?: string | null) => {
    const s = trimmed(v);
    if (s) fromLanding[key] = s;
  };
  put("heroPrimary", landing?.ctaLabel);
  put("heroSecondary", landing?.secondaryCtaLabel);
  put("aboutLead", landing?.storyBody);
  put("aboutTitle", landing?.storyTitle);
  put("collectionTitle", landing?.carryTitle);
  put("collectionTagline", landing?.carryLead);
  put("footerBlurb", landing?.contactBody);

  const shop = shopName.trim() || "our shop";
  const t: MizuWording = {};
  for (const key of Object.keys(preset.t)) {
    const own = options?.[key];
    const raw =
      typeof own === "string" && own.trim()
        ? own.trim()
        : (fromLanding[key] ?? preset.t[key]);
    t[key] = HIDE.test(raw) ? "" : raw.replace(/\{shop\}/gi, shop);
  }

  const chips = (key: string) =>
    t[key]
      .split(/[,\n]/)
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 6);
  const on = (key: string) => options?.[key] !== false;

  return {
    kind,
    headline: preset.headline,
    subcopy: preset.subcopy,
    passTitleIn: preset.passTitleIn,
    passLeadIn: preset.passLeadIn,
    fallbackFeatureTitles: [preset.fallbackFeature1, preset.fallbackFeature2],
    t,
    chips: [chips("feature1Chips"), chips("feature2Chips")],
    show: {
      about: on("showAbout"),
      custom: on("showCustom"),
      pass: on("showPass"),
      faq: on("showFaq"),
      wave: on("wave"),
      motion: on("motion"),
    },
  };
}
