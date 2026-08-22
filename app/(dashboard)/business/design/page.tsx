"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Brush, LayoutTemplate } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardLoadError,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { StorefrontDesignEditor } from "@/components/business/storefront-design-editor";
import { Button } from "@/components/ui/button";
import { fetchBusiness, type BusinessRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";

export default function BusinessDesignPage() {
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
            : "Could not load your shop design.",
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
        <DesignPageHeader />
        <div className="space-y-6" aria-busy="true" aria-label="Loading shop design">
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (loadFailed && !business) {
    return (
      <DashboardLoadError
        title="Could not load shop design"
        message={errorText ?? "Could not load your shop design."}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <div className="space-y-8">
        <DesignPageHeader />
        <StorefrontDesignEditor
          business={business}
          onSaved={(next) => setBusiness(next)}
        />
      </div>
    </div>
  );
}

function DesignPageHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <DashboardPageHero
        compact
        icon={Brush}
        title="Design your shop"
        description="The theme is the starting point — this is where you make it yours. Colors and photos you set here survive a theme change, so your identity stays put."
      />
      <div className="flex flex-wrap gap-2 sm:pt-1">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={APP_ROUTES.businessThemes}>
            <LayoutTemplate className="size-3.5" aria-hidden />
            Themes
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
