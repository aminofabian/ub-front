"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Brush,
  ChevronRight,
  Globe,
  Image as ImageIcon,
  Images,
  LayoutTemplate,
  Palette,
  Search,
  Share2,
  Smartphone,
  Type,
} from "lucide-react";

import { BrandingTemplateSection } from "@/components/business/branding-template-section";
import { dashboardHintClass, dashboardInputClass } from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import type { BusinessRecord } from "@/lib/api";
import type { StorefrontSeoLocation } from "@/lib/storefront-seo-defaults";
import { cn } from "@/lib/utils";

import {
  BrandingPreview,
  RelatedLinks,
  type BrandingSectionId,
  type FormState,
} from "./branding-shared";

type SectionNavItem = {
  id: BrandingSectionId;
  label: string;
  hint: string;
  icon: typeof Palette;
};

const BRANDING_SECTIONS: SectionNavItem[] = [
  {
    id: "identity",
    label: "Shop look",
    hint: "Display name and brand colours",
    icon: Type,
  },
  {
    id: "logos",
    label: "Logos",
    hint: "Light and dark marks",
    icon: ImageIcon,
  },
  {
    id: "appIcon",
    label: "Home screen",
    hint: "Install icon on phones",
    icon: Smartphone,
  },
  {
    id: "favicon",
    label: "Browser tab",
    hint: "Tiny tab icon",
    icon: Globe,
  },
  {
    id: "og",
    label: "Share image",
    hint: "WhatsApp and Facebook preview",
    icon: Share2,
  },
  {
    id: "photos",
    label: "Photos",
    hint: "Rotating home banners",
    icon: Images,
  },
  {
    id: "search",
    label: "Search",
    hint: "Google title and snippet",
    icon: Search,
  },
  {
    id: "themes",
    label: "Themes",
    hint: "Store layout and templates",
    icon: LayoutTemplate,
  },
];

function sectionMeta(id: BrandingSectionId) {
  return (
    BRANDING_SECTIONS.find((s) => s.id === id) ?? {
      id,
      label: id,
      hint: "Branding for your storefront.",
      icon: Palette,
    }
  );
}

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function sectionStatus(
  id: BrandingSectionId,
  form: FormState,
  assets: {
    logoUrl: string | null | undefined;
    appIconUrl: string | null | undefined;
    faviconUrl: string | null | undefined;
    ogImageUrl: string | null | undefined;
    bannerCount: number;
  },
): string {
  switch (id) {
    case "identity":
      return form.displayName.trim() || "Using business name";
    case "logos":
      return assets.logoUrl?.trim() ? "Ready" : "Add a logo";
    case "appIcon":
      return assets.appIconUrl?.trim() ? "Ready" : "Add an icon";
    case "favicon":
      return String(assets.faviconUrl ?? "").trim()
        ? "Ready"
        : "Add a tab icon";
    case "og":
      return String(assets.ogImageUrl ?? "").trim()
        ? "Ready"
        : "Add a preview";
    case "photos":
      return assets.bannerCount
        ? `${assets.bannerCount} photo${assets.bannerCount === 1 ? "" : "s"}`
        : "Add photos";
    case "search":
      return form.metaTitle.trim() || form.metaDescription.trim()
        ? "Custom SEO"
        : "Using defaults";
    case "themes":
      return "Change on Themes page";
    default:
      return "";
  }
}

function sectionSummary(id: BrandingSectionId, form: FormState): ReactNode {
  switch (id) {
    case "identity":
      return (
        <>
          Shoppers see{" "}
          <span className="font-semibold">
            {form.displayName.trim() || "your business name"}
          </span>{" "}
          with{" "}
          <span className="font-semibold font-mono text-[11px]">
            {form.primaryColor}
          </span>{" "}
          /{" "}
          <span className="font-semibold font-mono text-[11px]">
            {form.accentColor}
          </span>
        </>
      );
    case "logos":
      return <>Light header mark and dark hero ink — uploads apply immediately.</>;
    case "appIcon":
      return <>Square icon for Add to Home Screen.</>;
    case "favicon":
      return <>Browser tab icon — upload now or paste a URL to save.</>;
    case "og":
      return <>1200×630 preview for shared links.</>;
    case "photos":
      return <>Wide banners on the shop home — first in line shows first.</>;
    case "search":
      return <>Google blue link and grey snippet for your shop URL.</>;
    case "themes":
      return <>Layout and motion live on Themes — branding colours feed the preview.</>;
    default:
      return null;
  }
}

