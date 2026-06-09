"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Banknote,
  Building2,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  Lock,
  MapPin,
  Package,
  Receipt,
  ShoppingBag,
  SlidersHorizontal,
  Tags,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { DesktopLicenseBanner } from "@/components/desktop/desktop-license-banner";
import { DesktopReadOnlyOverlay } from "@/components/desktop/desktop-read-only-overlay";
import {
  TabletAppHeader,
  TabletBottomNav,
  TabletMoreSheet,
} from "@/components/shell/tablet-app-chrome";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { useOptionalTenant } from "@/components/providers/tenant-provider";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { logoutRemote } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { IS_DESKTOP } from "@/lib/runtime";
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
      { href: APP_ROUTES.promoCampaigns, label: "Promotions" },
      { href: APP_ROUTES.desktopSettings, label: "Desktop & LAN" },
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
      { href: APP_ROUTES.inventoryRestock, label: "Out of stock" },
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
    id: "payments",
    title: "Payments",
    blurb: "Gateways and methods",
    icon: CreditCard,
    items: [{ href: APP_ROUTES.paymentsSettings, label: "Gateway settings" }],
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
      { href: APP_ROUTES.grocery, label: "Grocery counter" },
      { href: APP_ROUTES.groceryInvoices, label: "Grocery invoices" },
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
  canAccessGrocery: boolean;
  canManageImports: boolean;
  canViewPaymentGateways: boolean;
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

/**
 * Routes that depend on cloud-only integrations (SMS/WhatsApp blasts, KopoKopo
 * STK gateway, public storefront orders, multi-domain hosting). Hidden in the
 * desktop SKU so users don't land on a dead page. See {@code DESKTOP_INSTALLATION.md} §6.2.
 */
const DESKTOP_HIDDEN_NAV_HREFS: readonly string[] = [
  APP_ROUTES.paymentsSettings,
  APP_ROUTES.promoCampaigns,
  APP_ROUTES.businessDomains,
  APP_ROUTES.storefrontWebOrders,
];

const DESKTOP_ONLY_NAV_HREFS: readonly string[] = [APP_ROUTES.desktopSettings];

