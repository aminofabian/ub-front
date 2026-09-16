"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  MapPin,
  Palette,
  QrCode,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  SlidersHorizontal,
  Smartphone,
  Store,
  Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  GetTheAppPanel,
  GetTheAppPanelError,
  GetTheAppPanelLoading,
} from "@/components/mobile/get-the-app-panel";
import { dashboardHintClass, dashboardInputClass } from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
import { APP_ROUTES } from "@/lib/config";
import type {
  MobilePublishStatus,
  MobileTenantProfileExport,
  PublicMobileConfig,
} from "@/lib/public-mobile-config";
import { cn } from "@/lib/utils";

export type MobileSectionId =
  | "get-app"
  | "publish"
  | "profile"
  | "links"
  | "status"
  | "ops";

type SectionNavItem = {
  id: MobileSectionId;
  label: string;
  hint: string;
  icon: LucideIcon;
};

const MOBILE_SECTIONS: SectionNavItem[] = [
  {
    id: "get-app",
    label: "Get the app",
    hint: "QR code and install links",
    icon: QrCode,
  },
  {
    id: "publish",
    label: "Publish",
    hint: "App Store & Play builds",
    icon: Rocket,
  },
  {
    id: "profile",
    label: "Tenant profile",
    hint: "EAS JSON and bundle IDs",
    icon: Smartphone,
  },
  {
    id: "links",
    label: "Related settings",
    hint: "Branding, domains, branches",
    icon: Link2,
  },
  {
    id: "status",
    label: "Readiness",
    hint: "Storefront and config checks",
    icon: CheckCircle2,
  },
  {
    id: "ops",
    label: "Operator setup",
    hint: "Env vars and GitHub secrets",
    icon: Terminal,
  },
];

const RELATED_LINKS = [
  {
    href: APP_ROUTES.business,
    label: "Business",
    desc: "Business hub",
    icon: Building2,
  },
  {
    href: APP_ROUTES.businessSettings,
    label: "Settings",
    desc: "Profile & storefront",
    icon: Settings,
  },
  {
    href: APP_ROUTES.businessConfiguration,
    label: "Operations",
    desc: "Inventory & till",
    icon: SlidersHorizontal,
  },
  {
    href: APP_ROUTES.businessBranding,
    label: "Branding",
    desc: "Logo & colors",
    icon: Palette,
  },
  {
    href: APP_ROUTES.businessDomains,
    label: "Domains",
    desc: "Custom hostnames",
    icon: Globe,
  },
  {
    href: APP_ROUTES.branches,
    label: "Branches",
    desc: "Locations",
    icon: MapPin,
  },
] as const;

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function sectionMeta(id: MobileSectionId) {
  return (
    MOBILE_SECTIONS.find((s) => s.id === id) ?? {
      id,
      label: id,
      hint: "Mobile store app.",
      icon: Store,
    }
  );
}

export function publishStatusLabel(
  status: MobilePublishStatus["status"],
): string {
  switch (status) {
    case "requested":
      return "Build queued";
    case "building":
      return "Building";
    case "submitted":
      return "Submitted to stores";
    case "failed":
      return "Build failed";
    default:
      return "Not started";
  }
}

function sectionStatus(
  id: MobileSectionId,
  ctx: {
    publishStatus: MobilePublishStatus | null;
    config: PublicMobileConfig | null;
    tenantProfile: MobileTenantProfileExport | null;
    loading: boolean;
  },
): string {
  const { publishStatus, config, tenantProfile, loading } = ctx;
  switch (id) {
    case "get-app":
      if (loading) return "Loading…";
      return config ? "QR & install links ready" : "Load config first";
    case "publish":
      return publishStatus
        ? publishStatusLabel(publishStatus.status)
        : "Not started";
    case "profile":
      return tenantProfile
        ? `${tenantProfile.slug}.json`
        : loading
          ? "Loading…"
          : "No profile yet";
    case "links":
      return `${RELATED_LINKS.length} destinations`;
    case "status":
      if (!config) return loading ? "Checking…" : "Config missing";
      return config.storefrontEnabled
        ? "Storefront on"
        : "Storefront off — fix first";
    case "ops":
      return "Platform secrets once";
    default:
      return "";
  }
}

