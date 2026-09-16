"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Brush, LayoutTemplate, Palette } from "lucide-react";

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
import { cn } from "@/lib/utils";

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
      <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
        <ThemesPageHeader />
        <ThemesStudioSkeleton />
      </div>
    );
  }

  if (loadFailed && !business) {
    return (
      <DashboardLoadError
        title="Could not load shop looks"
        message={
          errorText ?? "Could not load the looks for your customer website."
        }
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
      <ThemesPageHeader />
      <StorefrontThemesStudio
        business={business}
        onSaved={(next) => setBusiness(next)}
      />
    </div>
  );
}

function ThemesPageHeader() {
  return (
    <DashboardPageHero
      compact
      icon={LayoutTemplate}
      title="How your shop looks online"
      description="Tap a look. Save it when you want customers to see it."
    >
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-none shadow-none"
      >
        <Link href={APP_ROUTES.businessDesign}>
          <Brush className="size-3.5" aria-hidden />
          Design
        </Link>
      </Button>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-none shadow-none"
      >
        <Link href={APP_ROUTES.businessBranding}>
          <Palette className="size-3.5" aria-hidden />
          Branding
        </Link>
      </Button>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 rounded-none"
      >
        <Link href={APP_ROUTES.businessSettings}>
          <ArrowLeft className="size-3.5" aria-hidden />
          Settings
        </Link>
      </Button>
    </DashboardPageHero>
  );
}

function ThemesStudioSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-col gap-1.5"
      aria-busy="true"
      aria-label="Loading shop looks"
    >
      <div className="h-9 animate-pulse border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-muted/40" />
      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border lg:grid",
          "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div className="space-y-2 border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] p-3">
          <div className="h-8 animate-pulse bg-muted/70" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse bg-muted/50" />
          ))}
        </div>
        <div className="flex items-center justify-center p-6">
          <div className="h-72 w-36 animate-pulse rounded-[1.4rem] bg-muted/60" />
        </div>
        <div className="space-y-3 border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-4">
          <div className="h-5 w-28 animate-pulse bg-muted" />
          <div className="h-3 w-full animate-pulse bg-muted/60" />
          <div className="h-3 w-4/5 animate-pulse bg-muted/40" />
          <div className="h-3 w-3/5 animate-pulse bg-muted/40" />
        </div>
      </div>
      <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white lg:hidden">
        <div className="space-y-2 p-3">
          <div className="h-8 animate-pulse bg-muted/70" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse bg-muted/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
