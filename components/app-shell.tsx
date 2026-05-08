"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  Banknote,
  Building2,
  ChevronDown,
  ChevronRight,
  Grid3x3,
  LogOut,
  Package,
  ShoppingBag,
  SlidersHorizontal,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useOptionalTenant } from "@/components/providers/tenant-provider";
import { logoutRemote } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

const BRANCHES_LINK = { href: APP_ROUTES.branches, label: "Branches" } as const;

type NavItem = {
  href: string;
  label: string;
  /** Tenant feature flag the item depends on. Item is hidden when the flag exists and is false. */
  featureFlag?: string;
};

type NavSection = {
  id: string;
  title: string;
  blurb: string;
  icon: LucideIcon;
  items: readonly NavItem[];
};

const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: "org",
    title: "Organization",
    blurb: "Identity, access, locations",
    icon: Building2,
    items: [
      { href: APP_ROUTES.business, label: "Business settings" },
      { href: APP_ROUTES.businessBranding, label: "Branding" },
      { href: APP_ROUTES.businessDomains, label: "Domains" },
      BRANCHES_LINK,
      { href: APP_ROUTES.users, label: "Users" },
      { href: APP_ROUTES.businessImport, label: "Data import" },
    ],
  },
  {
    id: "catalog",
    title: "Catalog & relationships",
    blurb: "What you sell and who you trade with",
    icon: Package,
    items: [
      { href: APP_ROUTES.products, label: "Products" },
      { href: APP_ROUTES.categories, label: "Categories" },
      { href: APP_ROUTES.suppliers, label: "Suppliers" },
      { href: APP_ROUTES.customers, label: "Customers" },
    ],
  },
  {
    id: "purchasing",
    title: "Purchasing & payables",
    blurb: "Spend visibility and supplier cash",
    icon: Banknote,
    items: [
      { href: APP_ROUTES.purchasingAddSupplies, label: "Add supplies" },
      {
        href: APP_ROUTES.purchasingIntelligence,
        label: "Supplier intelligence",
      },
      { href: APP_ROUTES.purchasingApAging, label: "AP aging" },
      { href: APP_ROUTES.purchasingRecordPayment, label: "Record payment" },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    blurb: "Stock truth, movement, counts",
    icon: Warehouse,
    items: [
      { href: APP_ROUTES.inventoryValuation, label: "Stock valuation" },
      { href: APP_ROUTES.inventoryTransfers, label: "Stock transfers" },
      { href: APP_ROUTES.inventoryStockTake, label: "Stock take" },
    ],
  },
  {
    id: "ops",
    title: "Operations",
    blurb: "Pricing and floor rhythm",
    icon: SlidersHorizontal,
    items: [
      { href: APP_ROUTES.pricing, label: "Pricing" },
      { href: APP_ROUTES.shifts, label: "Shifts" },
    ],
  },
  {
    id: "sales",
    title: "Sales & POS",
    blurb: "Channels, reports, checkout",
    icon: ShoppingBag,
    items: [
      { href: APP_ROUTES.salesReports, label: "Sales by category" },
      {
        href: APP_ROUTES.storefrontWebOrders,
        label: "Pickup orders (web)",
        featureFlag: "shop",
      },
      { href: APP_ROUTES.salesQuick, label: "Quick sale" },
      { href: APP_ROUTES.cashier, label: "Cashier (PWA)" },
    ],
  },
];

type NavGate = {
  featureFlags: Record<string, boolean> | undefined;
  canListUsers: boolean;
  canManageBusinessSettings: boolean;
  canViewCategories: boolean;
  canViewPurchasingIntelligence: boolean;
  canAddSupplies: boolean;
  canViewApAging: boolean;
  canViewSuppliers: boolean;
  canViewCustomers: boolean;
  canRecordSupplierPayment: boolean;
  canViewInventoryValuation: boolean;
  canViewInventoryTransfers: boolean;
  canViewStockTake: boolean;
  canViewPricing: boolean;
  canViewShifts: boolean;
  canViewSalesIntelligence: boolean;
  canViewStorefrontOrders: boolean;
  canQuickSale: boolean;
  canManageImports: boolean;
};

function featureFlagAllows(
  flags: Record<string, boolean> | undefined,
  key: string | undefined,
): boolean {
  if (!key) return true;
  if (!flags || !(key in flags)) return true;
  return flags[key] === true;
}

