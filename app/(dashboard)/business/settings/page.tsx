"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Clock,
  Coins,
  CreditCard,
  Globe,
  LayoutTemplate,
  MapPin,
  MessageCircle,
  Palette,
  RefreshCw,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
} from "lucide-react";

import { BusinessSettingsForm } from "@/components/business/business-settings-form";
import {
  BUSINESS_CONFIGURATION_NAV,
  BUSINESS_OPS_ALERT_NAV,
  BUSINESS_PROFILE_NAV,
} from "@/components/business/business-settings-nav";
import { BusinessSettingsQuickLinks } from "@/components/business-hub/business-settings-quick-links";
import { BusinessPageLayout } from "@/components/business-hub/business-page-layout";
import {
  DashboardAccessDenied,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { BusinessSettingsSkeleton } from "@/components/dashboard/business-settings-skeleton";
import { Button } from "@/components/ui/button";
import { useBusinessSettingsEditor } from "@/hooks/use-business-settings-editor";
import { HUB_BORDER, HUB_SURFACE } from "@/lib/business-hub/constants";
import { APP_ROUTES } from "@/lib/config";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import { cn } from "@/lib/utils";

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

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

export default function BusinessSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editor = useBusinessSettingsEditor();
  const [activeSection, setActiveSection] = useState(
    BUSINESS_PROFILE_NAV[0]!.id,
  );
  const focusStorefront = searchParams.get("onboarding") === "storefront";

  useEffect(() => {
    if (redirectLegacyConfigHash()) return;
  }, []);

  useEffect(() => {
    const ids = BUSINESS_PROFILE_NAV.map((item) => item.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id;
        if (top) setActiveSection(top);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0.1, 0.35, 0.6] },
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [editor.effectiveSnapshot, editor.canManageBusinessSettings]);

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

  const navByGroup = useMemo(() => {
    return [
      {
        group: "Business" as const,
        items: BUSINESS_PROFILE_NAV,
      },
    ];
  }, []);

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
    <BusinessPageLayout
      title="Business settings"
      description="Profile, storefront, and delivery — inventory and till policies live under Configuration."
    >
      <div className="space-y-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-2">
        <BusinessSettingsQuickLinks
          links={[
            {
              href: APP_ROUTES.paymentsSettings,
              label: "Payments",
              desc: "Gateways & supplier payouts",
              icon: CreditCard,
            },
            {
              href: APP_ROUTES.businessConfiguration,
              label: "Configuration",
              desc: "Inventory & till",
              icon: SlidersHorizontal,
            },
            {
              href: `${APP_ROUTES.businessConfiguration}#settings-whatsapp-alerts`,
              label: "WhatsApp alerts",
              desc: "Owner event notifications",
              icon: MessageCircle,
            },
            {
              href: APP_ROUTES.businessBranding,
              label: "Branding",
              desc: "Logo & colors",
              icon: Palette,
            },
            {
              href: APP_ROUTES.businessThemes,
              label: "Themes",
              desc: "How the website looks",
              icon: LayoutTemplate,
            },
            {
              href: APP_ROUTES.businessMobile,
              label: "Store app",
              desc: "Mobile storefront",
              icon: Smartphone,
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
              icon: Building2,
            },
          ]}
        />

        {editor.feedback && !editor.loadFailed ? (
          <DashboardFeedback
            kind={editor.feedback.kind === "error" ? "error" : "success"}
            text={editor.feedback.text}
          />
        ) : null}

        {editor.effectiveSnapshot ? (
          <section className={HUB_SURFACE}>
            <div className={cn("flex flex-wrap items-center gap-2 border-b bg-white px-4 py-2.5 sm:px-5", HUB_BORDER)}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-heading text-sm font-semibold tracking-tight text-[#141414]">
                    {editor.effectiveSnapshot.name ?? "—"}
                  </h2>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
                      editor.effectiveSnapshot.active
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-white text-[#7A7A7A] ring-1 ring-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
                    )}
                  >
                    {editor.effectiveSnapshot.active ? "Live" : "Paused"}
                  </span>
                  <span className="text-[11px] capitalize text-[#8A8A8A]">
                    {editor.effectiveSnapshot.subscriptionTier ?? "starter"}
                  </span>
                </div>
              </div>
              <Link
                href={`${APP_ROUTES.businessConfiguration}#settings-stock-levels`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-none border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  editor.inventory.allowNegativeStock
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-800"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[#666666] hover:border-[#0f766e] hover:text-[#0f766e]",
                )}
              >
                <ShoppingCart className="size-3 shrink-0" aria-hidden />
                Oversell {editor.inventory.allowNegativeStock ? "on" : "off"}
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:grid-cols-4">
              {[
                {
                  label: "Slug",
                  value: editor.effectiveSnapshot.slug ?? "—",
                  icon: Globe,
                },
                {
                  label: "Country",
                  value: editor.effectiveSnapshot.countryCode ?? "—",
                  icon: MapPin,
                },
                {
                  label: "Currency",
                  value: editor.effectiveSnapshot.currency ?? "—",
                  icon: Coins,
                },
                {
                  label: "Timezone",
                  value: editor.effectiveSnapshot.timezone ?? "—",
                  icon: Clock,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white px-3 py-2.5 sm:px-4">
                  <dt className="flex items-center gap-1 text-[10px] font-semibold tracking-[-0.02em] text-[#8A8A8A]">
                    <Icon
                      className="size-3 shrink-0 text-[#0f766e]"
                      aria-hidden
                    />
                    {label}
                  </dt>
                  <dd className="mt-0.5 truncate font-mono text-xs font-semibold text-[#141414]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <nav
          aria-label="Settings sections"
          className={cn(
            "sticky top-[3.75rem] z-20 -mx-0.5 overflow-x-auto rounded-none border bg-white px-1 py-1 lg:hidden",
            HUB_BORDER,
          )}
        >
          <div className="flex w-max gap-1 pb-0.5">
            {BUSINESS_PROFILE_NAV.map(({ id, label, icon: Icon }) => {
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveSection(id);
                    scrollToSection(id);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-none border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    active
                      ? "border-[#0f766e] bg-white text-[#0f766e]"
                      : "border-transparent text-[#666666] hover:border-[#0f766e] hover:text-[#0f766e]",
                  )}
                >
                  <Icon className="size-3 shrink-0" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </nav>

        <div
          className="grid gap-4 lg:grid-cols-[11.5rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[12.5rem_minmax(0,1fr)]"
          data-onboarding-target={ONBOARDING_TARGETS.settingsDrawer}
        >
          <aside className="hidden lg:block">
            <div className={cn("sticky top-4 space-y-3 rounded-none border bg-white p-2.5 shadow-none", HUB_BORDER)}>
              <p className="px-1.5 text-[10px] font-semibold tracking-[-0.02em] text-[#8A8A8A]">
                On this page
              </p>
              {navByGroup.map(({ group, items }) => (
                <div key={group} className="space-y-0.5">
                  <p className="px-1.5 text-[10px] font-medium tracking-[-0.02em] text-[#AAAAAA]">
                    {group}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map(({ id, label, icon: Icon }) => {
                      const active = activeSection === id;
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSection(id);
                              scrollToSection(id);
                            }}
                            className={cn(
                              "flex w-full items-center gap-1.5 rounded-none px-1.5 py-1.5 text-left text-xs transition-colors",
                              active
                                ? "border border-[#0f766e] bg-white font-medium text-[#0f766e]"
                                : "text-[#666666] hover:border hover:border-[#0f766e] hover:text-[#0f766e]",
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-3 shrink-0",
                                active ? "text-[#0f766e]" : "text-[#AAAAAA]",
                              )}
                              aria-hidden
                            />
                            <span className="truncate">{label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className={cn("rounded-none border border-dashed bg-white px-2 py-2", HUB_BORDER)}>
                <p className="text-[10px] font-semibold tracking-[-0.02em] text-[#8A8A8A]">
                  Policies
                </p>
                <Link
                  href={APP_ROUTES.businessConfiguration}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#0f766e] hover:text-[#141414]"
                >
                  Open Configuration
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              </div>
            </div>
          </aside>

          <section className={cn(HUB_SURFACE, "min-w-0 p-3 sm:p-4")}>
            <BusinessSettingsForm
              variant="profile"
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
          </section>
        </div>
      </div>
    </BusinessPageLayout>
  );
}
