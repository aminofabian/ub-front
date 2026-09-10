"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Brush, LayoutTemplate, Palette } from "lucide-react";

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
const STUDIO_WRAPPER =
  "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col gap-1 bg-white px-0 pb-4";

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
        message={
          errorText ?? "Could not load the looks for your customer website."
        }
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className={STUDIO_WRAPPER}>
      <div className="space-y-3">
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
        className="rounded-none shadow-none"
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
        className="rounded-none shadow-none"
      >
        <Link href={APP_ROUTES.businessBranding}>
          <Palette className="size-3.5" aria-hidden />
          Branding
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="rounded-none">
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
    <div className="space-y-3" aria-busy="true" aria-label="Loading shop looks">
      <div className="grid items-start gap-4 xl:grid-cols-[10.75rem_minmax(0,1fr)_17.5rem] xl:gap-5">
        <div className="hidden space-y-3 xl:block">
          <div className="h-3 w-16 animate-pulse bg-muted" />
          <div className="h-14 animate-pulse bg-muted" />
          <div className="h-14 animate-pulse bg-muted/70" />
          <div className="mt-4 space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-7 animate-pulse bg-muted/60" />
            ))}
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="space-y-1.5">
            <div className="h-4 w-48 animate-pulse bg-muted" />
            <div className="h-3 w-72 animate-pulse bg-muted/70" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]"
              >
                <div className="h-40 animate-pulse bg-muted/50" />
                <div className="space-y-1.5 border-t p-2.5">
                  <div className="h-3.5 w-1/2 animate-pulse bg-muted" />
                  <div className="h-3 w-16 animate-pulse bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
          <div className="space-y-3 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3.5%,white)] p-4">
            <div className="mx-auto h-52 w-28 animate-pulse rounded-[1.4rem] bg-muted" />
            <div className="mx-auto h-4 w-28 animate-pulse bg-muted" />
          </div>
          <div className="space-y-2 p-3">
            <div className="h-3 w-full animate-pulse bg-muted/60" />
            <div className="h-3 w-4/5 animate-pulse bg-muted/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
