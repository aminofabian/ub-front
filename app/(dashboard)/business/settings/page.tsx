"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Clock,
  Coins,
  Globe,
  MapPin,
  Palette,
  RefreshCw,
  Shield,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
} from "lucide-react";

import { BusinessSettingsForm } from "@/components/business/business-settings-form";
import {
  BUSINESS_CONFIGURATION_NAV,
  BUSINESS_PROFILE_NAV,
} from "@/components/business/business-settings-nav";
import {
  DASHBOARD_MAX,
  DASHBOARD_TABLE_SURFACE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { BusinessSettingsSkeleton } from "@/components/dashboard/business-settings-skeleton";
import { Button } from "@/components/ui/button";
import { useBusinessSettingsEditor } from "@/hooks/use-business-settings-editor";
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
  if (BUSINESS_CONFIGURATION_NAV.some((item) => item.id === hash)) {
    window.location.replace(
      `${APP_ROUTES.businessConfiguration}#${hash}`,
    );
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
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
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
        DASHBOARD_MAX,
        "space-y-5 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] lg:pb-16",
      )}
    >
      <header className="space-y-4 border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            asChild
          >
            <Link href={APP_ROUTES.business}>
              <ArrowLeft className="size-3.5" aria-hidden />
              Business
            </Link>
          </Button>
        </div>
        <DashboardPageHero
          compact
          icon={Shield}
          eyebrow="Account"
          title="Business settings"
          description="Profile and storefront. Inventory and till policies live under Configuration."
        />
        <DashboardQuickLinks
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
      </header>

      {editor.feedback && !editor.loadFailed ? (
        <DashboardFeedback
          kind={editor.feedback.kind === "error" ? "error" : "success"}
          text={editor.feedback.text}
        />
      ) : null}

      {editor.effectiveSnapshot ? (
        <section className={DASHBOARD_TABLE_SURFACE}>
          <div className="flex flex-wrap items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5 sm:px-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-sm font-semibold tracking-tight">
                  {editor.effectiveSnapshot.name ?? "—"}
                </h2>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    editor.effectiveSnapshot.active
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {editor.effectiveSnapshot.active ? "Live" : "Paused"}
                </span>
                <span className="text-[11px] capitalize text-muted-foreground">
                  {editor.effectiveSnapshot.subscriptionTier ?? "starter"}
                </span>
              </div>
            </div>
            <Link
              href={`${APP_ROUTES.businessConfiguration}#settings-stock-levels`}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                editor.inventory.allowNegativeStock
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                  : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <ShoppingCart className="size-3 shrink-0" aria-hidden />
              Oversell {editor.inventory.allowNegativeStock ? "on" : "off"}
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-px bg-border/40 sm:grid-cols-4">
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
              <div key={label} className="bg-card px-3 py-2.5 sm:px-4">
                <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon className="size-3 shrink-0" aria-hidden />
                  {label}
                </dt>
                <dd className="mt-0.5 truncate font-mono text-xs font-semibold">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <nav
        aria-label="Settings sections"
        className="sticky top-[3.75rem] z-20 -mx-1 overflow-x-auto bg-background/90 px-1 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
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
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? "border-primary/35 bg-primary/10 text-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
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
          <div className="sticky top-4 space-y-3 rounded-xl border border-border/60 bg-card p-2.5 shadow-sm">
            <p className="px-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              On this page
            </p>
            {navByGroup.map(({ group, items }) => (
              <div key={group} className="space-y-0.5">
                <p className="px-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
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
                            "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs transition-colors",
                            active
                              ? "bg-primary/10 font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-3 shrink-0",
                              active ? "text-primary" : "text-muted-foreground",
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
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-2 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Policies
              </p>
              <Link
                href={APP_ROUTES.businessConfiguration}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open Configuration
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          </div>
        </aside>

        <section
          className={cn(DASHBOARD_TABLE_SURFACE, "min-w-0 p-3 sm:p-4")}
        >
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
            onSubmit={onSave}
            onCancel={onCancel}
          />
        </section>
      </div>
    </div>
  );
}
