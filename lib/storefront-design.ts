/**
 * Storefront design overrides — the merchant's "make it yours" layer.
 *
 * The theme (`storeThemeId`) is the starting point; this versioned JSON blob
 * is the customization that survives theme switches. The storefront never
 * renders "the design" or "the theme" — it renders the merged result
 * (see {@link resolveStorefrontDesign}).
 *
 * The blob is stored opaquely by the backend (`storefront.designJson`) and
 * parsed here with strict, whitelist-only normalization so a malformed or
 * hostile payload degrades to defaults instead of breaking the page.
 */

import type { LandingContent } from "@/lib/storefront-templates";
import type { StoreThemeId } from "@/lib/storefront-templates";
import {
  isStorefrontFontPairingId,
  type StorefrontFontPairingId,
} from "@/lib/storefront-fonts";
import {
  normalizeThemeBlob,
  type ThemeOptionValue,
} from "@/lib/storefront-theme-options";

export const STOREFRONT_DESIGN_VERSION = 1;

export type StorefrontDesignRadius = "sharp" | "soft" | "round";
export type StorefrontDesignButtons = "solid" | "outline" | "pill";
export type StorefrontDesignDensity = "compact" | "cozy" | "airy";
export type StorefrontDesignImageFit = "cover" | "contain";

/** Weekday keys in display order (Monday first). */
export const STOREFRONT_DAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type StorefrontDesignDayKey = (typeof STOREFRONT_DAY_KEYS)[number];

export const STOREFRONT_DAY_LABELS: Record<StorefrontDesignDayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const STOREFRONT_DAY_SHORT_LABELS: Record<StorefrontDesignDayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** Structured opening hours for one day (24h "HH:mm" times). */
export type StorefrontDesignDayHours = {
  open: boolean;
  openTime: string;
  closeTime: string;
};

export type StorefrontDesignHours = {
  /** All seven days; closed days carry `open: false`. */
  days: Record<StorefrontDesignDayKey, StorefrontDesignDayHours>;
  /** Optional free-text addition, e.g. "Open on public holidays". */
  note?: string | null;
};

export type StorefrontDesignBusiness = {
  /** Short line under the business name, e.g. "Pens, paper, gifts and everyday essentials." */
  tagline?: string | null;
  description?: string | null;
  contact?: {
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
  } | null;
  location?: {
    address?: string | null;
    town?: string | null;
    mapUrl?: string | null;
  } | null;
  hours?: StorefrontDesignHours | null;
  /** Handles or full URLs, stored as the merchant typed them. */
  social?: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    x?: string | null;
    youtube?: string | null;
  } | null;
};

// ─── Sections ───────────────────────────────────────────────────────────

/**
 * Merchant sections render in two zones around the theme's product engine:
 * `pre` = between the header and the products, `post` = below the products.
 */
export type StorefrontSectionRegion = "pre" | "shelves" | "post";

export type StorefrontSectionId =
  | "announcement"
  | "promo"
  | "hero"
  | "categories"
  | "products"
  | "about"
  | "social"
  | "contact";

export type StorefrontAnnouncementSectionSettings = {
  text: string;
};

export type StorefrontPromoSectionSettings = {
  title: string;
  subtitle: string;
  /** ISO datetime for the countdown; empty = no countdown. */
  endsAt: string;
  coupon: string;
  ctaLabel: string;
  /** WhatsApp number for the CTA (digits as typed); empty = no CTA. */
  whatsapp: string;
};

/** Hero sizes map onto the theme's built-in hero heights. */
export type StorefrontHeroSectionHeight = "small" | "medium" | "large";
/** Darkens the hero photo so text stays readable. */
export type StorefrontHeroSectionOverlay = "none" | "light" | "dark";

export type StorefrontHeroSectionSettings = {
  /** Empty = fall back to the shop announcement / tagline. */
  headline: string;
  /** Empty = fall back to the business tagline. */
  subheadline: string;
  height: StorefrontHeroSectionHeight;
  overlay: StorefrontHeroSectionOverlay;
  showCta: boolean;
  showWhatsapp: boolean;
};

