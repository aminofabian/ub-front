"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import {
  AlertCircle,
  ArrowRight,
  Brush,
  Globe,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { BrandingTemplateSection } from "@/components/business/branding-template-section";
import { BusinessPageLayout } from "@/components/business-hub/business-page-layout";
import { HubSettingsSectionNav } from "@/components/business-hub/hub-settings-section-nav";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DashboardAccessDenied,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { BRAND_ACCENT, BRAND_PRIMARY } from "@/lib/brand-colors";
import {
  BRANDING_COLOR_PRESETS,
  brandingPresetMatches,
  type BrandingColorPreset,
} from "@/lib/branding-color-presets";
import { APP_ROUTES, PLATFORM_DOMAIN } from "@/lib/config";
import { setDocumentFavicon } from "@/lib/document-favicon";
import {
  defaultStorefrontMetaDescription,
  defaultStorefrontMetaTitle,
  localitiesFromBranches,
  resolveStorefrontMetaDescription,
  resolveStorefrontMetaTitle,
  type StorefrontSeoLocation,
} from "@/lib/storefront-seo-defaults";
import { resolveBusinessFaviconHref } from "@/lib/tenant-favicon-path";
import { cn } from "@/lib/utils";
import {
  clearMyBrandingFavicon,
  clearMyBrandingLogo,
  clearMyBrandingOgImage,
  deleteMyBrandingBanner,
  fetchBranches,
  fetchBusiness,
  reorderMyBrandingBanners,
  updateMyBranding,
  uploadMyBrandingBanner,
  uploadMyBrandingFavicon,
  uploadMyBrandingLogo,
  uploadMyBrandingOgImage,
  type BrandingPatchPayload,
  type BrandingRecord,
  type BranchRecord,
  type BusinessRecord,
} from "@/lib/api";

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_PRIMARY = BRAND_PRIMARY;
const DEFAULT_ACCENT = BRAND_ACCENT;
const ACCEPTED_LOGO_TYPES = "image/png,image/jpeg,image/webp,image/svg+xml";
const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const ACCEPTED_FAVICON_TYPES =
  "image/png,image/x-icon,image/vnd.microsoft.icon,image/webp,.ico";
const MAX_FAVICON_BYTES = 512 * 1024;
const ACCEPTED_OG_IMAGE_TYPES = "image/png,image/jpeg,image/webp";
const MAX_OG_IMAGE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_BANNER_TYPES = "image/png,image/jpeg,image/webp";
const MAX_BANNER_BYTES = 5 * 1024 * 1024;

type FormState = {
  displayName: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  metaKeywords: string;
  heroBannerUrls: string[];
};

type Feedback = { kind: "success" | "error"; text: string } | null;

function emptyForm(): FormState {
  return {
    displayName: "",
    faviconUrl: "",
    primaryColor: DEFAULT_PRIMARY,
    accentColor: DEFAULT_ACCENT,
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
    metaKeywords: "",
    heroBannerUrls: [],
  };
}

function formFromBranding(b: BrandingRecord | undefined | null): FormState {
  return {
    displayName: String(b?.displayName ?? ""),
    faviconUrl: String(b?.faviconUrl ?? ""),
    primaryColor: normalizeHex(b?.primaryColor) ?? DEFAULT_PRIMARY,
    accentColor: normalizeHex(b?.accentColor) ?? DEFAULT_ACCENT,
    metaTitle: String(b?.metaTitle ?? ""),
    metaDescription: String(b?.metaDescription ?? ""),
    ogImage: String(b?.ogImage ?? ""),
    metaKeywords: String(b?.metaKeywords ?? ""),
    heroBannerUrls: b?.heroBannerUrls ?? [],
  };
}

function normalizeHex(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  return HEX_REGEX.test(trimmed) ? trimmed.toUpperCase() : null;
}

function buildPatch(next: FormState): BrandingPatchPayload {
  return {
    displayName: next.displayName.trim(),
    faviconUrl: next.faviconUrl.trim(),
    primaryColor: next.primaryColor.toUpperCase(),
    accentColor: next.accentColor.toUpperCase(),
    metaTitle: next.metaTitle.trim() || null,
    metaDescription: next.metaDescription.trim() || null,
    ogImage: next.ogImage.trim() || null,
    metaKeywords: next.metaKeywords.trim() || null,
  };
}

