"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Banknote,
  Building2,
  ChevronDown,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Package,
  ShoppingBag,
  SlidersHorizontal,
  Tags,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { KioskLogoMark } from "@/components/brand/kiosk-logo-mark";
import { useOptionalTenant } from "@/components/providers/tenant-provider";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { logoutRemote } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
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
    id: "overview",
    title: "Home",
    blurb: "Dashboard overview",
    icon: LayoutDashboard,
    items: [{ href: APP_ROUTES.overview, label: "Overview" }],
  },
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
      { href: APP_ROUTES.itemTypes, label: "Departments" },
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
      { href: APP_ROUTES.inventorySupplyBatches, label: "Supply batches" },
      { href: APP_ROUTES.inventoryStock, label: "Stock" },
      { href: APP_ROUTES.inventoryValuation, label: "Stock valuation" },
      { href: APP_ROUTES.inventoryTransfers, label: "Stock transfers" },
      { href: APP_ROUTES.inventoryStockTake, label: "Stock take" },
      {
        href: APP_ROUTES.inventoryStockTakeReconciliation,
        label: "Reconciliation",
      },
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
      { href: APP_ROUTES.sales, label: "Sales" },
      { href: APP_ROUTES.salesTransactions, label: "Transactions" },
      { href: APP_ROUTES.analytics, label: "Analytics" },
      { href: APP_ROUTES.analyticsActivity, label: "Activity" },
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
  canViewSupplyBatches: boolean;
  canViewStockTake: boolean;
  canViewPricing: boolean;
  canViewShifts: boolean;
  canViewAnalytics: boolean;
  canViewSalesIntelligence: boolean;
  canViewStorefrontOrders: boolean;
  canQuickSale: boolean;
  canManageImports: boolean;
  roleKey: string | undefined;
};

function featureFlagAllows(
  item: NavItem,
  featureFlags: Record<string, boolean> | undefined,
): boolean {
  if (!item.featureFlag) return true;
  if (!featureFlags) return false;
  return featureFlags[item.featureFlag] !== false;
}

function isNavItemVisible(item: NavItem, gate: NavGate): boolean {
  // Restricted roles: only explicitly-allowed pages
  if (gate.roleKey === "stock_manager") {
    const allowed: readonly string[] = [
      APP_ROUTES.overview,
      APP_ROUTES.inventoryStockTake,
      APP_ROUTES.inventoryStockTakeReconciliation,
      APP_ROUTES.inventoryStock,
      APP_ROUTES.inventoryValuation,
      APP_ROUTES.inventoryTransfers,
      APP_ROUTES.purchasingAddSupplies,
    ];
    return allowed.includes(item.href);
  }

  if (gate.roleKey === "cashier") {
    const allowed: readonly string[] = [
      APP_ROUTES.overview,
      APP_ROUTES.salesQuick,
      APP_ROUTES.cashier,
      APP_ROUTES.shifts,
      APP_ROUTES.purchasingAddSupplies,
    ];
    return allowed.includes(item.href);
  }

  if (item.href === APP_ROUTES.overview) return true;
  if (item.href === APP_ROUTES.users) return gate.canListUsers;
  if (item.href === APP_ROUTES.businessImport) return gate.canManageImports;
  if (item.href === APP_ROUTES.categories) return gate.canViewCategories;
  if (item.href === APP_ROUTES.purchasingIntelligence)
    return gate.canViewPurchasingIntelligence;
  if (item.href === APP_ROUTES.purchasingAddSupplies)
    return gate.canAddSupplies;
  if (item.href === APP_ROUTES.purchasingApAging) return gate.canViewApAging;
  if (item.href === APP_ROUTES.suppliers) return gate.canViewSuppliers;
  if (item.href === APP_ROUTES.customers) return gate.canViewCustomers;
  if (item.href === APP_ROUTES.purchasingRecordPayment)
    return gate.canRecordSupplierPayment;
  if (item.href === APP_ROUTES.inventoryStock)
    return gate.canViewInventoryValuation;
  if (item.href === APP_ROUTES.inventoryValuation)
    return gate.canViewInventoryValuation;
  if (item.href === APP_ROUTES.inventoryTransfers)
    return gate.canViewInventoryTransfers;
  if (item.href === APP_ROUTES.inventorySupplyBatches)
    return gate.canViewSupplyBatches;
  if (item.href === APP_ROUTES.inventoryStockTake) return gate.canViewStockTake;
  if (item.href === APP_ROUTES.pricing) return gate.canViewPricing;
  if (item.href === APP_ROUTES.shifts) return gate.canViewShifts;
  if (item.href === APP_ROUTES.analytics) return gate.canViewAnalytics;
  if (item.href === APP_ROUTES.sales) return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.salesTransactions)
    return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.salesReports)
    return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.salesQuick) return gate.canQuickSale;
  if (item.href === APP_ROUTES.cashier) return gate.canQuickSale;
  return featureFlagAllows(item, gate.featureFlags);
}

function itemIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return (
    pathname === href ||
    pathname.startsWith(href + "/") ||
    pathname.startsWith(href + "?")
  );
}

function sectionHasActiveItem(
  pathname: string,
  items: readonly NavItem[],
): boolean {
  return items.some((item) => itemIsActive(pathname, item.href));
}

type BottomTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  matchSectionIds: string[];
};

const BOTTOM_TABS: readonly BottomTab[] = [
  {
    id: "overview",
    label: "Home",
    icon: LayoutDashboard,
    href: APP_ROUTES.overview,
    matchSectionIds: ["overview"],
  },
  {
    id: "catalog",
    label: "Catalog",
    icon: Package,
    href: APP_ROUTES.products,
    matchSectionIds: ["catalog"],
  },
  {
    id: "inventory",
    label: "Stock",
    icon: Warehouse,
    href: APP_ROUTES.inventoryStock,
    matchSectionIds: ["purchasing", "inventory"],
  },
  {
    id: "ops",
    label: "Operations",
    icon: SlidersHorizontal,
    href: APP_ROUTES.pricing,
    matchSectionIds: ["ops"],
  },
  {
    id: "sales",
    label: "Sales",
    icon: ShoppingBag,
    href: APP_ROUTES.analytics,
    matchSectionIds: ["sales"],
  },
  { id: "more", label: "More", icon: Tags, matchSectionIds: ["org"] },
];

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
    canViewSupplyBatches,
    canViewStockTake,
    canViewPricing,
    canViewShifts,
    canViewAnalytics,
    canViewSalesIntelligence,
    canViewStorefrontOrders,
    canQuickSale,
    canManageImports,
    branches,
    branchId,
    setBranchId,
    branchesLoading,
    itemTypes,
    itemTypeId,
    setItemTypeId,
    itemTypesLoading,
  } = useDashboard();

  const isOwner = me?.role?.key === "owner";
  const isStockManager =
    me?.role?.key?.trim().toLowerCase() === "stock_manager";
  const isCashier = me?.role?.key?.trim().toLowerCase() === "cashier";
  const canReadNotifications = hasPermission(
    me?.permissions,
    Permission.ReportsNotificationsRead,
  );

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
      canViewSupplyBatches,
      canViewStockTake,
      canViewPricing,
      canViewShifts,
      canViewAnalytics,
      canViewSalesIntelligence,
      canViewStorefrontOrders,
      canQuickSale,
      canManageImports,
      roleKey: me?.role?.key?.trim().toLowerCase(),
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
    canAddSupplies,
    canViewApAging,
    canViewSuppliers,
    canViewCustomers,
    canRecordSupplierPayment,
    canViewInventoryValuation,
    canViewInventoryTransfers,
    canViewSupplyBatches,
    canViewStockTake,
    canViewPricing,
    canViewShifts,
    canViewAnalytics,
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

  const userDisplayName =
    me?.name?.trim() || me?.email?.trim() || tenantTitle;

  const headerSubtitle = loading
    ? "Loading session…"
    : [business?.name, userDisplayName].filter(Boolean).join(" · ");

  const userInitial = userDisplayName.charAt(0).toUpperCase();
  const businessInitial = (business?.name ?? tenantTitle)
    .charAt(0)
    .toUpperCase();

  const visibleBottomTabs = useMemo(() => {
    const roleKey = me?.role?.key?.trim().toLowerCase();
    if (roleKey === "stock_manager") {
      return BOTTOM_TABS.map((tab) =>
        tab.id === "inventory"
          ? { ...tab, href: APP_ROUTES.inventoryStockTake }
          : tab,
      ).filter(
        (tab) =>
          !tab.href ||
          tab.href === APP_ROUTES.overview ||
          tab.href === APP_ROUTES.inventoryStockTake ||
          tab.id === "more",
      );
    }
    if (roleKey === "cashier") {
      return BOTTOM_TABS.map((tab) => {
        if (tab.id === "sales") return { ...tab, href: APP_ROUTES.sales };
        if (tab.id === "ops") return { ...tab, href: APP_ROUTES.shifts };
        return tab;
      }).filter(
        (tab) =>
          !tab.href ||
          tab.href === APP_ROUTES.overview ||
          tab.href === APP_ROUTES.sales ||
          tab.href === APP_ROUTES.salesQuick ||
          tab.href === APP_ROUTES.shifts ||
          tab.id === "more",
      );
    }
    return BOTTOM_TABS;
  }, [me]);

  // Which bottom tab is currently "active"
  const activeBottomTabId = useMemo(() => {
    for (const tab of visibleBottomTabs) {
      if (tab.matchSectionIds.includes(activeSectionId ?? "")) return tab.id;
    }
    return null;
  }, [activeSectionId, visibleBottomTabs]);

  // ── Phase 9: multi_branch gate ────────────────────────────────────────
  const multiBranch = featureFlags?.multi_branch !== false;

  // ── current selections for header display ─────────────────────────────────
  const currentBranch = branches.find((b) => b.id === branchId);
  const currentItemType = itemTypes.find((t) => t.id === itemTypeId);

  // ── Auto-redirect restricted roles away from unauthorized pages ──────────
  useEffect(() => {
    if (!me) return;
    const roleKey = me.role?.key?.trim().toLowerCase();

    if (roleKey === "stock_manager") {
      const allowed = [
        APP_ROUTES.inventoryStockTake,
        APP_ROUTES.inventoryStock,
        APP_ROUTES.inventoryValuation,
        APP_ROUTES.inventoryTransfers,
        APP_ROUTES.purchasingAddSupplies,
      ];
      const isAllowed = allowed.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
      );
      if (!isAllowed) {
        router.replace(APP_ROUTES.inventoryStockTake);
      }
      return;
    }

    if (roleKey === "cashier") {
      const allowed = [
        APP_ROUTES.salesQuick,
        APP_ROUTES.cashier,
        APP_ROUTES.shifts,
        APP_ROUTES.purchasingAddSupplies,
      ];
      const isAllowed = allowed.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
      );
      if (!isAllowed) {
        router.replace(APP_ROUTES.salesQuick);
      }
      return;
    }
  }, [me, pathname, router]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-muted/30">
      {/* ── Desktop sidebar (hidden on mobile) ──────────────────────────────── */}
      <aside className="hidden md:flex sticky top-0 h-screen w-64 shrink-0 flex-col border-r bg-background">
        <div className="border-b p-4">
          <Link
            href={APP_ROUTES.overview}
            className="mb-3 flex items-center gap-2.5 rounded-lg outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
          >
            {business?.branding?.logoUrl?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.branding.logoUrl.trim()}
                alt=""
                className="h-8 w-8 shrink-0 rounded-lg object-contain"
              />
            ) : (
              <KioskLogoMark size="sm" variant="default" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-tight tracking-tight">
                {tenantTitle}
              </span>
              {!business?.branding?.logoUrl?.trim() ? (
                <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">
                  Powered by Kiosk
                </span>
              ) : null}
            </span>
          </Link>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Navigate by area — groups collapse to reduce noise.
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2 pb-4">
          {isStockManager || isCashier ? (
            <div className="space-y-0.5">
              {visibleSections
                .flatMap((s) => s.items)
                .map((item) => {
                  const active = itemIsActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "block rounded-md py-1.5 pl-2.5 pr-2 text-[13px] leading-snug transition-colors",
                        active
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          ) : (
            visibleSections.map((section) => {
              const Icon = section.icon;
              const routeOpen = sectionHasActiveItem(pathname, section.items);
              const isOpen =
                routeOpen || userExpandedSectionIds.has(section.id);
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
            })
          )}
        </nav>
      </aside>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Desktop top header */}
        <header className="hidden md:flex items-center justify-between gap-4 border-b bg-background px-6 py-3">
          <div className="flex min-w-0 flex-col">
            <p className="text-sm text-muted-foreground truncate">
              {headerSubtitle ? headerSubtitle : ""}
            </p>
            {currentBranch ? (
              <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80 truncate">
                <MapPin className="size-3 shrink-0" aria-hidden />
                {currentBranch.name}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {canReadNotifications ? <NotificationBell /> : null}
            {/* Phase 9: Branch selector — hidden for stock managers and cashiers who are locked to their assigned branch */}
            {isStockManager || isCashier ? (
              currentBranch ? (
                <span
                  className="inline-flex items-center gap-1.5 h-8 px-2 text-xs font-medium text-muted-foreground border rounded-md bg-muted/30 cursor-not-allowed"
                  title="Branch switching is disabled for your role"
                >
                  <Lock className="size-3" aria-hidden />
                  <MapPin className="size-3.5" aria-hidden />
                  {currentBranch.name}
                </span>
              ) : null
            ) : multiBranch ? (
              <select
                className="h-8 max-w-[11rem] rounded-md border bg-background px-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={branchesLoading || branches.length === 0}
                aria-label="Select branch"
              >
                {branches.length === 0 ? (
                  <option value="">
                    {branchesLoading ? "Loading…" : "No branches"}
                  </option>
                ) : (
                  <>
                    {!branchId ? (
                      <option value="">Select branch…</option>
                    ) : null}
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            ) : currentBranch ? (
              <span className="inline-flex items-center gap-1.5 h-8 px-2 text-xs font-medium text-muted-foreground border rounded-md bg-muted/30">
                <MapPin className="size-3.5" aria-hidden />
                {currentBranch.name}
              </span>
            ) : null}

            {/* Item type selector */}
            <select
              className="h-8 max-w-[11rem] rounded-md border bg-background px-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
              value={itemTypeId}
              onChange={(e) => setItemTypeId(e.target.value)}
              disabled={itemTypesLoading || itemTypes.length === 0}
              aria-label="Select department"
            >
              {itemTypes.length === 0 ? (
                <option value="">
                  {itemTypesLoading ? "Loading…" : "No departments"}
                </option>
              ) : (
                <>
                  {!itemTypeId ? <option value="">Select department…</option> : null}
                  {itemTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                      {t.isDefault ? " ★" : ""}
                    </option>
                  ))}
                </>
              )}
            </select>

            <Button variant="outline" onClick={onLogout}>
              Log out
            </Button>
          </div>
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
          {/* Mobile branch + type indicator */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {currentBranch ? (
              <span className="truncate max-w-[6rem] sm:max-w-[7rem]">
                {currentBranch.name}
              </span>
            ) : null}
            {currentItemType ? (
              <span className="hidden sm:inline truncate max-w-[7rem] border-l border-border/50 pl-2">
                {currentItemType.label}
              </span>
            ) : null}
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
        <main className="min-h-0 flex-1 overflow-y-auto p-4 pb-28 md:p-6 md:pb-6">
          {children}
        </main>

        {/* ── Mobile bottom nav ──────────────────────────────────────────────── */}
        <nav
          aria-label="Main navigation"
          className={cn(
            "md:hidden fixed bottom-0 inset-x-0 z-40",
            "border-t border-border/40 bg-background/95 backdrop-blur-xl",
            "shadow-[0_-1px_0_0_hsl(var(--border)/0.5),0_-8px_32px_-8px_hsl(var(--foreground)/0.08)]",
            "pb-[env(safe-area-inset-bottom,0px)]",
          )}
        >
          <div className="flex items-center justify-around px-2 py-1">
            {visibleBottomTabs.map((tab) => {
              const Icon = tab.icon;
              const isMoreTab = tab.id === "more";
              const isActive = activeBottomTabId === tab.id;

              if (isMoreTab) {
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMoreOpen(true)}
                    aria-label={tab.label}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-xl transition-colors",
                        isActive && "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span>{tab.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={tab.id}
                  href={tab.href ?? "#"}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-xl transition-colors",
                      isActive && "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ── Mobile "More" drawer ──────────────────────────────────────────── */}
        {moreOpen ? (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-background">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">More</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex size-8 items-center justify-center rounded-full hover:bg-muted"
                aria-label="Close menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-foreground text-background text-sm font-bold">
                  {userInitial}
                </div>
                <div>
                  <p className="text-sm font-medium">{userDisplayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {me?.email?.trim() && me.email !== userDisplayName
                      ? me.email
                      : business?.name}
                  </p>
                </div>
              </div>

              {/* Branch & item type selectors on mobile */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Branch
                  </label>
                  {!isStockManager && !isCashier && isOwner ? (
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      disabled={branchesLoading || branches.length === 0}
                      aria-label="Select branch"
                    >
                      {branches.length === 0 ? (
                        <option value="">
                          {branchesLoading ? "Loading…" : "No branches"}
                        </option>
                      ) : (
                        <>
                          {!branchId ? (
                            <option value="">Select branch…</option>
                          ) : null}
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  ) : currentBranch ? (
                    <span
                      className={cn(
                        "mt-1 flex w-full items-center gap-1.5 rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium text-muted-foreground",
                        (isStockManager || isCashier) && "cursor-not-allowed",
                      )}
                      title={
                        isStockManager || isCashier
                          ? "Branch switching is disabled for your role"
                          : undefined
                      }
                    >
                      {isStockManager || isCashier ? (
                        <Lock className="size-3.5 shrink-0" aria-hidden />
                      ) : (
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                      )}
                      {currentBranch.name}
                    </span>
                  ) : null}
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Department
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    value={itemTypeId}
                    onChange={(e) => setItemTypeId(e.target.value)}
                    disabled={itemTypesLoading || itemTypes.length === 0}
                    aria-label="Select department"
                  >
                    {itemTypes.length === 0 ? (
                      <option value="">
                        {itemTypesLoading ? "Loading…" : "No departments"}
                      </option>
                    ) : (
                      <>
                        {!itemTypeId ? (
                          <option value="">Select department…</option>
                        ) : null}
                        {itemTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                            {t.isDefault ? " ★" : ""}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Navigation sections */}
              {isStockManager || isCashier ? (
                <div className="space-y-0.5">
                  {visibleSections
                    .flatMap((s) => s.items)
                    .map((item) => {
                      const active = itemIsActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "block rounded-md px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-accent font-medium text-accent-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                </div>
              ) : (
                visibleSections.map((section) => (
                  <div key={section.id}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {section.title}
                    </p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const active = itemIsActive(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              "block rounded-md px-3 py-2 text-sm transition-colors",
                              active
                                ? "bg-accent font-medium text-accent-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              {/* Logout */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={onLogout}
              >
                <LogOut className="size-4" aria-hidden />
                Log out
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