function BrandingContextBanner({
  displayName,
  dirty,
  assetReadyCount,
  totalAssets,
}: {
  displayName: string;
  dirty: boolean;
  assetReadyCount: number;
  totalAssets: number;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <LiveDot />
          {displayName}
        </span>
        <span className={dashboardHintClass()}>
          {assetReadyCount}/{totalAssets} assets ready
        </span>
        {dirty ? (
          <span className="font-medium text-[#0f766e]">· unsaved text fields</span>
        ) : (
          <span className={dashboardHintClass()}>· uploads already live</span>
        )}
      </p>
      <span className={cn(dashboardHintClass(), "hidden sm:inline")}>
        Pick a section — edit in the panel, save name/colours/SEO together.
      </span>
    </div>
  );
}

function BrandingPulse({
  form,
  business,
  location,
  logoUrl,
  logoDarkUrl,
  onLogoScaleChange,
  onSelectSection,
  className,
}: {
  form: FormState;
  business: BusinessRecord | null;
  location: StorefrontSeoLocation;
  logoUrl: string | null | undefined;
  logoDarkUrl: string | null | undefined;
  onLogoScaleChange: (scale: number) => void;
  onSelectSection: (id: BrandingSectionId) => void;
  className?: string;
}) {
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M20 36 C 36 22, 60 18, 78 26"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M24 54 C 44 64, 62 58, 76 68"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className={cn(card, "left-3 top-[10%] max-h-[55%] overflow-y-auto")}>
        <BrandingPreview
          compact
          form={form}
          logoUrl={logoUrl}
          business={business}
          location={location}
          onLogoScaleChange={onLogoScaleChange}
        />
      </div>

      <div className={cn(card, "bottom-[12%] right-3")}>
        <BrandingTemplateSection
          business={business}
          storeName={form.displayName}
          logoUrl={logoUrl}
          logoDarkUrl={logoDarkUrl}
          brandPrimary={form.primaryColor}
        />
      </div>

      <button
        type="button"
        className={cn(
          card,
          "bottom-[8%] left-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={() => onSelectSection("identity")}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Palette
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Start with shop look
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          Name and colours shoppers see everywhere
        </p>
      </button>
    </div>
  );
}

function BrandingFocus({
  sectionId,
  form,
  className,
}: {
  sectionId: BrandingSectionId;
  form: FormState;
  className?: string;
}) {
  const meta = sectionMeta(sectionId);
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
        className,
      )}
    >
      <div className="max-w-md space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <Icon className="size-3" aria-hidden />
          {meta.label}
        </span>
        <h2
          className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {meta.label}
        </h2>
        <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
          {meta.hint}
        </p>
        <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
          {sectionSummary(sectionId, form)}
        </p>
        {sectionId === "themes" ? (
          <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
            <Brush className="size-3.5 shrink-0" aria-hidden />
            Open Themes from the panel to change layout — colours preview here.
          </p>
        ) : null}
      </div>
      <p
        className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
      >
        <LiveDot />
        {sectionId === "identity" ||
        sectionId === "search" ||
        sectionId === "favicon" ||
        sectionId === "og"
          ? "Edit in the panel → Save changes"
          : "Uploads apply immediately"}
      </p>
    </div>
  );
}

export type BrandingTheatreProps = {
  activeSectionId: BrandingSectionId | null;
  onActiveSectionChange: (id: BrandingSectionId | null) => void;
  form: FormState;
  dirty: boolean;
  business: BusinessRecord | null;
  seoLocation: StorefrontSeoLocation;
  logoUrl: string | null | undefined;
  logoDarkUrl: string | null | undefined;
  appIconUrl: string | null | undefined;
  faviconUrl: string | null | undefined;
  ogImageUrl: string | null | undefined;
  bannerCount: number;
  onLogoScaleChange: (scale: number) => void;
  drawerFields: ReactNode;
  drawerFooter: ReactNode | null;
  applyNowSection: boolean;
};