function isNavItemVisible(item: NavItem, g: NavGate): boolean {
  if (!featureFlagAllows(g.featureFlags, item.featureFlag)) return false;
  if (
    item.href === APP_ROUTES.businessDomains ||
    item.href === APP_ROUTES.businessBranding
  )
    return g.canManageBusinessSettings;
  if (item.href === APP_ROUTES.users) return g.canListUsers;
  if (item.href === APP_ROUTES.businessImport) return g.canManageImports;
  if (item.href === APP_ROUTES.categories) return g.canViewCategories;
  if (item.href === APP_ROUTES.suppliers) return g.canViewSuppliers;
  if (item.href === APP_ROUTES.customers) return g.canViewCustomers;
  if (item.href === APP_ROUTES.purchasingIntelligence)
    return g.canViewPurchasingIntelligence;
  if (item.href === APP_ROUTES.purchasingAddSupplies) return g.canAddSupplies;
  if (item.href === APP_ROUTES.purchasingApAging) return g.canViewApAging;
  if (item.href === APP_ROUTES.purchasingRecordPayment)
    return g.canRecordSupplierPayment;
  if (item.href === APP_ROUTES.inventoryValuation)
    return g.canViewInventoryValuation;
  if (item.href === APP_ROUTES.inventoryTransfers)
    return g.canViewInventoryTransfers;
  if (item.href === APP_ROUTES.inventoryStockTake) return g.canViewStockTake;
  if (item.href === APP_ROUTES.pricing) return g.canViewPricing;
  if (item.href === APP_ROUTES.shifts) return g.canViewShifts;
  if (item.href === APP_ROUTES.salesReports) return g.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.storefrontWebOrders)
    return g.canViewStorefrontOrders;
  if (item.href === APP_ROUTES.salesQuick || item.href === APP_ROUTES.cashier)
    return g.canQuickSale;
  return true;
}

function itemIsActive(pathname: string, href: string): boolean {
  return pathname === href;
}

function sectionHasActiveItem(
  pathname: string,
  items: readonly NavItem[],
): boolean {
  return items.some((item) => pathname === item.href);
}

// ─── Bottom-tab config ────────────────────────────────────────────────────────

type BottomTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Primary href navigated to on tap (undefined → "More" special tab) */
  href?: string;
  matchSectionIds: string[];
};

const BOTTOM_TABS: BottomTab[] = [
  {
    id: "org",
    label: "Business",
    icon: Building2,
    href: APP_ROUTES.business,
    matchSectionIds: ["org"],
  },
  {
    id: "catalog",
    label: "Catalog",
    icon: Package,
    href: APP_ROUTES.products,
    matchSectionIds: ["catalog"],
  },
  {
    id: "sales",
    label: "Sales",
    icon: ShoppingBag,
    href: APP_ROUTES.salesReports,
    matchSectionIds: ["sales"],
  },
  {
    id: "inventory",
    label: "Stock",
    icon: Warehouse,
    href: APP_ROUTES.inventoryValuation,
    matchSectionIds: ["inventory"],
  },
  {
    id: "more",
    label: "More",
    icon: Grid3x3,
    matchSectionIds: ["purchasing", "ops"],
  },
];

// ─── AppShell ─────────────────────────────────────────────────────────────────