/** Pure show/hide sections (the shelves). */
export type StorefrontEmptySectionSettings = Record<string, never>;

export type StorefrontAboutSectionSettings = {
  heading: string;
  text: string;
  imageUrl: string;
};

export type StorefrontSocialSectionSettings = {
  heading: string;
};

export type StorefrontContactSectionSettings = {
  heading: string;
  showHours: boolean;
  showMap: boolean;
};

export type StorefrontSectionSettings =
  | StorefrontAnnouncementSectionSettings
  | StorefrontPromoSectionSettings
  | StorefrontHeroSectionSettings
  | StorefrontEmptySectionSettings
  | StorefrontAboutSectionSettings
  | StorefrontSocialSectionSettings
  | StorefrontContactSectionSettings;

export type StorefrontSectionConfig = {
  id: StorefrontSectionId;
  enabled: boolean;
  settings: StorefrontSectionSettings;
};

export type StorefrontSectionSchema = {
  id: StorefrontSectionId;
  label: string;
  description: string;
  region: StorefrontSectionRegion;
};

/** Canonical order; also the order used when a merchant enables a section. */
export const STOREFRONT_SECTION_IDS: readonly StorefrontSectionId[] = [
  "announcement",
  "promo",
  "hero",
  "categories",
  "products",
  "about",
  "social",
  "contact",
] as const;

export const STOREFRONT_SECTION_SCHEMAS: readonly StorefrontSectionSchema[] = [
  {
    id: "announcement",
    label: "Notice bar",
    description: "A slim message at the top — deliveries, hours, new stock.",
    region: "pre",
  },
  {
    id: "promo",
    label: "Offer banner",
    description: "Flash sale with countdown, coupon code and a WhatsApp button.",
    region: "pre",
  },
  {
    id: "hero",
    label: "Hero",
    description: "The big welcome at the top — headline, photo and buttons.",
    region: "shelves",
  },
  {
    id: "categories",
    label: "Categories",
    description: "The grid of categories people tap to browse.",
    region: "shelves",
  },
  {
    id: "products",
    label: "Products",
    description: "The product shelves — the heart of the shop.",
    region: "shelves",
  },
  {
    id: "about",
    label: "About the shop",
    description: "Your story and a photo — straight from the business details.",
    region: "post",
  },
  {
    id: "social",
    label: "Social links",
    description: "Instagram, TikTok, Facebook and more, set once in Business details.",
    region: "post",
  },
  {
    id: "contact",
    label: "Contact & visit",
    description: "Address, opening hours, phone and directions.",
    region: "post",
  },
];

export function storefrontSectionSchema(
  id: StorefrontSectionId,
): StorefrontSectionSchema {
  return (
    STOREFRONT_SECTION_SCHEMAS.find((s) => s.id === id) ??
    STOREFRONT_SECTION_SCHEMAS[0]!
  );
}

export function isStorefrontSectionId(v: unknown): v is StorefrontSectionId {
  return (
    typeof v === "string" &&
    (STOREFRONT_SECTION_IDS as readonly string[]).includes(v)
  );
}

export function storefrontSectionDefaultSettings(
  id: StorefrontSectionId,
): StorefrontSectionSettings {
  switch (id) {
    case "announcement":
      return { text: "" };
    case "promo":
      return {
        title: "",
        subtitle: "",
        endsAt: "",
        coupon: "",
        ctaLabel: "",
        whatsapp: "",
      };
    case "hero":
      return {
        headline: "",
        subheadline: "",
        height: "medium",
        overlay: "none",
        showCta: true,
        showWhatsapp: true,
      };
    case "categories":
    case "products":
      return {};
    case "about":
      return { heading: "", text: "", imageUrl: "" };
    case "social":
      return { heading: "" };
    case "contact":
      return { heading: "", showHours: true, showMap: true };
  }
}

export function isStorefrontHeroHeight(v: unknown): v is StorefrontHeroSectionHeight {
  return v === "small" || v === "medium" || v === "large";
}