export function BrandingTheatre({
  activeSectionId,
  onActiveSectionChange,
  form,
  dirty,
  business,
  seoLocation,
  logoUrl,
  logoDarkUrl,
  appIconUrl,
  faviconUrl,
  ogImageUrl,
  bannerCount,
  onLogoScaleChange,
  drawerFields,
  drawerFooter,
  applyNowSection,
}: BrandingTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const displayName =
    form.displayName.trim() || business?.name?.trim() || "Your storefront";

  const assetReadyCount = useMemo(() => {
    let n = 0;
    if (logoUrl?.trim()) n += 1;
    if (appIconUrl?.trim()) n += 1;
    if (String(faviconUrl ?? "").trim()) n += 1;
    if (String(ogImageUrl ?? "").trim()) n += 1;
    if (bannerCount > 0) n += 1;
    return n;
  }, [logoUrl, appIconUrl, faviconUrl, ogImageUrl, bannerCount]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BRANDING_SECTIONS;
    return BRANDING_SECTIONS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q),
    );
  }, [query]);

  const selectSection = (id: BrandingSectionId) => {
    onActiveSectionChange(id);
    const hash =
      id === "photos"
        ? "branding-banners"
        : id === "search"
          ? "branding-search"
          : id === "identity"
            ? "branding-identity"
            : id;
    history.replaceState(null, "", `#${hash}`);
    if (!isLg) setMobileDrawerOpen(true);
  };

  const clearSection = () => {
    onActiveSectionChange(null);
    setMobileDrawerOpen(false);
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  const activeMeta = activeSectionId ? sectionMeta(activeSectionId) : null;
  const drawerOpen = !!activeSectionId && (isLg || mobileDrawerOpen);

  useEffect(() => {
    if (activeSectionId && !isLg) {
      setMobileDrawerOpen(true);
    }
  }, [activeSectionId, isLg]);

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;
    const assets = {
      logoUrl,
      appIconUrl,
      faviconUrl,
      ogImageUrl,
      bannerCount,
    };

    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(
                dashboardInputClass(),
                "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search branding…"
              aria-label="Search branding sections"
            />
          </label>
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filteredSections.length} section
            {filteredSections.length === 1 ? "" : "s"}
            {dirty ? (
              <span className="text-[#0f766e]"> · unsaved</span>
            ) : null}
          </p>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {filteredSections.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              No sections match “{query.trim()}”.
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filteredSections.map((item) => {
                const active = activeSectionId === item.id;
                const Icon = item.icon;
                const status = sectionStatus(item.id, form, assets);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      id={
                        item.id === "photos"
                          ? "branding-banners"
                          : item.id === "search"
                            ? "branding-search"
                            : undefined
                      }
                      onClick={() => selectSection(item.id)}
                      className={cn(
                        "relative flex w-full items-start gap-2.5 text-left transition-colors",
                        denser ? "px-2.5 py-2 sm:px-3" : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-7 shrink-0 place-items-center border",
                          active
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {item.label}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                          {status}
                        </p>
                      </div>
                      {!denser ? (
                        <ChevronRight
                          className="mt-1 size-4 shrink-0 text-muted-foreground/70"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const room = activeSectionId ? (
    <BrandingFocus sectionId={activeSectionId} form={form} className="h-full min-h-0" />
  ) : (
    <BrandingPulse
      form={form}
      business={business}
      location={seoLocation}
      logoUrl={logoUrl}
      logoDarkUrl={logoDarkUrl}
      onLogoScaleChange={onLogoScaleChange}
      onSelectSection={selectSection}
      className="h-full min-h-0"
    />
  );

  const inspect = activeSectionId ? null : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a section
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          Preview in the middle reflects live uploads. Name, colours, and SEO
          save together — asset uploads are immediate.
        </p>
        <div className="mt-4">
          <RelatedLinks />
        </div>
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <Brush className="size-3.5 shrink-0" aria-hidden />
        Deep links use{" "}
        <span className="font-mono text-[10px]">#branding-identity</span> and
        friends
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <BrandingContextBanner
        displayName={displayName}
        dirty={dirty}
        assetReadyCount={assetReadyCount}
        totalAssets={5}
      />

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] lg:grid",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
          {roster({ fill: true, denser: true })}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <p
            className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
            aria-hidden
          >
            Storefront
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && activeSectionId ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) clearSection();
        }}
        contextLabel="Branding"
        title={activeMeta?.label ?? "Section"}
        description={
          applyNowSection
            ? `${activeMeta?.hint ?? ""} Uploads apply immediately.`
            : activeMeta?.hint
        }
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
        footer={drawerFooter ?? undefined}
      >
        {activeSectionId ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-white px-3 py-3 sm:px-4",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            {applyNowSection ? (
              <p className="mb-3 text-[11px] font-medium text-[#0f766e]">
                Applies as you upload
              </p>
            ) : activeSectionId === "identity" ||
              activeSectionId === "search" ? (
              <p className="mb-3 text-[11px] font-medium text-[#0f766e]">
                Saves with the button below
              </p>
            ) : null}
            {drawerFields}
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