function keepUnsavedFields(
  prev: FormState,
  branding: BrandingRecord | undefined | null,
  previousSaved: FormState,
): FormState {
  const next = formFromBranding(branding);
  return {
    displayName: prev.displayName,
    primaryColor: prev.primaryColor,
    accentColor: prev.accentColor,
    metaTitle: prev.metaTitle,
    metaDescription: prev.metaDescription,
    metaKeywords: prev.metaKeywords,
    faviconUrl:
      next.faviconUrl !== previousSaved.faviconUrl
        ? next.faviconUrl
        : prev.faviconUrl,
    ogImage:
      next.ogImage !== previousSaved.ogImage ? next.ogImage : prev.ogImage,
    heroBannerUrls: next.heroBannerUrls,
  };
}

function isFormDirty(form: FormState, saved: FormState): boolean {
  return (
    form.displayName !== saved.displayName ||
    form.faviconUrl !== saved.faviconUrl ||
    form.primaryColor !== saved.primaryColor ||
    form.accentColor !== saved.accentColor ||
    form.metaTitle !== saved.metaTitle ||
    form.metaDescription !== saved.metaDescription ||
    form.ogImage !== saved.ogImage ||
    form.metaKeywords !== saved.metaKeywords
  );
}

function BrandingSection({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn(HUB_SURFACE, "scroll-mt-24 p-4 sm:p-5")}>
      <div className="border-b border-[#E6E1D8]/80 pb-3">
        <h2 className="font-heading text-sm font-semibold tracking-tight text-[#141414]">
          {title}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-[#7A7A7A]">{hint}</p>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function inputClass() {
  return cn(
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
  );
}

function labelClass() {
  return "text-sm font-medium leading-none text-foreground";
}

function hintClass() {
  return "text-xs leading-relaxed text-muted-foreground";
}

function BrandingColorPresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: BrandingColorPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li role="presentation">
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={onSelect}
        title={preset.name}
        className={cn(
          "flex w-full flex-col gap-1 rounded-lg border bg-card p-1.5 text-left transition-colors",
          "hover:border-[#B08D48]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
          selected
            ? "border-[#B08D48] ring-2 ring-[#B08D48]/20"
            : "border-[#E6E1D8]",
        )}
      >
        <span className="flex gap-0.5">
          <span
            className="h-5 flex-1 rounded-sm border border-black/10"
            style={{ backgroundColor: preset.primary }}
            aria-hidden
          />
          <span
            className="h-5 flex-1 rounded-sm border border-black/10"
            style={{ backgroundColor: preset.accent }}
            aria-hidden
          />
        </span>
        <span className="truncate text-[10px] font-medium leading-tight text-[#141414]">
          {preset.name}
        </span>
      </button>
    </li>
  );
}

function BrandingColorPresetPicker({
  primaryColor,
  accentColor,
  onSelect,
}: {
  primaryColor: string;
  accentColor: string;
  onSelect: (preset: BrandingColorPreset) => void;
}) {
  const activePreset = BRANDING_COLOR_PRESETS.find((preset) =>
    brandingPresetMatches(preset, primaryColor, accentColor),
  );

  return (
    <div className="space-y-3">
      <div>
        <p className={labelClass()}>Color themes</p>
        <p className={cn(hintClass(), "mt-1")}>
          {activePreset
            ? `Using ${activePreset.name}. Click another pair, or edit the hex values above.`
            : "Pick a ready-made pair, or set your own hex values above."}
        </p>
      </div>

      <ul
        role="listbox"
        aria-label="Branding color themes"
        className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5"
      >
        {BRANDING_COLOR_PRESETS.map((preset) => (
          <BrandingColorPresetCard
            key={preset.name}
            preset={preset}
            selected={brandingPresetMatches(
              preset,
              primaryColor,
              accentColor,
            )}
            onSelect={() => onSelect(preset)}
          />
        ))}
      </ul>
    </div>
  );
}

