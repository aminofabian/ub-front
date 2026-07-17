"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Smartphone,
} from "lucide-react";

import { BusinessSettingsForm } from "@/components/business/business-settings-form";
import {
  BUSINESS_SETTINGS_NAV,
  BUSINESS_SETTINGS_NAV_GROUPS,
} from "@/components/business/business-settings-nav";
import {
  applyBusinessSnapshot,
  DEFAULT_CASHIER_CAPABILITIES,
  DEFAULT_EDITABLE,
  DEFAULT_INVENTORY,
  DEFAULT_POS_DRAFTS,
  DEFAULT_SHIFT_SETTINGS,
  DEFAULT_STOREFRONT,
  defaultCatalogBranchId,
  parseFeaturedLines,
  type CashierCapabilitiesForm,
  type EditableBusiness,
  type InventoryForm,
  type PosDraftsForm,
  type ShiftSettingsForm,
  type StorefrontForm,
} from "@/components/business/business-settings-types";
import { useDashboard } from "@/components/dashboard-provider";
import { BusinessSettingsSkeleton } from "@/components/dashboard/business-settings-skeleton";
import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  fetchBranches,
  fetchBusiness,
  updateBusiness,
  type BranchRecord,
  type BusinessRecord,
  type PatchBusinessPayload,
} from "@/lib/api";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import { useSessionBootstrapSnapshot } from "@/hooks/use-session-bootstrap-snapshot";

const LOAD_TIMEOUT_MS = 20_000;

type Feedback = { kind: "success" | "error"; text: string };

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

