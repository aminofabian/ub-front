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
import { BusinessHubMenuButton } from "@/components/business-hub/hub-menu";
import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import {
  JumpInGrid,
  type JumpInLink,
} from "@/components/business-hub/jump-in-grid";
import { BusinessPageLayout } from "@/components/business-hub/business-page-layout";
import {
  DashboardAccessDenied,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { BusinessSettingsSkeleton } from "@/components/dashboard/business-settings-skeleton";
import { Button } from "@/components/ui/button";
import { useBusinessSettingsEditor } from "@/hooks/use-business-settings-editor";
import { HUB_BORDER, HUB_BTN, HUB_SURFACE } from "@/lib/business-hub/constants";
import { APP_ROUTES, PLATFORM_DOMAIN } from "@/lib/config";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import { cn } from "@/lib/utils";

/** Breathing room under the sticky header when a section is scrolled into view. */
const SECTION_OFFSET = 12;

/**
 * Jumps to a form section, clearing whatever the sticky hub header currently
 * measures — it grows with the shop identity and the section rail, so a fixed
 * offset would bury the heading on a phone.
 */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const chrome = document.querySelector<HTMLElement>("[data-hub-chrome]");
  const offset = (chrome?.getBoundingClientRect().height ?? 88) + SECTION_OFFSET;
  const scroller = el.closest("main");
  if (scroller) {
    const top =
      el.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop -
      offset;
    scroller.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  history.replaceState(null, "", `#${id}`);
}

/** The two form sections as a compact rail inside the sticky chrome. */
function ProfileSectionRail({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Settings sections" className="flex gap-1">
      {BUSINESS_PROFILE_NAV.map(({ id, label, icon: Icon }) => {
        const current = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={current ? "true" : undefined}
            className={cn(
              HUB_BTN,
              "inline-flex min-h-8 min-w-0 flex-1 items-center justify-center gap-1.5 border bg-white px-2.5 text-[12px] font-medium",
              current
                ? "border-[#0f766e] text-[#0f766e]"
                : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[#5A5A5A] hover:text-[#0f766e]",
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
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

  /**
   * Everything a shop owner leaves this page for. Ordered by how often it is
   * reached for, then regrouped by job in the board's overflow sheet.
   */
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
      identity={shopIdentity}
      menu={<BusinessHubMenuButton identity={shopIdentity} />}
      toolbarLeading={null}
      stageClassName="lg:hidden"
      stage={
        <ProfileSectionRail
          active={activeSection}
          onSelect={(id) => {
            setActiveSection(id);
            scrollToSection(id);
          }}
        />
      }
    >
      <div className="space-y-3.5 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:space-y-4 lg:pb-2">
        {editor.feedback && !editor.loadFailed ? (
          <DashboardFeedback
            kind={editor.feedback.kind === "error" ? "error" : "success"}
            text={editor.feedback.text}
          />
        ) : null}

        {snapshot ? (
          <section className="space-y-1.5">
            <HubSectionLabel title="This shop" className="px-0.5" />
            <div className={HUB_SURFACE}>
              <div className={cn("flex flex-wrap items-center gap-2 border-b bg-white px-4 py-2.5 sm:px-5", HUB_BORDER)}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-heading text-sm font-semibold tracking-tight text-[#141414]">
                      {snapshot.name ?? "—"}
                    </h2>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
                        snapshot.active
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-white text-[#6F6F6F] ring-1 ring-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
                      )}
                    >
                      {snapshot.active ? "Live" : "Paused"}
                    </span>
                    <span className="text-[11px] capitalize text-[#6F6F6F]">
                      {snapshot.subscriptionTier ?? "starter"}
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
                    value: snapshot.slug ?? "—",
                    icon: Globe,
                  },
                  {
                    label: "Country",
                    value: snapshot.countryCode ?? "—",
                    icon: MapPin,
                  },
                  {
                    label: "Currency",
                    value: snapshot.currency ?? "—",
                    icon: Coins,
                  },
                  {
                    label: "Timezone",
                    value: snapshot.timezone ?? "—",
                    icon: Clock,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-white px-3 py-2.5 sm:px-4">
                    <dt className="flex items-center gap-1 text-[10px] font-semibold tracking-[-0.02em] text-[#6F6F6F]">
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
            </div>
          </section>
        ) : null}

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

        {/* Where this page hands off. Kept last: the form is the job here, and
            the board is one consistent gesture with the Business hub. */}
        <JumpInGrid
          links={setupLinks}
          title="Shop setup"
          meta={`${setupLinks.length} pages`}
        />
      </div>
    </BusinessPageLayout>
  );
}
