"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CreditCard,
  Globe,
  LayoutTemplate,
  MessageCircle,
  Palette,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Smartphone,
} from "lucide-react";

import { BusinessSettingsForm } from "@/components/business/business-settings-form";
import {
  BUSINESS_CONFIGURATION_NAV,
  BUSINESS_OPS_ALERT_NAV,
  BUSINESS_PROFILE_NAV,
} from "@/components/business/business-settings-nav";
import { BusinessHubMenuButton } from "@/components/business-hub/hub-menu";
import {
  JumpInGrid,
  type JumpInLink,
} from "@/components/business-hub/jump-in-grid";
import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { BusinessSettingsSkeleton } from "@/components/dashboard/business-settings-skeleton";
import { Button } from "@/components/ui/button";
import { useBusinessSettingsEditor } from "@/hooks/use-business-settings-editor";
import { APP_ROUTES, PLATFORM_DOMAIN } from "@/lib/config";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import { cn } from "@/lib/utils";

/** Old inventory/till anchors lived on this page — send them to Configuration. */
function redirectLegacyConfigHash() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return false;
  if (
    BUSINESS_CONFIGURATION_NAV.some((item) => item.id === hash) ||
    hash === BUSINESS_OPS_ALERT_NAV.id
  ) {
    window.location.replace(`${APP_ROUTES.businessConfiguration}#${hash}`);
    return true;
  }
  return false;
}

function sectionFromHash(hash: string): string | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (BUSINESS_PROFILE_NAV.some((item) => item.id === id)) {
    return id;
  }
  return null;
}

