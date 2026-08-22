"use client";

import Link from "next/link";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  BadgePercent,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  ImagePlus,
  LayoutList,
  Loader2,
  MapPinned,
  Megaphone,
  Save,
  Share2,
  Store,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";

import { ImageFocalPointPicker } from "@/components/business/image-focal-point-picker";
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
  uploadToCloudinary,
  type BusinessRecord,
} from "@/lib/api";
import { APP_ROUTES, PLATFORM_DOMAIN, slugDerivedShopUrl } from "@/lib/config";
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
  type StorefrontDesignDayHours,
  type StorefrontDesignDayKey,
  type StorefrontDesignHours,
  type StorefrontDesignImageFit,
  type StorefrontDesignRadius,
  type StorefrontPromoSectionSettings,
  type StorefrontSectionConfig,
  type StorefrontSectionId,
  type StorefrontSectionSettings,
  type StorefrontSocialSectionSettings,
} from "@/lib/storefront-design";
import { storefrontPreviewUrl } from "@/lib/storefront-preview";
import { normalizeStoreThemeId } from "@/lib/storefront-templates";
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
  /** Page background override; empty = use the theme's own background. */
  surface: string;
  heroUrl: string;
  heroFocalX: number;
  heroFocalY: number;
  heroFit: StorefrontDesignImageFit;
  business: BusinessForm;
  /** All five section slots in canonical order; enable + configure as wanted. */
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

function formFromDesign(design: StorefrontDesign | null | undefined): DesignForm {
  const sections: StorefrontSectionConfig[] = STOREFRONT_SECTION_IDS.map((id) => {
    const existing = design?.sections?.find((s) => s.id === id);
    return existing
      ? { id, enabled: existing.enabled, settings: existing.settings }
      : { id, enabled: false, settings: storefrontSectionDefaultSettings(id) };
  });
  return {
    radius: design?.brandKit?.radius ?? "sharp",
    surface: design?.brandKit?.surface ?? "",
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
function buildDesign(form: DesignForm): StorefrontDesign | null {
  const design: StorefrontDesign = { version: STOREFRONT_DESIGN_VERSION };

  const brandKit: StorefrontDesign["brandKit"] = {};
  if (form.radius !== "sharp") {
    brandKit.radius = form.radius;
  }
  const surface = form.surface.trim();
  if (HEX_REGEX.test(surface)) {
    brandKit.surface = surface.toLowerCase();
  }
  if (brandKit.radius || brandKit.surface) {
    design.brandKit = brandKit;
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

  if (!design.brandKit && !design.photos && !design.business && !design.sections) {
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
  const snapshot = useMemo(() => formFromDesign(liveDesign), [liveDesign]);

  const [form, setForm] = useState<DesignForm>(snapshot);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heroBusy, setHeroBusy] = useState(false);
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

  const shopBase = business?.slug
    ? slugDerivedShopUrl(business.slug) ||
      `https://${business.slug}.${PLATFORM_DOMAIN}`
    : "";
  const liveUrl = shopBase
    ? storefrontPreviewUrl(
        shopBase,
        "store",
        normalizeStoreThemeId(business?.storefront?.storeThemeId),
      )
    : null;

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
      const designJson = serializeStorefrontDesign(buildDesign(form)) ?? "";
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
      patchSectionSettings("about", {
        ...(settings ?? storefrontSectionDefaultSettings("about")),
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

  const b = form.business;

  return (
    <div className="space-y-6">
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {feedback ? <DashboardFeedback kind="success" text={feedback} /> : null}

      <div className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <ImagePlus className="size-5" aria-hidden />
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
      </div>

      <div className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <ImagePlus className="size-5" aria-hidden />
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
            </>
          ) : (
            <p className={dashboardHintClass()}>
              Without a photo here, the theme uses your store banners or a
              featured product image — the way it does today.
            </p>
          )}
        </div>
      </div>

      <div className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
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

      <div className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
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
          {(["pre", "post"] as const).map((region) => {
            const regionSections = form.sections.filter(
              (s) => storefrontSectionSchema(s.id).region === region,
            );
            return (
              <div key={region} className="space-y-2">
                <p className={dashboardFilterFieldLabelClass()}>
                  {region === "pre" ? "Above the products" : "Below the products"}
                </p>
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
                              onAboutImagePick={(file) => void onAboutImagePick(file)}
                              onClearAboutImage={() =>
                                patchSectionSettings("about", {
                                  ...(section.settings as StorefrontAboutSectionSettings),
                                  imageUrl: "",
                                })
                              }
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

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void save()} disabled={saving || !dirty}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          {dirty ? "Save design" : "Saved"}
        </Button>
        <Button
          variant="outline"
          onClick={revert}
          disabled={!dirty || saving}
          className="gap-1.5"
        >
          <Undo2 className="size-4" aria-hidden />
          Undo changes
        </Button>
        {liveUrl ? (
          <Button asChild variant="ghost" className="gap-1.5">
            <Link href={liveUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              Open live shop
            </Link>
          </Button>
        ) : null}
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
  onAboutImagePick,
  onClearAboutImage,
}: {
  section: StorefrontSectionConfig;
  onChange: (settings: StorefrontSectionSettings) => void;
  aboutBusy: boolean;
  aboutInputRef: RefObject<HTMLInputElement | null>;
  onAboutImagePick: (file: File) => void;
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
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.imageUrl}
                alt="About section photo preview"
                className="h-28 w-full max-w-xs rounded-lg border border-border/70 object-cover"
              />
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
