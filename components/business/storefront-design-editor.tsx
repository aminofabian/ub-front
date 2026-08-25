/*
 * STOREFRONT DESIGN STUDIO
 * THESIS: This page is a shop window, not a settings form — the merchant edits
 * on the left and watches their shop change in a live phone-frame miniature on
 * the right, so every toggle proves itself instead of being described.
 * OWN-WORLD: The Kiosk dashboard's restrained neutral palette and Inter,
 * sharpened with one studio motif — a miniature shop front that borrows the
 * storefront's own materials (surface color, radius, buttons, density) — and
 * soft offset elevation, no nested cards.
 * STORY: A shop owner lands on a page that already looks like their shop,
 * reaches for the control that bothers them, and watches it change on the
 * spot; they save when the miniature matches the shop they imagine.
 * FIRST VIEWPORT: Three columns — a step rail with completion dots, the
 * control stack, and a sticky phone-frame preview rendering the current
 * design; a floating sticky action bar carries Save, Preview and the change
 * count.
 * FORM: Studio arrangement inside the established dashboard world (Operate
 * mode); chosen directly, no world replacement, tokens stay.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 * finish review, the verdict, and DESIGN.md
 */
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  BadgePercent,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  ImagePlus,
  LayoutGrid,
  LayoutList,
  Loader2,
  MapPinned,
  Megaphone,
  Palette,
  Save,
  Share2,
  ShoppingBag,
  Store,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";

import { ImageFocalPointPicker } from "@/components/business/image-focal-point-picker";
import { StorefrontDesignAiCard } from "@/components/business/storefront-design-ai";
import { CloudinaryTransformRow } from "@/components/business/cloudinary-transform-row";
import { StorefrontMiniPreview, type MiniPreviewData, type MiniPreviewEditHandlers } from "@/components/business/storefront-mini-preview";
import {
  DashboardFeedback,
  DASHBOARD_SECTION_SURFACE,
  dashboardFilterFieldLabelClass,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchBusiness,
  getCloudinarySignature,
  updateBusiness,
  uploadMyBrandingLogo,
  uploadToCloudinary,
  type BusinessRecord,
  type StorefrontAiSuggestResponse,
} from "@/lib/api";
import { APP_ROUTES, PLATFORM_DOMAIN, slugDerivedShopUrl } from "@/lib/config";
import { trackStorefrontEditEvent } from "@/lib/storefront-staff-edit";
import {
  STOREFRONT_DESIGN_VERSION,
  STOREFRONT_DAY_KEYS,
  STOREFRONT_DAY_LABELS,
  STOREFRONT_DAY_SHORT_LABELS,
  STOREFRONT_SECTION_IDS,
  formatBusinessHours,
  isValidHoursTime,
  parseStorefrontDesignJson,
  serializeStorefrontDesign,
  storefrontSectionDefaultSettings,
  storefrontSectionSchema,
  type StorefrontAboutSectionSettings,
  type StorefrontAnnouncementSectionSettings,
  type StorefrontContactSectionSettings,
  type StorefrontDesign,
  type StorefrontDesignBusiness,
  type StorefrontDesignButtons,
  type StorefrontDesignDayHours,
  type StorefrontDesignDayKey,
  type StorefrontDesignDensity,
  type StorefrontDesignHours,
  type StorefrontDesignImageFit,
  type StorefrontDesignRadius,
  type StorefrontHeroSectionHeight,
  type StorefrontHeroSectionOverlay,
  type StorefrontHeroSectionSettings,
  type StorefrontPromoSectionSettings,
  type StorefrontSectionConfig,
  type StorefrontSectionId,
  type StorefrontSectionSettings,
  type StorefrontSocialSectionSettings,
} from "@/lib/storefront-design";
import { storefrontPreviewUrl } from "@/lib/storefront-preview";
import {
  normalizeStoreThemeId,
  storeThemeMeta,
} from "@/lib/storefront-templates";
import {
  STOREFRONT_FONT_PAIRINGS,
  type StorefrontFontPairingId,
} from "@/lib/storefront-fonts";
import {
  serializeThemeOptions,
  storefrontThemeOptionDefaults,
  storefrontThemeOptionDefs,
  type ThemeOptionDef,
  type ThemeOptionValue,
} from "@/lib/storefront-theme-options";
import {
  STORE_PERSONALITY_PRESETS,
  type StorePersonalityPreset,
} from "@/lib/storefront-personality";
import { cn } from "@/lib/utils";

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

const RADIUS_OPTIONS: {
  value: StorefrontDesignRadius;
  label: string;
  hint: string;
}[] = [
  { value: "sharp", label: "Sharp", hint: "Crisp, straight edges" },
  { value: "soft", label: "Soft", hint: "Gently rounded cards" },
  { value: "round", label: "Round", hint: "Friendly pill buttons" },
];

const FIT_OPTIONS: { value: StorefrontDesignImageFit; label: string }[] = [
  { value: "cover", label: "Fill the frame" },
  { value: "contain", label: "Show the whole photo" },
];

const BUTTON_OPTIONS: {
  value: StorefrontDesignButtons;
  label: string;
}[] = [
  { value: "solid", label: "Solid" },
  { value: "outline", label: "Outline" },
  { value: "pill", label: "Pill" },
];

const DENSITY_OPTIONS: {
  value: StorefrontDesignDensity;
  label: string;
  hint: string;
}[] = [
  { value: "compact", label: "Compact", hint: "Tighter" },
  { value: "cozy", label: "Cozy", hint: "Balanced" },
  { value: "airy", label: "Airy", hint: "Room to breathe" },
];

const HERO_HEIGHT_OPTIONS: { value: StorefrontHeroSectionHeight; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const HERO_OVERLAY_OPTIONS: {
  value: StorefrontHeroSectionOverlay;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function ThemeOptionControl({
  def,
  value,
  onChange,
}: {
  def: ThemeOptionDef;
  value: ThemeOptionValue;
  onChange: (value: ThemeOptionValue) => void;
}) {
  switch (def.type) {
    case "toggle":
      return (
        <button
          type="button"
          role="switch"
          aria-checked={value === true}
          onClick={() => onChange(!value)}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
            value === true
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border/70 bg-background hover:border-foreground/25",
          )}
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              {def.label}
            </span>
            {def.hint ? (
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                {def.hint}
              </span>
            ) : null}
          </span>
          <span
            className={cn(
              "relative h-5 w-9 shrink-0 rounded-full transition-colors",
              value === true ? "bg-primary" : "bg-muted",
            )}
            aria-hidden
          >
            <span
              className={cn(
                "absolute top-0.5 size-4 rounded-full bg-background shadow transition-transform",
                value === true ? "translate-x-[18px]" : "translate-x-0.5",
              )}
            />
          </span>
        </button>
      );
    case "select":
      return (
        <div className="space-y-2">
          <span className="block text-sm font-medium text-foreground">
            {def.label}
          </span>
          <div
            className="grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-label={def.label}
          >
            {def.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={value === opt.value}
                onClick={() => onChange(opt.value)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm font-medium transition-colors",
                  value === opt.value
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                    : "border-border/70 bg-background text-muted-foreground hover:border-foreground/25",
                )}
              >
                {opt.swatch ? (
                  <span
                    className="size-3.5 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: opt.swatch }}
                    aria-hidden
                  />
                ) : null}
                {opt.label}
              </button>
            ))}
          </div>
          {def.hint ? <p className={dashboardHintClass()}>{def.hint}</p> : null}
        </div>
      );
    case "range":
      return (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              {def.label}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {typeof value === "number" ? value : def.default}
              {def.unit ?? ""}
            </span>
          </div>
          <input
            type="range"
            min={def.min}
            max={def.max}
            step={def.step}
            value={typeof value === "number" ? value : def.default}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full"
          />
          {def.hint ? <p className={dashboardHintClass()}>{def.hint}</p> : null}
        </div>
      );
    case "color":
      return (
        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">{def.label}</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={
                typeof value === "string" && HEX_REGEX.test(value)
                  ? value
                  : def.default
              }
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="h-9 w-12 cursor-pointer rounded-lg border border-input bg-background shadow-sm"
            />
            <span className="font-mono text-xs uppercase text-muted-foreground">
              {String(value)}
            </span>
          </div>
          {def.hint ? <p className={dashboardHintClass()}>{def.hint}</p> : null}
        </div>
      );
    case "text":
      return (
        <div className="space-y-2">
          <span className="block text-sm font-medium text-foreground">
            {def.label}
          </span>
          <input
            type="text"
            value={typeof value === "string" ? value : def.default}
            maxLength={def.max ?? 80}
            placeholder={def.placeholder ?? def.default}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {def.hint ? <p className={dashboardHintClass()}>{def.hint}</p> : null}
        </div>
      );
  }
}