function sectionSummary(
  id: MobileSectionId,
  ctx: {
    slug: string;
    publishStatus: MobilePublishStatus | null;
    config: PublicMobileConfig | null;
    shopperName: string | null;
  },
): ReactNode {
  const { slug, publishStatus, config, shopperName } = ctx;
  switch (id) {
    case "get-app":
      return (
        <>
          Share the QR on posters and receipts
          {shopperName ? (
            <>
              {" "}
              for{" "}
              <span className="font-semibold">{shopperName}</span>
            </>
          ) : null}
          .
        </>
      );
    case "publish":
      return (
        <>
          Status:{" "}
          <span className="font-semibold">
            {publishStatus
              ? publishStatusLabel(publishStatus.status)
              : "Not started"}
          </span>
          . Request a branded EAS build from the panel.
        </>
      );
    case "profile":
      return (
        <>
          Download the EAS tenant profile
          {slug ? (
            <>
              {" "}
              for{" "}
              <span className="font-mono font-semibold text-[11px]">{slug}</span>
            </>
          ) : null}
          .
        </>
      );
    case "links":
      return <>Jump to branding, domains, branches, and shop settings.</>;
    case "status":
      return (
        <>
          Storefront{" "}
          <span className="font-semibold">
            {config
              ? config.storefrontEnabled
                ? "on"
                : "off"
              : "unknown"}
          </span>
          {config ? " · config loaded" : " · waiting for config"}
        </>
      );
    case "ops":
      return <>GitHub token, Expo secrets, and store console registration.</>;
    default:
      return null;
  }
}

function MobileContextBanner({
  slug,
  publishStatus,
  storefrontEnabled,
  onReload,
  loading,
}: {
  slug: string;
  publishStatus: MobilePublishStatus | null;
  storefrontEnabled: boolean | null;
  onReload: () => void;
  loading: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <LiveDot />
          {publishStatus
            ? publishStatusLabel(publishStatus.status)
            : "Publish idle"}
        </span>
        {slug ? (
          <span className={cn(dashboardHintClass(), "font-mono")}>{slug}</span>
        ) : null}
        <span
          className={cn(
            "font-medium",
            storefrontEnabled === false
              ? "text-amber-800"
              : "text-muted-foreground",
          )}
        >
          · Storefront{" "}
          {storefrontEnabled == null
            ? "…"
            : storefrontEnabled
              ? "on"
              : "off"}
        </span>
      </p>

      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />

      <span className={cn(dashboardHintClass(), "hidden sm:inline")}>
        Pick a section — QR, publish, or profile in the panel.
      </span>

      <div className="ml-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          disabled={loading}
          onClick={() => onReload()}
        >
          <RefreshCw
            className={cn("size-3", loading && "animate-spin")}
            aria-hidden
          />
          Refresh
        </Button>
      </div>
    </div>
  );
}

function StorefrontOffWarning() {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-none border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 text-[12px] leading-relaxed text-amber-950 shadow-none dark:text-amber-50"
    >
      <AlertCircle
        className="mt-0.5 size-3.5 shrink-0 text-amber-700"
        aria-hidden
      />
      <span>
        Your web storefront is off.{" "}
        <Link
          href={APP_ROUTES.business}
          className="font-medium underline underline-offset-2"
        >
          Enable it in Business settings
        </Link>{" "}
        so the mobile app can load your catalog.
      </span>
    </div>
  );
}