export default function BusinessSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canManageBusinessSettings, refreshSession } = useDashboard();
  const bootstrapBusiness = useSessionBootstrapSnapshot().business;
  const [snapshot, setSnapshot] = useState<BusinessRecord | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [editable, setEditable] = useState<EditableBusiness>(DEFAULT_EDITABLE);
  const [storefront, setStorefront] =
    useState<StorefrontForm>(DEFAULT_STOREFRONT);
  const [inventory, setInventory] = useState<InventoryForm>(DEFAULT_INVENTORY);
  const [posDrafts, setPosDrafts] = useState<PosDraftsForm>(DEFAULT_POS_DRAFTS);
  const [cashierCapabilities, setCashierCapabilities] =
    useState<CashierCapabilitiesForm>(DEFAULT_CASHIER_CAPABILITIES);
  const [shiftSettings, setShiftSettings] = useState<ShiftSettingsForm>(
    DEFAULT_SHIFT_SETTINGS,
  );
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(
    BUSINESS_SETTINGS_NAV[0]!.id,
  );
  const hydratedFromBootstrap = useRef(Boolean(bootstrapBusiness));
  const effectiveSnapshot = snapshot ?? bootstrapBusiness;
  const focusStorefront = searchParams.get("onboarding") === "storefront";

  const branchesRef = useRef<BranchRecord[]>([]);
  useEffect(() => {
    branchesRef.current = branches;
  }, [branches]);

  const load = useCallback(() => {
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("Request timed out. Tap Try again.")),
        LOAD_TIMEOUT_MS,
      );
    });

    return Promise.race([fetchBusiness(), timeout])
      .then((payload) => {
        setLoadFailed(false);
        setFeedback(null);
        setSnapshot(payload);
        hydratedFromBootstrap.current = true;
        const next = applyBusinessSnapshot(payload, branchesRef.current);
        setEditable(next.editable);
        setStorefront(next.storefront);
        setInventory(next.inventory);
        setPosDrafts(next.posDrafts);
        setCashierCapabilities(next.cashierCapabilities);
        setShiftSettings(next.shiftSettings);
      })
      .catch((error) => {
        if (hydratedFromBootstrap.current) {
          return;
        }
        setLoadFailed(true);
        setSnapshot(null);
        setFeedback({
          kind: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not load your business.",
        });
      });
  }, []);

  useEffect(() => {
    if (bootstrapBusiness) {
      hydratedFromBootstrap.current = true;
      setLoadFailed(false);
      setSnapshot(bootstrapBusiness);
      const next = applyBusinessSnapshot(bootstrapBusiness, branchesRef.current);
      setEditable(next.editable);
      setStorefront(next.storefront);
      setInventory(next.inventory);
      setPosDrafts(next.posDrafts);
      setCashierCapabilities(next.cashierCapabilities);
      setShiftSettings(next.shiftSettings);
    }
    void load();
  }, [load, bootstrapBusiness]);

  useEffect(() => {
    if (!canManageBusinessSettings) {
      return;
    }
    fetchBranches()
      .then((list) => {
        setBranches(list);
        setStorefront((prev) => {
          const catalogBranchId = defaultCatalogBranchId(
            list,
            prev.catalogBranchId,
          );
          if (catalogBranchId === prev.catalogBranchId) {
            return prev;
          }
          return { ...prev, catalogBranchId };
        });
      })
      .catch(() => setBranches([]));
  }, [canManageBusinessSettings]);

  useEffect(() => {
    if (branches.length === 0) {
      return;
    }
    setStorefront((prev) => {
      const catalogBranchId = defaultCatalogBranchId(
        branches,
        prev.catalogBranchId,
      );
      if (!catalogBranchId || catalogBranchId === prev.catalogBranchId) {
        return prev;
      }
      return { ...prev, catalogBranchId };
    });
  }, [branches]);

  useEffect(() => {
    const ids = BUSINESS_SETTINGS_NAV.map((item) => item.id);
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
  }, [effectiveSnapshot, canManageBusinessSettings]);

  const resetFormFromSnapshot = useCallback(() => {
    if (!effectiveSnapshot) {
      return;
    }
    const next = applyBusinessSnapshot(effectiveSnapshot, branches);
    setEditable(next.editable);
    setStorefront(next.storefront);
    setInventory(next.inventory);
    setPosDrafts(next.posDrafts);
    setCashierCapabilities(next.cashierCapabilities);
    setShiftSettings(next.shiftSettings);
  }, [effectiveSnapshot, branches]);

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const body: PatchBusinessPayload = {
        name: editable.name,
        subscriptionTier: editable.subscriptionTier,
        active: editable.active,
      };
      if (canManageBusinessSettings) {
        body.storefront = {
          enabled: storefront.enabled,
          catalogBranchId: storefront.enabled
            ? storefront.catalogBranchId.trim()
            : "",
          label: storefront.label.trim() || null,
          announcement: storefront.announcement.trim() || null,
          featuredItemIds: parseFeaturedLines(storefront.featuredLines),
        };
        body.inventory = {
          stocktake: {
            showSystemStockToStockManager:
              inventory.showSystemStockToStockManager,
          },
          stockLevels: {
            allowStockEditForStockManager:
              inventory.allowStockEditForStockManager,
            allowStockEditForGroceryClerk:
              inventory.allowStockEditForGroceryClerk,
            allowNegativeStock: inventory.allowNegativeStock,
          },
          suppliers: {
            allowSupplierWriteForStockManager:
              inventory.allowSupplierWriteForStockManager,
            allowSupplierWriteForCashier:
              inventory.allowSupplierWriteForCashier,
            allowLinkProductsForStockManager:
              inventory.allowLinkProductsForStockManager,
            allowLinkProductsForCashier:
              inventory.allowLinkProductsForCashier,
          },
          receiveStock: {
            allowReceiveForCashier: inventory.allowReceiveForCashier,
            allowReceiveForStockManager: inventory.allowReceiveForStockManager,
          },
          creditTabs: {
            allowCashierTabClearance: inventory.allowCashierTabClearance,
          },
        };
        body.featureFlags = {
          posDrafts: {
            enabled: posDrafts.enabled,
            uiVisible: posDrafts.uiVisible,
            shadowWrites: posDrafts.shadowWrites,
            offlineMirror: posDrafts.offlineMirror,
          },
          posCashierPriceEdit: cashierCapabilities.priceEdit,
          posCashierCreateProduct: cashierCapabilities.createProduct,
          posCashierWeighedToggle: cashierCapabilities.weighedToggle,
          posCashierAddPhoto: cashierCapabilities.addPhoto,
          shiftsPrefillOpeningFromLastClose:
            shiftSettings.prefillOpeningFromLastClose,
        };
      }
      await updateBusiness(body);
      await refreshSession();
      router.refresh();
      const next = await fetchBusiness();
      setSnapshot(next);
      const applied = applyBusinessSnapshot(next, branches);
      setEditable(applied.editable);
      setStorefront(applied.storefront);
      setInventory(applied.inventory);
      setPosDrafts(applied.posDrafts);
      setCashierCapabilities(applied.cashierCapabilities);
      setShiftSettings(applied.shiftSettings);
      setFeedback({ kind: "success", text: "Your changes were saved." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong while saving.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onCancel = () => {
    resetFormFromSnapshot();
    router.push(APP_ROUTES.business);
  };

  const isLoading = effectiveSnapshot === null && !loadFailed;
  const activeBranches = branches.filter((b) => b.active);
  const storefrontNeedsBranch =
    canManageBusinessSettings &&
    storefront.enabled &&
    (activeBranches.length === 0 || !storefront.catalogBranchId.trim());

  const businessQuickLinks = [
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
  ] as const;

  const navByGroup = useMemo(() => {
    return BUSINESS_SETTINGS_NAV_GROUPS.map((group) => ({
      group,
      items: BUSINESS_SETTINGS_NAV.filter((item) => item.group === group),
    }));
  }, []);

  if (!canManageBusinessSettings) {
    return (
      <DashboardAccessDenied
        title="Business settings"
        description="You need permission to manage business settings."
        backHref={APP_ROUTES.business}
        backLabel="Back to business"
      />
    );
  }

  if (isLoading) {
    return <BusinessSettingsSkeleton />;
  }

  if (loadFailed && !effectiveSnapshot) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-6" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            Could not load settings
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{feedback?.text}</p>
          <Button
            className="mt-6 gap-2"
            variant="outline"
            onClick={() => {
              setLoadFailed(false);
              setFeedback(null);
              void load();
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
        "pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] lg:pb-16",
      )}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5" asChild>
            <Link href={APP_ROUTES.business}>
              <ArrowLeft className="size-3.5" aria-hidden />
              Business
            </Link>
          </Button>
          <div className="flex flex-wrap gap-1.5">
            {businessQuickLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm transition-colors",
                  "hover:border-primary/30 hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="size-3" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <DashboardPageHero
          compact
          icon={Shield}
          eyebrow="Account"
          title="Business settings"
          description="Profile, storefront, inventory policy, and till permissions — organized so you can jump to what you need."
        />

        {feedback && !loadFailed ? (
          <DashboardFeedback
            kind={feedback.kind === "error" ? "error" : "success"}
            text={feedback.text}
          />
        ) : null}

        {effectiveSnapshot ? (
          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-muted/25 px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold tracking-tight">
                  {effectiveSnapshot.name ?? "—"}
                </h2>
                <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                  {effectiveSnapshot.subscriptionTier ?? "starter"} plan
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                  effectiveSnapshot.active
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {effectiveSnapshot.active ? "Live" : "Paused"}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-border/50 sm:grid-cols-4">
              {[
                {
                  label: "Slug",
                  value: effectiveSnapshot.slug ?? "—",
                  icon: Globe,
                },
                {
                  label: "Country",
                  value: effectiveSnapshot.countryCode ?? "—",
                  icon: MapPin,
                },
                {
                  label: "Currency",
                  value: effectiveSnapshot.currency ?? "—",
                  icon: Coins,
                },
                {
                  label: "Timezone",
                  value: effectiveSnapshot.timezone ?? "—",
                  icon: Clock,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="bg-card px-3.5 py-3 sm:px-4 sm:py-3.5"
                >
                  <dt className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <Icon className="size-3 shrink-0" aria-hidden />
                    {label}
                  </dt>
                  <dd className="mt-1 truncate font-mono text-sm font-semibold">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-2.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                  inventory.allowNegativeStock
                    ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <ShoppingCart className="size-3 shrink-0" aria-hidden />
                Oversell: {inventory.allowNegativeStock ? "Allowed" : "Blocked"}
              </span>
              <button
                type="button"
                onClick={() => scrollToSection("settings-stock-levels")}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary underline-offset-2 hover:underline"
              >
                Change in Stock levels
                <ArrowRight className="size-3" aria-hidden />
              </button>
            </div>
          </section>
        ) : null}

        {/* Mobile section chips */}
        <nav
          aria-label="Settings sections"
          className="sticky top-[3.75rem] z-20 -mx-1 overflow-x-auto bg-background/90 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
        >
          <div className="flex w-max gap-1.5 pb-0.5">
            {BUSINESS_SETTINGS_NAV.map(({ id, label, icon: Icon }) => {
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
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/70 bg-card text-muted-foreground hover:bg-accent/50 hover:text-foreground",
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
          className="grid gap-5 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[15rem_minmax(0,1fr)]"
          data-onboarding-target={ONBOARDING_TARGETS.settingsDrawer}
        >
          {/* Desktop section nav */}
          <aside className="hidden lg:block">
            <div className="sticky top-4 space-y-4 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm">
              <p className="px-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                On this page
              </p>
              {navByGroup.map(({ group, items }) => (
                <div key={group} className="space-y-1">
                  <p className="px-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
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
                              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors",
                              active
                                ? "bg-primary/10 font-medium text-foreground"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-3.5 shrink-0",
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
            </div>
          </aside>

          <section className="min-w-0 rounded-2xl border border-border/70 bg-card/40 p-3 shadow-sm sm:p-4 xl:p-5">
            <BusinessSettingsForm
              editable={editable}
              setEditable={setEditable}
              storefront={storefront}
              setStorefront={setStorefront}
              inventory={inventory}
              setInventory={setInventory}
              posDrafts={posDrafts}
              setPosDrafts={setPosDrafts}
              cashierCapabilities={cashierCapabilities}
              setCashierCapabilities={setCashierCapabilities}
              shiftSettings={shiftSettings}
              setShiftSettings={setShiftSettings}
              activeBranches={activeBranches}
              canManageBusinessSettings={canManageBusinessSettings}
              isSaving={isSaving}
              storefrontNeedsBranch={storefrontNeedsBranch}
              focusStorefrontOnMount={focusStorefront}
              onSubmit={onSave}
              onCancel={onCancel}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