function isNavItemVisible(item: NavItem, gate: NavGate): boolean {
  if (!IS_DESKTOP && DESKTOP_ONLY_NAV_HREFS.includes(item.href)) {
    return false;
  }
  if (IS_DESKTOP && DESKTOP_HIDDEN_NAV_HREFS.includes(item.href)) {
    return false;
  }

  // Restricted roles: only explicitly-allowed pages
  if (gate.roleKey === "stock_manager") {
    const allowed: readonly string[] = [
      APP_ROUTES.inventoryStockTake,
      APP_ROUTES.inventoryStockTakeReconciliation,
      APP_ROUTES.inventoryStock,
      APP_ROUTES.inventoryRestock,
      APP_ROUTES.inventoryValuation,
      APP_ROUTES.inventoryTransfers,
      APP_ROUTES.purchasingAddSupplies,
    ];
    return allowed.includes(item.href);
  }

  if (gate.roleKey === "cashier") {
    const allowed: readonly string[] = [
      APP_ROUTES.salesQuick,
      APP_ROUTES.cashier,
      APP_ROUTES.shifts,
      APP_ROUTES.purchasingAddSupplies,
      APP_ROUTES.grocery,
      APP_ROUTES.groceryInvoices,
    ];
    return allowed.includes(item.href);
  }

  // Grocery clerks: generate invoices and look at the ones they created.
  // No cashier, no sales, no other dashboard surfaces.
  if (gate.roleKey === "grocery_clerk") {
    const allowed: readonly string[] = [
      APP_ROUTES.grocery,
      APP_ROUTES.groceryInvoices,
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
  if (item.href === APP_ROUTES.inventoryRestock)
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
  if (item.href === APP_ROUTES.paymentsSettings)
    return gate.canViewPaymentGateways;
  if (item.href === APP_ROUTES.salesTransactions)
    return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.salesReports)
    return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.salesQuick) return gate.canQuickSale;
  if (item.href === APP_ROUTES.cashier) return gate.canQuickSale;
  if (item.href === APP_ROUTES.grocery) return gate.canAccessGrocery;
  if (item.href === APP_ROUTES.groceryInvoices) return gate.canAccessGrocery;
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
  {
    id: "more",
    label: "More",
    icon: Tags,
    matchSectionIds: ["org", "payments"],
  },
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
    canAccessGrocery,
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
  const isGroceryClerk =
    me?.role?.key?.trim().toLowerCase() === "grocery_clerk";
  // Tablet / iPad app shell: bottom nav + large-title header for every role
  // below 2xl (1536px). That keeps all iPad sizes — including 12.9″ landscape
  // at 1366px — in native-app mode; only wide desktop monitors get the sidebar.
  const desktopChromeVisible = "hidden 2xl:flex";
  const tabletChromeVisible = "2xl:hidden";
  const mainContentPadding = "p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] 2xl:p-6 2xl:pb-6";
  const homeHref = isStockManager
    ? APP_ROUTES.inventoryStockTake
    : isCashier
      ? APP_ROUTES.salesQuick
      : isGroceryClerk
        ? APP_ROUTES.grocery
        : APP_ROUTES.overview;
  const canReadNotifications = hasPermission(
    me?.permissions,
    Permission.ReportsNotificationsRead,
  );
  const canViewPaymentGateways = hasPermission(
    me?.permissions,
    Permission.PaymentsGatewaysRead,
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
    canAccessGrocery,
      canManageImports,
      canViewPaymentGateways,
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
    canAccessGrocery,
    canManageImports,
    canViewPaymentGateways,
    me?.role?.key,
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

  const userDisplayName = me?.name?.trim() || me?.email?.trim() || tenantTitle;

  const headerSubtitle = loading
    ? "Loading session…"
    : [business?.name, userDisplayName].filter(Boolean).join(" · ");

  const userInitial = userDisplayName.charAt(0).toUpperCase();

  const visibleBottomTabs = useMemo(() => {
    const roleKey = me?.role?.key?.trim().toLowerCase();
    if (roleKey === "stock_manager") {
      return BOTTOM_TABS.map((tab) =>
        tab.id === "inventory"
          ? { ...tab, href: APP_ROUTES.inventoryStockTake }
          : tab,
      ).filter(
        (tab) =>
          tab.id !== "overview" &&
          (!tab.href ||
            tab.href === APP_ROUTES.inventoryStockTake ||
            tab.id === "more"),
      );
    }
    if (roleKey === "cashier") {
      return BOTTOM_TABS.map((tab) => {
        if (tab.id === "sales") return { ...tab, href: APP_ROUTES.sales };
        if (tab.id === "ops") return { ...tab, href: APP_ROUTES.shifts };
        return tab;
      }).filter(
        (tab) =>
          tab.id !== "overview" &&
          (!tab.href ||
            tab.href === APP_ROUTES.sales ||
            tab.href === APP_ROUTES.salesQuick ||
            tab.href === APP_ROUTES.shifts ||
            tab.id === "more"),
      );
    }
    if (roleKey === "grocery_clerk") {
      // Compact, kiosk-friendly tab set surfaced at every viewport size since
      // the sidebar is hidden for grocery clerks (kiosk-nav mode).
      const groceryClerkTabs: readonly BottomTab[] = [
        {
          id: "pos",
          label: "POS",
          icon: ShoppingBag,
          href: APP_ROUTES.grocery,
          matchSectionIds: ["sales"],
        },
        {
          id: "invoices",
          label: "Invoices",
          icon: Receipt,
          href: APP_ROUTES.groceryInvoices,
          matchSectionIds: ["sales"],
        },
        {
          id: "more",
          label: "More",
          icon: Tags,
          matchSectionIds: ["org", "payments"],
        },
      ];
      return groceryClerkTabs;
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

    if (roleKey === "grocery_clerk") {
      const allowed = [APP_ROUTES.grocery, APP_ROUTES.groceryInvoices];
      const isAllowed = allowed.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
      );
      if (!isAllowed) {
        router.replace(APP_ROUTES.grocery);
      }
      return;
    }
  }, [me, pathname, router]);

  return (
    <div className="tablet-app-root flex h-[100dvh] overflow-hidden bg-muted/30">
      {/* ── Desktop sidebar — only on wide monitors (2xl+). iPads use bottom nav. ── */}
      <aside
        className={cn(
          "sticky top-0 h-screen w-64 shrink-0 flex-col border-r bg-background",
          desktopChromeVisible,
        )}
      >
        <div className="border-b p-4">
          <Link
            href={homeHref}
            className="mb-3 flex items-center gap-2.5 rounded-lg outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
          >
            <TenantLogo
              brand={tenantTitle}
              logoUrl={business?.branding?.logoUrl}
              faviconUrl={business?.branding?.faviconUrl}
              primaryColor={business?.branding?.primaryColor}
              variant="sidebar-mark"
            />
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
          {isStockManager || isCashier || isGroceryClerk ? (
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

      {/* ── Right panel — on iPad/tablet this becomes the rounded “app stage”. ── */}
      <div className="tablet-app-stage flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Desktop top header — paired with the desktop sidebar. Appears at
            xl+ for grocery clerks, md+ for everyone else. */}
        <header
          className={cn(
            "items-center justify-between gap-4 border-b bg-background px-6 py-3",
            desktopChromeVisible,
          )}
        >
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
            {/* Phase 9: Branch selector — hidden for stock managers, cashiers and grocery clerks who are locked to their assigned branch */}
            {isStockManager || isCashier || isGroceryClerk ? (
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

            <Button variant="outline" onClick={onLogout}>
              Log out
            </Button>
          </div>
        </header>

        <div className={tabletChromeVisible}>
          <TabletAppHeader
            tenantTitle={tenantTitle}
            businessName={business?.name}
            logoUrl={business?.branding?.logoUrl}
            faviconUrl={business?.branding?.faviconUrl}
            primaryColor={business?.branding?.primaryColor}
            branchName={currentBranch?.name}
            departmentName={currentItemType?.label}
            userInitial={userInitial}
            canReadNotifications={canReadNotifications}
            onOpenMore={() => setMoreOpen(true)}
          />
        </div>

        {IS_DESKTOP ? <DesktopLicenseBanner /> : null}

        {/* ── Main content ───────────────────────────────────────────────────── */}
        <main
          className={cn(
            "tablet-app-main relative min-h-0 flex-1 overflow-y-auto",
            mainContentPadding,
          )}
        >
          {IS_DESKTOP ? <DesktopReadOnlyOverlay /> : null}
          {children}
        </main>

        <div className={tabletChromeVisible}>
          <TabletBottomNav
            tabs={visibleBottomTabs}
            activeTabId={activeBottomTabId}
            onMore={() => setMoreOpen(true)}
          />
        </div>

        <div className={tabletChromeVisible}>
          <TabletMoreSheet
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            userDisplayName={userDisplayName}
            userEmail={me?.email}
            tenantTitle={tenantTitle}
            logoUrl={business?.branding?.logoUrl}
            faviconUrl={business?.branding?.faviconUrl}
            userInitial={userInitial}
            primaryColor={business?.branding?.primaryColor}
            sections={visibleSections}
            pathname={pathname}
            branchName={currentBranch?.name}
            branchLocked={isStockManager || isCashier || isGroceryClerk}
            branches={branches}
            branchId={branchId}
            branchesLoading={branchesLoading}
            onBranchChange={setBranchId}
            showBranchPicker={
              !isStockManager &&
              !isCashier &&
              !isGroceryClerk &&
              multiBranch
            }
            itemTypes={itemTypes}
            itemTypeId={itemTypeId}
            itemTypesLoading={itemTypesLoading}
            onItemTypeChange={setItemTypeId}
            onLogout={onLogout}
            itemIsActive={itemIsActive}
            compactNav={isStockManager || isCashier || isGroceryClerk}
          />
        </div>
      </div>
    </div>
  );
}
