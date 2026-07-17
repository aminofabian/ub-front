"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  DashboardQuickLinks,
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
      desc: "Logo, colors, shop name",
      icon: Palette,
    },
    {
      href: APP_ROUTES.businessMobile,
      label: "Store app",
      desc: "Launch mobile storefront",
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
      desc: "Locations & registers",
      icon: Building2,
    },
  ] as const;

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
        "pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] 2xl:pb-20",
      )}
    >
      <div className="space-y-4 2xl:space-y-5">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 2xl:hidden">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5" asChild>
              <Link href={APP_ROUTES.business}>
                <ArrowLeft className="size-3.5" aria-hidden />
                Business
              </Link>
            </Button>
            <DashboardQuickLinks compact links={[...businessQuickLinks]} />
          </div>
        </div>

        <div className="hidden 2xl:block">
          <DashboardPageHero
            compact
            icon={Shield}
            eyebrow="Account"
            title="Business settings"
            description={
              <>
                Name, billing tier, storefront controls, and inventory policy.{" "}
                <Link
                  href={APP_ROUTES.business}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Back to business hub
                </Link>
                .
              </>
            }
          />
        </div>

        <div className="hidden gap-2 sm:grid-cols-2 2xl:grid 2xl:grid-cols-4">
          {businessQuickLinks.map(({ href, label, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all",
                "hover:border-primary/25 hover:bg-accent/40 hover:shadow-md",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  {label}
                  <ArrowRight
                    className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {desc}
                </span>
              </span>
            </Link>
          ))}
        </div>

        {feedback && !loadFailed ? (
          <DashboardFeedback
            kind={feedback.kind === "error" ? "error" : "success"}
            text={feedback.text}
          />
        ) : null}

        {effectiveSnapshot ? (
          <section className="overflow-hidden rounded-xl border border-border/80 bg-gradient-to-b from-card to-card/80 shadow-sm 2xl:rounded-2xl">
            <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-3 py-2.5 sm:px-4 2xl:px-5 2xl:py-3">
              <Shield
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold leading-tight">
                  {effectiveSnapshot.name ?? "—"}
                </h2>
                <p className="text-[11px] text-muted-foreground capitalize">
                  {effectiveSnapshot.subscriptionTier ?? "starter"} ·{" "}
                  {effectiveSnapshot.active ? "Active" : "Inactive"}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  effectiveSnapshot.active
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {effectiveSnapshot.active ? "Live" : "Paused"}
              </span>
            </div>

            <div className="p-3 sm:p-4 2xl:p-5">
              <p className="mb-2 hidden text-xs text-muted-foreground sm:mb-3 sm:block">
                Read-only workspace identifiers. Edit name, storefront, and
                policy in the form below.
              </p>
              <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
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
                    className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2.5 sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-3"
                  >
                    <dt className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <Icon className="size-3 shrink-0" aria-hidden />
                      {label}
                    </dt>
                    <dd className="truncate font-mono text-sm font-semibold text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                    inventory.allowNegativeStock
                      ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <ShoppingCart className="size-3 shrink-0" aria-hidden />
                  Cashier oversell:{" "}
                  {inventory.allowNegativeStock ? "Allowed" : "Blocked"}
                </span>
                <a
                  href="#stock-levels-settings"
                  className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                >
                  Change in Stock levels
                </a>
              </div>
            </div>
          </section>
        ) : null}

        <section
          className="rounded-xl border border-border/80 bg-card/50 p-3 shadow-sm sm:p-4 2xl:rounded-2xl 2xl:p-5"
          data-onboarding-target={ONBOARDING_TARGETS.settingsDrawer}
        >
          <p className="mb-4 hidden text-xs text-muted-foreground 2xl:block">
            Changes are sent to{" "}
            <span className="font-mono">PATCH /businesses/me</span>. Cancel
            returns to the business hub without saving.
          </p>
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
  );
}
