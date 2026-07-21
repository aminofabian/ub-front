"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  ClipboardList,
  Palette,
  RefreshCw,
  Settings2,
  ShoppingCart,
  SlidersHorizontal,
  Warehouse,
} from "lucide-react";

import { BusinessConfigurationForm } from "@/components/business/business-configuration-form";
import {
  BUSINESS_CONFIGURATION_NAV,
  CONFIGURATION_WORKSPACES,
  type ConfigurationWorkspace,
} from "@/components/business/business-settings-nav";
import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { BusinessSettingsSkeleton } from "@/components/dashboard/business-settings-skeleton";
import { Button } from "@/components/ui/button";
import { useBusinessSettingsEditor } from "@/hooks/use-business-settings-editor";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

function workspaceFromHash(hash: string): ConfigurationWorkspace {
  const id = hash.replace(/^#/, "");
  const item = BUSINESS_CONFIGURATION_NAV.find((nav) => nav.id === id);
  if (item?.group === "Till") return "till";
  return "inventory";
}

export default function BusinessConfigurationPage() {
  const router = useRouter();
  const editor = useBusinessSettingsEditor();
  const [workspace, setWorkspace] =
    useState<ConfigurationWorkspace>("inventory");
  const [activeSection, setActiveSection] = useState(
    BUSINESS_CONFIGURATION_NAV[0]!.id,
  );

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      setWorkspace(workspaceFromHash(hash));
      const id = hash.replace(/^#/, "");
      if (BUSINESS_CONFIGURATION_NAV.some((item) => item.id === id)) {
        setActiveSection(id);
        window.requestAnimationFrame(() => scrollToSection(id));
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    const ids = BUSINESS_CONFIGURATION_NAV.filter((item) =>
      workspace === "inventory"
        ? item.group === "Inventory"
        : item.group === "Till",
    ).map((item) => item.id);
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
  }, [workspace, editor.effectiveSnapshot, editor.canManageBusinessSettings]);

  const sectionItems = useMemo(
    () =>
      BUSINESS_CONFIGURATION_NAV.filter((item) =>
        workspace === "inventory"
          ? item.group === "Inventory"
          : item.group === "Till",
      ),
    [workspace],
  );

  const enabledCount = useMemo(() => {
    if (workspace === "inventory") {
      return [
        editor.inventory.showSystemStockToStockManager,
        editor.inventory.allowStockEditForStockManager,
        editor.inventory.allowStockEditForGroceryClerk,
        editor.inventory.allowNegativeStock,
        editor.inventory.allowReceiveForStockManager,
        editor.inventory.allowReceiveForCashier,
        editor.inventory.allowCashierTabClearance,
        editor.inventory.allowSupplierWriteForStockManager,
        editor.inventory.allowSupplierWriteForCashier,
        editor.inventory.allowLinkProductsForStockManager,
        editor.inventory.allowLinkProductsForCashier,
      ].filter(Boolean).length;
    }
    return [
      editor.shiftSettings.prefillOpeningFromLastClose,
      editor.cashierCapabilities.priceEdit,
      editor.cashierCapabilities.createProduct,
      editor.cashierCapabilities.weighedToggle,
      editor.cashierCapabilities.addPhoto,
      editor.posDrafts.enabled,
      editor.posDrafts.uiVisible,
    ].filter(Boolean).length;
  }, [workspace, editor.inventory, editor.shiftSettings, editor.cashierCapabilities, editor.posDrafts]);

  if (!editor.canManageBusinessSettings) {
    return (
      <DashboardAccessDenied
        title="Configuration"
        description="You need permission to manage business configuration."
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
            Could not load configuration
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
        "space-y-5 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] lg:pb-16",
      )}
    >
      <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 0% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 10%, rgba(14, 165, 233, 0.12), transparent 50%), linear-gradient(180deg, color-mix(in oklab, var(--primary) 4%, transparent), transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklab, var(--foreground) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 6%, transparent) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage:
              "linear-gradient(180deg, black 0%, transparent 85%)",
          }}
        />

        <div className="relative space-y-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-xl bg-background/70 px-2.5 text-xs backdrop-blur"
              asChild
            >
              <Link href={APP_ROUTES.businessSettings}>
                <ArrowLeft className="size-3.5" aria-hidden />
                Settings
              </Link>
            </Button>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-xl bg-background/70 px-2.5 text-xs backdrop-blur"
                asChild
              >
                <Link href={APP_ROUTES.businessBranding}>
                  <Palette className="size-3.5" aria-hidden />
                  Branding
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-xl bg-background/70 px-2.5 text-xs backdrop-blur"
                asChild
              >
                <Link href={APP_ROUTES.business}>
                  <Building2 className="size-3.5" aria-hidden />
                  Business
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                <SlidersHorizontal className="size-3.5" aria-hidden />
                Configuration
              </div>
              <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                How your store runs
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                Inventory rules and till permissions in one place. Flip policies
                with clear switches — no digging through a long settings scroll.
              </p>
            </div>

            <div className="grid min-w-[12rem] grid-cols-2 gap-2 sm:min-w-[14rem]">
              <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2.5 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Active policies
                </p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">
                  {enabledCount}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2.5 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Audit sample
                </p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">
                  {editor.inventory.dailyAuditSampleSize}
                </p>
              </div>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Configuration workspaces"
            className="grid gap-2 sm:grid-cols-2"
          >
            {CONFIGURATION_WORKSPACES.map((item) => {
              const active = workspace === item.id;
              const Icon =
                item.id === "inventory" ? Warehouse : ShoppingCart;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setWorkspace(item.id);
                    const first = BUSINESS_CONFIGURATION_NAV.find((nav) =>
                      item.groups.includes(nav.group),
                    );
                    if (first) {
                      setActiveSection(first.id);
                      history.replaceState(null, "", `#${first.id}`);
                    }
                  }}
                  className={cn(
                    "group flex items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all",
                    active
                      ? "border-primary/40 bg-background shadow-md shadow-primary/10"
                      : "border-border/50 bg-background/50 hover:border-border hover:bg-background/80",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold tracking-tight">
                        {item.label}
                      </span>
                      {active ? (
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                          Open
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                      {item.blurb}
                    </span>
                  </span>
                  <ArrowRight
                    className={cn(
                      "mt-1 size-4 shrink-0 transition-opacity",
                      active ? "opacity-100 text-primary" : "opacity-30",
                    )}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {editor.feedback ? (
        <DashboardFeedback
          kind={editor.feedback.kind === "error" ? "error" : "success"}
          text={editor.feedback.text}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          <ClipboardList className="size-3.5" aria-hidden />
          Oversell{" "}
          <span
            className={cn(
              "font-semibold",
              editor.inventory.allowNegativeStock
                ? "text-amber-700 dark:text-amber-300"
                : "text-foreground",
            )}
          >
            {editor.inventory.allowNegativeStock ? "on" : "off"}
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          <Banknote className="size-3.5" aria-hidden />
          Prefill float{" "}
          <span className="font-semibold text-foreground">
            {editor.shiftSettings.prefillOpeningFromLastClose ? "on" : "off"}
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          <Settings2 className="size-3.5" aria-hidden />
          Drafts{" "}
          <span className="font-semibold text-foreground">
            {editor.posDrafts.enabled ? "on" : "off"}
          </span>
        </div>
      </div>

      <nav
        aria-label="Configuration sections"
        className="sticky top-[3.75rem] z-20 -mx-1 overflow-x-auto bg-background/90 px-1 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
      >
        <div className="flex w-max gap-1.5 pb-0.5">
          {sectionItems.map(({ id, label, icon: Icon }) => {
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
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                  active
                    ? "border-primary/40 bg-primary text-primary-foreground"
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

      <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-4 space-y-3 rounded-2xl border border-border/60 bg-card/90 p-3 shadow-sm">
            <p className="px-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              On this board
            </p>
            <ul className="space-y-0.5">
              {sectionItems.map(({ id, label, icon: Icon }) => {
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
                        "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs transition-colors",
                        active
                          ? "bg-primary/10 font-semibold text-foreground"
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
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Also under Configuration
              </p>
              <div className="mt-1.5 flex flex-col gap-1">
                <Link
                  href={APP_ROUTES.businessBranding}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Branding
                </Link>
                <Link
                  href={APP_ROUTES.businessMobile}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Store app
                </Link>
                <Link
                  href={APP_ROUTES.businessDomains}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Domains
                </Link>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <BusinessConfigurationForm
            workspace={workspace}
            inventory={editor.inventory}
            setInventory={editor.setInventory}
            posDrafts={editor.posDrafts}
            setPosDrafts={editor.setPosDrafts}
            cashierCapabilities={editor.cashierCapabilities}
            setCashierCapabilities={editor.setCashierCapabilities}
            shiftSettings={editor.shiftSettings}
            setShiftSettings={editor.setShiftSettings}
            activeBranches={editor.activeBranches}
            defaultBranchId={
              editor.storefront.catalogBranchId ||
              editor.activeBranches[0]?.id ||
              null
            }
            isSaving={editor.isSaving}
            onSubmit={(event) => {
              event.preventDefault();
              void editor.save("operations");
            }}
            onCancel={() => {
              editor.resetFormFromSnapshot();
              router.push(APP_ROUTES.business);
            }}
          />
        </div>
      </div>
    </div>
  );
}
