"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LayoutTemplate, Palette } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardLoadError,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { StorefrontThemesStudio } from "@/components/business/storefront-themes-studio";
import { Button } from "@/components/ui/button";
import { fetchBusiness, type BusinessRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";

export default function BusinessThemesPage() {
  const { canManageBusinessSettings } = useDashboard();
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const load = useCallback(() => {
    return fetchBusiness()
      .then((next) => {
        setBusiness(next);
        setLoadFailed(false);
        setErrorText(null);
      })
      .catch((e) => {
        setLoadFailed(true);
        setBusiness(null);
        setErrorText(
          e instanceof Error && e.message.trim()
            ? e.message
            : "Could not load the looks for your customer website.",
        );
      });
  }, []);

  useEffect(() => {
    if (!canManageBusinessSettings) return;
    void load();
  }, [canManageBusinessSettings, load]);

  if (!canManageBusinessSettings) {
    return (
      <DashboardAccessDenied
        title="Only an owner can dress the shop"
        description="Ask the business owner to change how the customer website looks. This screen does not affect the till."
        backHref={APP_ROUTES.business}
        backLabel="Back to business"
      />
    );
  }

  if (!business && !loadFailed) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <ThemesPageHeader />
        <ThemesStudioSkeleton />
      </div>
    );
  }

  if (loadFailed && !business) {
    return (
      <DashboardLoadError
        title="Could not load shop looks"
        message={errorText ?? "Could not load the looks for your customer website."}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <div className="space-y-8">
        <ThemesPageHeader />
        <StorefrontThemesStudio
          business={business}
          onSaved={(next) => setBusiness(next)}
        />
      </div>
    </div>
  );
}

function ThemesPageHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <DashboardPageHero
        compact
        icon={LayoutTemplate}
        title="How your shop looks online"
        description="Each picture is the customer website — the page people open on their phone. This back office stays private. Pick a style, then save to hang it on the shop front."
      />
      <div className="flex flex-wrap gap-2 sm:pt-1">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={APP_ROUTES.businessBranding}>
            <Palette className="size-3.5" aria-hidden />
            Branding
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={APP_ROUTES.businessSettings}>
            <ArrowLeft className="size-3.5" aria-hidden />
            Settings
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ThemesStudioSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading shop looks">
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
      <div className="space-y-2">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-border/70"
          >
            <div className="aspect-[16/10] animate-pulse bg-muted" />
            <div className="space-y-2 p-3.5">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