function ColorField({
  label,
  htmlId,
  value,
  onChange,
}: {
  label: string;
  htmlId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = HEX_REGEX.test(value);
  return (
    <div className="space-y-2">
      <label className={labelClass()} htmlFor={htmlId}>
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={htmlId}
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background shadow-sm"
        />
        <input
          aria-label={`${label} hex value`}
          className={cn(
            inputClass(),
            "w-36 max-w-full font-mono text-sm uppercase",
          )}
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
        {valid ? null : (
          <span className="text-xs font-medium text-destructive">
            Use #RRGGBB
          </span>
        )}
      </div>
    </div>
  );
}

function storefrontHostLabel(business: BusinessRecord | null): string {
  const custom = business?.primaryDomain?.trim();
  if (custom) {
    return custom.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  }
  const slug = business?.slug?.trim();
  if (slug) {
    return `${slug}.${PLATFORM_DOMAIN}`;
  }
  return PLATFORM_DOMAIN;
}

function SerpPreview({
  form,
  business,
  location,
  compact = false,
}: {
  form: FormState;
  business: BusinessRecord | null;
  location: StorefrontSeoLocation;
  compact?: boolean;
}) {
  const display =
    form.displayName.trim() || business?.name?.trim() || "Your storefront";
  const title = resolveStorefrontMetaTitle(
    display,
    form.metaTitle,
    location,
  );
  const description = resolveStorefrontMetaDescription(
    display,
    form.metaDescription,
    location,
  );
  const host = storefrontHostLabel(business);
  const usingDefaults = !form.metaTitle.trim() || !form.metaDescription.trim();
  const areaHint = location.areas?.[0]?.trim();

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/20 shadow-sm",
        compact ? "p-4" : "p-5 sm:p-6",
      )}
    >
      <div className="flex items-center gap-2 text-primary">
        <Globe className="size-4" aria-hidden />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-primary/90">
          Search preview
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        How your storefront can appear in Google. Area is taken from your
        branches
        {areaHint ? (
          <>
            {" "}
            (now <span className="font-medium text-foreground">{areaHint}</span>)
          </>
        ) : null}
        . Use <span className="font-mono text-xs">[Area]</span> in custom copy
        to keep it dynamic.
      </p>
      <div className="mt-4 rounded-xl border border-border/70 bg-background p-4 shadow-inner">
        <p className="truncate text-xs text-muted-foreground">{host}</p>
        <p className="mt-1 line-clamp-2 text-lg font-medium leading-snug text-[#8ab4f8]">
          {title}
        </p>
        <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {usingDefaults ? (
        <p className={cn(hintClass(), "mt-2")}>
          Empty fields use groceries defaults with your branch area until you
          save custom copy.
        </p>
      ) : null}
    </div>
  );
}

function BrandingPreview({
  form,
  logoUrl,
  business,
  location,
}: {
  form: FormState;
  logoUrl: string | null | undefined;
  business: BusinessRecord | null;
  location: StorefrontSeoLocation;
}) {
  const display = form.displayName.trim() || "Your storefront";
  const primary = HEX_REGEX.test(form.primaryColor)
    ? form.primaryColor
    : DEFAULT_PRIMARY;
  const accent = HEX_REGEX.test(form.accentColor)
    ? form.accentColor
    : DEFAULT_ACCENT;
  const faviconPreview = form.faviconUrl.trim() || null;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/20 p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="size-4" aria-hidden />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-primary/90">
            Live preview
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Approximates your public shop header.
        </p>
        <div
          className="mt-4 rounded-xl border-2 bg-background/80 p-4 shadow-inner backdrop-blur-sm"
          style={{ borderColor: `${primary}55` }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <TenantLogo
              brand={display}
              logoUrl={logoUrl}
              faviconUrl={faviconPreview}
              primaryColor={primary}
              variant="preview"
              tagline="Header + favicon as shoppers see them"
              className="flex-1 min-w-0"
            />
            <span
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm shrink-0"
              style={{ backgroundColor: accent }}
            >
              Sale
            </span>
          </div>
        </div>
      </div>
      <SerpPreview form={form} business={business} location={location} />
    </div>
  );
}

function LogoSection({
  logoUrl,
  primaryColor,
  busy,
  onUpload,
  onClear,
}: {
  logoUrl: string | null | undefined;
  primaryColor?: string | null;
  busy: boolean;
  onUpload: (file: File) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void onUpload(file);
    }
    event.target.value = "";
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <TenantLogo
          brand="Your logo"
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          variant="upload"
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_LOGO_TYPES}
            className="hidden"
            onChange={onPick}
          />
          <Button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {logoUrl ? "Replace logo" : "Upload logo"}
          </Button>
          {logoUrl ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void onClear()}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className={hintClass()}>PNG, JPEG, WEBP, or SVG · max 4&nbsp;MB</p>
    </div>
  );
}