export function isStorefrontHeroOverlay(v: unknown): v is StorefrontHeroSectionOverlay {
  return v === "none" || v === "light" || v === "dark";
}

function normalizeSectionSettings(
  id: StorefrontSectionId,
  raw: unknown,
): StorefrontSectionSettings {
  const defaults = storefrontSectionDefaultSettings(id);
  const o =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const text = (key: string, max: number) =>
    pickString(o[key], max) ?? "";
  const flag = (key: string, fallback: boolean) =>
    typeof o[key] === "boolean" ? Boolean(o[key]) : fallback;

  switch (id) {
    case "announcement":
      return { text: text("text", 200) };
    case "promo": {
      const endsAt = pickString(o.endsAt, 40) ?? "";
      return {
        title: text("title", 120),
        subtitle: text("subtitle", 200),
        endsAt: endsAt && !Number.isNaN(Date.parse(endsAt)) ? endsAt : "",
        coupon: text("coupon", 40),
        ctaLabel: text("ctaLabel", 60),
        whatsapp: text("whatsapp", 32),
      };
    }
    case "hero":
      return {
        headline: text("headline", 120),
        subheadline: text("subheadline", 120),
        height: isStorefrontHeroHeight(o.height) ? o.height : "medium",
        overlay: isStorefrontHeroOverlay(o.overlay) ? o.overlay : "none",
        showCta: flag("showCta", (defaults as StorefrontHeroSectionSettings).showCta),
        showWhatsapp: flag(
          "showWhatsapp",
          (defaults as StorefrontHeroSectionSettings).showWhatsapp,
        ),
      };
    case "categories":
    case "products":
      return {};
    case "about":
      return {
        heading: text("heading", 80),
        text: text("text", 1200),
        imageUrl: text("imageUrl", 600),
      };
    case "social":
      return { heading: text("heading", 80) };
    case "contact":
      return {
        heading: text("heading", 80),
        showHours: flag("showHours", (defaults as StorefrontContactSectionSettings).showHours),
        showMap: flag("showMap", (defaults as StorefrontContactSectionSettings).showMap),
      };
  }
}

export function normalizeStorefrontSection(raw: unknown): StorefrontSectionConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (!isStorefrontSectionId(o.id)) {
    return null;
  }
  return {
    id: o.id,
    enabled: o.enabled === true,
    settings: normalizeSectionSettings(o.id, o.settings),
  };
}

/** Enabled merchant sections for a zone, in design order. */
export function storefrontSectionsInRegion(
  design: StorefrontDesign | null | undefined,
  region: StorefrontSectionRegion,
): StorefrontSectionConfig[] {
  const sections = design?.sections;
  if (!sections) {
    return [];
  }
  return sections.filter(
    (s) => s.enabled && storefrontSectionSchema(s.id).region === region,
  );
}

/** The stored config for one section, or `null` when the merchant never touched it. */
export function storefrontSectionConfig(
  design: StorefrontDesign | null | undefined,
  id: StorefrontSectionId,
): StorefrontSectionConfig | null {
  return design?.sections?.find((s) => s.id === id) ?? null;
}

/** True when the merchant explicitly enabled a section. */
export function storefrontSectionEnabled(
  design: StorefrontDesign | null | undefined,
  id: StorefrontSectionId,
): boolean {
  return storefrontSectionConfig(design, id)?.enabled === true;
}

/** A photo slot with the merchant's chosen focal point ("keep this part visible"). */
export type StorefrontDesignPhoto = {
  url: string;
  /** 0–100, left→right. */
  focalX: number;
  /** 0–100, top→bottom. */
  focalY: number;
  fit: StorefrontDesignImageFit;
};

export type StorefrontDesignBrandKit = {
  /** Hex page background override (e.g. "#FFFCF5"). */
  surface?: string | null;
  radius?: StorefrontDesignRadius | null;
  buttons?: StorefrontDesignButtons | null;
  density?: StorefrontDesignDensity | null;
};

/**
 * v1 design document. Forward-compatible: unknown keys are dropped on parse,
 * and later versions keep the same shape plus additive keys.
 */
