"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Lock, Store } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchMyMobileConfig,
  fetchMyMobilePublishStatus,
  requestMyMobilePublish,
} from "@/lib/api";
import type {
  MobilePublishStatus,
  MobileTenantProfileExport,
  PublicMobileConfig,
} from "@/lib/public-mobile-config";
import { useSessionBootstrapSnapshot } from "@/hooks/use-session-bootstrap-snapshot";
import { cn } from "@/lib/utils";

import { MobileTheatre } from "./_components/mobile-theatre";

function LockedNotice() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="rounded-none border border-border/80 bg-card p-8 text-center shadow-none">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="size-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">
          Store app settings are restricted
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask an owner or admin with{" "}
          <span className="font-mono text-xs">business.manage_settings</span> to
          launch your mobile store.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href={APP_ROUTES.business}>Back to business</Link>
        </Button>
      </div>
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

export default function BusinessMobilePage() {
  const { canManageBusinessSettings } = useDashboard();
  const bootstrapBusiness = useSessionBootstrapSnapshot().business;
  const [slug, setSlug] = useState(bootstrapBusiness?.slug?.trim() ?? "");
  const [config, setConfig] = useState<PublicMobileConfig | null>(null);
  const [tenantProfile, setTenantProfile] =
    useState<MobileTenantProfileExport | null>(null);
  const [publishStatus, setPublishStatus] =
    useState<MobilePublishStatus | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success";
    text: string;
  } | null>(null);
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
      setError(
        err instanceof Error ? err.message : "Could not load your store app.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const onRequestPublish = useCallback(async () => {
    setPublishing(true);
    setFeedback(null);
    try {
      const result = await requestMyMobilePublish({
        app: "shopper",
        platform: "all",
      });
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
      setError(
        err instanceof Error ? err.message : "Could not request store build.",
      );
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

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={Store}
        eyebrow="Your ecommerce"
        title="Store app"
        description="QR, publish, and EAS profile for your shopper app."
      />

      {feedback ? (
        <DashboardFeedback kind="success" text={feedback.text} />
      ) : null}

      <MobileTheatre
        slug={slug}
        config={config}
        tenantProfile={tenantProfile}
        publishStatus={publishStatus}
        loading={loading}
        publishing={publishing}
        error={error}
        onReload={() => void load()}
        onRequestPublish={() => void onRequestPublish()}
        onDownloadProfile={() => {
          if (tenantProfile) downloadTenantProfile(tenantProfile);
        }}
      />
    </div>
  );
}
