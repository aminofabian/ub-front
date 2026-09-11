"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useSearchParams } from "next/navigation";

import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import {
  AlertCircle,
  ArrowRight,
  Brush,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { AiAppIconGenerator } from "@/components/brand/ai-app-icon-generator";
import { AiLogoGenerator } from "@/components/brand/ai-logo-generator";
import { useLogoObjectUrl } from "@/components/onboarding/onboarding-branding-preview";
import type { GeneratedBrandKit } from "@/components/brand/ai-logo-generator";
import { darkStorefrontThemeNames } from "@/lib/branding-themed-logo";
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
  BRANDING_LOGO_SCALE_DEFAULT,
  BRANDING_LOGO_SCALE_MAX,
  BRANDING_LOGO_SCALE_MIN,
  BRANDING_LOGO_SCALE_STEP,
  clampBrandingLogoScale,
  storefrontLogoScaleVarStyle,
} from "@/lib/branding-logo-scale";
import {
  BRANDING_COLOR_PRESETS,
  brandingPresetMatches,
  type BrandingColorPreset,
} from "@/lib/branding-color-presets";
import { prepareAppIconFile } from "@/lib/branding-asset-prepare";
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
  clearMyBrandingAppIcon,
  clearMyBrandingFavicon,
  clearMyBrandingLogo,
  clearMyBrandingOgImage,
  deleteMyBrandingBanner,
  fetchBranches,
  fetchBusiness,
  reorderMyBrandingBanners,
  updateMyBranding,
  uploadMyBrandingAppIcon,
  uploadMyBrandingBanner,
  uploadMyBrandingFavicon,
  uploadMyBrandingLogo,
  uploadMyBrandingLogoDark,
  uploadMyBrandingAssetKit,
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
const ACCEPTED_APP_ICON_TYPES = "image/png,image/jpeg,image/webp";
const MAX_APP_ICON_BYTES = 1024 * 1024;
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
  logoScale: number;
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
    logoScale: BRANDING_LOGO_SCALE_DEFAULT,
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
    logoScale: clampBrandingLogoScale(b?.logoScale),
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
    logoScale: clampBrandingLogoScale(next.logoScale),
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
    logoScale: prev.logoScale,
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
    form.metaKeywords !== saved.metaKeywords ||
    form.logoScale !== saved.logoScale
  );
}

function StartOpenDetails({
  startOpen,
  children,
}: {
  startOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(startOpen);
  useEffect(() => {
    if (startOpen) setOpen(true);
  }, [startOpen]);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      {children}
    </details>
  );
}