export type StorefrontDesign = {
  version: typeof STOREFRONT_DESIGN_VERSION;
  brandKit?: StorefrontDesignBrandKit | null;
  photos?: {
    hero?: StorefrontDesignPhoto | null;
  } | null;
  /** Business profile — one source of truth every theme consumes. */
  business?: StorefrontDesignBusiness | null;
  /** Merchant sections in render order (see {@link StorefrontSectionConfig}). */
  sections?: StorefrontSectionConfig[] | null;
  /** Typography voice — a font pairing that overrides the theme's lettering. */
  fontPairing?: StorefrontFontPairingId | null;
  /** Per-theme personality dials, keyed by theme id (see theme-options). */
  theme?: Partial<
    Record<StoreThemeId, Record<string, ThemeOptionValue>>
  > | null;
};

export type ResolvedStorefrontDesign = {
  radius: StorefrontDesignRadius;
  buttons: StorefrontDesignButtons;
  density: StorefrontDesignDensity;
  surfaceHex: string | null;
  heroPhoto: StorefrontDesignPhoto | null;
  fontPairingId: StorefrontFontPairingId;
};

/** CSS radius values per radius mode (card / button / small control). */
export const STOREFRONT_RADIUS_TOKENS: Record<
  StorefrontDesignRadius,
  { card: string; button: string; control: string }
> = {
  sharp: { card: "2px", button: "3px", control: "2px" },
  soft: { card: "14px", button: "10px", control: "8px" },
  round: { card: "24px", button: "9999px", control: "14px" },
};

/** Spacing multiplier per density mode (consumed as `--sf-density`). */
export const STOREFRONT_DENSITY_SCALE: Record<StorefrontDesignDensity, number> = {
  compact: 0.9,
  cozy: 1,
  airy: 1.15,
};

export function isStorefrontDesignRadius(v: unknown): v is StorefrontDesignRadius {
  return v === "sharp" || v === "soft" || v === "round";
}

export function isStorefrontDesignButtons(v: unknown): v is StorefrontDesignButtons {
  return v === "solid" || v === "outline" || v === "pill";
}

export function isStorefrontDesignDensity(v: unknown): v is StorefrontDesignDensity {
  return v === "compact" || v === "cozy" || v === "airy";
}

export function isStorefrontDesignFit(v: unknown): v is StorefrontDesignImageFit {
  return v === "cover" || v === "contain";
}

/** 24h "HH:mm" (e.g. "08:00", "19:30") — used for structured opening hours. */
export function isValidHoursTime(value: string): boolean {
  return HOURS_TIME_RE.test(value);
}

function clampFocal(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function pickHex(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const raw = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return raw.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }
  return null;
}

function pickString(value: unknown, maxLen = 400): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const s = value.trim().slice(0, maxLen);
  return s.length > 0 ? s : null;
}

const HOURS_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validTime(value: unknown): value is string {
  return typeof value === "string" && HOURS_TIME_RE.test(value);
}

function parseDayHours(raw: unknown): StorefrontDesignDayHours {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { open: false, openTime: "08:00", closeTime: "19:00" };
  }
  const d = raw as Record<string, unknown>;
  const open =
    d.open === true && validTime(d.openTime) && validTime(d.closeTime);
  return {
    open,
    openTime: validTime(d.openTime) ? (d.openTime as string) : "08:00",
    closeTime: validTime(d.closeTime) ? (d.closeTime as string) : "19:00",
  };
}

function parseHours(raw: unknown): StorefrontDesignHours | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const daysRaw =
    o.days && typeof o.days === "object" && !Array.isArray(o.days)
      ? (o.days as Record<string, unknown>)
      : null;
  const days = {} as Record<StorefrontDesignDayKey, StorefrontDesignDayHours>;
  for (const key of STOREFRONT_DAY_KEYS) {
    days[key] = parseDayHours(daysRaw?.[key]);
  }
  const note = pickString(o.note, 200);
  const hours: StorefrontDesignHours = { days };
  if (note) {
    hours.note = note;
  }
  return hours;
}