function MobilePulse({
  slug,
  publishStatus,
  storefrontOff,
  onSelectSection,
  className,
}: {
  slug: string;
  publishStatus: MobilePublishStatus | null;
  storefrontOff: boolean;
  onSelectSection: (id: MobileSectionId) => void;
  className?: string;
}) {
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M18 38 C 34 24, 58 20, 76 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M26 52 C 46 62, 64 56, 78 66"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className={cn(card, "left-3 top-[12%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Publish
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">
          {publishStatus
            ? publishStatusLabel(publishStatus.status)
            : "Not started"}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          App Store &amp; Play via EAS
        </p>
      </div>

      <div className={cn(card, "right-3 top-[10%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Slug
        </p>
        <p className="mt-1 truncate font-mono text-lg font-semibold tracking-tight">
          {slug || "—"}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Used in deep links and profiles
        </p>
      </div>

      {storefrontOff ? (
        <div className={cn(card, "bottom-[28%] left-3 right-3 w-auto max-w-none")}>
          <StorefrontOffWarning />
        </div>
      ) : null}

      <button
        type="button"
        className={cn(
          card,
          "bottom-[8%] right-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={() => onSelectSection("get-app")}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <QrCode
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Start with Get the app
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          QR code and install links for shoppers
        </p>
      </button>
    </div>
  );
}

function MobileFocus({
  sectionId,
  slug,
  publishStatus,
  config,
  shopperName,
  storefrontOff,
  className,
}: {
  sectionId: MobileSectionId;
  slug: string;
  publishStatus: MobilePublishStatus | null;
  config: PublicMobileConfig | null;
  shopperName: string | null;
  storefrontOff: boolean;
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
          {sectionSummary(sectionId, {
            slug,
            publishStatus,
            config,
            shopperName,
          })}
        </p>
        {storefrontOff && (sectionId === "get-app" || sectionId === "status") ? (
          <StorefrontOffWarning />
        ) : null}
      </div>
      <p
        className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
      >
        <LiveDot />
        Actions live in the panel on the right
      </p>
    </div>
  );
}

function RelatedLinksList() {
  return (
    <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
      {RELATED_LINKS.map(({ href, label, desc, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="group flex w-full items-start gap-2.5 px-1 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]"
          >
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground transition-colors group-hover:border-[var(--pos-primary,#0f766e)] group-hover:text-[var(--pos-primary,#0f766e)]">
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[13px] font-semibold tracking-[-0.015em] text-foreground">
                {label}
                <ArrowRight
                  className="size-3 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </span>
              <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                {desc}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ReadinessChecklist({
  loading,
  config,
  tenantProfile,
  publishStatus,
  error,
}: {
  loading: boolean;
  config: PublicMobileConfig | null;
  tenantProfile: MobileTenantProfileExport | null;
  publishStatus: MobilePublishStatus | null;
  error: string | null;
}) {
  const items = [
    {
      ok: !loading && !!config && !error,
      label: "Mobile config loaded",
      detail: error ?? (config ? config.slug : "Waiting…"),
    },
    {
      ok: !!config?.storefrontEnabled,
      label: "Storefront enabled",
      detail: config
        ? config.storefrontEnabled
          ? "Catalog can load in-app"
          : "Turn on in Business settings"
        : "Unknown until config loads",
    },
    {
      ok: !!tenantProfile,
      label: "Tenant profile ready",
      detail: tenantProfile
        ? `${Object.keys(tenantProfile.apps).length} app role(s)`
        : "EAS JSON not available yet",
    },
    {
      ok:
        !!publishStatus &&
        publishStatus.status !== "idle" &&
        publishStatus.status !== "failed",
      label: "Store publish progress",
      detail: publishStatus
        ? publishStatusLabel(publishStatus.status)
        : "Not requested",
    },
  ];

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-start gap-2.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2.5"
        >
          <span
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center",
              item.ok
                ? "text-emerald-600"
                : "text-muted-foreground",
            )}
            aria-hidden
          >
            {item.ok ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-foreground">
              {item.label}
            </p>
            <p className={cn(dashboardHintClass(), "mt-0.5")}>{item.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function OperatorSetupList() {
  return (
    <ul className="list-disc space-y-2.5 pl-5 text-[12px] leading-relaxed text-muted-foreground">
      <li>
        API server: set{" "}
        <code className="text-[11px] text-foreground">
          APP_MOBILE_PUBLISH_GITHUB_TOKEN
        </code>
        ,{" "}
        <code className="text-[11px] text-foreground">
          APP_MOBILE_PUBLISH_GITHUB_REPO
        </code>
        , and{" "}
        <code className="text-[11px] text-foreground">
          APP_MOBILE_PUBLISH_CALLBACK_SECRET
        </code>{" "}
        (generate with{" "}
        <code className="text-[11px] text-foreground">
          openssl rand -base64 32
        </code>
        ).
      </li>
      <li>
        GitHub repo secrets:{" "}
        <code className="text-[11px] text-foreground">EXPO_TOKEN</code>,{" "}
        <code className="text-[11px] text-foreground">API_PUBLIC_BASE_URL</code>,
        and the same{" "}
        <code className="text-[11px] text-foreground">
          MOBILE_PUBLISH_CALLBACK_SECRET
        </code>{" "}
        value.
      </li>
      <li>Register bundle IDs in Apple Developer and Google Play Console.</li>
      <li>
        After a successful build, set store URLs on the API server for install
        buttons.
      </li>
    </ul>
  );
}

function DockBody({
  sectionId,
  config,
  tenantProfile,
  publishStatus,
  loading,
  publishing,
  error,
  shopperApp,
  onRequestPublish,
  onDownloadProfile,
  onReload,
}: {
  sectionId: MobileSectionId;
  config: PublicMobileConfig | null;
  tenantProfile: MobileTenantProfileExport | null;
  publishStatus: MobilePublishStatus | null;
  loading: boolean;
  publishing: boolean;
  error: string | null;
  shopperApp: PublicMobileConfig["apps"][number] | undefined;
  onRequestPublish: () => void;
  onDownloadProfile: () => void;
  onReload: () => void;
}) {
  switch (sectionId) {
    case "get-app":
      return (
        <div className="space-y-3">
          {loading ? <GetTheAppPanelLoading /> : null}
          {!loading && error ? (
            <div className="space-y-3">
              <GetTheAppPanelError message={error} />
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => onReload()}
              >
                <AlertCircle className="size-4" aria-hidden />
                Try again
              </Button>
            </div>
          ) : null}
          {!loading && config ? (
            <GetTheAppPanel config={config} variant="admin" />
          ) : null}
        </div>
      );

    case "publish":
      return (
        <div className="space-y-4">
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              Publish to App Store &amp; Play
            </p>
            <p className={cn(dashboardHintClass(), "mt-1")}>
              Build your branded shopper app with EAS. Status:{" "}
              <span className="font-medium text-foreground">
                {publishStatus
                  ? publishStatusLabel(publishStatus.status)
                  : "…"}
              </span>
            </p>
            {publishStatus?.workflowUrl ? (
              <a
                href={publishStatus.workflowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
              >
                View build workflow
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : null}
            {publishStatus?.lastError ? (
              <p className="mt-2 text-sm text-destructive">
                {publishStatus.lastError}
              </p>
            ) : null}
            {publishStatus?.requestedAt ? (
              <p className={cn(dashboardHintClass(), "mt-1")}>
                Requested{" "}
                {new Date(publishStatus.requestedAt).toLocaleString()}
                {publishStatus.completedAt
                  ? ` · Finished ${new Date(publishStatus.completedAt).toLocaleString()}`
                  : null}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            className="w-full gap-2 sm:w-auto"
            disabled={loading || publishing}
            onClick={() => onRequestPublish()}
          >
            {publishing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Rocket className="size-4" aria-hidden />
            )}
            Request store build
          </Button>
          {publishStatus && !publishStatus.automationConfigured ? (
            <p className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,#faf8f4)] px-3 py-2 font-mono text-[11px] text-muted-foreground">
              {publishStatus.manualCommand}
            </p>
          ) : null}
        </div>
      );

    case "profile":
      return (
        <div className="space-y-4">
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              {shopperApp?.name ?? "Shopper app"}
            </p>
            {shopperApp?.whiteLabel ? (
              <span className="mt-1 inline-block rounded-none border border-[var(--pos-primary,#0f766e)]/25 bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--pos-primary,#0f766e)]">
                Branded
              </span>
            ) : null}
            {shopperApp?.bundleId ? (
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {shopperApp.bundleId}
              </p>
            ) : null}
            {tenantProfile ? (
              <dl className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Display name</dt>
                  <dd className="truncate font-semibold text-foreground">
                    {tenantProfile.displayName}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Scheme</dt>
                  <dd className="font-mono font-semibold text-foreground">
                    {tenantProfile.scheme}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>API</dt>
                  <dd className="max-w-[12rem] truncate font-mono text-foreground">
                    {tenantProfile.apiBaseURL}
                  </dd>
                </div>
              </dl>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 sm:w-auto"
            disabled={!tenantProfile}
            onClick={() => onDownloadProfile()}
          >
            <Download className="size-4" aria-hidden />
            Download EAS profile
          </Button>
        </div>
      );

    case "links":
      return <RelatedLinksList />;

    case "status":
      return (
        <ReadinessChecklist
          loading={loading}
          config={config}
          tenantProfile={tenantProfile}
          publishStatus={publishStatus}
          error={error}
        />
      );

    case "ops":
      return (
        <div className="space-y-3">
          <p className="text-[13px] font-semibold text-foreground">
            Operator setup (once per platform)
          </p>
          <OperatorSetupList />
        </div>
      );

    default:
      return null;
  }
}

export type MobileTheatreProps = {
  slug: string;
  config: PublicMobileConfig | null;
  tenantProfile: MobileTenantProfileExport | null;
  publishStatus: MobilePublishStatus | null;
  loading: boolean;
  publishing: boolean;
  error: string | null;
  onReload: () => void;
  onRequestPublish: () => void;
  onDownloadProfile: () => void;
};

export function MobileTheatre({
  slug,
  config,
  tenantProfile,
  publishStatus,
  loading,
  publishing,
  error,
  onReload,
  onRequestPublish,
  onDownloadProfile,
}: MobileTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<MobileSectionId | null>(
    null,
  );

  const shopperApp = config?.apps.find((app) => app.role === "shopper");
  const storefrontOff = !!config && !config.storefrontEnabled;
  const storefrontEnabled = config ? config.storefrontEnabled : null;

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOBILE_SECTIONS;
    return MOBILE_SECTIONS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q) ||
        item.id.includes(q),
    );
  }, [query]);

  const selectSection = (id: MobileSectionId) => {
    setActiveSectionId(id);
    history.replaceState(null, "", `#${id}`);
    if (!isLg) setMobileDrawerOpen(true);
  };

  const clearSection = () => {
    setActiveSectionId(null);
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

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (MOBILE_SECTIONS.some((s) => s.id === hash)) {
      setActiveSectionId(hash as MobileSectionId);
    }
  }, []);

  const statusCtx = {
    publishStatus,
    config,
    tenantProfile,
    loading,
  };

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;

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
              placeholder="Search mobile…"
              aria-label="Search mobile sections"
            />
          </label>
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filteredSections.length} section
            {filteredSections.length === 1 ? "" : "s"}
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
                const status = sectionStatus(item.id, statusCtx);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectSection(item.id)}
                      className={cn(
                        "relative flex w-full items-start gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
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
    <MobileFocus
      sectionId={activeSectionId}
      slug={slug}
      publishStatus={publishStatus}
      config={config}
      shopperName={shopperApp?.name ?? null}
      storefrontOff={storefrontOff}
      className="h-full min-h-0"
    />
  ) : (
    <MobilePulse
      slug={slug}
      publishStatus={publishStatus}
      storefrontOff={storefrontOff}
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
          Share the QR, request a store build, or download the EAS tenant
          profile — choose a section on the left.
        </p>
        {storefrontOff ? (
          <div className="mt-4">
            <StorefrontOffWarning />
          </div>
        ) : null}
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <Smartphone className="size-3.5 shrink-0" aria-hidden />
        Deep links use{" "}
        <span className="font-mono text-[10px]">#get-app</span> and friends
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <MobileContextBanner
        slug={slug}
        publishStatus={publishStatus}
        storefrontEnabled={storefrontEnabled}
        onReload={onReload}
        loading={loading}
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
            Store app
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
        contextLabel="Store app"
        title={activeMeta?.label ?? "Section"}
        description={activeMeta?.hint}
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
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
            <DockBody
              sectionId={activeSectionId}
              config={config}
              tenantProfile={tenantProfile}
              publishStatus={publishStatus}
              loading={loading}
              publishing={publishing}
              error={error}
              shopperApp={shopperApp}
              onRequestPublish={onRequestPublish}
              onDownloadProfile={onDownloadProfile}
              onReload={onReload}
            />
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