function BrandingSection({
  id,
  title,
  hint,
  apply,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  apply?: "now" | "save" | "mixed";
  children: React.ReactNode;
}) {
  const applyLabel =
    apply === "now"
      ? "Applies as you upload"
      : apply === "save"
        ? "Saves with the button below"
        : apply === "mixed"
          ? "Uploads apply now. Other fields save below"
          : null;
  return (
    <section id={id} className={cn(HUB_SURFACE, "scroll-mt-24 p-4 sm:p-5")}>
      <div className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="font-heading text-sm font-semibold tracking-tight text-[#141414]">
            {title}
          </h2>
          {applyLabel ? (
            <p className="text-[11px] font-medium text-[#0f766e]">{applyLabel}</p>
          ) : null}
        </div>
        <p className="mt-1 max-w-prose text-[12px] leading-relaxed text-[#7A7A7A]">
          {hint}
        </p>
      </div>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

function PasteUrlField({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <details>
      <summary className="cursor-pointer text-xs text-[#7A7A7A] underline-offset-2 hover:text-[#141414] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
        {label}
      </summary>
      <input
        id={id}
        className={cn(inputClass(), "mt-2")}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </details>
  );
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function inputClass() {
  return cn(
    "w-full rounded-none border border-input bg-background px-3 py-2.5 text-sm shadow-none transition-colors",
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
          "flex w-full flex-col gap-1 rounded-none border bg-card p-1.5 text-left transition-colors",
          "hover:border-[#0f766e]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
          selected
            ? "border-[#0f766e] ring-2 ring-[#0f766e]/20"
            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
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
        <p className={labelClass()}>Colours</p>
        <p className={cn(hintClass(), "mt-1")}>
          {activePreset
            ? `Using ${activePreset.name}. Pick another pair, or set hex below.`
            : "Pick a pair for headers and highlights, or set hex below."}
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
            selected={brandingPresetMatches(preset, primaryColor, accentColor)}
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
          className="h-10 w-14 cursor-pointer rounded-none border border-input bg-background shadow-none"
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
}: {
  form: FormState;
  business: BusinessRecord | null;
  location: StorefrontSeoLocation;
}) {
  const display =
    form.displayName.trim() || business?.name?.trim() || "Your storefront";
  const title = resolveStorefrontMetaTitle(display, form.metaTitle, location);
  const description = resolveStorefrontMetaDescription(
    display,
    form.metaDescription,
    location,
  );
  const host = storefrontHostLabel(business);
  const usingDefaults = !form.metaTitle.trim() || !form.metaDescription.trim();
  const areaHint = location.areas?.[0]?.trim();

  return (
    <div>
      <h3 className="text-sm font-medium text-[#141414]">Google</h3>
      <p className={cn(hintClass(), "mt-0.5")}>
        {areaHint
          ? `Uses ${areaHint} from your branches unless you write your own.`
          : "Empty fields use a grocery default with your branch area."}
      </p>
      <div className="mt-3 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-3">
        <p className="truncate text-[11px] text-[#7A7A7A]">{host}</p>
        <p className="mt-1 line-clamp-2 text-base font-medium leading-snug text-[#1a0dab]">
          {title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-[#4d5156]">
          {description}
        </p>
      </div>
      {usingDefaults ? (
        <p className={cn(hintClass(), "mt-2")}>
          Custom title and description save with the button below.
        </p>
      ) : null}
    </div>
  );
}

const LOGO_CHECKERBOARD: CSSProperties = {
  backgroundColor: "#ececec",
  backgroundImage:
    "linear-gradient(45deg, #d4d4d4 25%, transparent 25%), linear-gradient(-45deg, #d4d4d4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d4 75%), linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)",
  backgroundSize: "12px 12px",
  backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0",
};

function LogoSizeControls({
  scale,
  accent,
  onChange,
  inputId = "branding-logo-scale",
}: {
  scale: number;
  accent: string;
  onChange: (next: number) => void;
  inputId?: string;
}) {
  const clamped = clampBrandingLogoScale(scale);
  const pct = Math.round(clamped * 100);
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className={labelClass()}>
          Logo size
        </label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {pct}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={clamped <= BRANDING_LOGO_SCALE_MIN}
          aria-label="Make logo smaller"
          onClick={() =>
            onChange(clampBrandingLogoScale(clamped - BRANDING_LOGO_SCALE_STEP))
          }
        >
          <Minus className="size-3.5" aria-hidden />
        </Button>
        <input
          id={inputId}
          type="range"
          min={BRANDING_LOGO_SCALE_MIN}
          max={BRANDING_LOGO_SCALE_MAX}
          step={BRANDING_LOGO_SCALE_STEP}
          value={clamped}
          onChange={(e) =>
            onChange(clampBrandingLogoScale(Number(e.target.value)))
          }
          className="h-2 min-w-0 flex-1 cursor-pointer"
          style={{ accentColor: accent }}
          aria-valuetext={`${pct} percent`}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={clamped >= BRANDING_LOGO_SCALE_MAX}
          aria-label="Make logo larger"
          onClick={() =>
            onChange(clampBrandingLogoScale(clamped + BRANDING_LOGO_SCALE_STEP))
          }
        >
          <Plus className="size-3.5" aria-hidden />
        </Button>
      </div>
      <p className={hintClass()}>
        Drag until the mark sits in the header. Cut a white box off the file
        before you upload.
      </p>
    </div>
  );
}

function BrandingPreview({
  form,
  logoUrl,
  business,
  location,
  onLogoScaleChange,
  compact = false,
}: {
  form: FormState;
  logoUrl: string | null | undefined;
  business: BusinessRecord | null;
  location: StorefrontSeoLocation;
  onLogoScaleChange: (next: number) => void;
  compact?: boolean;
}) {
  const display = form.displayName.trim() || "Your storefront";
  const primary = HEX_REGEX.test(form.primaryColor)
    ? form.primaryColor
    : DEFAULT_PRIMARY;
  const accent = HEX_REGEX.test(form.accentColor)
    ? form.accentColor
    : DEFAULT_ACCENT;
  const faviconPreview = form.faviconUrl.trim() || null;
  const hasLogo = Boolean(logoUrl?.trim());
  return (
    <div className={cn(HUB_SURFACE, compact ? "space-y-3 p-3" : "space-y-4 p-4 sm:p-5")}>
      <div>
        <h2 className="font-heading text-sm font-semibold tracking-tight text-[#141414]">
          Preview
        </h2>
        {compact ? null : (
          <p className="mt-1 text-[12px] leading-relaxed text-[#7A7A7A]">
            Header and Google as shoppers see them. Uploads are already live.
          </p>
        )}
      </div>
      <div className="overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[#F4F4F5]">
        <div className="flex items-center gap-1.5 border-b border-black/8 px-2 py-1.5">
          <span className="size-1.5 rounded-full bg-[#D4D4D8]" aria-hidden />
          <span className="size-1.5 rounded-full bg-[#D4D4D8]" aria-hidden />
          <span className="size-1.5 rounded-full bg-[#D4D4D8]" aria-hidden />
          <span className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 bg-white px-1.5 py-0.5">
            {faviconPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={faviconPreview}
                alt=""
                className="size-3.5 object-contain"
              />
            ) : (
              <Globe className="size-3 text-[#A1A1AA]" aria-hidden />
            )}
            <span className="truncate text-[10px] text-[#52525B]">
              {display}
            </span>
          </span>
        </div>
        <div
          className="bg-white p-3"
          style={{
            borderTop: `2px solid ${primary}`,
            ...storefrontLogoScaleVarStyle(form.logoScale),
          }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {hasLogo ? (
              <div
                className="inline-flex max-w-full items-center justify-center px-2 py-1.5"
                style={LOGO_CHECKERBOARD}
              >
                <TenantLogo
                  brand={display}
                  logoUrl={logoUrl}
                  primaryColor={primary}
                  variant="storefront"
                  size="md"
                />
              </div>
            ) : (
              <TenantLogo
                brand={display}
                logoUrl={logoUrl}
                faviconUrl={faviconPreview}
                primaryColor={primary}
                variant="preview"
                tagline="Header as shoppers see it"
                className="min-w-0 flex-1"
              />
            )}
            <span
              className="shrink-0 px-2.5 py-1 text-[11px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Sale
            </span>
          </div>
          {hasLogo ? (
            <LogoSizeControls
              scale={form.logoScale}
              accent={accent}
              onChange={onLogoScaleChange}
              inputId={
                compact
                  ? "branding-logo-scale-compact"
                  : "branding-logo-scale"
              }
            />
          ) : null}
        </div>
      </div>
      {compact ? null : (
        <SerpPreview form={form} business={business} location={location} />
      )}
    </div>
  );
}

function LogoSection({
  logoUrl,
  logoDarkUrl,
  primaryColor,
  accentColor,
  shopName,
  busy,
  onUpload,
  onUploadDark,
  onUploadPair,
  onClear,
  onClearDark,
}: {
  logoUrl: string | null | undefined;
  logoDarkUrl: string | null | undefined;
  primaryColor?: string | null;
  accentColor?: string | null;
  shopName?: string;
  busy: boolean;
  onUpload: (file: File) => Promise<void>;
  onUploadDark: (file: File) => Promise<void>;
  onUploadPair: (kit: GeneratedBrandKit) => Promise<void>;
  onClear: () => Promise<void>;
  onClearDark: () => Promise<void>;
}) {
  const lightInputRef = useRef<HTMLInputElement | null>(null);
  const darkInputRef = useRef<HTMLInputElement | null>(null);
  const [draftPair, setDraftPair] = useState<GeneratedBrandKit | null>(null);
  const draftLightUrl = useLogoObjectUrl(draftPair?.light ?? null);
  const draftDarkUrl = useLogoObjectUrl(draftPair?.dark ?? null);
  const lightUrl = draftLightUrl ?? logoUrl;
  const darkUrl = draftDarkUrl ?? logoDarkUrl;
  const darkUses = darkStorefrontThemeNames().join(", ");
  const onPick =
    (slot: "light" | "dark") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setDraftPair(null);
        void (slot === "light" ? onUpload(file) : onUploadDark(file)).catch(
          () => {},
        );
      }
      event.target.value = "";
    };
  return (
    <div className="space-y-4">
      <AiLogoGenerator
        variant="dashboard"
        shopName={shopName ?? ""}
        primaryColor={primaryColor ?? undefined}
        accentColor={accentColor ?? undefined}
        disabled={busy}
        onDraftPair={setDraftPair}
        onGenerated={async (pair) => {
          await onUploadPair(pair);
          setDraftPair(null);
        }}
      />
      <p className={labelClass()}>Logos</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className={labelClass()}>On white</p>
          <div className="flex min-h-[7.5rem] items-center justify-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-3">
            <TenantLogo
              brand="Your logo"
              logoUrl={lightUrl}
              primaryColor={primaryColor}
              variant="upload"
            />
          </div>
          <p className={hintClass()}>
            Receipts, emails, and light shop headers.
          </p>
          <input
            ref={lightInputRef}
            type="file"
            accept={ACCEPTED_LOGO_TYPES}
            className="hidden"
            onChange={onPick("light")}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => lightInputRef.current?.click()}
            >
              {lightUrl ? "Replace" : "Upload"}
            </Button>
            {logoUrl && !draftPair ? (
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
        <div className="space-y-2">
          <p className={labelClass()}>On the hero</p>
          <div className="flex min-h-[7.5rem] items-center justify-center border border-neutral-800 bg-[#0f172a] p-3">
            <TenantLogo
              brand="Your logo"
              logoUrl={darkUrl}
              primaryColor={primaryColor}
              variant="upload"
            />
          </div>
          <p className={hintClass()}>
            Same logo as on white, in light ink. Navy hero and {darkUses}.
          </p>
          <input
            ref={darkInputRef}
            type="file"
            accept={ACCEPTED_LOGO_TYPES}
            className="hidden"
            onChange={onPick("dark")}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => darkInputRef.current?.click()}
            >
              {darkUrl ? "Replace" : "Upload"}
            </Button>
            {logoDarkUrl && !draftPair ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void onClearDark()}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <p className={hintClass()}>
        {draftPair
          ? "Preview only. Tap Save and use to apply the kit."
          : "PNG, JPEG, WEBP, or SVG. 4 MB max. Uploads go live immediately."}
      </p>
    </div>
  );
}

function AppIconSection({
  appIconUrl,
  logoUrl,
  primaryColor,
  accentColor,
  shopName,
  busy,
  onUpload,
  onClear,
}: {
  appIconUrl: string | null | undefined;
  logoUrl: string | null | undefined;
  primaryColor?: string | null;
  accentColor?: string | null;
  shopName?: string;
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
  const trimmed = appIconUrl?.trim() ?? "";
  const hasLogo = Boolean(logoUrl?.trim());
  return (
    <div className="space-y-3 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] pt-5">
      <p className={labelClass()}>Home screen</p>
      <div className="flex flex-wrap items-center gap-3">
        {trimmed ? (
          <Image
            src={trimmed}
            alt="Current app icon"
            width={64}
            height={64}
            className="size-16 rounded-[22%] bg-[#171c19] object-cover"
            unoptimized
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-[22%] bg-[#171c19] text-[10px] font-medium tracking-tight text-white/55">
            App
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_APP_ICON_TYPES}
          className="hidden"
          onChange={onPick}
        />
        <Button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {trimmed ? "Replace" : "Upload"}
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
      <AiAppIconGenerator
        shopName={shopName ?? ""}
        primaryColor={primaryColor ?? undefined}
        accentColor={accentColor ?? undefined}
        hasLogo={hasLogo}
        disabled={busy}
        onGenerated={onUpload}
      />
      <p className={hintClass()}>
        Square PNG, 512px. Generate a kit to stamp this from the logo, or
        upload / remake it here. Shoppers see this when they install the shop.
      </p>
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
    <div className="space-y-2">
      <p className={labelClass()}>Browser tab</p>
      <div className="flex flex-wrap items-center gap-3">
        {trimmed ? (
          <Image
            src={trimmed}
            alt="Current favicon"
            width={32}
            height={32}
            className="size-8 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white object-contain"
            unoptimized
          />
        ) : (
          <div className="flex size-8 items-center justify-center border border-dashed border-[#D4D4D8] text-[10px] text-[#A1A1AA]">
            Tab
          </div>
        )}
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
          {trimmed ? "Replace" : "Upload"}
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
      <p className={hintClass()}>
        PNG or ICO. 32px is enough. Generate a kit to stamp this from the logo.
      </p>
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
            className="aspect-[1200/630] w-28 rounded-none border border-border/60 bg-muted/30 object-cover shadow-none"
            unoptimized
          />
        ) : (
          <div className="flex aspect-[1200/630] w-28 items-center justify-center rounded-none border border-dashed border-muted-foreground/30 bg-muted/20 text-xs text-muted-foreground">
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
        WhatsApp and Facebook preview. PNG, JPEG, or WEBP. 1200×630 works best.
        Applies now.
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
          <div key={`${url}-${i}`} className="space-y-1">
            <div className="relative">
              <Image
                src={url}
                alt={`Banner ${i + 1}`}
                width={200}
                height={80}
                className="h-20 w-40 rounded-none border object-cover shadow-none"
                unoptimized
              />
              <span className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                {i + 1}
              </span>
            </div>
            <div className="flex w-40 items-center justify-center gap-0.5">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-7"
                disabled={i === 0 || busy}
                aria-label="Move left"
                onClick={() => {
                  const next = [...banners];
                  [next[i], next[i - 1]] = [next[i - 1], next[i]];
                  void onReorder(next);
                }}
              >
                <ChevronLeft className="size-3.5" aria-hidden />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-7 text-destructive hover:text-destructive"
                disabled={busy}
                aria-label="Remove banner"
                onClick={() => void onDelete(i)}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-7"
                disabled={i === banners.length - 1 || busy}
                aria-label="Move right"
                onClick={() => {
                  const next = [...banners];
                  [next[i], next[i + 1]] = [next[i + 1], next[i]];
                  void onReorder(next);
                }}
              >
                <ChevronRight className="size-3.5" aria-hidden />
              </Button>
            </div>
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
          className="flex h-20 w-40 items-center justify-center rounded-none border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <span className="text-xs text-muted-foreground">+ Add banner</span>
        </button>
      </div>
      <p className={hintClass()}>
        Wide photos that rotate on the shop. PNG, JPEG, or WEBP. 5 MB each.
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
          className="inline-flex items-center gap-2 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 py-2 text-sm transition-colors hover:border-[#0f766e] hover:text-[#0f766e] hover:bg-white"
        >
          <Icon className="size-3.5 text-[#0f766e]" aria-hidden />
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
  const [appIconBusy, setAppIconBusy] = useState(false);
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
      const text = "Business not loaded yet.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    if (file.size > MAX_LOGO_BYTES) {
      const text = "Logo exceeds the 4 MB limit.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingLogo(file, snapshot.id);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Logo updated." });
    } catch (error) {
      const text = messageFor(error, "Upload failed.");
      setFeedback({ kind: "error", text });
      throw error instanceof Error ? error : new Error(text);
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

  const onLogoUploadDark = async (file: File) => {
    if (!snapshot?.id) {
      const text = "Business not loaded yet.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    if (file.size > MAX_LOGO_BYTES) {
      const text = "Logo exceeds the 4 MB limit.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingLogoDark(file, snapshot.id);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Dark logo updated." });
    } catch (error) {
      const text = messageFor(error, "Upload failed.");
      setFeedback({ kind: "error", text });
      throw error instanceof Error ? error : new Error(text);
    } finally {
      setLogoBusy(false);
    }
  };

  const onLogoUploadPair = async (kit: GeneratedBrandKit) => {
    if (!snapshot?.id) {
      const text = "Business not loaded yet.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    if (
      kit.light.size > MAX_LOGO_BYTES ||
      kit.dark.size > MAX_LOGO_BYTES ||
      kit.og.size > MAX_OG_IMAGE_BYTES
    ) {
      const text = "An asset exceeds the 4 MB limit.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    if (kit.favicon.size > MAX_FAVICON_BYTES) {
      const text = "Favicon exceeds the 512 KB limit.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    if (kit.appIcon.size > MAX_APP_ICON_BYTES) {
      const text = "App icon exceeds the 1 MB limit.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingAssetKit(kit, snapshot.id);
      applyAssetSnapshot(next);
      setDocumentFavicon(resolveBusinessFaviconHref(next));
      setFeedback({ kind: "success", text: "Brand kit updated." });
    } catch (error) {
      const text = messageFor(error, "Upload failed.");
      setFeedback({ kind: "error", text });
      throw error instanceof Error ? error : new Error(text);
    } finally {
      setLogoBusy(false);
    }
  };

  const onLogoClearDark = async () => {
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await updateMyBranding({
        logoDarkUrl: "",
        logoDarkPublicId: "",
      });
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Dark logo removed." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not remove dark logo."),
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

  const onAppIconUpload = async (file: File) => {
    if (!snapshot?.id) {
      const text = "Business not loaded yet.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    let prepared = file;
    try {
      prepared = await prepareAppIconFile(file);
    } catch {
      prepared = file;
    }
    if (prepared.size > MAX_APP_ICON_BYTES) {
      const text = "App icon exceeds the 1 MB limit.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    setAppIconBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingAppIcon(prepared, snapshot.id);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Home-screen icon updated." });
    } catch (error) {
      const text = messageFor(error, "App icon upload failed.");
      setFeedback({ kind: "error", text });
      throw error instanceof Error ? error : new Error(text);
    } finally {
      setAppIconBusy(false);
    }
  };

  const onAppIconClear = async () => {
    setAppIconBusy(true);
    setFeedback(null);
    try {
      const next = await clearMyBrandingAppIcon();
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Home-screen icon removed." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not remove the app icon."),
      });
    } finally {
      setAppIconBusy(false);
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
  const logoDarkUrl = snapshot?.branding?.logoDarkUrl ?? null;
  const appIconUrl = snapshot?.branding?.appIconUrl ?? null;
  const faviconUrl = snapshot?.branding?.faviconUrl ?? form.faviconUrl;
  const ogImageUrl = snapshot?.branding?.ogImage ?? form.ogImage;
  const bannerUrls = snapshot?.branding?.heroBannerUrls ?? [];

  if (isLoading) {
    return (
      <BusinessPageLayout
        title="Branding"
        description="Logo, colours, and the name shoppers see."
      >
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <Loader2
            className="size-10 animate-spin text-[#0f766e]"
            aria-hidden
          />
          <p className="text-sm text-[#7A7A7A]">Loading branding…</p>
        </div>
      </BusinessPageLayout>
    );
  }

  if (loadFailed && !snapshot) {
    return (
      <BusinessPageLayout
        title="Branding"
        description="Logo, colours, and the name shoppers see."
      >
        <div className="mx-auto max-w-lg py-8">
          <div className="rounded-none border border-destructive/30 bg-destructive/5 p-8 text-center shadow-none">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertCircle className="size-6" aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">
              Could not load branding
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {feedback?.text}
            </p>
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

  const assetBusy = logoBusy || faviconBusy || appIconBusy || ogImageBusy || bannerBusy;
  const dirty = isFormDirty(form, formFromBranding(snapshot?.branding));

  const onboardingLocalitiesRaw =
    snapshot?.onboarding?.answers?.branchLocalities;
  const onboardingLocalities = Array.isArray(onboardingLocalitiesRaw)
    ? onboardingLocalitiesRaw.filter((v): v is string => typeof v === "string")
    : [];

  const seoLocation: StorefrontSeoLocation = {
    areas: localitiesFromBranches(branches, onboardingLocalities),
    countryCode: snapshot?.countryCode ?? "KE",
  };

  const seoDisplayName =
    form.displayName.trim() || snapshot?.name?.trim() || "Your store";

  const saveBar = (
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-2.5 shadow-none lg:static lg:bottom-auto lg:mx-0 lg:justify-end lg:shadow-none">
      <p className="hidden text-[11px] text-[#7A7A7A] sm:block lg:mr-auto">
        Unsaved name, colours, and search text. Uploads are already live.
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
              Save changes
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <BusinessPageLayout
      title="Branding"
      description="Name, logos, colours, photos, and how the shop looks in Google."
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
          ariaLabel="Branding sections"
          items={[
            { id: "branding-identity", label: "Shop look" },
            { id: "branding-banners", label: "Photos" },
            { id: "branding-search", label: "Search" },
          ]}
        />

        {feedback ? (
          <DashboardFeedback
            kind={feedback.kind === "error" ? "error" : "success"}
            text={feedback.text}
          />
        ) : null}

        <div className="lg:hidden">
          <BrandingPreview
            compact
            form={form}
            logoUrl={logoUrl}
            business={snapshot}
            location={seoLocation}
            onLogoScaleChange={(logoScale) =>
              setForm((s) => ({ ...s, logoScale }))
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22rem]">
          <form id="branding-edit-form" className="space-y-4" onSubmit={onSave}>
            <BrandingSection
              id="branding-identity"
              title="Shop look"
              apply="mixed"
              hint="The name, logos, home-screen icon, tab icon, and colours shoppers see."
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
                logoDarkUrl={logoDarkUrl}
                primaryColor={form.primaryColor}
                accentColor={form.accentColor}
                shopName={form.displayName || snapshot?.name}
                busy={logoBusy}
                onUpload={onLogoUpload}
                onUploadDark={onLogoUploadDark}
                onUploadPair={onLogoUploadPair}
                onClear={onLogoClear}
                onClearDark={onLogoClearDark}
              />
              <AppIconSection
                appIconUrl={appIconUrl}
                logoUrl={logoUrl}
                primaryColor={form.primaryColor}
                accentColor={form.accentColor}
                shopName={form.displayName || snapshot?.name}
                busy={appIconBusy}
                onUpload={onAppIconUpload}
                onClear={onAppIconClear}
              />
              <div className="space-y-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] pt-5">
                <FaviconSection
                  faviconUrl={faviconUrl}
                  busy={faviconBusy}
                  onUpload={onFaviconUpload}
                  onClear={onFaviconClear}
                />
                <PasteUrlField
                  id="branding-favicon-url"
                  label="Paste a favicon URL"
                  value={form.faviconUrl}
                  maxLength={1024}
                  placeholder="https://cdn.example.com/favicon.png"
                  onChange={(faviconUrl) =>
                    setForm((s) => ({ ...s, faviconUrl }))
                  }
                />
              </div>
              <div className="space-y-4 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] pt-5">
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorField
                    label="Shop colour"
                    htmlId="branding-primary"
                    value={form.primaryColor}
                    onChange={(v) =>
                      setForm((s) => ({ ...s, primaryColor: v }))
                    }
                  />
                  <ColorField
                    label="Highlight"
                    htmlId="branding-accent"
                    value={form.accentColor}
                    onChange={(v) =>
                      setForm((s) => ({ ...s, accentColor: v }))
                    }
                  />
                </div>
              </div>
            </BrandingSection>

            <BrandingSection
              id="branding-banners"
              title="Photos"
              apply="now"
              hint="Wide photos that rotate across the shop home. Number 1 shows first."
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
              title="Search"
              apply="mixed"
              hint="How Google and chat apps show your shop. Empty title and description use your branch area."
            >
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <label className={labelClass()} htmlFor="branding-meta-title">
                    Google title
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
                  Blue link in search results. About 50 to 60 characters.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <label
                    className={labelClass()}
                    htmlFor="branding-meta-description"
                  >
                    Google snippet
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
                  Grey text under the title. Placeholders stay dynamic:{" "}
                  <span className="font-mono text-[11px]">[Area]</span>,{" "}
                  <span className="font-mono text-[11px]">[Country]</span>,{" "}
                  <span className="font-mono text-[11px]">[Name]</span>.
                </p>
              </div>

              <div className="space-y-2">
                <p className={labelClass()}>Share image</p>
                <OgImageSection
                  ogImageUrl={ogImageUrl}
                  busy={ogImageBusy}
                  onUpload={onOgImageUpload}
                  onClear={onOgImageClear}
                />
                <PasteUrlField
                  id="branding-og-image"
                  label="Paste a share image URL"
                  value={form.ogImage}
                  maxLength={1024}
                  placeholder="https://cdn.example.com/social-preview.png"
                  onChange={(ogImage) => setForm((s) => ({ ...s, ogImage }))}
                />
              </div>

              <StartOpenDetails startOpen={Boolean(form.metaKeywords.trim())}>
                <summary className="cursor-pointer text-xs text-[#7A7A7A] underline-offset-2 hover:text-[#141414] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
                  Keywords
                </summary>
                <div className="mt-2 space-y-2">
                  <label className="sr-only" htmlFor="branding-meta-keywords">
                    Meta keywords
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
                  <p className={hintClass()}>
                    Optional. Most search engines ignore this.
                  </p>
                </div>
              </StartOpenDetails>
            </BrandingSection>

            {saveBar}
          </form>

          <aside className="space-y-4 lg:sticky lg:top-4">
            <BrandingTemplateSection
              business={snapshot}
              storeName={form.displayName}
              logoUrl={logoUrl}
              logoDarkUrl={logoDarkUrl}
              brandPrimary={form.primaryColor}
            />
            <div className="hidden lg:block">
              <BrandingPreview
                form={form}
                logoUrl={logoUrl}
                business={snapshot}
                location={seoLocation}
                onLogoScaleChange={(logoScale) =>
                  setForm((s) => ({ ...s, logoScale }))
                }
              />
            </div>
            <RelatedLinks />
          </aside>
        </div>
      </div>
    </BusinessPageLayout>
  );
}