function parseBusiness(raw: unknown): StorefrontDesignBusiness | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const business: StorefrontDesignBusiness = {};

  const tagline = pickString(o.tagline, 120);
  if (tagline) {
    business.tagline = tagline;
  }
  const description = pickString(o.description, 1200);
  if (description) {
    business.description = description;
  }

  const c = o.contact;
  if (c && typeof c === "object" && !Array.isArray(c)) {
    const co = c as Record<string, unknown>;
    const contact: NonNullable<StorefrontDesignBusiness["contact"]> = {};
    const phone = pickString(co.phone, 32);
    if (phone) contact.phone = phone;
    const whatsapp = pickString(co.whatsapp, 32);
    if (whatsapp) contact.whatsapp = whatsapp;
    const email = pickString(co.email, 120);
    if (email) contact.email = email;
    if (Object.keys(contact).length > 0) {
      business.contact = contact;
    }
  }

  const l = o.location;
  if (l && typeof l === "object" && !Array.isArray(l)) {
    const lo = l as Record<string, unknown>;
    const location: NonNullable<StorefrontDesignBusiness["location"]> = {};
    const address = pickString(lo.address, 200);
    if (address) location.address = address;
    const town = pickString(lo.town, 80);
    if (town) location.town = town;
    const mapUrl = pickString(lo.mapUrl, 600);
    if (mapUrl) location.mapUrl = mapUrl;
    if (Object.keys(location).length > 0) {
      business.location = location;
    }
  }

  const hours = parseHours(o.hours);
  if (hours) {
    business.hours = hours;
  }

  const s = o.social;
  if (s && typeof s === "object" && !Array.isArray(s)) {
    const so = s as Record<string, unknown>;
    const social: NonNullable<StorefrontDesignBusiness["social"]> = {};
    for (const key of ["instagram", "facebook", "tiktok", "x", "youtube"] as const) {
      const handle = pickString(so[key], 160);
      if (handle) {
        social[key] = handle;
      }
    }
    if (Object.keys(social).length > 0) {
      business.social = social;
    }
  }

  if (
    !business.tagline &&
    !business.description &&
    !business.contact &&
    !business.location &&
    !business.hours &&
    !business.social
  ) {
    return null;
  }
  return business;
}

function parsePhoto(raw: unknown): StorefrontDesignPhoto | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const url = pickString(o.url);
  if (!url) {
    return null;
  }
  return {
    url,
    focalX: clampFocal(o.focalX, 50),
    focalY: clampFocal(o.focalY, 50),
    fit: isStorefrontDesignFit(o.fit) ? o.fit : "cover",
  };
}

/**
 * Strict, whitelist-only parser for the stored design JSON. Returns `null`
 * when there is nothing usable, so callers can treat it as "use theme defaults".
 */
export function parseStorefrontDesignJson(
  raw: string | null | undefined,
): StorefrontDesign | null {
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const o = parsed as Record<string, unknown>;
  if (o.version !== STOREFRONT_DESIGN_VERSION) {
    return null;
  }

  const design: StorefrontDesign = { version: STOREFRONT_DESIGN_VERSION };

  const bk = o.brandKit;
  if (bk && typeof bk === "object" && !Array.isArray(bk)) {
    const b = bk as Record<string, unknown>;
    const brandKit: StorefrontDesignBrandKit = {};
    const surface = pickHex(b.surface);
    if (surface) {
      brandKit.surface = surface;
    }
    if (isStorefrontDesignRadius(b.radius)) {
      brandKit.radius = b.radius;
    }
    if (isStorefrontDesignButtons(b.buttons)) {
      brandKit.buttons = b.buttons;
    }
    if (isStorefrontDesignDensity(b.density)) {
      brandKit.density = b.density;
    }
    if (Object.keys(brandKit).length > 0) {
      design.brandKit = brandKit;
    }
  }

  const ph = o.photos;
  if (ph && typeof ph === "object" && !Array.isArray(ph)) {
    const hero = parsePhoto((ph as Record<string, unknown>).hero);
    if (hero) {
      design.photos = { hero };
    }
  }

  const business = parseBusiness(o.business);
  if (business) {
    design.business = business;
  }

  if (Array.isArray(o.sections)) {
    const sections = o.sections
      .map(normalizeStorefrontSection)
      .filter((s): s is StorefrontSectionConfig => s !== null);
    if (sections.length > 0) {
      design.sections = sections;
    }
  }

  if (isStorefrontFontPairingId(o.fontPairing) && o.fontPairing !== "default") {
    design.fontPairing = o.fontPairing;
  }

  const theme = normalizeThemeBlob(o.theme);
  if (theme) {
    design.theme = theme;
  }

  if (
    !design.brandKit &&
    !design.photos &&
    !design.business &&
    !design.sections &&
    !design.fontPairing &&
    !design.theme
  ) {
    return null;
  }
  return design;
}