export default function BusinessSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editor = useBusinessSettingsEditor();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const focusStorefront = searchParams.get("onboarding") === "storefront";

  useEffect(() => {
    if (redirectLegacyConfigHash()) return;
  }, []);

  useEffect(() => {
    const applyHash = () => {
      const id = sectionFromHash(window.location.hash);
      if (id) setActiveSection(id);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const onSave = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await editor.save("profile");
    },
    [editor.save],
  );

  const onCancel = () => {
    editor.resetFormFromSnapshot();
    router.push(APP_ROUTES.business);
  };

  const setupLinks = useMemo<JumpInLink[]>(
    () => [
      {
        href: APP_ROUTES.paymentsSettings,
        label: "Payments",
        hint: "Gateways & payouts",
        icon: CreditCard,
        group: "Money",
      },
      {
        href: APP_ROUTES.branches,
        label: "Branches",
        hint: "Where you sell",
        icon: Building2,
        group: "Shop",
      },
      {
        href: APP_ROUTES.businessBranding,
        label: "Branding",
        hint: "Logo and colours",
        icon: Palette,
        group: "Storefront",
      },
      {
        href: APP_ROUTES.businessThemes,
        label: "Themes",
        hint: "How the site looks",
        icon: LayoutTemplate,
        group: "Storefront",
      },
      {
        href: APP_ROUTES.businessMobile,
        label: "Store app",
        hint: "Mobile storefront",
        icon: Smartphone,
        group: "Storefront",
      },
      {
        href: APP_ROUTES.businessDomains,
        label: "Domains",
        hint: "Custom hostnames",
        icon: Globe,
        group: "Storefront",
      },
      {
        href: APP_ROUTES.businessConfiguration,
        label: "Configuration",
        hint: "Inventory & till",
        icon: SlidersHorizontal,
        group: "Policies",
      },
      {
        href: `${APP_ROUTES.businessConfiguration}#settings-whatsapp-alerts`,
        label: "Alerts",
        hint: "WhatsApp order notices",
        icon: MessageCircle,
        group: "Policies",
      },
    ],
    [],
  );

  const snapshot = editor.effectiveSnapshot;
  const shopIdentity = {
    name: snapshot?.branding?.displayName?.trim() || snapshot?.name?.trim() || "",
    meta: [
      snapshot?.primaryDomain?.trim() ||
        (snapshot?.slug?.trim()
          ? `${snapshot.slug.trim()}.${PLATFORM_DOMAIN}`
          : ""),
      snapshot?.currency?.trim().toUpperCase(),
    ]
      .filter(Boolean)
      .join(" · "),
    logoUrl: snapshot?.branding?.logoUrl,
    faviconUrl: snapshot?.branding?.faviconUrl,
  };

  const shopSnapshot = snapshot
    ? {
        name: snapshot.name ?? null,
        active: Boolean(snapshot.active),
        subscriptionTier: snapshot.subscriptionTier ?? null,
        slug: snapshot.slug ?? null,
        countryCode: snapshot.countryCode ?? null,
        currency: snapshot.currency ?? null,
        timezone: snapshot.timezone ?? null,
      }
    : null;

  if (!editor.canManageBusinessSettings) {
    return (
      <DashboardAccessDenied
        title="Business settings"
        description="You need permission to manage business settings."
        backHref={APP_ROUTES.business}
        backLabel="Back to business"
      />
    );
  }

  if (editor.isLoading) {
    return <BusinessSettingsSkeleton />;
  }

  if (editor.loadFailed && !editor.effectiveSnapshot) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="rounded-none border border-destructive/30 bg-destructive/5 p-8 text-center shadow-none">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-6" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            Could not load settings
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {editor.feedback?.text}
          </p>
          <Button
            className="mt-6 gap-2"
            variant="outline"
            onClick={() => {
              editor.setLoadFailed(false);
              editor.setFeedback(null);
              void editor.load();
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
      data-onboarding-target={ONBOARDING_TARGETS.settingsDrawer}
    >
      <DashboardPageHero
        icon={Settings2}
        eyebrow="Shop"
        title="Business settings"
        description="Profile, storefront, and delivery — inventory and till policies live under Configuration."
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <BusinessHubMenuButton identity={shopIdentity} />
          <DashboardQuickLinks
            compact
            links={[
              {
                href: APP_ROUTES.businessConfiguration,
                label: "Configuration",
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
                href: APP_ROUTES.business,
                label: "Business",
                desc: "Morning board",
                icon: Building2,
              },
            ]}
          />
        </div>
      </DashboardPageHero>

      {editor.feedback && !editor.loadFailed ? (
        <DashboardFeedback
          kind={editor.feedback.kind === "error" ? "error" : "success"}
          text={editor.feedback.text}
        />
      ) : null}

      {snapshot ? (
        <BusinessSettingsForm
          useTheatreLayout
          variant="profile"
          activeSectionId={activeSection}
          onActiveSectionChange={setActiveSection}
          shopSnapshot={shopSnapshot}
          editable={editor.editable}
          setEditable={editor.setEditable}
          storefront={editor.storefront}
          setStorefront={editor.setStorefront}
          inventory={editor.inventory}
          setInventory={editor.setInventory}
          posDrafts={editor.posDrafts}
          setPosDrafts={editor.setPosDrafts}
          cashierCapabilities={editor.cashierCapabilities}
          setCashierCapabilities={editor.setCashierCapabilities}
          shiftSettings={editor.shiftSettings}
          setShiftSettings={editor.setShiftSettings}
          activeBranches={editor.activeBranches}
          canManageBusinessSettings={editor.canManageBusinessSettings}
          isSaving={editor.isSaving}
          storefrontNeedsBranch={editor.storefrontNeedsBranch}
          focusStorefrontOnMount={focusStorefront}
          logoUrl={editor.effectiveSnapshot?.branding?.logoUrl}
          brandPrimary={editor.effectiveSnapshot?.branding?.primaryColor}
          currency={editor.effectiveSnapshot?.currency}
          businessId={editor.effectiveSnapshot?.id}
          onSubmit={onSave}
          onCancel={onCancel}
          onRemoveDeliveryArea={editor.removeDeliveryArea}
        />
      ) : null}

      <JumpInGrid
        links={setupLinks}
        title="Shop setup"
        meta={`${setupLinks.length} pages`}
      />
    </div>
  );
}
