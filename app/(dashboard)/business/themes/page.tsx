"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  LayoutTemplate,
  Loader2,
  Lock,
  Palette,
  RefreshCw,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX,
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
            : "Could not load themes.",
        );
      });
  }, []);

  useEffect(() => {
    if (!canManageBusinessSettings) return;
    void load();
  }, [canManageBusinessSettings, load]);

  if (!canManageBusinessSettings) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lock className="size-6" aria-hidden />
          </div>
          <h1 className="mt-4 text-lg font-semibold tracking-tight">
            Themes are restricted
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask an owner or admin with business settings access to change the
            storefront look.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href={APP_ROUTES.business}>Back to business</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!business && !loadFailed) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 py-24">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Loading themes…</p>
      </div>
    );
  }

  if (loadFailed && !business) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-6" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            Could not load themes
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{errorText}</p>
          <Button
            className="mt-6 gap-2"
            variant="outline"
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <DashboardPageHero
            icon={LayoutTemplate}
            eyebrow="Appearance"
            title="Themes"
            description="Pick the layout for your live shop or coming-soon page. Stage a look on the right, save when it feels right."
          />
          <div className="flex flex-wrap gap-2">
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

        <StorefrontThemesStudio
          business={business}
          onSaved={(next) => setBusiness(next)}
        />
      </div>
    </div>
  );
}