const SOCIAL_FIELDS: {
  key: "instagram" | "facebook" | "tiktok" | "x" | "youtube";
  label: string;
}[] = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "x", label: "X" },
  { key: "youtube", label: "YouTube" },
];

type BusinessForm = {
  tagline: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  town: string;
  mapUrl: string;
  hoursEnabled: boolean;
  days: Record<StorefrontDesignDayKey, StorefrontDesignDayHours>;
  hoursNote: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  x: string;
  youtube: string;
};

type DesignForm = {
  radius: StorefrontDesignRadius;
  buttons: StorefrontDesignButtons;
  density: StorefrontDesignDensity;
  /** Page background override; empty = use the theme's own background. */
  surface: string;
  /** Font pairing id; "default" = the theme's own lettering. */
  fontPairing: string;
  /** Per-theme personality dials for the currently selected theme. */
  themeOptions: Record<string, ThemeOptionValue>;
  heroUrl: string;
  heroFocalX: number;
  heroFocalY: number;
  heroFit: StorefrontDesignImageFit;
  business: BusinessForm;
  /** All section slots in canonical order; enable + configure as wanted. */
  sections: StorefrontSectionConfig[];
};

function defaultDays(): Record<StorefrontDesignDayKey, StorefrontDesignDayHours> {
  const days = {} as Record<StorefrontDesignDayKey, StorefrontDesignDayHours>;
  for (const key of STOREFRONT_DAY_KEYS) {
    days[key] = { open: key !== "sun", openTime: "08:00", closeTime: "19:00" };
  }
  return days;
}

function businessFormFromDesign(design: StorefrontDesign | null | undefined): BusinessForm {
  const b = design?.business;
  const hours = b?.hours;
  const days = defaultDays();
  for (const key of STOREFRONT_DAY_KEYS) {
    const day = hours?.days?.[key];
    if (day) {
      days[key] = { ...day };
    }
  }
  return {
    tagline: b?.tagline ?? "",
    description: b?.description ?? "",
    phone: b?.contact?.phone ?? "",
    whatsapp: b?.contact?.whatsapp ?? "",
    email: b?.contact?.email ?? "",
    address: b?.location?.address ?? "",
    town: b?.location?.town ?? "",
    mapUrl: b?.location?.mapUrl ?? "",
    hoursEnabled: Boolean(hours),
    days,
    hoursNote: hours?.note ?? "",
    instagram: b?.social?.instagram ?? "",
    facebook: b?.social?.facebook ?? "",
    tiktok: b?.social?.tiktok ?? "",
    x: b?.social?.x ?? "",
    youtube: b?.social?.youtube ?? "",
  };
}

function formFromDesign(
  design: StorefrontDesign | null | undefined,
  themeId: string | null,
): DesignForm {
  const sections: StorefrontSectionConfig[] = STOREFRONT_SECTION_IDS.map((id) => {
    const existing = design?.sections?.find((s) => s.id === id);
    return existing
      ? { id, enabled: existing.enabled, settings: existing.settings }
      : { id, enabled: false, settings: storefrontSectionDefaultSettings(id) };
  });
  return {
    radius: design?.brandKit?.radius ?? "sharp",
    buttons: design?.brandKit?.buttons ?? "solid",
    density: design?.brandKit?.density ?? "cozy",
    surface: design?.brandKit?.surface ?? "",
    fontPairing: design?.fontPairing ?? "default",
    themeOptions: {
      ...storefrontThemeOptionDefaults(themeId),
      ...(design?.theme?.[themeId as keyof NonNullable<StorefrontDesign["theme"]>] ??
        {}),
    },
    heroUrl: design?.photos?.hero?.url ?? "",
    heroFocalX: design?.photos?.hero?.focalX ?? 50,
    heroFocalY: design?.photos?.hero?.focalY ?? 50,
    heroFit: design?.photos?.hero?.fit ?? "cover",
    business: businessFormFromDesign(design),
    sections,
  };
}