type AppShellProps = { children: React.ReactNode };

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const tenant = useOptionalTenant();
  const tenantTitle =
    tenant?.branding?.displayName ?? tenant?.tenantName ?? "UB Admin";
  const featureFlags = tenant?.featureFlags;

  const {
    business,
    me,
    loading,
    canListUsers,
    canManageBusinessSettings,
    canViewCategories,
    canViewPurchasingIntelligence,
    canPathBWrite,
    canViewApAging,
    canViewSuppliers,
    canViewCustomers,
    canRecordSupplierPayment,
    canViewInventoryValuation,
    canViewInventoryTransfers,
    canViewStockTake,
    canViewPricing,
    canViewShifts,
    canViewSalesIntelligence,
    canViewStorefrontOrders,
    canQuickSale,
    canManageImports,
  } = useDashboard();

  const canAddSupplies = canPathBWrite && canViewSuppliers && canViewCategories;

  const visibleSections = useMemo(() => {
    const gate: NavGate = {
      featureFlags,
      canListUsers,
      canManageBusinessSettings,
      canViewCategories,
      canViewPurchasingIntelligence,
      canAddSupplies,
      canViewApAging,
      canViewSuppliers,
      canViewCustomers,
      canRecordSupplierPayment,
      canViewInventoryValuation,
      canViewInventoryTransfers,
      canViewStockTake,
      canViewPricing,
      canViewShifts,
      canViewSalesIntelligence,
      canViewStorefrontOrders,
      canQuickSale,
      canManageImports,
    };
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => isNavItemVisible(item, gate)),
    })).filter((s) => s.items.length > 0);
  }, [
    featureFlags,
    canListUsers,
    canManageBusinessSettings,
    canViewCategories,
    canViewPurchasingIntelligence,
    canPathBWrite,
    canViewApAging,
    canViewSuppliers,
    canViewCustomers,
    canRecordSupplierPayment,
    canViewInventoryValuation,
    canViewInventoryTransfers,
    canViewStockTake,
    canViewPricing,
    canViewShifts,
    canViewSalesIntelligence,
    canViewStorefrontOrders,
    canQuickSale,
    canManageImports,
  ]);

  const activeSectionId = useMemo(() => {
    for (const s of visibleSections) {
      if (sectionHasActiveItem(pathname, s.items)) return s.id;
    }
    return null;
  }, [pathname, visibleSections]);

  const [userExpandedSectionIds, setUserExpandedSectionIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [moreOpen, setMoreOpen] = useState(false);

  const toggleSection = useCallback(
    (id: string) => {
      const section = visibleSections.find((s) => s.id === id);
      if (section && sectionHasActiveItem(pathname, section.items)) return;
      setUserExpandedSectionIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [pathname, visibleSections],
  );

  const onLogout = async () => {
    await logoutRemote();
    router.push(APP_ROUTES.login);
  };

  const headerSubtitle = loading
    ? "Loading session…"
    : [business?.name, me?.email].filter(Boolean).join(" · ");

  const userInitial = (me?.email ?? tenantTitle).charAt(0).toUpperCase();
  const businessInitial = (business?.name ?? tenantTitle)
    .charAt(0)
    .toUpperCase();

  // Which bottom tab is currently "active"
  const activeBottomTabId = useMemo(() => {
    for (const tab of BOTTOM_TABS) {
      if (tab.matchSectionIds.includes(activeSectionId ?? "")) return tab.id;
    }
    return null;
  }, [activeSectionId]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-muted/30">
      {/* ── Desktop sidebar (hidden on mobile) ──────────────────────────────── */}
      <aside className="hidden md:flex sticky top-0 h-screen w-64 shrink-0 flex-col border-r bg-background">
        <div className="border-b p-4">
          <h1 className="text-lg font-semibold leading-tight tracking-tight">
            {tenantTitle}
          </h1>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Navigate by area — groups collapse to reduce noise.
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2 pb-4">
          {visibleSections.map((section) => {
            const Icon = section.icon;
            const routeOpen = sectionHasActiveItem(pathname, section.items);
            const isOpen = routeOpen || userExpandedSectionIds.has(section.id);
            const sectionActive = activeSectionId === section.id;
            return (
              <div
                key={section.id}
                className={cn(
                  "rounded-lg border border-transparent transition-colors",
                  sectionActive && "border-primary/15 bg-primary/[0.04]",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                    "hover:bg-muted/80",
                    routeOpen && "cursor-default",
                  )}
                  aria-expanded={isOpen}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40",
                      sectionActive &&
                        "border-primary/25 bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium leading-none">
                      {section.title}
                      <ChevronDown
                        className={cn(
                          "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                          isOpen ? "rotate-0" : "-rotate-90",
                        )}
                        aria-hidden
                      />
                    </span>
                    <span className="mt-1 block text-[11px] font-normal leading-snug text-muted-foreground">
                      {section.blurb}
                    </span>
                  </span>
                </button>
                {isOpen ? (
                  <ul className="relative mx-1 mb-1.5 mt-0.5 space-y-0.5 border-l border-border/70 pl-2 ml-4">
                    {section.items.map((item) => {
                      const active = itemIsActive(pathname, item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "block rounded-md py-1.5 pl-2.5 pr-2 text-[13px] leading-snug text-muted-foreground transition-colors",
                              "hover:bg-accent hover:text-accent-foreground",
                              active &&
                                "bg-accent font-medium text-accent-foreground",
                            )}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Desktop top header */}
        <header className="hidden md:flex items-center justify-between border-b bg-background px-6 py-3">
          <p className="text-sm text-muted-foreground">
            {headerSubtitle ? headerSubtitle : ""}
          </p>
          <Button variant="outline" onClick={onLogout}>
            Log out
          </Button>
        </header>

        {/* ── Mobile top header ──────────────────────────────────────────────── */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-4 py-3 backdrop-blur-md shadow-sm">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background text-sm font-bold shadow-sm">
              {businessInitial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight tracking-tight">
                {tenantTitle}
              </p>
              {business?.name && business.name !== tenantTitle ? (
                <p className="truncate text-[11px] leading-none text-muted-foreground">
                  {business.name}
                </p>
              ) : null}
            </div>
          </div>
          {/* User avatar */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Open menu"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted text-sm font-semibold text-muted-foreground",
              "hover:bg-accent transition-colors active:scale-95",
            )}
          >
            {userInitial}
          </button>
        </header>

        {/* ── Main content ───────────────────────────────────────────────────── */}
        <main className="min-h-0 flex-1 overflow-y-auto md:overflow-hidden p-4 pb-28 md:p-6 md:pb-6">
          {children}
        </main>

        {/* ── Mobile bottom nav ──────────────────────────────────────────────── */}
        <nav
          aria-label="Main navigation"
          className={cn(
            "md:hidden fixed bottom-0 inset-x-0 z-40",
            "border-t border-border/40 bg-background/95 backdrop-blur-xl",
            "shadow-[0_-1px_0_0_hsl(var(--border)/0.5),0_-8px_32px_-8px_hsl(var(--foreground)/0.08)]",
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex h-[60px] items-stretch">
            {BOTTOM_TABS.map((tab) => {
              const Icon = tab.icon;
              const isMoreTab = tab.id === "more";
              const isActive = isMoreTab
                ? moreOpen ||
                  tab.matchSectionIds.includes(activeSectionId ?? "")
                : !moreOpen && tab.id === activeBottomTabId;

              if (isMoreTab) {
                return (
                  <button
                    key="more"
                    type="button"
                    onClick={() => setMoreOpen((o) => !o)}
                    className={cn(
                      "flex flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-all",
                      "active:scale-90",
                      isActive ? "text-foreground" : "text-muted-foreground/70",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-10 items-center justify-center rounded-full transition-all duration-200",
                        isActive && "bg-foreground/[0.08]",
                      )}
                    >
                      {moreOpen ? (
                        <X className="size-[18px]" aria-hidden />
                      ) : (
                        <Icon className="size-[18px]" aria-hidden />
                      )}
                    </span>
                    <span className="text-[10px] font-medium leading-none">
                      {tab.label}
                    </span>
                  </button>
                );
              }

              return (
                <Link
                  key={tab.id}
                  href={tab.href!}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-all",
                    "active:scale-90",
                    isActive ? "text-foreground" : "text-muted-foreground/70",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-10 items-center justify-center rounded-full transition-all duration-200",
                      isActive && "bg-foreground/[0.08]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "transition-all duration-200",
                        isActive ? "size-[20px]" : "size-[18px]",
                      )}
                      aria-hidden
                    />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium leading-none transition-all",
                      isActive && "font-semibold",
                    )}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ── "More" bottom sheet (mobile) ───────────────────────────────────── */}
        {moreOpen && (
          <>
            {/* Backdrop */}
            <div
              className="md:hidden fixed inset-0 z-[45] bg-background/50 backdrop-blur-[2px]"
              onClick={() => setMoreOpen(false)}
              aria-hidden
            />

            {/* Sheet */}
            <div
              className={cn(
                "md:hidden fixed inset-x-0 bottom-[60px] z-[46] flex max-h-[78dvh] flex-col",
                "rounded-t-[28px] border-t border-x border-border/50",
                "bg-background shadow-[0_-16px_64px_-8px_hsl(var(--foreground)/0.15)]",
                "animate-in slide-in-from-bottom-4 duration-300 ease-out",
              )}
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              {/* Drag handle */}
              <div className="flex shrink-0 justify-center pb-1 pt-3">
                <div className="h-[3px] w-10 rounded-full bg-border" />
              </div>

              {/* User card */}
              <div className="mx-4 my-2 flex shrink-0 items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-bold">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {me?.email ?? "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {business?.name ?? tenantTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border border-border/60 bg-background px-3 py-1.5",
                    "text-xs font-medium text-muted-foreground hover:text-foreground transition-colors",
                  )}
                >
                  <LogOut className="size-3.5" aria-hidden />
                  Out
                </button>
              </div>

              {/* Nav sections */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="space-y-1 px-4 pb-4 pt-1">
                  {visibleSections.map((section) => {
                    const Icon = section.icon;
                    const sectionActive = activeSectionId === section.id;
                    return (
                      <div
                        key={section.id}
                        className="overflow-hidden rounded-2xl border border-border/50 bg-card"
                      >
                        {/* Section header */}
                        <div
                          className={cn(
                            "flex items-center gap-2.5 px-3.5 py-2.5",
                            sectionActive && "bg-primary/[0.04]",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-lg",
                              sectionActive
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <Icon className="size-3.5" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "text-[13px] font-semibold leading-tight",
                                sectionActive && "text-primary",
                              )}
                            >
                              {section.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                              {section.blurb}
                            </p>
                          </div>
                        </div>

                        {/* Section links */}
                        <div className="border-t border-border/50 px-2 py-1.5 grid grid-cols-2 gap-1">
                          {section.items.map((item) => {
                            const active = itemIsActive(pathname, item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMoreOpen(false)}
                                className={cn(
                                  "flex items-center justify-between rounded-xl px-3 py-2 text-[13px] transition-colors",
                                  active
                                    ? "bg-foreground text-background font-medium"
                                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                                )}
                              >
                                <span className="truncate">{item.label}</span>
                                <ChevronRight
                                  className={cn(
                                    "size-3 shrink-0 ml-1",
                                    active ? "opacity-60" : "opacity-30",
                                  )}
                                  aria-hidden
                                />
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
