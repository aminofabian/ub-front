"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Palette,
  RefreshCw,
  Rocket,
  Store,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  GetTheAppPanel,
  GetTheAppPanelError,
  GetTheAppPanelLoading,
} from "@/components/mobile/get-the-app-panel";
import {
  DASHBOARD_MAX,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { fetchMyMobileConfig, fetchMyMobilePublishStatus, requestMyMobilePublish } from "@/lib/api";
import type {
  MobilePublishStatus,
  MobileTenantProfileExport,
  PublicMobileConfig,
} from "@/lib/public-mobile-config";
import { useSessionBootstrapSnapshot } from "@/hooks/use-session-bootstrap-snapshot";
import { cn } from "@/lib/utils";

function LockedNotice() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="size-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Store app settings are restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask an owner or admin with{" "}
          <span className="font-mono text-xs">business.manage_settings</span> to launch your mobile store.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href={APP_ROUTES.business}>Back to business settings</Link>
        </Button>
      </div>
    </div>
  );
}

function RelatedLinks() {
  const links = [
    { href: APP_ROUTES.business, label: "Business", desc: "Core settings", icon: Building2 },
    { href: APP_ROUTES.businessBranding, label: "Branding", desc: "Logo & colors", icon: Palette },
    { href: APP_ROUTES.businessDomains, label: "Domains", desc: "Custom hostnames", icon: Globe },
    { href: APP_ROUTES.branches, label: "Branches", desc: "Locations", icon: MapPin },
  ] as const;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {links.map(({ href, label, desc, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all",
            "hover:border-primary/25 hover:bg-accent/40 hover:shadow-md",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-semibold">
              {label}
              <ArrowRight
                className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function downloadTenantProfile(profile: MobileTenantProfileExport) {
  const blob = new Blob([JSON.stringify(profile, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${profile.slug}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function publishStatusLabel(status: MobilePublishStatus["status"]): string {
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

export default function BusinessMobilePage() {
  const { canManageBusinessSettings } = useDashboard();
  const bootstrapBusiness = useSessionBootstrapSnapshot().business;
  const [slug, setSlug] = useState(bootstrapBusiness?.slug?.trim() ?? "");
  const [config, setConfig] = useState<PublicMobileConfig | null>(null);
  const [tenantProfile, setTenantProfile] = useState<MobileTenantProfileExport | null>(null);
  const [publishStatus, setPublishStatus] = useState<MobilePublishStatus | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const [payload, publish] = await Promise.all([
        fetchMyMobileConfig(),
        fetchMyMobilePublishStatus(),
      ]);
      setConfig(payload.config);
      setTenantProfile(payload.tenantProfile);
      setPublishStatus(publish);
      setSlug(payload.config.slug);
      if (payload.newlyProvisioned) {
        setFeedback({
          kind: "success",
          text: "Your store app profile was created automatically. Bundle IDs and deep links are ready.",
        });
      }
    } catch (err) {
      setConfig(null);
      setTenantProfile(null);
      setPublishStatus(null);
      setError(err instanceof Error ? err.message : "Could not load your store app.");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRequestPublish = useCallback(async () => {
    setPublishing(true);
    setFeedback(null);
    try {
      const result = await requestMyMobilePublish({ app: "shopper", platform: "all" });
      setPublishStatus(result);
      if (result.status === "failed") {
        setError(result.lastError ?? "Could not start the store build.");
        return;
      }
      setError(null);
      if (result.automationConfigured) {
        setFeedback({
          kind: "success",
          text: "Store build started in GitHub Actions. Watch progress in the workflow link below.",
        });
      } else {
        setFeedback({
          kind: "success",
          text: "Build request saved. Run the manual command below on a machine with EAS credentials.",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request store build.");
    } finally {
      setPublishing(false);
    }
  }, []);

  useEffect(() => {
    if (!canManageBusinessSettings) {
      return;
    }
    void load();
  }, [canManageBusinessSettings, load]);

  if (!canManageBusinessSettings) {
    return <LockedNotice />;
  }

  const shopperApp = config?.apps.find((app) => app.role === "shopper");
  const storefrontOff = config && !config.storefrontEnabled;

  return (
    <div className={cn(DASHBOARD_MAX, "space-y-6 pb-20")}>
      <DashboardPageHero
        icon={Store}
        eyebrow="Your ecommerce"
        title="Launch your store app"
        description={
          <>
            Every business gets a mobile storefront — your catalog, branding, and checkout in a
            dedicated shopper app. Share the QR code on posters and receipts, or publish a branded
            listing on the App Store and Google Play.
          </>
        }
      />

      {feedback ? <DashboardFeedback kind="success" text={feedback.text} /> : null}

      {storefrontOff ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3.5 text-sm leading-relaxed text-amber-950 shadow-sm dark:text-amber-50"
        >
          <span>
            Your web storefront is off.{" "}
            <Link href={APP_ROUTES.business} className="font-medium underline underline-offset-2">
              Enable it in Business settings
            </Link>{" "}
            so the mobile app can load your catalog.
          </span>
        </div>
      ) : null}

      <RelatedLinks />

      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Publish to App Store &amp; Play</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Build your branded shopper app with EAS. Status:{" "}
              <span className="font-medium text-foreground">
                {publishStatus ? publishStatusLabel(publishStatus.status) : "…"}
              </span>
            </p>
            {publishStatus?.workflowUrl ? (
              <a
                href={publishStatus.workflowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                View build workflow
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : null}
            {publishStatus?.lastError ? (
              <p className="mt-2 text-sm text-destructive">{publishStatus.lastError}</p>
            ) : null}
            {publishStatus?.requestedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Requested {new Date(publishStatus.requestedAt).toLocaleString()}
                {publishStatus.completedAt
                  ? ` · Finished ${new Date(publishStatus.completedAt).toLocaleString()}`
                  : null}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            className="gap-2"
            disabled={loading || publishing}
            onClick={() => void onRequestPublish()}
          >
            {publishing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Rocket className="size-4" aria-hidden />
            )}
            Request store build
          </Button>
        </div>
        {publishStatus && !publishStatus.automationConfigured ? (
          <p className="mt-4 rounded-lg border border-border/70 bg-background/80 px-3 py-2 font-mono text-[11px] text-muted-foreground">
            {publishStatus.manualCommand}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Shopper app</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {shopperApp ? (
                <>
                  <span className="font-medium text-foreground">{shopperApp.name}</span>
                  {shopperApp.whiteLabel ? (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Branded
                    </span>
                  ) : null}
                </>
              ) : (
                "Loading…"
              )}
            </p>
            {shopperApp?.bundleId ? (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {shopperApp.bundleId}
              </p>
            ) : null}
            {slug ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Slug <span className="font-mono text-foreground/90">{slug}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {tenantProfile ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => downloadTenantProfile(tenantProfile)}
              >
                <Download className="size-4" aria-hidden />
                Download EAS profile
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? <GetTheAppPanelLoading /> : null}
        {!loading && error ? (
          <div className="space-y-4">
            <GetTheAppPanelError message={error} />
            <div className="flex justify-center">
              <Button type="button" variant="outline" className="gap-2" onClick={() => void load()}>
                <AlertCircle className="size-4" aria-hidden />
                Try again
              </Button>
            </div>
          </div>
        ) : null}
        {!loading && config ? <GetTheAppPanel config={config} variant="admin" /> : null}
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Operator setup (once per platform)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            API server: set{" "}
            <code className="text-xs">APP_MOBILE_PUBLISH_GITHUB_TOKEN</code>,{" "}
            <code className="text-xs">APP_MOBILE_PUBLISH_GITHUB_REPO</code>, and{" "}
            <code className="text-xs">APP_MOBILE_PUBLISH_CALLBACK_SECRET</code> (generate with{" "}
            <code className="text-xs">openssl rand -base64 32</code>).
          </li>
          <li>
            GitHub repo secrets: <code className="text-xs">EXPO_TOKEN</code>,{" "}
            <code className="text-xs">API_PUBLIC_BASE_URL</code>, and the same{" "}
            <code className="text-xs">MOBILE_PUBLISH_CALLBACK_SECRET</code> value.
          </li>
          <li>Register bundle IDs in Apple Developer and Google Play Console.</li>
          <li>After a successful build, set store URLs on the API server for install buttons.</li>
        </ul>
      </div>
    </div>
  );
}