function FaviconSection({
  faviconUrl,
  busy,
  onUpload,
  onClear,
}: {
  faviconUrl: string | null | undefined;
  busy: boolean;
  onUpload: (file: File) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void onUpload(file);
    }
    event.target.value = "";
  };
  const trimmed = faviconUrl?.trim() ?? "";
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {trimmed ? (
          <Image
            src={trimmed}
            alt="Current favicon"
            width={56}
            height={56}
            className="size-14 rounded-xl border border-border/60 bg-muted/30 object-contain shadow-sm"
            unoptimized
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 text-xs text-muted-foreground">
            None
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FAVICON_TYPES}
            className="hidden"
            onChange={onPick}
          />
          <Button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {trimmed ? "Replace favicon" : "Upload favicon"}
          </Button>
          {trimmed ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void onClear()}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className={hintClass()}>PNG, ICO, or WEBP · max 512&nbsp;KB</p>
    </div>
  );
}

function OgImageSection({
  ogImageUrl,
  busy,
  onUpload,
  onClear,
}: {
  ogImageUrl: string | null | undefined;
  busy: boolean;
  onUpload: (file: File) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void onUpload(file);
    }
    event.target.value = "";
  };
  const trimmed = ogImageUrl?.trim() ?? "";
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {trimmed ? (
          <Image
            src={trimmed}
            alt="Social preview"
            width={112}
            height={60}
            className="aspect-[1200/630] w-28 rounded-xl border border-border/60 bg-muted/30 object-cover shadow-sm"
            unoptimized
          />
        ) : (
          <div className="flex aspect-[1200/630] w-28 items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 text-xs text-muted-foreground">
            None
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_OG_IMAGE_TYPES}
            className="hidden"
            onChange={onPick}
          />
          <Button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {trimmed ? "Replace" : "Upload image"}
          </Button>
          {trimmed ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void onClear()}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className={hintClass()}>
        PNG, JPEG, or WEBP · max 4&nbsp;MB · 1200×630&nbsp;px recommended
      </p>
    </div>
  );
}

function BannerSection({
  banners,
  busy,
  onUpload,
  onDelete,
  onReorder,
}: {
  banners: string[];
  busy: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
  onReorder: (urls: string[]) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void onUpload(file);
    }
    event.target.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {banners.map((url, i) => (
          <div key={`${url}-${i}`} className="relative group">
            <Image
              src={url}
              alt={`Banner ${i + 1}`}
              width={200}
              height={80}
              className="h-20 w-40 rounded-lg border object-cover shadow-sm"
              unoptimized
            />
            <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition bg-black/40 rounded-lg">
              {i > 0 && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="size-7"
                  onClick={() => {
                    const next = [...banners];
                    [next[i], next[i - 1]] = [next[i - 1], next[i]];
                    void onReorder(next);
                  }}
                >
                  ←
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="size-7"
                disabled={busy}
                onClick={() => void onDelete(i)}
              >
                ✕
              </Button>
              {i < banners.length - 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="size-7"
                  onClick={() => {
                    const next = [...banners];
                    [next[i], next[i + 1]] = [next[i + 1], next[i]];
                    void onReorder(next);
                  }}
                >
                  →
                </Button>
              )}
            </div>
            <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
              {i + 1}
            </span>
          </div>
        ))}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_BANNER_TYPES}
          className="hidden"
          onChange={onPick}
        />
        <button
          type="button"
          disabled={busy}
          className="flex h-20 w-40 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <span className="text-xs text-muted-foreground">+ Add banner</span>
        </button>
      </div>
      <p className={hintClass()}>
        PNG, JPEG, or WEBP · max 5 MB each. Banners slide automatically on your
        storefront.
      </p>
    </div>
  );
}

