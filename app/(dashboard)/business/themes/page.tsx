"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Brush,
  LayoutTemplate,
  Palette,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DashboardAccessDenied,
  DashboardLoadError,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { StorefrontThemesStudio } from "@/components/business/storefront-themes-studio";
import { Button } from "@/components/ui/button";
import { fetchBusiness, type BusinessRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";

/** The try-it-on atelier needs more width than the standard dashboard column. */
const STUDIO_WRAPPER = "mx-auto w-full max-w-[1400px] space-y-10 pb-20";

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
      <div className={STUDIO_WRAPPER}>
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
    <div className={STUDIO_WRAPPER}>
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
        description="Pick a look in the middle. The phone shows your shop in that layout. Open the drawers for details, colours, and side-by-side compare."
      />
      <div className="flex flex-wrap gap-2 sm:pt-1">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={APP_ROUTES.businessDesign}>
            <Brush className="size-3.5" aria-hidden />
            Design
          </Link>
        </Button>
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
    <div className="space-y-4" aria-busy="true" aria-label="Loading shop looks">
      <div className="grid items-start gap-5 xl:grid-cols-[188px_minmax(0,1fr)_300px] xl:gap-6">
        <div className="hidden space-y-3 xl:block">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted/70" />
          <div className="mt-4 space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-7 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted/70" />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 overflow-hidden rounded-xl border border-border/70 p-2.5"
              >
                <div className="h-24 w-[4.75rem] shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex flex-1 flex-col gap-2 py-1">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/70">
          <div className="space-y-3 bg-muted/25 p-4">
            <div className="mx-auto h-48 w-28 animate-pulse rounded-[1.4rem] bg-muted" />
            <div className="mx-auto h-4 w-28 animate-pulse rounded bg-muted" />
          </div>
          <div className="divide-y divide-border/60">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse bg-muted/40" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