/** Serialize a design for storage. Omits empty groups so a reset round-trips to `null`. */
export function serializeStorefrontDesign(
  design: StorefrontDesign | null | undefined,
): string | null {
  if (!design) {
    return null;
  }
  const clean: StorefrontDesign = { version: STOREFRONT_DESIGN_VERSION };
  if (design.brandKit && Object.keys(design.brandKit).length > 0) {
    clean.brandKit = design.brandKit;
  }
  if (design.photos?.hero) {
    clean.photos = { hero: design.photos.hero };
  }
  if (design.business && Object.keys(design.business).length > 0) {
    clean.business = design.business;
  }
  if (design.sections && design.sections.length > 0) {
    clean.sections = design.sections;
  }
  if (design.fontPairing && design.fontPairing !== "default") {
    clean.fontPairing = design.fontPairing;
  }
  if (design.theme && Object.keys(design.theme).length > 0) {
    clean.theme = design.theme;
  }
  if (
    !clean.brandKit &&
    !clean.photos &&
    !clean.business &&
    !clean.sections &&
    !clean.fontPairing &&
    !clean.theme
  ) {
    return null;
  }
  return JSON.stringify(clean);
}

/**
 * Merge theme defaults with merchant overrides into the values the storefront
 * actually renders. Pure and deterministic — shared by the public storefront
 * and (later) the live preview.
 */
export function resolveStorefrontDesign(
  design: StorefrontDesign | null | undefined,
): ResolvedStorefrontDesign {
  return {
    radius: design?.brandKit?.radius ?? "sharp",
    buttons: design?.brandKit?.buttons ?? "solid",
    density: design?.brandKit?.density ?? "cozy",
    surfaceHex: design?.brandKit?.surface ?? null,
    heroPhoto: design?.photos?.hero ?? null,
    fontPairingId: design?.fontPairing ?? "default",
  };
}

// ─── Business profile helpers ───────────────────────────────────────────

/** "08:00" → "8:00", "19:00" → "19:00" (matches the legacy hours look). */
function formatHoursTime(time: string): string {
  const [h, m] = time.split(":");
  if (!h || !m) {
    return time;
  }
  const hour = Number(h);
  return `${hour}:${m}`;
}

/**
 * Render structured hours as a compact line, e.g.
 * `Mon–Sat 8:00–19:00` or `Mon–Fri 8:00–19:00, Sat 9:00–13:00 · Open holidays`.
 * When nothing is open, returns the note alone (e.g. "By appointment") or
 * `null` when there is no note either — the theme then decides what to show.
 */
