import type { ThemeOptionDef } from "@/lib/storefront-theme-options";

/**
 * Every line of Mizu Springs copy is a theme option, so a shop can rewrite it
 * from the design studio or by clicking the text on the page. Each field is
 * empty by default: an empty field means "use the wording of the chosen voice".
 */
export type MizuTextField = {
  key: string;
  label: string;
  group: string;
  max: number;
  hint?: string;
};

const G_HERO = "Hero";
const G_ABOUT = "About";
const G_COLLECTION = "Collection";
const G_CUSTOM = "Special orders";
const G_PASS = "Account invite";
const G_FAQ = "Questions";
const G_FOOTER = "Footer";

const pillars = [1, 2, 3].flatMap((n): MizuTextField[] => [
  { key: `pillar${n}Title`, label: `Point ${n} title`, group: G_ABOUT, max: 40 },
  { key: `pillar${n}Copy`, label: `Point ${n} text`, group: G_ABOUT, max: 200 },
]);

const features = [1, 2].flatMap((n): MizuTextField[] => [
  { key: `feature${n}Badge`, label: `Card ${n} badge`, group: G_COLLECTION, max: 24 },
  { key: `feature${n}Copy`, label: `Card ${n} text`, group: G_COLLECTION, max: 180 },
  {
    key: `feature${n}Chips`,
    label: `Card ${n} tags`,
    group: G_COLLECTION,
    max: 120,
    hint: "Separate with commas, e.g. Small, Medium, Large",
  },
]);

const items = [1, 2, 3, 4].map(
  (n): MizuTextField => ({
    key: `customItem${n}`,
    label: `Checklist item ${n}`,
    group: G_CUSTOM,
    max: 48,
  }),
);

const faqs = [1, 2, 3, 4, 5].flatMap((n): MizuTextField[] => [
  { key: `faq${n}Q`, label: `Question ${n}`, group: G_FAQ, max: 120 },
  { key: `faq${n}A`, label: `Answer ${n}`, group: G_FAQ, max: 320 },
]);

export const MIZU_TEXT_FIELDS: readonly MizuTextField[] = [
  { key: "heroPrimary", label: "Main button", group: G_HERO, max: 28 },
  { key: "heroSecondary", label: "Second button", group: G_HERO, max: 28 },
  { key: "navCustom", label: "Menu link for special orders", group: G_HERO, max: 20 },
  { key: "aboutTitle", label: "About heading", group: G_ABOUT, max: 60, hint: "Write {shop} to insert your shop name." },
  { key: "aboutLead", label: "About intro", group: G_ABOUT, max: 320 },
  ...pillars,
  { key: "collectionTitle", label: "Collection heading", group: G_COLLECTION, max: 60 },
  { key: "collectionTagline", label: "Collection line", group: G_COLLECTION, max: 100 },
  ...features,
  { key: "catalogTitle", label: "Product grid heading", group: G_COLLECTION, max: 50 },
  { key: "customTitle", label: "Heading", group: G_CUSTOM, max: 60 },
  { key: "customLead", label: "Intro", group: G_CUSTOM, max: 280 },
  { key: "customCta", label: "Button", group: G_CUSTOM, max: 28 },
  ...items,
  { key: "turnaroundValue", label: "Badge number", group: G_CUSTOM, max: 12, hint: "e.g. 24h. Leave empty for none." },
  { key: "turnaroundLabel", label: "Badge label", group: G_CUSTOM, max: 28 },
  { key: "passTitle", label: "Heading", group: G_PASS, max: 60 },
  { key: "passLead", label: "Text", group: G_PASS, max: 200 },
  { key: "faqTitle", label: "Heading", group: G_FAQ, max: 60 },
  { key: "faqLead", label: "Intro", group: G_FAQ, max: 160 },
  ...faqs,
  { key: "footerBlurb", label: "Footer intro", group: G_FOOTER, max: 200 },
  { key: "footerSign", label: "Footer sign-off", group: G_FOOTER, max: 60 },
];

const toText = (f: MizuTextField): ThemeOptionDef => ({
  key: f.key,
  label: f.label,
  group: f.group,
  hint: f.hint ?? "Leave empty to use the wording of the chosen voice.",
  type: "text",
  default: "",
  max: f.max,
});

export const MIZU_SPRINGS_OPTIONS: readonly ThemeOptionDef[] = [
  {
    key: "voice",
    label: "What do you sell?",
    group: "Start here",
    hint: "Sets all the wording below. Auto reads your shop name and categories.",
    type: "select",
    var: "--ms-opt-voice",
    default: "auto",
    values: {
      auto: "auto",
      water: "water",
      general: "general",
      food: "food",
      style: "style",
    },
    options: [
      { value: "auto", label: "Auto" },
      { value: "water", label: "Water & drinks" },
      { value: "general", label: "Everyday goods" },
      { value: "food", label: "Food & fresh" },
      { value: "style", label: "Style & beauty" },
    ],
  },
  {
    key: "primary",
    label: "Header & headline colour",
    group: "Colour & shape",
    hint: "Defaults to your brand colour. Too light a colour is darkened so text stays readable.",
    type: "color",
    var: "--ms-opt-primary",
    // One step off the house navy so choosing exactly #172554 still counts.
    default: "#172553",
  },
  {
    key: "accent",
    label: "Button colour",
    group: "Colour & shape",
    hint: "Order buttons, prices and highlights.",
    type: "color",
    var: "--ms-opt-accent",
    default: "#0891b1",
  },
  {
    key: "corners",
    label: "Corners",
    group: "Colour & shape",
    type: "select",
    var: "--ms-brand-r",
    default: "soft",
    values: { soft: "1", round: "1.6", sharp: "0.2" },
    options: [
      { value: "soft", label: "Soft" },
      { value: "round", label: "Round" },
      { value: "sharp", label: "Sharp" },
    ],
  },
  {
    key: "buttons",
    label: "Buttons",
    group: "Colour & shape",
    type: "select",
    var: "--ms-brand-pill",
    default: "pill",
    values: { pill: "9999px", soft: "0.75rem", square: "0.15rem" },
    options: [
      { value: "pill", label: "Pill" },
      { value: "soft", label: "Soft" },
      { value: "square", label: "Square" },
    ],
  },
  {
    key: "wave",
    label: "Wave under the hero",
    group: "Colour & shape",
    type: "toggle",
    var: "--ms-opt-wave",
    default: true,
    offValue: "0",
  },
  {
    key: "motion",
    label: "Drifting hero shapes",
    group: "Colour & shape",
    hint: "Slow background movement. Always off for visitors who prefer less motion.",
    type: "toggle",
    var: "--ms-opt-motion",
    default: true,
    offValue: "0",
  },
  ...(
    [
      ["showAbout", "About section"],
      ["showCustom", "Special orders section"],
      ["showPass", "Account invite"],
      ["showFaq", "Questions"],
    ] as const
  ).map(
    ([key, label]): ThemeOptionDef => ({
      key,
      label,
      group: "Sections",
      type: "toggle",
      var: `--ms-opt-${key}`,
      default: true,
      offValue: "0",
    }),
  ),
  ...MIZU_TEXT_FIELDS.map(toText),
];