function RelatedLinks() {
  const links = [
    {
      href: APP_ROUTES.businessDesign,
      label: "Design",
      desc: "Photos, colors & focal points",
      icon: Brush,
    },
    {
      href: APP_ROUTES.businessSettings,
      label: "Settings",
      desc: "Profile & storefront",
      icon: Globe,
    },
  ] as const;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(({ href, label, desc, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="inline-flex items-center gap-2 rounded-lg border border-[#E6E1D8]/90 bg-white px-3 py-2 text-sm transition-colors hover:border-[#B08D48]/50 hover:bg-[#FCFAF6]"
        >
          <Icon className="size-3.5 text-[#B08D48]" aria-hidden />
          <span className="font-medium text-[#141414]">{label}</span>
          <span className="hidden text-[11px] text-[#7A7A7A] sm:inline">
            {desc}
          </span>
          <ArrowRight className="size-3 text-[#DDDDDD]" aria-hidden />
        </Link>
      ))}
    </div>
  );
}

export default function BrandingPage() {
  const searchParams = useSearchParams();
  const { canManageBusinessSettings } = useDashboard();
  const [snapshot, setSnapshot] = useState<BusinessRecord | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [faviconBusy, setFaviconBusy] = useState(false);
  const [ogImageBusy, setOgImageBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(() => {
    return Promise.all([fetchBusiness(), fetchBranches().catch(() => [])])
      .then(([next, nextBranches]) => {
        setLoadFailed(false);
        setFeedback(null);
        setSnapshot(next);
        setBranches(nextBranches);
        setForm(formFromBranding(next.branding));
      })
      .catch((error) => {
        setLoadFailed(true);
        setSnapshot(null);
        setBranches([]);
        setFeedback({
          kind: "error",
          text: messageFor(error, "Could not load branding."),
        });
      });
  }, []);

  useEffect(() => {
    if (!canManageBusinessSettings) {
      return;
    }
    void load();
  }, [canManageBusinessSettings, load]);

  useEffect(() => {
    if (searchParams.get("onboarding") !== "branding") return;
    if (!snapshot) return;
    nameInputRef.current?.focus();
    document.getElementById("branding-identity")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [searchParams, snapshot]);

  const resetFormFromSnapshot = useCallback(() => {
    if (!snapshot) {
      return;
    }
    setForm(formFromBranding(snapshot.branding));
  }, [snapshot]);

  if (!canManageBusinessSettings) {
    return (
      <DashboardAccessDenied
        title="Branding is restricted"
        description={
          <>
            Ask an owner or admin with{" "}
            <span className="font-mono text-xs">business.manage_settings</span>{" "}
            to update storefront branding, or open another area you have access
            to.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Back to business"
      />
    );
  }

  const isLoading = snapshot === null && !loadFailed;

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !HEX_REGEX.test(form.primaryColor) ||
      !HEX_REGEX.test(form.accentColor)
    ) {
      setFeedback({
        kind: "error",
        text: "Colors must be valid #RRGGBB hex values.",
      });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const next = await updateMyBranding(buildPatch(form));
      setSnapshot(next);
      setForm(formFromBranding(next.branding));
      setDocumentFavicon(resolveBusinessFaviconHref(next));
      setFeedback({ kind: "success", text: "Branding saved." });
    } catch (error) {
      setFeedback({ kind: "error", text: messageFor(error, "Save failed.") });
    } finally {
      setIsSaving(false);
    }
  };

  const applyAssetSnapshot = (next: BusinessRecord) => {
    const previousSaved = formFromBranding(snapshot?.branding);
    setSnapshot(next);
    setForm((prev) => keepUnsavedFields(prev, next.branding, previousSaved));
  };

  const onLogoUpload = async (file: File) => {
    if (!snapshot?.id) {
      setFeedback({ kind: "error", text: "Business not loaded yet." });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setFeedback({ kind: "error", text: "Logo exceeds the 4 MB limit." });
      return;
    }
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingLogo(file, snapshot.id);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Logo updated." });
    } catch (error) {
      setFeedback({ kind: "error", text: messageFor(error, "Upload failed.") });
    } finally {
      setLogoBusy(false);
    }
  };

  const onLogoClear = async () => {
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await clearMyBrandingLogo();
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Logo removed." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not remove logo."),
      });
    } finally {
      setLogoBusy(false);
    }
  };

  const onFaviconUpload = async (file: File) => {
    if (!snapshot?.id) {
      setFeedback({ kind: "error", text: "Business not loaded yet." });
      return;
    }
    if (file.size > MAX_FAVICON_BYTES) {
      setFeedback({ kind: "error", text: "Favicon exceeds the 512 KB limit." });
      return;
    }
    setFaviconBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingFavicon(file, snapshot.id);
      applyAssetSnapshot(next);
      setDocumentFavicon(resolveBusinessFaviconHref(next));
      setFeedback({ kind: "success", text: "Favicon updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Favicon upload failed."),
      });
    } finally {
      setFaviconBusy(false);
    }
  };

  const onOgImageUpload = async (file: File) => {
    if (!snapshot?.id) {
      setFeedback({ kind: "error", text: "Business not loaded yet." });
      return;
    }
    if (file.size > MAX_OG_IMAGE_BYTES) {
      setFeedback({
        kind: "error",
        text: "Social preview image exceeds the 4 MB limit.",
      });
      return;
    }
    setOgImageBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingOgImage(file, snapshot.id);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Social preview image updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Upload failed."),
      });
    } finally {
      setOgImageBusy(false);
    }
  };

  const onOgImageClear = async () => {
    setOgImageBusy(true);
    setFeedback(null);
    try {
      const next = await clearMyBrandingOgImage();
      applyAssetSnapshot(next);
      setFeedback({
        kind: "success",
        text: "Social preview image removed.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not remove social preview image."),
      });
    } finally {
      setOgImageBusy(false);
    }
  };

  const onFaviconClear = async () => {
    setFaviconBusy(true);
    setFeedback(null);
    try {
      const next = await clearMyBrandingFavicon();
      applyAssetSnapshot(next);
      setDocumentFavicon(resolveBusinessFaviconHref(next));
      setFeedback({ kind: "success", text: "Favicon removed." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not remove favicon."),
      });
    } finally {
      setFaviconBusy(false);
    }
  };

  const onBannerUpload = async (file: File) => {
    if (!snapshot?.id) {
      setFeedback({ kind: "error", text: "Business not loaded yet." });
      return;
    }
    if (file.size > MAX_BANNER_BYTES) {
      setFeedback({ kind: "error", text: "Banner exceeds the 5 MB limit." });
      return;
    }
    setBannerBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingBanner(file, snapshot.id);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Banner added." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Banner upload failed."),
      });
    } finally {
      setBannerBusy(false);
    }
  };

  const onBannerDelete = async (index: number) => {
    setBannerBusy(true);
    setFeedback(null);
    try {
      const next = await deleteMyBrandingBanner(index);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Banner removed." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not remove banner."),
      });
    } finally {
      setBannerBusy(false);
    }
  };

  const onBannerReorder = async (orderedUrls: string[]) => {
    setBannerBusy(true);
    setFeedback(null);
    try {
      const next = await reorderMyBrandingBanners(orderedUrls);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Banners reordered." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not reorder banners."),
      });
    } finally {
      setBannerBusy(false);
    }
  };

  const logoUrl = snapshot?.branding?.logoUrl ?? null;
  const faviconUrl = snapshot?.branding?.faviconUrl ?? form.faviconUrl;
  const ogImageUrl = snapshot?.branding?.ogImage ?? form.ogImage;
  const bannerUrls = snapshot?.branding?.heroBannerUrls ?? [];

  if (isLoading) {
    return (
      <BusinessPageLayout
        title="Branding"
        description="Logo, colours, and the name shoppers see on your storefront."
      >
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <Loader2 className="size-10 animate-spin text-[#B08D48]" aria-hidden />
          <p className="text-sm text-[#7A7A7A]">Loading branding…</p>
        </div>
      </BusinessPageLayout>
    );
  }

  if (loadFailed && !snapshot) {
    return (
      <BusinessPageLayout
        title="Branding"
        description="Logo, colours, and the name shoppers see on your storefront."
      >
        <div className="mx-auto max-w-lg py-8">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertCircle className="size-6" aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">
              Could not load branding
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{feedback?.text}</p>
            <Button
              className="mt-6 gap-2"
              variant="outline"
              onClick={() => {
                setLoadFailed(false);
                setFeedback(null);
                void load();
              }}
            >
              <RefreshCw className="size-4" aria-hidden />
              Try again
            </Button>
          </div>
        </div>
      </BusinessPageLayout>
    );
  }

  const assetBusy = logoBusy || faviconBusy || ogImageBusy || bannerBusy;
  const dirty = isFormDirty(form, formFromBranding(snapshot?.branding));

  const onboardingLocalitiesRaw =
    snapshot?.onboarding?.answers?.branchLocalities;
  const onboardingLocalities = Array.isArray(onboardingLocalitiesRaw)
    ? onboardingLocalitiesRaw.filter(
        (v): v is string => typeof v === "string",
      )
    : [];

  const seoLocation: StorefrontSeoLocation = {
    areas: localitiesFromBranches(branches, onboardingLocalities),
    countryCode: snapshot?.countryCode ?? "KE",
  };

  const seoDisplayName =
    form.displayName.trim() || snapshot?.name?.trim() || "Your store";

  const saveBar = (
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E6E1D8]/90 bg-white/95 p-2.5 shadow-md backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:static lg:bottom-auto lg:mx-0 lg:justify-end lg:shadow-none">
      <p className="hidden text-[11px] text-[#7A7A7A] sm:block lg:mr-auto">
        Logo, favicon, and banners apply immediately. Name, colours, and search
        fields save here.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={isSaving || !dirty}
          onClick={resetFormFromSnapshot}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="branding-edit-form"
          size="sm"
          className="h-8 gap-1.5"
          disabled={isSaving || assetBusy || !dirty}
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" aria-hidden />
              Save branding
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <BusinessPageLayout
      title="Branding"
      description="Upload a logo, pick colours, and set the name shoppers see. Logo and favicon apply immediately; name, colours, and search fields save with the button below."
      headerActions={
        dirty ? (
          <Button
            type="submit"
            form="branding-edit-form"
            size="sm"
            className="gap-1.5"
            disabled={isSaving || assetBusy}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden />
                Save
              </>
            )}
          </Button>
        ) : null
      }
    >
      <div
        className="space-y-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-2"
        data-onboarding-target={ONBOARDING_TARGETS.brandingDrawer}
      >
        <HubSettingsSectionNav
          items={[
            { id: "branding-identity", label: "Name & logo" },
            { id: "branding-colors", label: "Colours" },
            { id: "branding-favicon", label: "Favicon" },
            { id: "branding-banners", label: "Banners" },
            { id: "branding-search", label: "Search" },
          ]}
        />

        {feedback ? (
          <DashboardFeedback
            kind={feedback.kind === "error" ? "error" : "success"}
            text={feedback.text}
          />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22rem]">
          <form
            id="branding-edit-form"
            className="space-y-4"
            onSubmit={onSave}
          >
            <BrandingSection
              id="branding-identity"
              title="Name & logo"
              hint="The name and mark shoppers see in the shop header, login, and emails. Square logos look sharpest."
            >
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="branding-name">
                  Display name
                </label>
                <input
                  ref={nameInputRef}
                  id="branding-name"
                  className={inputClass()}
                  value={form.displayName}
                  maxLength={255}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, displayName: e.target.value }))
                  }
                  placeholder={snapshot?.name ?? "Your storefront name"}
                />
                <p className={hintClass()}>
                  Falls back to your legal business name when empty.
                </p>
              </div>
              <LogoSection
                logoUrl={logoUrl}
                primaryColor={form.primaryColor}
                busy={logoBusy}
                onUpload={onLogoUpload}
                onClear={onLogoClear}
              />
            </BrandingSection>

            <BrandingSection
              id="branding-colors"
              title="Colours"
              hint="Primary is headers and navigation. Accent is badges and highlights. Pick a theme or set hex values."
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <ColorField
                  label="Primary color"
                  htmlId="branding-primary"
                  value={form.primaryColor}
                  onChange={(v) => setForm((s) => ({ ...s, primaryColor: v }))}
                />
                <ColorField
                  label="Accent color"
                  htmlId="branding-accent"
                  value={form.accentColor}
                  onChange={(v) => setForm((s) => ({ ...s, accentColor: v }))}
                />
              </div>
              <BrandingColorPresetPicker
                primaryColor={form.primaryColor}
                accentColor={form.accentColor}
                onSelect={(preset) =>
                  setForm((s) => ({
                    ...s,
                    primaryColor: preset.primary.toUpperCase(),
                    accentColor: preset.accent.toUpperCase(),
                  }))
                }
              />
            </BrandingSection>

            <BrandingSection
              id="branding-favicon"
              title="Favicon"
              hint="Browser tab icon. Prefer 32×32 or 48×48. Upload applies immediately, or paste an HTTPS URL and save."
            >
              <FaviconSection
                faviconUrl={faviconUrl}
                busy={faviconBusy}
                onUpload={onFaviconUpload}
                onClear={onFaviconClear}
              />
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="branding-favicon-url">
                  Favicon URL{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <input
                  id="branding-favicon-url"
                  className={inputClass()}
                  value={form.faviconUrl}
                  maxLength={1024}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, faviconUrl: e.target.value }))
                  }
                  placeholder="https://cdn.example.com/favicon.png"
                />
              </div>
            </BrandingSection>

            <BrandingSection
              id="branding-banners"
              title="Hero banners"
              hint="Images that rotate on the storefront. Use the arrows to reorder. Uploads apply immediately."
            >
              <BannerSection
                banners={bannerUrls}
                busy={bannerBusy}
                onUpload={onBannerUpload}
                onDelete={onBannerDelete}
                onReorder={onBannerReorder}
              />
            </BrandingSection>

            <BrandingSection
              id="branding-search"
              title="Search & social"
              hint="How Google and social apps see your shop. Empty fields use groceries defaults with your branch area. Use [Area] and [Country] to keep location dynamic."
            >
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <label className={labelClass()} htmlFor="branding-meta-title">
                    Search title{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {form.metaTitle.length}/255
                  </span>
                </div>
                <input
                  id="branding-meta-title"
                  className={inputClass()}
                  value={form.metaTitle}
                  maxLength={255}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, metaTitle: e.target.value }))
                  }
                  placeholder={defaultStorefrontMetaTitle(
                    seoDisplayName,
                    seoLocation,
                  )}
                />
                <p className={hintClass()}>
                  Blue link text in search results. Aim for about 50–60
                  characters.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <label
                    className={labelClass()}
                    htmlFor="branding-meta-description"
                  >
                    Search description{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {form.metaDescription.length}/320
                  </span>
                </div>
                <textarea
                  id="branding-meta-description"
                  className={cn(inputClass(), "min-h-[96px] resize-y")}
                  value={form.metaDescription}
                  maxLength={320}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, metaDescription: e.target.value }))
                  }
                  placeholder={defaultStorefrontMetaDescription(
                    seoDisplayName,
                    seoLocation,
                  )}
                />
                <p className={hintClass()}>
                  Grey snippet under the title. Placeholders:{" "}
                  <span className="font-mono text-[11px]">[Area]</span>,{" "}
                  <span className="font-mono text-[11px]">[Country]</span>,{" "}
                  <span className="font-mono text-[11px]">[Name]</span>.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-[#E6E1D8]/80 bg-[#FCFAF6] p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8A8A8A]">
                  Social preview image
                </p>
                <OgImageSection
                  ogImageUrl={ogImageUrl}
                  busy={ogImageBusy}
                  onUpload={onOgImageUpload}
                  onClear={onOgImageClear}
                />
                <div className="space-y-2">
                  <label className={labelClass()} htmlFor="branding-og-image">
                    Or paste an image URL{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="branding-og-image"
                    className={inputClass()}
                    value={form.ogImage}
                    maxLength={1024}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, ogImage: e.target.value }))
                    }
                    placeholder="https://cdn.example.com/social-preview.png"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClass()} htmlFor="branding-meta-keywords">
                  Meta keywords{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <input
                  id="branding-meta-keywords"
                  className={inputClass()}
                  value={form.metaKeywords}
                  maxLength={500}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, metaKeywords: e.target.value }))
                  }
                  placeholder="grocery, fresh produce, delivery, Nairobi"
                />
              </div>
            </BrandingSection>

            {saveBar}
          </form>

          <aside className="space-y-4 lg:sticky lg:top-4">
            <BrandingTemplateSection
              business={snapshot}
              storeName={form.displayName}
              logoUrl={logoUrl}
              brandPrimary={form.primaryColor}
            />
            <BrandingPreview
              form={form}
              logoUrl={logoUrl}
              business={snapshot}
              location={seoLocation}
            />
            <RelatedLinks />
          </aside>
        </div>
      </div>
    </BusinessPageLayout>
  );
}