export function formatBusinessHours(
  hours: StorefrontDesignHours | null | undefined,
): string | null {
  if (!hours) {
    return null;
  }
  const runs: {
    start: StorefrontDesignDayKey;
    end: StorefrontDesignDayKey;
    open: boolean;
    openTime: string;
    closeTime: string;
  }[] = [];
  let current: (typeof runs)[number] | null = null;
  for (const key of STOREFRONT_DAY_KEYS) {
    const day = hours.days[key] ?? { open: false, openTime: "08:00", closeTime: "19:00" };
    const open = day.open && validTime(day.openTime) && validTime(day.closeTime);
    if (
      current &&
      current.open === open &&
      (open ? current.openTime === day.openTime && current.closeTime === day.closeTime : true)
    ) {
      current.end = key;
      continue;
    }
    current = {
      start: key,
      end: key,
      open,
      openTime: day.openTime,
      closeTime: day.closeTime,
    };
    runs.push(current);
  }

  const openRuns = runs.filter((r) => r.open);
  const note = hours.note?.trim();
  if (openRuns.length === 0) {
    return note || null;
  }
  const parts = openRuns.map((r) => {
    const days =
      r.start === r.end
        ? STOREFRONT_DAY_SHORT_LABELS[r.start]
        : `${STOREFRONT_DAY_SHORT_LABELS[r.start]}–${STOREFRONT_DAY_SHORT_LABELS[r.end]}`;
    return `${days} ${formatHoursTime(r.openTime)}–${formatHoursTime(r.closeTime)}`;
  });
  const joined = parts.join(", ");
  return note ? `${joined} · ${note}` : joined;
}

/**
 * Map the structured business profile onto the legacy {@link LandingContent}
 * fields so existing landing templates pick it up without changes. The
 * business profile wins over the legacy free-text settings — it is the new
 * source of truth (see {@link applyBusinessProfileToLandingContent}).
 */
export function applyBusinessProfileToLandingContent(
  explicit: LandingContent | null,
  business: StorefrontDesignBusiness | null | undefined,
): LandingContent | null {
  if (!business) {
    return explicit;
  }
  const locationParts = [
    business.location?.address?.trim(),
    business.location?.town?.trim(),
  ].filter((v): v is string => Boolean(v));
  const derived: LandingContent = {
    subheadline: business.tagline?.trim() || null,
    phone: business.contact?.phone?.trim() || null,
    whatsapp: business.contact?.whatsapp?.trim() || null,
    hours: business.hours ? formatBusinessHours(business.hours) : null,
    address: locationParts.length > 0 ? locationParts.join(", ") : null,
  };
  if (!derived.subheadline && !derived.phone && !derived.whatsapp && !derived.hours && !derived.address) {
    return explicit;
  }
  if (!explicit) {
    return derived;
  }
  return {
    headline: explicit.headline ?? null,
    subheadline: derived.subheadline ?? explicit.subheadline ?? null,
    phone: derived.phone ?? explicit.phone ?? null,
    whatsapp: derived.whatsapp ?? explicit.whatsapp ?? null,
    hours: derived.hours ?? explicit.hours ?? null,
    address: derived.address ?? explicit.address ?? null,
    ctaLabel: explicit.ctaLabel ?? null,
  };
}

const SOCIAL_BASES: Record<
  keyof NonNullable<StorefrontDesignBusiness["social"]>,
  { label: string; urlFor: (handle: string) => string }
> = {
  instagram: { label: "Instagram", urlFor: (h) => `https://instagram.com/${h}` },
  facebook: { label: "Facebook", urlFor: (h) => `https://facebook.com/${h}` },
  tiktok: { label: "TikTok", urlFor: (h) => `https://tiktok.com/@${h}` },
  x: { label: "X", urlFor: (h) => `https://x.com/${h}` },
  youtube: { label: "YouTube", urlFor: (h) => `https://youtube.com/@${h}` },
};

export type BusinessSocialLink = {
  key: keyof NonNullable<StorefrontDesignBusiness["social"]>;
  label: string;
  href: string;
};

/** Accepts a handle (`palmart`, `@palmart`) or a full URL and normalizes to a link. */
export function businessSocialLinks(
  business: StorefrontDesignBusiness | null | undefined,
): BusinessSocialLink[] {
  const social = business?.social;
  if (!social) {
    return [];
  }
  const links: BusinessSocialLink[] = [];
  for (const key of Object.keys(SOCIAL_BASES) as (keyof typeof SOCIAL_BASES)[]) {
    const raw = social[key]?.trim();
    if (!raw) {
      continue;
    }
    const base = SOCIAL_BASES[key];
    const href = /^https?:\/\//i.test(raw)
      ? raw
      : base.urlFor(raw.replace(/^@+/, ""));
    links.push({ key, label: base.label, href });
  }
  return links;
}