function buildBusinessFromForm(form: DesignForm): StorefrontDesignBusiness | null {
  const b = form.business;
  const business: StorefrontDesignBusiness = {};

  const tagline = b.tagline.trim();
  if (tagline) {
    business.tagline = tagline.slice(0, 120);
  }
  const description = b.description.trim();
  if (description) {
    business.description = description.slice(0, 1200);
  }

  const contact: NonNullable<StorefrontDesignBusiness["contact"]> = {};
  if (b.phone.trim()) contact.phone = b.phone.trim().slice(0, 32);
  if (b.whatsapp.trim()) contact.whatsapp = b.whatsapp.trim().slice(0, 32);
  if (b.email.trim()) contact.email = b.email.trim().slice(0, 120);
  if (Object.keys(contact).length > 0) {
    business.contact = contact;
  }

  const location: NonNullable<StorefrontDesignBusiness["location"]> = {};
  if (b.address.trim()) location.address = b.address.trim().slice(0, 200);
  if (b.town.trim()) location.town = b.town.trim().slice(0, 80);
  if (b.mapUrl.trim()) location.mapUrl = b.mapUrl.trim().slice(0, 600);
  if (Object.keys(location).length > 0) {
    business.location = location;
  }

  if (b.hoursEnabled) {
    const days = {} as Record<StorefrontDesignDayKey, StorefrontDesignDayHours>;
    for (const key of STOREFRONT_DAY_KEYS) {
      const day = b.days[key];
      const open =
        day.open && isValidHoursTime(day.openTime) && isValidHoursTime(day.closeTime);
      days[key] = { open, openTime: day.openTime, closeTime: day.closeTime };
    }
    const hours: StorefrontDesignHours = { days };
    if (b.hoursNote.trim()) {
      hours.note = b.hoursNote.trim().slice(0, 200);
    }
    business.hours = hours;
  }

  const social: NonNullable<StorefrontDesignBusiness["social"]> = {};
  if (b.instagram.trim()) social.instagram = b.instagram.trim().slice(0, 160);
  if (b.facebook.trim()) social.facebook = b.facebook.trim().slice(0, 160);
  if (b.tiktok.trim()) social.tiktok = b.tiktok.trim().slice(0, 160);
  if (b.x.trim()) social.x = b.x.trim().slice(0, 160);
  if (b.youtube.trim()) social.youtube = b.youtube.trim().slice(0, 160);
  if (Object.keys(social).length > 0) {
    business.social = social;
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

/** Keep the stored blob minimal: only what differs from the theme defaults. */
function buildDesign(
  form: DesignForm,
  themeId: string | null,
): StorefrontDesign | null {
  const design: StorefrontDesign = { version: STOREFRONT_DESIGN_VERSION };

  const brandKit: StorefrontDesign["brandKit"] = {};
  if (form.radius !== "sharp") {
    brandKit.radius = form.radius;
  }
  if (form.buttons !== "solid") {
    brandKit.buttons = form.buttons;
  }
  if (form.density !== "cozy") {
    brandKit.density = form.density;
  }
  const surface = form.surface.trim();
  if (HEX_REGEX.test(surface)) {
    brandKit.surface = surface.toLowerCase();
  }
  if (brandKit.radius || brandKit.surface) {
    design.brandKit = brandKit;
  }

  if (form.fontPairing !== "default") {
    design.fontPairing = form.fontPairing as StorefrontFontPairingId;
  }
  const themeOptions = serializeThemeOptions(themeId, form.themeOptions);
  if (themeOptions && themeId) {
    design.theme = { [themeId]: themeOptions };
  }

  const heroUrl = form.heroUrl.trim();
  if (heroUrl) {
    design.photos = {
      hero: {
        url: heroUrl,
        focalX: form.heroFocalX,
        focalY: form.heroFocalY,
        fit: form.heroFit,
      },
    };
  }

  const sections = form.sections
    .filter(
      (s) =>
        s.enabled ||
        JSON.stringify(s.settings) !==
          JSON.stringify(storefrontSectionDefaultSettings(s.id)),
    )
    .map((s) => ({ id: s.id, enabled: s.enabled, settings: s.settings }));
  if (sections.length > 0) {
    design.sections = sections;
  }

  const business = buildBusinessFromForm(form);
  if (business) {
    design.business = business;
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

export function StorefrontDesignEditor({
  business,
  onSaved,
}: {
  business: BusinessRecord | null;
  onSaved?: (business: BusinessRecord) => void;
}) {
  const liveDesign = useMemo(
    () => parseStorefrontDesignJson(business?.storefront?.designJson),
    [business?.storefront?.designJson],
  );
  const themeId = normalizeStoreThemeId(business?.storefront?.storeThemeId);
  const snapshot = useMemo(
    () => formFromDesign(liveDesign, themeId),
    [liveDesign, themeId],
  );

  const [form, setForm] = useState<DesignForm>(snapshot);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heroBusy, setHeroBusy] = useState(false);
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string | null>(
    business?.branding?.logoUrl?.trim() || null,
  );
  const heroInputRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(snapshot);

  const set = useCallback(
    <K extends keyof DesignForm>(key: K, value: DesignForm[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  const setBusiness = useCallback((patch: Partial<BusinessForm>) => {
    setForm((f) => ({ ...f, business: { ...f.business, ...patch } }));
  }, []);

  const setThemeOption = useCallback((key: string, value: ThemeOptionValue) => {
    setForm((f) => ({ ...f, themeOptions: { ...f.themeOptions, [key]: value } }));
  }, []);

  const setDay = useCallback(
    (key: StorefrontDesignDayKey, patch: Partial<StorefrontDesignDayHours>) => {
      setForm((f) => ({
        ...f,
        business: {
          ...f.business,
          days: { ...f.business.days, [key]: { ...f.business.days[key], ...patch } },
        },
      }));
    },
    [],
  );

  const patchSection = useCallback((id: StorefrontSectionId, patch: Partial<StorefrontSectionConfig>) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const patchSectionSettings = useCallback((id: StorefrontSectionId, settings: StorefrontSectionSettings) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s) => (s.id === id ? { ...s, settings } : s)),
    }));
  }, []);

  const toggleSection = useCallback(
    (id: StorefrontSectionId) => {
      setForm((f) => ({
        ...f,
        sections: f.sections.map((s) =>
          s.id === id ? { ...s, enabled: !s.enabled } : s,
        ),
      }));
    },
    [],
  );

  const moveSection = useCallback((id: StorefrontSectionId, dir: -1 | 1) => {
    setForm((f) => {
      const sections = [...f.sections];
      const idx = sections.findIndex((s) => s.id === id);
      if (idx < 0) return f;
      const region = storefrontSectionSchema(id).region;
      let target = idx + dir;
      while (
        target >= 0 &&
        target < sections.length &&
        storefrontSectionSchema(sections[target]!.id).region !== region
      ) {
        target += dir;
      }
      if (target < 0 || target >= sections.length) return f;
      const tmp = sections[idx]!;
      sections[idx] = sections[target]!;
      sections[target] = tmp;
      return { ...f, sections };
    });
  }, []);

  const [openSection, setOpenSection] = useState<StorefrontSectionId | null>(null);
  const aboutInputRef = useRef<HTMLInputElement>(null);
  const [aboutBusy, setAboutBusy] = useState(false);
  // Original (untransformed) Cloudinary URLs, so “improve” can always revert.
  const heroBaseRef = useRef(form.heroUrl);
  const aboutBaseRef = useRef(
    (form.sections.find((s) => s.id === "about")?.settings as
      | StorefrontAboutSectionSettings
      | undefined)?.imageUrl ?? "",
  );

  // Studio navigation: step rail scroll-spy + mobile preview toggle.
  const [activeStep, setActiveStep] = useState<
    "brand" | "photos" | "business" | "sections" | null
  >(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const stepRefs = {
    brand: useRef<HTMLDivElement>(null),
    photos: useRef<HTMLDivElement>(null),
    business: useRef<HTMLDivElement>(null),
    sections: useRef<HTMLDivElement>(null),
  };
  const scrollToStep = (id: keyof typeof stepRefs) => {
    stepRefs[id].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const shopBase = business?.slug
    ? slugDerivedShopUrl(business.slug) ||
      `https://${business.slug}.${PLATFORM_DOMAIN}`
    : "";
  const liveUrl = shopBase ? storefrontPreviewUrl(shopBase, "store", themeId) : null;
  const draftJson = useMemo(
    () => serializeStorefrontDesign(buildDesign(form, themeId)) ?? null,
    [form, themeId],
  );
  const draftPreviewUrl =
    shopBase && draftJson
      ? storefrontPreviewUrl(shopBase, "store", themeId, { designJson: draftJson })
      : null;
  const draftTooLarge = Boolean(draftJson && draftJson.length > 8000);

  useEffect(() => {
    setPreviewLogoUrl(business?.branding?.logoUrl?.trim() || null);
  }, [business?.branding?.logoUrl]);

  const previewData = useMemo<MiniPreviewData>(() => {
    const hero = form.sections.find((s) => s.id === "hero");
    const heroSettings = hero?.settings as StorefrontHeroSectionSettings | undefined;
    const announcement = form.sections.find((s) => s.id === "announcement");
    const promo = form.sections.find((s) => s.id === "promo");
    const promoSettings = promo?.settings as StorefrontPromoSectionSettings | undefined;
    const products = form.sections.find((s) => s.id === "products");
    return {
      storeName: business?.branding?.displayName?.trim() || business?.name || "Your shop",
      logoUrl: previewLogoUrl,
      primaryHex: business?.branding?.primaryColor ?? null,
      surface: form.surface || "#FAFAF8",
      radius: form.radius,
      buttons: form.buttons,
      density: form.density,
      heroUrl: form.heroUrl,
      heroFocalX: form.heroFocalX,
      heroFocalY: form.heroFocalY,
      heroHeadline: heroSettings?.headline || "",
      heroSubheadline: heroSettings?.subheadline || form.business.tagline || "",
      heroEnabled: hero?.enabled === true,
      announcementEnabled: announcement?.enabled === true,
      announcement:
        (announcement?.settings as StorefrontAnnouncementSectionSettings | undefined)?.text || "",
      promoEnabled: promo?.enabled === true,
      promoTitle: promoSettings?.title || "",
      promoSubtitle: promoSettings?.subtitle || "",
      promoCoupon: promoSettings?.coupon || "",
      productsEnabled: products ? products.enabled : true,
      aboutEnabled: form.sections.find((s) => s.id === "about")?.enabled === true,
      socialEnabled: form.sections.find((s) => s.id === "social")?.enabled === true,
      contactEnabled: form.sections.find((s) => s.id === "contact")?.enabled === true,
    };
  }, [form, business, previewLogoUrl]);

  const previewEditHandlers = useMemo<MiniPreviewEditHandlers>(() => {
    const heroSettings = () => {
      const hero = form.sections.find((s) => s.id === "hero");
      return (hero?.settings ??
        storefrontSectionDefaultSettings("hero")) as StorefrontHeroSectionSettings;
    };
    const announcementSettings = () => {
      const row = form.sections.find((s) => s.id === "announcement");
      return (row?.settings ??
        storefrontSectionDefaultSettings(
          "announcement",
        )) as StorefrontAnnouncementSectionSettings;
    };
    const promoSettings = () => {
      const row = form.sections.find((s) => s.id === "promo");
      return (row?.settings ??
        storefrontSectionDefaultSettings("promo")) as StorefrontPromoSectionSettings;
    };
    return {
      onHeadlineChange: (value) => {
        patchSectionSettings("hero", { ...heroSettings(), headline: value });
        patchSection("hero", { enabled: true });
      },
      onSubheadlineChange: (value) => {
        patchSectionSettings("hero", { ...heroSettings(), subheadline: value });
        patchSection("hero", { enabled: true });
      },
      onAnnouncementChange: (value) => {
        patchSectionSettings("announcement", {
          ...announcementSettings(),
          text: value,
        });
        patchSection("announcement", { enabled: true });
      },
      onPromoTitleChange: (value) => {
        patchSectionSettings("promo", { ...promoSettings(), title: value });
        patchSection("promo", { enabled: true });
      },
      onFocusSection: (id) => {
        if (id === "logo") {
          scrollToStep("brand");
          return;
        }
        if (id === "hero") {
          scrollToStep("photos");
          return;
        }
        if (id === "announcement" || id === "promo" || id === "about" || id === "social" || id === "contact" || id === "products") {
          scrollToStep("sections");
          return;
        }
        scrollToStep("business");
      },
      onLogoFile: async (file) => {
        const bid = business?.id?.trim();
        if (!bid) {
          setError("Could not resolve business for logo upload.");
          return;
        }
        try {
          const next = await uploadMyBrandingLogo(file, bid);
          const url = next.branding?.logoUrl?.trim() || null;
          setPreviewLogoUrl(url);
          onSaved?.(next);
          trackStorefrontEditEvent("storefront_logo_uploaded", {
            surface: "design_studio",
          });
          setFeedback("Logo updated.");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not upload logo");
        }
      },
    };
  }, [
    form.sections,
    patchSection,
    patchSectionSettings,
    business?.id,
    onSaved,
  ]);

  const changes = useMemo(() => {
    const groups: Record<string, string> = {
      brand: JSON.stringify({
        radius: form.radius,
        buttons: form.buttons,
        density: form.density,
        surface: form.surface.trim().toLowerCase(),
      }),
      font: JSON.stringify({
        pairing: form.fontPairing,
        options: form.themeOptions,
      }),
      photos: JSON.stringify({
        url: form.heroUrl.trim(),
        focalX: form.heroFocalX,
        focalY: form.heroFocalY,
        fit: form.heroFit,
      }),
      business: JSON.stringify(form.business),
      sections: JSON.stringify(form.sections),
    };
    const base: Record<string, string> = {
      brand: JSON.stringify({
        radius: snapshot.radius,
        buttons: snapshot.buttons,
        density: snapshot.density,
        surface: snapshot.surface.trim().toLowerCase(),
      }),
      font: JSON.stringify({
        pairing: snapshot.fontPairing,
        options: snapshot.themeOptions,
      }),
      photos: JSON.stringify({
        url: snapshot.heroUrl.trim(),
        focalX: snapshot.heroFocalX,
        focalY: snapshot.heroFocalY,
        fit: snapshot.heroFit,
      }),
      business: JSON.stringify(snapshot.business),
      sections: JSON.stringify(snapshot.sections),
    };
    return Object.keys(groups).filter((key) => groups[key] !== base[key]).length;
  }, [form, snapshot]);

  const themeOptionDefaults = useMemo(
    () => storefrontThemeOptionDefaults(themeId),
    [themeId],
  );

  const stepState = useMemo(
    () => ({
      brand:
        form.radius !== "sharp" ||
        form.buttons !== "solid" ||
        form.density !== "cozy" ||
        form.surface.trim() !== "" ||
        form.fontPairing !== "default" ||
        Object.keys(form.themeOptions).some(
          (key) => form.themeOptions[key] !== themeOptionDefaults[key],
        ),
      photos: form.heroUrl.trim() !== "",
      business:
        [
          form.business.tagline,
          form.business.description,
          form.business.phone,
          form.business.whatsapp,
          form.business.email,
          form.business.address,
          form.business.town,
          form.business.mapUrl,
          form.business.hoursNote,
          form.business.instagram,
          form.business.facebook,
          form.business.tiktok,
          form.business.x,
          form.business.youtube,
        ].some((v) => v.trim() !== "") || form.business.hoursEnabled,
      sections: form.sections.some((s) => s.enabled),
    }),
    [form, themeOptionDefaults],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("design-step-", "");
            if (
              id === "brand" ||
              id === "photos" ||
              id === "business" ||
              id === "sections"
            ) {
              setActiveStep(id);
            }
          }
        }
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    for (const key of ["brand", "photos", "business", "sections"] as const) {
      const el = stepRefs[key].current;
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // Refs are stable across renders; re-running would re-observe on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoursPreview = useMemo(() => {
    if (!form.business.hoursEnabled) return null;
    const hours: StorefrontDesignHours = {
      days: form.business.days,
      note: form.business.hoursNote.trim() || null,
    };
    return formatBusinessHours(hours);
  }, [form.business.hoursEnabled, form.business.days, form.business.hoursNote]);

  const revert = () => {
    setForm(snapshot);
    setFeedback(null);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const designJson = serializeStorefrontDesign(buildDesign(form, themeId)) ?? "";
      await updateBusiness({ storefront: { designJson } });
      const next = await fetchBusiness();
      onSaved?.(next);
      setFeedback(
        "Saved — the shop front now uses your design. Open it live to take a look.",
      );
    } catch (e) {
      setError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not save the design.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onHeroPick = async (file: File) => {
    if (!business?.id) {
      setError("Could not upload — the business record is missing an id.");
      return;
    }
    setHeroBusy(true);
    setError(null);
    try {
      const folder = `ub/${business.id}/design/hero`;
      const sig = await getCloudinarySignature(folder);
      const result = await uploadToCloudinary(file, sig);
      heroBaseRef.current = result.secure_url;
      set("heroUrl", result.secure_url);
    } catch (e) {
      setError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not upload the photo.",
      );
    } finally {
      setHeroBusy(false);
    }
  };

  const onAboutImagePick = async (file: File) => {
    if (!business?.id) {
      setError("Could not upload — the business record is missing an id.");
      return;
    }
    const about = form.sections.find((s) => s.id === "about");
    setAboutBusy(true);
    setError(null);
    try {
      const folder = `ub/${business.id}/design/about`;
      const sig = await getCloudinarySignature(folder);
      const result = await uploadToCloudinary(file, sig);
      const settings = about?.settings as StorefrontAboutSectionSettings | undefined;
      aboutBaseRef.current = result.secure_url;
      patchSectionSettings("about", {
        heading: settings?.heading ?? "",
        text: settings?.text ?? "",
        imageUrl: result.secure_url,
      });
    } catch (e) {
      setError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not upload the photo.",
      );
    } finally {
      setAboutBusy(false);
    }
  };

  const pickAboutImage = (url: string) => {
    const current = form.sections.find((s) => s.id === "about")?.settings as
      | StorefrontAboutSectionSettings
      | undefined;
    patchSectionSettings("about", {
      heading: current?.heading ?? "",
      text: current?.text ?? "",
      imageUrl: url,
    });
  };

  const applyPersonality = (preset: StorePersonalityPreset) => {
    set("radius", preset.tokens.radius);
    set("buttons", preset.tokens.buttons);
    set("density", preset.tokens.density);
    set("surface", preset.tokens.surface);
    if (preset.font) {
      set("fontPairing", preset.font);
    }
    setFeedback(
      `Applied "${preset.name}" — fine-tune below, then save when you're happy.`,
    );
  };

  const applyAiSuggestion = (suggestion: StorefrontAiSuggestResponse) => {
    const bk = suggestion.brandKit;
    if (bk) {
      if (bk.radius) set("radius", bk.radius as StorefrontDesignRadius);
      if (bk.buttons) set("buttons", bk.buttons as StorefrontDesignButtons);
      if (bk.density) set("density", bk.density as StorefrontDesignDensity);
      if (bk.surface) set("surface", bk.surface);
    }

    const cp = suggestion.copy;
    if (cp) {
      const businessPatch: Partial<BusinessForm> = {};
      if (cp.tagline) businessPatch.tagline = cp.tagline;
      if (cp.description) businessPatch.description = cp.description;
      if (Object.keys(businessPatch).length > 0) {
        setBusiness(businessPatch);
      }

      if (cp.announcement) {
        patchSectionSettings("announcement", { text: cp.announcement });
        patchSection("announcement", { enabled: true });
      }
      if (cp.promoTitle || cp.promoSubtitle || cp.coupon || cp.ctaLabel) {
        const current = form.sections.find((s) => s.id === "promo")?.settings as
          | StorefrontPromoSectionSettings
          | undefined;
        patchSectionSettings("promo", {
          title: cp.promoTitle ?? current?.title ?? "",
          subtitle: cp.promoSubtitle ?? current?.subtitle ?? "",
          endsAt: current?.endsAt ?? "",
          coupon: cp.coupon ?? current?.coupon ?? "",
          ctaLabel: cp.ctaLabel ?? current?.ctaLabel ?? "",
          whatsapp: current?.whatsapp ?? "",
        });
        patchSection("promo", { enabled: true });
      }
      if (cp.heroHeadline || cp.heroSubheadline) {
        const current = form.sections.find((s) => s.id === "hero")?.settings as
          | StorefrontHeroSectionSettings
          | undefined;
        patchSectionSettings("hero", {
          headline: cp.heroHeadline ?? current?.headline ?? "",
          subheadline: cp.heroSubheadline ?? current?.subheadline ?? "",
          height: current?.height ?? "medium",
          overlay: current?.overlay ?? "none",
          showCta: current?.showCta ?? true,
          showWhatsapp: current?.showWhatsapp ?? true,
        });
        patchSection("hero", { enabled: true });
      }
      if (cp.aboutHeading) {
        const current = form.sections.find((s) => s.id === "about")?.settings as
          | StorefrontAboutSectionSettings
          | undefined;
        patchSectionSettings("about", {
          heading: cp.aboutHeading,
          text: current?.text ?? "",
          imageUrl: current?.imageUrl ?? "",
        });
        patchSection("about", { enabled: true });
      }
      if (cp.socialHeading) {
        patchSectionSettings("social", { heading: cp.socialHeading });
        patchSection("social", { enabled: true });
      }
      if (cp.contactHeading) {
        const current = form.sections.find((s) => s.id === "contact")?.settings as
          | StorefrontContactSectionSettings
          | undefined;
        patchSectionSettings("contact", {
          heading: cp.contactHeading,
          showHours: current?.showHours ?? true,
          showMap: current?.showMap ?? true,
        });
        patchSection("contact", { enabled: true });
      }
    }
    setFeedback(
      "AI suggestions applied — review the form, then save when you're happy.",
    );
  };

  const b = form.business;

  return (
    <div className="space-y-5">
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {feedback ? <DashboardFeedback kind="success" text={feedback} /> : null}

      {showMobilePreview ? (
        <div className="flex justify-center rounded-2xl border border-border/70 bg-card p-5 shadow-sm lg:hidden">
          <StorefrontMiniPreview data={previewData} editHandlers={previewEditHandlers} />
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] xl:grid-cols-[196px_minmax(0,1fr)_minmax(220px,280px)]">
        <aside className="sticky top-24 hidden xl:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your shop
          </p>
          <nav className="mt-3 space-y-1" aria-label="Design steps">
            {(
              [
                { id: "brand", label: "Brand", icon: Palette },
                { id: "photos", label: "Photos", icon: ImageIcon },
                { id: "business", label: "Business", icon: Building2 },
                { id: "sections", label: "Sections", icon: LayoutList },
              ] as const
            ).map((step, i) => {
              const done = stepState[step.id];
              const active = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => scrollToStep(step.id)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                    active ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                      done
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground",
                      active && "border-primary/50",
                    )}
                  >
                    {done ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </nav>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Changes appear live in the preview.
          </p>
        </aside>

        <div className="min-w-0 space-y-6">
          <StorefrontDesignAiCard
            draftDesignJson={draftJson}
            onApply={(suggestion) => applyAiSuggestion(suggestion)}
          />

      <div
        ref={stepRefs.brand}
        id="design-step-brand"
        className={cn(DASHBOARD_SECTION_SURFACE, "scroll-mt-24")}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
            <Palette className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Look &amp; feel
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              These choices are <em>your</em> identity — they stay when you
              switch themes later. The theme only fills in what you leave
              alone.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <span className={dashboardLabelClass()}>Start from a mood</span>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STORE_PERSONALITY_PRESETS.map((preset) => {
              const active =
                form.radius === preset.tokens.radius &&
                form.buttons === preset.tokens.buttons &&
                form.density === preset.tokens.density &&
                form.surface.toLowerCase() ===
                  preset.tokens.surface.toLowerCase() &&
                form.fontPairing === (preset.font ?? "default");
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPersonality(preset)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border/70 bg-background hover:border-foreground/25",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span aria-hidden>{preset.emoji}</span>
                    {preset.name}
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                    {preset.vibe}
                  </span>
                </button>
              );
            })}
          </div>
          <p className={dashboardHintClass()}>
            A starting point — fine-tune below and preview. Your identity stays
            even if you change themes later.
          </p>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <span className={dashboardLabelClass()}>Corner radius</span>
            <div
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label="Corner radius"
            >
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={form.radius === opt.value}
                  onClick={() => set("radius", opt.value)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition-colors",
                    form.radius === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border/70 bg-background hover:border-foreground/25",
                  )}
                >
                  <span className="block text-sm font-medium text-foreground">
                    {opt.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
            <p className={dashboardHintClass()}>
              Changes card corners and button shape across the shop front.
            </p>
          </div>

          <div className="space-y-2">
            <label className={dashboardLabelClass()} htmlFor="design-surface">
              Page background
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="design-surface"
                type="color"
                value={HEX_REGEX.test(form.surface) ? form.surface : "#ffffff"}
                onChange={(e) => set("surface", e.target.value.toUpperCase())}
                className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background shadow-sm"
              />
              <input
                aria-label="Page background hex value"
                className={cn(
                  dashboardInputClass(),
                  "w-36 max-w-full font-mono text-sm uppercase",
                  !HEX_REGEX.test(form.surface) &&
                    form.surface.trim() &&
                    "border-destructive/60",
                )}
                value={form.surface}
                maxLength={7}
                onChange={(e) => set("surface", e.target.value)}
                placeholder="#FFFFFF"
              />
              {form.surface.trim() ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => set("surface", "")}
                >
                  Use theme default
                </Button>
              ) : null}
            </div>
            {form.surface.trim() && !HEX_REGEX.test(form.surface) ? (
              <p className="text-xs font-medium text-destructive">
                Use #RRGGBB
              </p>
            ) : (
              <p className={dashboardHintClass()}>
                Leave blank to keep the theme&apos;s own background.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <span className={dashboardLabelClass()}>Button style</span>
            <div
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label="Button style"
            >
              {BUTTON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={form.buttons === opt.value}
                  onClick={() => set("buttons", opt.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    form.buttons === opt.value
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border/70 bg-background text-muted-foreground hover:border-foreground/25",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className={dashboardHintClass()}>
              Solid fills, outlined edges, or fully round pills — on the shop
              front&apos;s buttons and offers.
            </p>
          </div>

          <div className="space-y-2">
            <span className={dashboardLabelClass()}>Spacing</span>
            <div
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label="Spacing"
            >
              {DENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={form.density === opt.value}
                  onClick={() => set("density", opt.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    form.density === opt.value
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border/70 bg-background text-muted-foreground hover:border-foreground/25",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className={dashboardHintClass()}>
              How much breathing room between sections — compact shops pack
              more above the fold.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <span className={dashboardLabelClass()}>Typography voice</span>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STOREFRONT_FONT_PAIRINGS.map((pairing) => {
              const active = form.fontPairing === pairing.id;
              return (
                <button
                  key={pairing.id}
                  type="button"
                  onClick={() => set("fontPairing", pairing.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border/70 bg-background hover:border-foreground/25",
                  )}
                >
                  <span
                    className="block text-xl leading-none text-foreground"
                    style={
                      pairing.display
                        ? { fontFamily: pairing.display.style.fontFamily }
                        : undefined
                    }
                  >
                    Aa
                  </span>
                  <span className="mt-2 block text-sm font-medium text-foreground">
                    {pairing.name}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {pairing.vibe}
                  </span>
                </button>
              );
            })}
          </div>
          <p className={dashboardHintClass()}>
            Headlines use the display font and the rest of the shop uses the
            body font. Pick “Theme&apos;s own voice” to keep the theme&apos;s
            lettering.
          </p>
        </div>

        {storefrontThemeOptionDefs(themeId).length > 0 ? (
          <div className="mt-6 space-y-3">
            <span className={dashboardLabelClass()}>
              Theme personality · {storeThemeMeta(themeId).name}
            </span>
            <div className="grid gap-4 sm:grid-cols-2">
              {storefrontThemeOptionDefs(themeId).map((def) => (
                <ThemeOptionControl
                  key={def.key}
                  def={def}
                  value={form.themeOptions[def.key] ?? def.default}
                  onChange={(value) => setThemeOption(def.key, value)}
                />
              ))}
            </div>
            <p className={dashboardHintClass()}>
              Extra dials this theme offers — saved per theme, so switching
              looks keeps each one&apos;s personality.
            </p>
          </div>
        ) : null}
      </div>

      <div
        ref={stepRefs.photos}
        id="design-step-photos"
        className={cn(DASHBOARD_SECTION_SURFACE, "scroll-mt-24")}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <ImageIcon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Hero photo
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              The first thing people see. Upload a photo of the shop, the
              shelves, or your best product — then tell the theme which part
              matters most.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onHeroPick(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={heroBusy}
              onClick={() => heroInputRef.current?.click()}
            >
              {heroBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="size-4" aria-hidden />
              )}
              {form.heroUrl ? "Replace photo" : "Upload photo"}
            </Button>
            {form.heroUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => set("heroUrl", "")}
              >
                <X className="size-4" aria-hidden />
                Remove — use theme photo
              </Button>
            ) : null}
          </div>

          {form.heroUrl ? (
            <>
              <ImageFocalPointPicker
                src={form.heroUrl}
                alt="Hero photo preview"
                focalX={form.heroFocalX}
                focalY={form.heroFocalY}
                onChange={(x, y) => {
                  set("heroFocalX", x);
                  set("heroFocalY", y);
                }}
              />
              <div className="space-y-2">
                <span className={dashboardLabelClass()}>How the photo fits</span>
                <div
                  className="flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-label="Hero photo fit"
                >
                  {FIT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={form.heroFit === opt.value}
                      onClick={() => set("heroFit", opt.value)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                        form.heroFit === opt.value
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                          : "border-border/70 bg-background text-muted-foreground hover:border-foreground/25",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className={dashboardLabelClass()}>Improve the photo</span>
                <CloudinaryTransformRow
                  baseUrl={heroBaseRef.current}
                  url={form.heroUrl}
                  onPick={(url) => set("heroUrl", url)}
                />
                <p className={dashboardHintClass()}>
                  Try an improvement — the shop keeps the original until you
                  save.
                </p>
              </div>
            </>
          ) : (
            <p className={dashboardHintClass()}>
              Without a photo here, the theme uses your store banners or a
              featured product image — the way it does today.
            </p>
          )}
        </div>
      </div>

      <div
        ref={stepRefs.business}
        id="design-step-business"
        className={cn(DASHBOARD_SECTION_SURFACE, "scroll-mt-24")}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
            <Building2 className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Business details
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              One place to describe the shop, share opening hours, and link
              your socials. Every theme uses these automatically — set them
              once, change the look as often as you like.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <label className={dashboardLabelClass()} htmlFor="design-tagline">
                Tagline
              </label>
              <input
                id="design-tagline"
                className={dashboardInputClass()}
                value={b.tagline}
                maxLength={120}
                onChange={(e) => setBusiness({ tagline: e.target.value })}
                placeholder="Pens, paper, gifts and everyday essentials."
              />
              <p className={dashboardHintClass()}>
                The short line under your business name.
              </p>
            </div>

            <div className="space-y-2">
              <label className={dashboardLabelClass()} htmlFor="design-description">
                About the shop
              </label>
              <textarea
                id="design-description"
                className={cn(dashboardInputClass(), "min-h-22 resize-y")}
                value={b.description}
                maxLength={1200}
                onChange={(e) => setBusiness({ description: e.target.value })}
                placeholder="What do you sell? What makes the shop special?"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <label className={dashboardLabelClass()} htmlFor="design-phone">
                Phone
              </label>
              <input
                id="design-phone"
                className={dashboardInputClass()}
                value={b.phone}
                maxLength={32}
                onChange={(e) => setBusiness({ phone: e.target.value })}
                placeholder="+254 7XX XXX XXX"
              />
            </div>
            <div className="space-y-2">
              <label className={dashboardLabelClass()} htmlFor="design-whatsapp">
                WhatsApp
              </label>
              <input
                id="design-whatsapp"
                className={dashboardInputClass()}
                value={b.whatsapp}
                maxLength={32}
                onChange={(e) => setBusiness({ whatsapp: e.target.value })}
                placeholder="+254 7XX XXX XXX"
              />
            </div>
            <div className="space-y-2">
              <label className={dashboardLabelClass()} htmlFor="design-email">
                Email
              </label>
              <input
                id="design-email"
                type="email"
                className={dashboardInputClass()}
                value={b.email}
                maxLength={120}
                onChange={(e) => setBusiness({ email: e.target.value })}
                placeholder="hello@shop.co.ke"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <label className={dashboardLabelClass()} htmlFor="design-address">
                Address
              </label>
              <input
                id="design-address"
                className={dashboardInputClass()}
                value={b.address}
                maxLength={200}
                onChange={(e) => setBusiness({ address: e.target.value })}
                placeholder="Moi Avenue, Jubilee House"
              />
            </div>
            <div className="space-y-2">
              <label className={dashboardLabelClass()} htmlFor="design-town">
                Town / area
              </label>
              <input
                id="design-town"
                className={dashboardInputClass()}
                value={b.town}
                maxLength={80}
                onChange={(e) => setBusiness({ town: e.target.value })}
                placeholder="Nairobi"
              />
            </div>
            <div className="space-y-2">
              <label className={dashboardLabelClass()} htmlFor="design-map">
                Google Maps link
              </label>
              <input
                id="design-map"
                className={dashboardInputClass()}
                value={b.mapUrl}
                maxLength={600}
                onChange={(e) => setBusiness({ mapUrl: e.target.value })}
                placeholder="https://maps.google.com/…"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/25 p-4">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={b.hoursEnabled}
                onChange={(e) => setBusiness({ hoursEnabled: e.target.checked })}
                className="mt-0.5 size-4 accent-primary"
              />
              <span className="text-sm font-medium text-foreground">
                Show opening hours on my page
              </span>
            </label>

            {b.hoursEnabled ? (
              <>
                <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
                  {STOREFRONT_DAY_KEYS.map((key, i) => {
                    const day = b.days[key];
                    return (
                      <div
                        key={key}
                        className={cn(
                          "grid grid-cols-[5rem_auto_1fr_1fr] items-center gap-2 px-3 py-2",
                          i > 0 && "border-t border-border/50",
                        )}
                      >
                        <span className="text-sm font-medium text-foreground">
                          {STOREFRONT_DAY_SHORT_LABELS[key]}
                        </span>
                        <input
                          type="checkbox"
                          aria-label={`Open on ${STOREFRONT_DAY_LABELS[key]}`}
                          checked={day.open}
                          onChange={(e) => setDay(key, { open: e.target.checked })}
                          className="size-4 accent-primary"
                        />
                        <input
                          type="time"
                          aria-label={`${STOREFRONT_DAY_LABELS[key]} opening time`}
                          value={day.openTime}
                          disabled={!day.open}
                          onChange={(e) => setDay(key, { openTime: e.target.value })}
                          className={cn(
                            dashboardInputClass(),
                            "py-1.5",
                            day.open &&
                              !isValidHoursTime(day.openTime) &&
                              "border-destructive/60",
                          )}
                        />
                        <input
                          type="time"
                          aria-label={`${STOREFRONT_DAY_LABELS[key]} closing time`}
                          value={day.closeTime}
                          disabled={!day.open}
                          onChange={(e) => setDay(key, { closeTime: e.target.value })}
                          className={cn(
                            dashboardInputClass(),
                            "py-1.5",
                            day.open &&
                              !isValidHoursTime(day.closeTime) &&
                              "border-destructive/60",
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={dashboardInputClass()}
                    value={b.hoursNote}
                    maxLength={200}
                    onChange={(e) => setBusiness({ hoursNote: e.target.value })}
                    placeholder="Extra note (optional) — e.g. Open on public holidays"
                  />
                  {hoursPreview ? (
                    <p className="self-center text-sm text-muted-foreground">
                      Shown as:{" "}
                      <span className="font-medium text-foreground">
                        {hoursPreview}
                      </span>
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-2">
            <span className={dashboardLabelClass()}>Social links</span>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SOCIAL_FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor={`design-social-${key}`}
                  >
                    {label}
                  </label>
                  <input
                    id={`design-social-${key}`}
                    className={dashboardInputClass()}
                    value={b[key]}
                    maxLength={160}
                    onChange={(e) => setBusiness({ [key]: e.target.value })}
                    placeholder="@handle or full link"
                  />
                </div>
              ))}
            </div>
            <p className={dashboardHintClass()}>
              Handles or full links both work — e.g.{" "}
              <span className="font-mono text-xs">@palmart</span> or{" "}
              <span className="font-mono text-xs">facebook.com/palmart</span>.
            </p>
          </div>
        </div>
      </div>

      <div
        ref={stepRefs.sections}
        id="design-step-sections"
        className={cn(DASHBOARD_SECTION_SURFACE, "scroll-mt-24")}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <LayoutList className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Sections
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              Think of the shop front as blocks. Show or hide them and change
              the order — the product shelves always stay, these wrap around
              them.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-6">
          {(["pre", "shelves", "post"] as const).map((region) => {
            const regionSections = form.sections.filter(
              (s) => storefrontSectionSchema(s.id).region === region,
            );
            return (
              <div key={region} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <p className={dashboardFilterFieldLabelClass()}>
                    {region === "pre"
                      ? "Above the products"
                      : region === "shelves"
                        ? "The shop shelves"
                        : "Below the products"}
                  </p>
                  {region === "shelves" ? (
                    <p className={dashboardHintClass()}>
                      Parts built into the theme. The hero and the product
                      shelves work on every theme; the category grid is
                      currently on Mart aisles only.
                    </p>
                  ) : null}
                </div>
                <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                  {regionSections.map((section) => {
                    const schema = storefrontSectionSchema(section.id);
                    const Icon = SECTION_ICONS[section.id];
                    const open = openSection === section.id;
                    const idx = regionSections.findIndex((s) => s.id === section.id);
                    return (
                      <div key={section.id}>
                        <div
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 transition-opacity",
                            !section.enabled && "opacity-55",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={section.enabled}
                            onChange={() => toggleSection(section.id)}
                            aria-label={`Show ${schema.label}`}
                            className="size-4 shrink-0 accent-primary"
                          />
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Icon className="size-4" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-tight text-foreground">
                              {schema.label}
                            </p>
                            <p className="truncate text-xs leading-snug text-muted-foreground">
                              {schema.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveSection(section.id, -1)}
                              disabled={idx <= 0}
                              aria-label={`Move ${schema.label} up`}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <ChevronUp className="size-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSection(section.id, 1)}
                              disabled={idx >= regionSections.length - 1}
                              aria-label={`Move ${schema.label} down`}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <ChevronDown className="size-4" aria-hidden />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setOpenSection(open ? null : section.id)}
                            aria-expanded={open}
                            aria-label={`${schema.label} settings`}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            {open ? (
                              <ChevronDown className="size-4" aria-hidden />
                            ) : (
                              <ChevronRight className="size-4" aria-hidden />
                            )}
                          </button>
                        </div>
                        {open ? (
                          <div className="border-t border-border/60 bg-muted/20 px-4 py-4">
                            <SectionSettingsPanel
                              section={section}
                              onChange={(settings) =>
                                patchSectionSettings(section.id, settings)
                              }
                              aboutBusy={aboutBusy}
                              aboutInputRef={aboutInputRef}
                              aboutBaseUrl={aboutBaseRef.current}
                              onAboutImagePick={(file) => void onAboutImagePick(file)}
                              onPickAboutImage={(url) => pickAboutImage(url)}
                              onClearAboutImage={() => {
                                const s =
                                  section.settings as StorefrontAboutSectionSettings;
                                patchSectionSettings("about", {
                                  heading: s.heading,
                                  text: s.text,
                                  imageUrl: "",
                                });
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 flex flex-col items-center gap-3">
            <StorefrontMiniPreview data={previewData} editHandlers={previewEditHandlers} />
            <div className="text-center">
              <p className="text-xs font-semibold text-foreground">Live preview</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Click headlines to type · click the logo to upload.
              </p>
              {draftPreviewUrl ? (
                <Button asChild variant="outline" size="sm" className="mt-2 gap-1.5">
                  <Link
                    href={draftPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={
                      draftTooLarge
                        ? "This design is too large to preview without saving."
                        : "Open the real shop with your unsaved changes"
                    }
                    aria-disabled={draftTooLarge}
                    onClick={(e) => {
                      if (draftTooLarge) e.preventDefault();
                    }}
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    Preview as customer
                  </Link>
                </Button>
              ) : null}
              {liveUrl ? (
                <Link
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-primary underline underline-offset-2"
                >
                  Open live shop
                </Link>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-4 z-20">
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.4)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {dirty
                ? `${changes} ${changes === 1 ? "area" : "areas"} changed`
                : "All changes saved"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {dirty
                ? "Review the live preview, then save when it feels right."
                : "Customers see the saved design."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 lg:hidden"
              onClick={() => setShowMobilePreview((v) => !v)}
            >
              <Eye className="size-4" aria-hidden />
              {showMobilePreview ? "Hide preview" : "Preview"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={revert}
              disabled={!dirty || saving}
              className="gap-1.5"
            >
              <Undo2 className="size-4" aria-hidden />
              Undo
            </Button>
            {draftPreviewUrl ? (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link
                  href={draftPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={
                    draftTooLarge
                      ? "This design is too large to preview without saving."
                      : "Preview the shop with your unsaved changes"
                  }
                  aria-disabled={draftTooLarge}
                  onClick={(e) => {
                    if (draftTooLarge) e.preventDefault();
                  }}
                >
                  <ExternalLink className="size-4" aria-hidden />
                  Preview my shop
                </Link>
              </Button>
            ) : null}
            <Button
              onClick={() => void save()}
              disabled={saving || !dirty}
              size="sm"
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              {dirty ? "Save design" : "Saved"}
            </Button>
          </div>
        </div>
      </div>

      {!business?.storefront?.enabled ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          The shop is not selling online yet, so visitors see the closed-sign
          page. Your design appears the moment you turn selling on in{" "}
          <Link
            href={APP_ROUTES.businessSettings}
            className="font-medium underline underline-offset-2"
          >
            Settings
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

const SECTION_ICONS: Record<StorefrontSectionId, LucideIcon> = {
  announcement: Megaphone,
  promo: BadgePercent,
  hero: ImageIcon,
  categories: LayoutGrid,
  products: ShoppingBag,
  about: Store,
  social: Share2,
  contact: MapPinned,
};

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string {
  if (!value) {
    return "";
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function SettingsField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className={dashboardLabelClass()} htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionSettingsPanel({
  section,
  onChange,
  aboutBusy,
  aboutInputRef,
  aboutBaseUrl,
  onAboutImagePick,
  onPickAboutImage,
  onClearAboutImage,
}: {
  section: StorefrontSectionConfig;
  onChange: (settings: StorefrontSectionSettings) => void;
  aboutBusy: boolean;
  aboutInputRef: RefObject<HTMLInputElement | null>;
  aboutBaseUrl: string;
  onAboutImagePick: (file: File) => void;
  onPickAboutImage: (url: string) => void;
  onClearAboutImage: () => void;
}) {
  const id = section.id;
  switch (id) {
    case "announcement": {
      const settings = section.settings as StorefrontAnnouncementSectionSettings;
      return (
        <div className="space-y-3">
          <SettingsField id={`sf-ann-text`} label="Message">
            <input
              id={`sf-ann-text`}
              className={dashboardInputClass()}
              value={settings.text}
              maxLength={200}
              onChange={(e) => onChange({ text: e.target.value })}
              placeholder="Free delivery within Nairobi today"
            />
          </SettingsField>
        </div>
      );
    }
    case "promo": {
      const settings = section.settings as StorefrontPromoSectionSettings;
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsField id={`sf-promo-title`} label="Offer headline">
            <input
              id={`sf-promo-title`}
              className={dashboardInputClass()}
              value={settings.title}
              maxLength={120}
              onChange={(e) => onChange({ ...settings, title: e.target.value })}
              placeholder="20% OFF selected household products"
            />
          </SettingsField>
          <SettingsField id={`sf-promo-subtitle`} label="Subtitle">
            <input
              id={`sf-promo-subtitle`}
              className={dashboardInputClass()}
              value={settings.subtitle}
              maxLength={200}
              onChange={(e) => onChange({ ...settings, subtitle: e.target.value })}
              placeholder="While stock lasts"
            />
          </SettingsField>
          <SettingsField id={`sf-promo-ends`} label="Offer ends (countdown)">
            <input
              id={`sf-promo-ends`}
              type="datetime-local"
              className={dashboardInputClass()}
              value={isoToLocalInput(settings.endsAt)}
              onChange={(e) =>
                onChange({ ...settings, endsAt: localInputToIso(e.target.value) })
              }
            />
          </SettingsField>
          <SettingsField id={`sf-promo-coupon`} label="Coupon code">
            <input
              id={`sf-promo-coupon`}
              className={cn(dashboardInputClass(), "font-mono uppercase")}
              value={settings.coupon}
              maxLength={40}
              onChange={(e) => onChange({ ...settings, coupon: e.target.value })}
              placeholder="WELCOME10"
            />
          </SettingsField>
          <SettingsField id={`sf-promo-wa`} label="WhatsApp number (button)">
            <input
              id={`sf-promo-wa`}
              className={dashboardInputClass()}
              value={settings.whatsapp}
              maxLength={32}
              onChange={(e) => onChange({ ...settings, whatsapp: e.target.value })}
              placeholder="254712345678"
            />
          </SettingsField>
          <SettingsField id={`sf-promo-cta`} label="Button label">
            <input
              id={`sf-promo-cta`}
              className={dashboardInputClass()}
              value={settings.ctaLabel}
              maxLength={60}
              onChange={(e) => onChange({ ...settings, ctaLabel: e.target.value })}
              placeholder="Message us"
            />
          </SettingsField>
        </div>
      );
    }
    case "hero": {
      const settings = section.settings as StorefrontHeroSectionSettings;
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsField id={`sf-hero-headline`} label="Headline">
            <input
              id={`sf-hero-headline`}
              className={dashboardInputClass()}
              value={settings.headline}
              maxLength={120}
              onChange={(e) => onChange({ ...settings, headline: e.target.value })}
              placeholder="Leave blank to use the shop announcement"
            />
          </SettingsField>
          <SettingsField id={`sf-hero-subhead`} label="Subheadline">
            <input
              id={`sf-hero-subhead`}
              className={dashboardInputClass()}
              value={settings.subheadline}
              maxLength={120}
              onChange={(e) =>
                onChange({ ...settings, subheadline: e.target.value })
              }
              placeholder="Leave blank to use the business tagline"
            />
          </SettingsField>
          <div className="space-y-2">
            <span className={dashboardLabelClass()}>Height</span>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Hero height"
            >
              {HERO_HEIGHT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={settings.height === opt.value}
                  onClick={() => onChange({ ...settings, height: opt.value })}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    settings.height === opt.value
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border/70 bg-background text-muted-foreground hover:border-foreground/25",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className={dashboardLabelClass()}>Photo overlay</span>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Hero photo overlay"
            >
              {HERO_OVERLAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={settings.overlay === opt.value}
                  onClick={() => onChange({ ...settings, overlay: opt.value })}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    settings.overlay === opt.value
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border/70 bg-background text-muted-foreground hover:border-foreground/25",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-5 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={settings.showCta}
                onChange={(e) => onChange({ ...settings, showCta: e.target.checked })}
                className="size-4 accent-primary"
              />
              Show the “Shop now” button
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={settings.showWhatsapp}
                onChange={(e) =>
                  onChange({ ...settings, showWhatsapp: e.target.checked })
                }
                className="size-4 accent-primary"
              />
              Show the WhatsApp button
            </label>
          </div>
        </div>
      );
    }
    case "categories":
      return (
        <p className={dashboardHintClass()}>
          Hiding this removes the category grid — customers can still browse
          everything from the search bar and the filters above the products.
        </p>
      );
    case "products":
      return (
        <p className={dashboardHintClass()}>
          Hiding this removes the product shelves and the filters. Use it for a
          “coming soon” shop front that only shows your story and contact
          details.
        </p>
      );
    case "about": {
      const settings = section.settings as StorefrontAboutSectionSettings;
      return (
        <div className="space-y-3">
          <SettingsField id={`sf-about-heading`} label="Heading">
            <input
              id={`sf-about-heading`}
              className={dashboardInputClass()}
              value={settings.heading}
              maxLength={80}
              onChange={(e) => onChange({ ...settings, heading: e.target.value })}
              placeholder="About us"
            />
          </SettingsField>
          <SettingsField id={`sf-about-text`} label="Story">
            <textarea
              id={`sf-about-text`}
              className={cn(dashboardInputClass(), "min-h-22 resize-y")}
              value={settings.text}
              maxLength={1200}
              onChange={(e) => onChange({ ...settings, text: e.target.value })}
              placeholder="Leave blank to use the About the shop text from Business details."
            />
          </SettingsField>
          <div className="space-y-2">
            <span className={dashboardLabelClass()}>Photo (optional)</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={aboutInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onAboutImagePick(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={aboutBusy}
                onClick={() => aboutInputRef.current?.click()}
              >
                {aboutBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <ImagePlus className="size-4" aria-hidden />
                )}
                {settings.imageUrl ? "Replace photo" : "Upload photo"}
              </Button>
              {settings.imageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearAboutImage}
                >
                  <X className="size-4" aria-hidden />
                  Remove
                </Button>
              ) : null}
            </div>
            {settings.imageUrl ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settings.imageUrl}
                  alt="About section photo preview"
                  className="h-28 w-full max-w-xs rounded-lg border border-border/70 object-cover"
                />
                <CloudinaryTransformRow
                  baseUrl={aboutBaseUrl}
                  url={settings.imageUrl}
                  onPick={onPickAboutImage}
                />
              </div>
            ) : null}
          </div>
        </div>
      );
    }
    case "social": {
      const settings = section.settings as StorefrontSocialSectionSettings;
      return (
        <div className="space-y-3">
          <SettingsField id={`sf-social-heading`} label="Heading">
            <input
              id={`sf-social-heading`}
              className={dashboardInputClass()}
              value={settings.heading}
              maxLength={80}
              onChange={(e) => onChange({ heading: e.target.value })}
              placeholder="Follow us"
            />
          </SettingsField>
          <p className={dashboardHintClass()}>
            Links come from Business details → Social links. The section hides
            itself when there are no links yet.
          </p>
        </div>
      );
    }
    case "contact": {
      const settings = section.settings as StorefrontContactSectionSettings;
      return (
        <div className="space-y-3">
          <SettingsField id={`sf-contact-heading`} label="Heading">
            <input
              id={`sf-contact-heading`}
              className={dashboardInputClass()}
              value={settings.heading}
              maxLength={80}
              onChange={(e) => onChange({ ...settings, heading: e.target.value })}
              placeholder="Visit us"
            />
          </SettingsField>
          <div className="flex flex-wrap gap-5">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={settings.showHours}
                onChange={(e) => onChange({ ...settings, showHours: e.target.checked })}
                className="size-4 accent-primary"
              />
              Show opening hours
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={settings.showMap}
                onChange={(e) => onChange({ ...settings, showMap: e.target.checked })}
                className="size-4 accent-primary"
              />
              Show map / directions
            </label>
          </div>
          <p className={dashboardHintClass()}>
            Details come from Business details → Contact &amp; location. The
            section hides itself when there is nothing to show.
          </p>
        </div>
      );
    }
  }
}
