"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Lock,
  MapPin,
  Package,
  PackageX,
  Receipt,
  ScanLine,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Tags,
  Truck,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { DesktopLicenseBanner } from "@/components/desktop/desktop-license-banner";
import { DesktopReadOnlyOverlay } from "@/components/desktop/desktop-read-only-overlay";
import { DesktopNavRail } from "@/components/shell/desktop-nav-rail";
import {
  HeaderPosLinks,
  type HeaderPosLink,
  TabletAppHeader,
  TabletBottomNav,
  TabletMoreSheet,
} from "@/components/shell/tablet-app-chrome";

import { useOptionalTenant, useFeatureFlags } from "@/components/providers/tenant-provider";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { ALL_DEPARTMENTS_LABEL } from "@/hooks/use-session-scope";
import { isButcheryOnlyBusiness } from "@/lib/business-store-type";
import { APP_ROUTES } from "@/lib/config";
import { groceryClerkStockAccessEnabled } from "@/lib/inventory-access";
import {
  canLinkSupplierProducts,
  canWriteSuppliers,
} from "@/lib/supplier-access";
import { BUTCHER_POS_FEATURE_FLAG, isButcherPosEnabled } from "@/lib/butcher-feature";
import { logoutRemote } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { IS_DESKTOP } from "@/lib/runtime";
import { resolveActiveNavSectionId } from "@/lib/nav-active-section";
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
  shortLabel: string;
  blurb: string;
  icon: LucideIcon;
  /** Default route when tapping the section in the icon rail. */
  entryHref: string;
  items: readonly NavItem[];
};

const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: "overview",
    title: "Home",
    shortLabel: "Home",
    blurb: "Pulse of the business",
    icon: LayoutDashboard,
    entryHref: APP_ROUTES.business,
    items: [{ href: APP_ROUTES.business, label: "Business" }],
  },
  {
    id: "org",
    title: "Organization",
    shortLabel: "Setup",
    blurb: "Identity, access, and locations",
    icon: Building2,
    entryHref: APP_ROUTES.business,
    items: [
      { href: APP_ROUTES.business, label: "Business" },
      { href: APP_ROUTES.businessSettings, label: "Settings" },
      { href: APP_ROUTES.businessBranding, label: "Branding" },
      { href: APP_ROUTES.businessMobile, label: "Store app" },
      { href: APP_ROUTES.businessDomains, label: "Domains" },
      BRANCHES_LINK,
      { href: APP_ROUTES.users, label: "Users" },
      { href: APP_ROUTES.businessImport, label: "Data import" },
      { href: APP_ROUTES.promoCampaigns, label: "Promotions" },
      {
        href: APP_ROUTES.inventoryStockTakeDailyAuditReview,
        label: "Daily audit review",
      },
      { href: APP_ROUTES.desktopSettings, label: "Desktop & LAN" },
    ],
  },
  {
    id: "catalog",
    title: "Catalog",
    shortLabel: "Catalog",
    blurb: "What you sell and how it's organized",
    icon: Package,
    entryHref: APP_ROUTES.products,
    items: [
      { href: APP_ROUTES.products, label: "Products" },
      { href: APP_ROUTES.itemTypes, label: "Departments" },
      { href: APP_ROUTES.categories, label: "Categories" },
    ],
  },
  {
    id: "procurement",
    title: "Procurement",
    shortLabel: "Buy",
    blurb: "Vendors, deliveries, and payables",
    icon: Truck,
    entryHref: APP_ROUTES.suppliers,
    items: [
      { href: APP_ROUTES.suppliers, label: "Suppliers" },
      { href: APP_ROUTES.marketplace, label: "Marketplace" },
      { href: APP_ROUTES.purchasingAddSupplies, label: "Receive supplies" },
      {
        href: APP_ROUTES.purchasingIntelligence,
        label: "Supplier intelligence",
      },
      { href: APP_ROUTES.purchasingApAging, label: "AP aging" },
      { href: APP_ROUTES.purchasingRecordPayment, label: "Pay open" },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    shortLabel: "Inventory",
    blurb: "On-hand stock, movement, and counts",
    icon: Warehouse,
    entryHref: APP_ROUTES.inventoryStock,
    items: [
      { href: APP_ROUTES.inventoryStockTakeDailyAudit, label: "Daily audit" },
      {
        href: APP_ROUTES.inventoryStockTakeDailyAuditReview,
        label: "Audit review",
      },
      {
        href: APP_ROUTES.inventoryStockTakeRestock,
        label: "Restock review",
      },
      { href: APP_ROUTES.inventoryStockTake, label: "Stock take" },
      { href: APP_ROUTES.inventorySupplyBatches, label: "Supply batches" },
      { href: APP_ROUTES.inventoryStock, label: "Stock" },
      { href: APP_ROUTES.inventoryRestock, label: "Out of stock" },
      { href: APP_ROUTES.inventoryValuation, label: "Stock valuation" },
      { href: APP_ROUTES.inventoryCostIssues, label: "Cost issues" },
      {
        href: APP_ROUTES.inventoryMissingBarcodes,
        label: "Missing barcodes",
      },
      { href: APP_ROUTES.inventoryTransfers, label: "Stock transfers" },
      {
        href: APP_ROUTES.inventoryStockTakeInvestigations,
        label: "Investigations",
      },
      {
        href: APP_ROUTES.inventoryStockTakeReconciliation,
        label: "Reconciliation",
      },
    ],
  },
  {
    id: "ops",
    title: "Operations",
    shortLabel: "Ops",
    blurb: "Shelf prices and shift rhythm",
    icon: SlidersHorizontal,
    entryHref: APP_ROUTES.pricing,
    items: [
      { href: APP_ROUTES.pricing, label: "Pricing" },
      { href: APP_ROUTES.shifts, label: "Shifts" },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    shortLabel: "Pay",
    blurb: "Day ledger and checkout gateways",
    icon: CreditCard,
    entryHref: APP_ROUTES.paymentsDayLedger,
    items: [
      { href: APP_ROUTES.paymentsDayLedger, label: "Day ledger" },
      { href: APP_ROUTES.paymentsSettings, label: "Gateway settings" },
    ],
  },
  {
    id: "credits",
    title: "Credit & tabs",
    shortLabel: "Credit",
    blurb: "Customers on tab, wallets, and payment claims",
    icon: Wallet,
    entryHref: APP_ROUTES.customers,
    items: [
      { href: APP_ROUTES.customers, label: "Credit customers" },
      { href: APP_ROUTES.creditsPaymentClaims, label: "Payment claims" },
    ],
  },
  {
    id: "sales",
    title: "Sales & POS",
    shortLabel: "Sales",
    blurb: "Customers, tills, and revenue",
    icon: ShoppingBag,
    entryHref: APP_ROUTES.sales,
    items: [
      { href: APP_ROUTES.sales, label: "Sales" },
      { href: APP_ROUTES.salesTransactions, label: "Transactions" },
      {
        href: APP_ROUTES.salesPendingCarts,
        label: "Pending sales",
        featureFlag: "pos_drafts.ui_visible",
      },
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
      {
        href: APP_ROUTES.butcher,
        label: "Butcher counter",
        featureFlag: BUTCHER_POS_FEATURE_FLAG,
      },
      {
        href: APP_ROUTES.butcherSuppliers,
        label: "Butcher suppliers",
        featureFlag: BUTCHER_POS_FEATURE_FLAG,
      },
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
  canViewMarketplace: boolean;
  canViewCustomers: boolean;
  canReviewPaymentClaims: boolean;
  canRecordSupplierPayment: boolean;
  canViewInventoryValuation: boolean;
  canViewInventoryTransfers: boolean;
  canViewSupplyBatches: boolean;
  canViewStockTake: boolean;
  canApproveStockTake: boolean;
  canViewPricing: boolean;
  canViewShifts: boolean;
  canViewAnalytics: boolean;
  canViewSalesIntelligence: boolean;
  canViewStorefrontOrders: boolean;
  canQuickSale: boolean;
  canViewPosDrafts: boolean;
  canAccessGrocery: boolean;
  canManageImports: boolean;
  canViewPaymentGateways: boolean;
  roleKey: string | undefined;
  groceryClerkStockAccess: boolean;
  canWriteSuppliers: boolean;
  canLinkSupplierProducts: boolean;
};

function featureFlagAllows(
  item: NavItem,
  featureFlags: Record<string, boolean> | undefined,
): boolean {
  if (!item.featureFlag) return true;
  if (!featureFlags) return false;
  const key = item.featureFlag;
  if (key.startsWith("pos_drafts.") || key.startsWith("grocery_drafts.")) {
    return featureFlags[key] === true;
  }
  if (key === BUTCHER_POS_FEATURE_FLAG) {
    return featureFlags[key] === true;
  }
  return featureFlags[key] !== false;
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
    const allowed: string[] = [
      APP_ROUTES.inventoryStockTake,
      APP_ROUTES.inventoryStockTakeMyStats,
      APP_ROUTES.inventoryStockTakeDailyAudit,
      APP_ROUTES.inventoryStock,
      APP_ROUTES.inventoryRestock,
      APP_ROUTES.inventoryMissingBarcodes,
    ];
    if (gate.canAddSupplies) {
      allowed.push(APP_ROUTES.purchasingAddSupplies);
    }
    if (
      gate.canViewSuppliers &&
      (gate.canWriteSuppliers || gate.canLinkSupplierProducts)
    ) {
      allowed.push(APP_ROUTES.suppliers);
    }
    return allowed.includes(item.href);
  }

  if (gate.roleKey === "cashier") {
    const allowed: string[] = [
      APP_ROUTES.cashier,
      APP_ROUTES.shifts,
      APP_ROUTES.grocery,
      APP_ROUTES.groceryInvoices,
    ];
    if (gate.canAddSupplies) {
      allowed.push(APP_ROUTES.purchasingAddSupplies);
    }
    return allowed.includes(item.href);
  }

  if (gate.roleKey === "butcher_cashier") {
    const allowed: string[] = [
      APP_ROUTES.butcher,
      APP_ROUTES.butcherSuppliers,
      APP_ROUTES.shifts,
    ];
    if (gate.canAddSupplies) {
      allowed.push(APP_ROUTES.purchasingAddSupplies);
    }
    if (!allowed.includes(item.href)) return false;
    if (item.href === APP_ROUTES.butcherSuppliers) return gate.canViewSuppliers;
    return true;
  }

  // Grocery clerks: generate invoices and look at the ones they created.
  // No cashier, no sales, no other dashboard surfaces.
  if (gate.roleKey === "grocery_clerk") {
    const allowed: string[] = [
      APP_ROUTES.grocery,
      APP_ROUTES.groceryInvoices,
    ];
    if (gate.groceryClerkStockAccess) {
      allowed.push(APP_ROUTES.inventoryStock, APP_ROUTES.inventoryRestock);
    }
    return allowed.includes(item.href);
  }

  if (item.href === APP_ROUTES.overview) return true;
  if (item.href === APP_ROUTES.business) return true;
  if (item.href === APP_ROUTES.businessSettings)
    return gate.canManageBusinessSettings;
  if (item.href === APP_ROUTES.users) return gate.canListUsers;
  if (item.href === APP_ROUTES.businessImport) return gate.canManageImports;
  if (item.href === APP_ROUTES.inventoryStockTakeDailyAuditReview)
    return gate.canApproveStockTake;
  if (item.href === APP_ROUTES.categories) return gate.canViewCategories;
  if (item.href === APP_ROUTES.purchasingIntelligence)
    return gate.canViewPurchasingIntelligence;
  if (item.href === APP_ROUTES.purchasingAddSupplies)
    return gate.canAddSupplies;
  if (item.href === APP_ROUTES.purchasingApAging) return gate.canViewApAging;
  if (item.href === APP_ROUTES.suppliers) return gate.canViewSuppliers;
  // Public marketplace directory — visible to anyone who can manage suppliers.
  if (item.href === APP_ROUTES.marketplace) return gate.canViewSuppliers;
  if (item.href === APP_ROUTES.customers) return gate.canViewCustomers;
  if (item.href === APP_ROUTES.creditsPaymentClaims)
    return gate.canReviewPaymentClaims;
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
  if (item.href === APP_ROUTES.inventoryStockTakeDailyAudit)
    return gate.canViewStockTake;
  if (item.href === APP_ROUTES.inventoryStockTakeDailyAuditReview)
    return gate.canApproveStockTake;
  if (item.href === APP_ROUTES.inventoryStockTakeRestock)
    return gate.canApproveStockTake;
  if (item.href === APP_ROUTES.inventoryStockTakeRestockOrders)
    return gate.canApproveStockTake;
  if (item.href === APP_ROUTES.inventoryStockTakeInvestigations)
    return gate.canApproveStockTake;
  if (item.href === APP_ROUTES.inventoryStockTakeReconciliation)
    return gate.canApproveStockTake;
  if (item.href === APP_ROUTES.inventoryCostIssues) return gate.canViewPricing;
  if (item.href === APP_ROUTES.inventoryMissingBarcodes)
    return gate.canViewInventoryValuation;
  if (item.href === APP_ROUTES.pricing) return gate.canViewPricing;
  if (item.href === APP_ROUTES.shifts) return gate.canViewShifts;
  if (item.href === APP_ROUTES.analytics) return gate.canViewAnalytics;
  if (item.href === APP_ROUTES.sales) return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.paymentsSettings)
    return gate.canViewPaymentGateways;
  if (item.href === APP_ROUTES.paymentsDayLedger)
    return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.salesTransactions)
    return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.salesPendingCarts)
    return gate.canViewPosDrafts;
  if (item.href === APP_ROUTES.salesReports)
    return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.salesQuick) return gate.canQuickSale;
  if (item.href === APP_ROUTES.cashier) return gate.canQuickSale;
  if (item.href === APP_ROUTES.grocery) {
    if (gate.roleKey === "grocery_clerk") return gate.canAccessGrocery;
    if (isButcherPosEnabled(gate.featureFlags)) return false;
    return gate.canAccessGrocery;
  }
  if (item.href === APP_ROUTES.groceryInvoices) {
    if (gate.roleKey === "grocery_clerk") return gate.canAccessGrocery;
    if (isButcherPosEnabled(gate.featureFlags)) return false;
    return gate.canAccessGrocery;
  }
  if (item.href === APP_ROUTES.butcher) {
    return isButcherPosEnabled(gate.featureFlags) && gate.canQuickSale;
  }
  if (item.href === APP_ROUTES.butcherSuppliers) {
    return (
      isButcherPosEnabled(gate.featureFlags) && gate.canViewSuppliers
    );
  }
  return featureFlagAllows(item, gate.featureFlags);
}

function itemIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === APP_ROUTES.butcher) {
    return pathname === APP_ROUTES.butcher;
  }
  return (
    pathname === href ||
    pathname.startsWith(href + "/") ||
    pathname.startsWith(href + "?")
  );
}

type BottomTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  matchSectionIds: string[];
};

/** Stock manager: every allowed screen gets its own tab — no burying in More. */
const STOCK_MANAGER_BOTTOM_TABS: readonly BottomTab[] = [
  {
    id: "receive",
    label: "Receive",
    icon: Truck,
    href: APP_ROUTES.purchasingAddSupplies,
    matchSectionIds: ["procurement"],
  },
  {
    id: "stock-levels",
    label: "Stock",
    icon: Warehouse,
    href: APP_ROUTES.inventoryStock,
    matchSectionIds: ["inventory"],
  },
  {
    id: "out-of-stock",
    label: "Out",
    icon: PackageX,
    href: APP_ROUTES.inventoryRestock,
    matchSectionIds: ["inventory"],
  },
  {
    id: "daily-audit",
    label: "Audit",
    icon: ClipboardCheck,
    href: APP_ROUTES.inventoryStockTakeDailyAudit,
    matchSectionIds: ["inventory"],
  },
  {
    id: "stock-take",
    label: "Counts",
    icon: ClipboardList,
    href: APP_ROUTES.inventoryStockTake,
    matchSectionIds: ["inventory"],
  },
];

const BOTTOM_TABS: readonly BottomTab[] = [
  {
    id: "overview",
    label: "Home",
    icon: LayoutDashboard,
    href: APP_ROUTES.business,
    matchSectionIds: ["overview", "org"],
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
    matchSectionIds: ["procurement", "inventory"],
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
  const mergedFeatureFlags = useFeatureFlags();

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
    canViewMarketplace,
    canViewCustomers,
    canReviewPaymentClaims,
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
  const isButcherCashier =
    me?.role?.key?.trim().toLowerCase() === "butcher_cashier";
  const isGroceryClerk =
    me?.role?.key?.trim().toLowerCase() === "grocery_clerk";
  // Tablet / iPad app shell: bottom nav + large-title header for every role
  // below 2xl (1536px). That keeps all iPad sizes — including 12.9″ landscape
  // at 1366px — in native-app mode; only wide desktop monitors get the sidebar.
  const desktopChromeVisible = "hidden 2xl:flex";
  const tabletChromeVisible = "2xl:hidden";
  const mainContentPadding = "p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] 2xl:p-6 2xl:pb-6";
  const homeHref = isStockManager
    ? APP_ROUTES.inventoryStockTakeDailyAudit
    : isCashier
      ? APP_ROUTES.cashier
      : isButcherCashier
        ? APP_ROUTES.butcher
        : isGroceryClerk
          ? APP_ROUTES.grocery
          : isButcheryOnlyBusiness(business)
            ? APP_ROUTES.butcher
            : APP_ROUTES.business;
  const canReadNotifications = hasPermission(
    me?.permissions,
    Permission.ReportsNotificationsRead,
  );
  const canViewPaymentGateways = hasPermission(
    me?.permissions,
    Permission.PaymentsGatewaysRead,
  );
  const canViewPosDrafts = hasPermission(
    me?.permissions,
    Permission.PosDraftsRead,
  );
  const canApproveStockTake = hasPermission(
    me?.permissions,
    Permission.StocktakeApprove,
  );

  const canAddSupplies = canPathBWrite && canViewSuppliers && canViewCategories;
  const groceryClerkStockAccess = groceryClerkStockAccessEnabled(business);
  const canWriteSuppliersDelegated = canWriteSuppliers(me, business);
  const canLinkSupplierProductsDelegated = canLinkSupplierProducts(
    me,
    business,
  );
  const supplierToolsEnabled =
    canViewSuppliers &&
    (canWriteSuppliersDelegated || canLinkSupplierProductsDelegated);

  const visibleSections = useMemo(() => {
    const gate: NavGate = {
      featureFlags: mergedFeatureFlags,
      canListUsers,
      canManageBusinessSettings,
      canViewCategories,
      canViewPurchasingIntelligence,
      canAddSupplies,
      canViewApAging,
      canViewSuppliers,
      canViewMarketplace,
      canViewCustomers,
      canReviewPaymentClaims,
      canRecordSupplierPayment,
      canViewInventoryValuation,
      canViewInventoryTransfers,
      canViewSupplyBatches,
      canViewStockTake,
      canApproveStockTake,
      canViewPricing,
      canViewShifts,
      canViewAnalytics,
      canViewSalesIntelligence,
      canViewStorefrontOrders,
      canQuickSale,
      canViewPosDrafts,
      canAccessGrocery,
      canManageImports,
      canViewPaymentGateways,
      roleKey: me?.role?.key?.trim().toLowerCase(),
      groceryClerkStockAccess,
      canWriteSuppliers: canWriteSuppliersDelegated,
      canLinkSupplierProducts: canLinkSupplierProductsDelegated,
    };
    return NAV_SECTIONS.map((section) => {
      const items = section.items.filter((item) => isNavItemVisible(item, gate));
      return {
        ...section,
        items,
        entryHref: items[0]?.href ?? section.entryHref,
      };
    }).filter((s) => s.items.length > 0);
  }, [
    mergedFeatureFlags,
    canListUsers,
    canManageBusinessSettings,
    canViewCategories,
    canViewPurchasingIntelligence,
    canAddSupplies,
    canViewApAging,
    canViewSuppliers,
    canViewMarketplace,
    canViewCustomers,
    canReviewPaymentClaims,
    canRecordSupplierPayment,
    canViewInventoryValuation,
    canViewInventoryTransfers,
    canViewSupplyBatches,
    canViewStockTake,
    canApproveStockTake,
    canViewPricing,
    canViewShifts,
    canViewAnalytics,
    canViewSalesIntelligence,
    canViewStorefrontOrders,
    canQuickSale,
    canViewPosDrafts,
    canAccessGrocery,
    canManageImports,
    canViewPaymentGateways,
    me?.role?.key,
    groceryClerkStockAccess,
    canWriteSuppliersDelegated,
    canLinkSupplierProductsDelegated,
  ]);

  const activeSectionId = useMemo(
    () => resolveActiveNavSectionId(visibleSections, pathname, itemIsActive),
    [pathname, visibleSections],
  );

  const [moreOpen, setMoreOpen] = useState(false);

  const onLogout = async () => {
    await logoutRemote();
    router.push(APP_ROUTES.login);
  };

  const userDisplayName = me?.name?.trim() || me?.email?.trim() || tenantTitle;

  const headerSubtitle = loading
    ? "Loading session…"
    : [business?.name, userDisplayName].filter(Boolean).join(" · ");

  const userInitial = userDisplayName.charAt(0).toUpperCase();

  const headerPosLinks = useMemo((): HeaderPosLink[] => {
    const links: HeaderPosLink[] = [];
    if (canQuickSale) {
      links.push({
        href: APP_ROUTES.cashier,
        label: "Cashier",
        icon: ScanLine,
      });
    }
    if (canAccessGrocery && !isButcherPosEnabled(mergedFeatureFlags)) {
      links.push({
        href: APP_ROUTES.grocery,
        label: "Grocery",
        icon: Store,
      });
    }
    if (isButcherPosEnabled(mergedFeatureFlags) && canQuickSale) {
      links.push({
        href: APP_ROUTES.butcher,
        label: "Butcher",
        icon: ScanLine,
      });
    }
    if (isButcherPosEnabled(mergedFeatureFlags) && canViewSuppliers) {
      links.push({
        href: APP_ROUTES.butcherSuppliers,
        label: "Butcher suppliers",
        icon: Truck,
      });
    }
    return links;
  }, [canQuickSale, canAccessGrocery, canViewSuppliers, mergedFeatureFlags]);

  const visibleBottomTabs = useMemo(() => {
    const roleKey = me?.role?.key?.trim().toLowerCase();
    if (roleKey === "stock_manager") {
      const tabs: BottomTab[] = [...STOCK_MANAGER_BOTTOM_TABS];
      if (supplierToolsEnabled) {
        tabs.splice(1, 0, {
          id: "suppliers",
          label: "Vendors",
          icon: Truck,
          href: APP_ROUTES.suppliers,
          matchSectionIds: ["procurement"],
        });
      }
      return tabs;
    }
    if (roleKey === "cashier") {
      return BOTTOM_TABS.map((tab) => {
        if (tab.id === "sales") return { ...tab, href: APP_ROUTES.cashier };
        if (tab.id === "ops") return { ...tab, href: APP_ROUTES.shifts };
        return tab;
      }).filter(
        (tab) =>
          tab.id !== "overview" &&
          (!tab.href ||
            tab.href === APP_ROUTES.cashier ||
            tab.href === APP_ROUTES.shifts ||
            tab.id === "more"),
      );
    }
    if (roleKey === "butcher_cashier") {
      const tabs: BottomTab[] = [
        {
          id: "counter",
          label: "Counter",
          icon: ScanLine,
          href: APP_ROUTES.butcher,
          matchSectionIds: ["sales"],
        },
      ];
      if (canViewSuppliers) {
        tabs.push({
          id: "suppliers",
          label: "Suppliers",
          icon: Truck,
          href: APP_ROUTES.butcherSuppliers,
          matchSectionIds: ["sales", "procurement"],
        });
      }
      tabs.push(
        {
          id: "ops",
          label: "Shifts",
          icon: SlidersHorizontal,
          href: APP_ROUTES.shifts,
          matchSectionIds: ["ops"],
        },
        {
          id: "more",
          label: "More",
          icon: Tags,
          matchSectionIds: ["org", "payments", "procurement", "inventory"],
        },
      );
      return tabs;
    }
    if (roleKey === "grocery_clerk") {
      // Compact, kiosk-friendly tab set surfaced at every viewport size since
      // the sidebar is hidden for grocery clerks (kiosk-nav mode).
      const groceryClerkTabs: BottomTab[] = [
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
      ];
      if (groceryClerkStockAccessEnabled(business)) {
        groceryClerkTabs.splice(2, 0, {
          id: "stock",
          label: "Stock",
          icon: Warehouse,
          href: APP_ROUTES.inventoryStock,
          matchSectionIds: ["inventory"],
        });
      }
      groceryClerkTabs.push({
        id: "more",
        label: "More",
        icon: Tags,
        matchSectionIds: ["org", "payments"],
      });
      return groceryClerkTabs;
    }
    return BOTTOM_TABS;
  }, [me, business, canViewSuppliers, supplierToolsEnabled]);

  // Which bottom tab is currently "active"
  const activeBottomTabId = useMemo(() => {
    for (const tab of visibleBottomTabs) {
      if (tab.href && itemIsActive(pathname, tab.href)) {
        return tab.id;
      }
    }
    for (const tab of visibleBottomTabs) {
      if (tab.matchSectionIds.includes(activeSectionId ?? "")) {
        return tab.id;
      }
    }
    return null;
  }, [pathname, visibleBottomTabs, activeSectionId]);

  // ── Phase 9: multi_branch gate ────────────────────────────────────────
  const multiBranch = mergedFeatureFlags.multi_branch !== false;

  // ── current selections for header display ─────────────────────────────────
  const currentBranch = branches.find((b) => b.id === branchId);
  const currentItemType = itemTypes.find((t) => t.id === itemTypeId);
  const departmentLocked = isGroceryClerk && itemTypes.length === 1;

  // ── Auto-redirect restricted roles away from unauthorized pages ──────────
  useEffect(() => {
    if (!me) return;
    const roleKey = me.role?.key?.trim().toLowerCase();

    if (roleKey === "stock_manager") {
      const allowed: string[] = [
        APP_ROUTES.inventoryStockTake,
        APP_ROUTES.inventoryStockTakeDailyAudit,
        APP_ROUTES.inventoryStock,
        APP_ROUTES.inventoryRestock,
      ];
      if (canAddSupplies) {
        allowed.push(APP_ROUTES.purchasingAddSupplies);
      }
      if (supplierToolsEnabled) {
        allowed.push(APP_ROUTES.suppliers);
      }
      const isAllowed = allowed.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
      );
      if (!isAllowed) {
        router.replace(APP_ROUTES.inventoryStockTake);
      }
      return;
    }

    if (roleKey === "cashier") {
      const allowed: string[] = [
        APP_ROUTES.cashier,
        APP_ROUTES.shifts,
        ...(canAddSupplies ? [APP_ROUTES.purchasingAddSupplies] : []),
        ...(canViewSuppliers ? [APP_ROUTES.suppliers] : []),
      ];
      const isAllowed = allowed.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
      );
      if (!isAllowed) {
        router.replace(APP_ROUTES.cashier);
      }
      return;
    }

    if (roleKey === "butcher_cashier") {
      const allowed = [
        APP_ROUTES.butcher,
        APP_ROUTES.butcherSuppliers,
        APP_ROUTES.shifts,
        ...(canAddSupplies ? [APP_ROUTES.purchasingAddSupplies] : []),
      ];
      const isAllowed = allowed.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
      );
      if (!isAllowed) {
        router.replace(APP_ROUTES.butcher);
      }
      return;
    }

    if (roleKey === "grocery_clerk") {
      const allowed: string[] = [APP_ROUTES.grocery, APP_ROUTES.groceryInvoices];
      if (groceryClerkStockAccessEnabled(business)) {
        allowed.push(APP_ROUTES.inventoryStock, APP_ROUTES.inventoryRestock);
      }
      const isAllowed = allowed.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
      );
      if (!isAllowed) {
        router.replace(APP_ROUTES.grocery);
      }
      return;
    }
  }, [
    me,
    pathname,
    router,
    business,
    supplierToolsEnabled,
    canViewSuppliers,
    canAddSupplies,
  ]);

  return (
    <div className="tablet-app-root flex h-[100dvh] overflow-hidden bg-muted/30">
      {/* ── Desktop sidebar — icon rail + sub-nav (2xl+). iPads use bottom nav. ── */}
      <div className={cn("shrink-0", desktopChromeVisible)}>
        <DesktopNavRail
          pathname={pathname}
          homeHref={homeHref}
          tenantTitle={tenantTitle}
          logoUrl={business?.branding?.logoUrl}
          faviconUrl={business?.branding?.faviconUrl}
          primaryColor={business?.branding?.primaryColor}
          sections={visibleSections}
          flat={isStockManager || isCashier || isButcherCashier || isGroceryClerk}
        />
      </div>

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
            <HeaderPosLinks
              links={headerPosLinks}
              pathname={pathname}
              variant="desktop"
            />
            {canReadNotifications ? <NotificationBell /> : null}
            {/* Phase 9: Branch selector — hidden for stock managers, cashiers and grocery clerks who are locked to their assigned branch */}
            {isStockManager || isCashier || isButcherCashier || isGroceryClerk ? (
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
            {departmentLocked && currentItemType ? (
              <span
                className="inline-flex h-8 max-w-[11rem] items-center gap-1.5 truncate rounded-md border bg-muted/30 px-2 text-xs font-medium text-muted-foreground"
                title="Department switching is disabled for your role"
              >
                <Lock className="size-3 shrink-0" aria-hidden />
                {currentItemType.label}
              </span>
            ) : (
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
                  <option value="">{ALL_DEPARTMENTS_LABEL}</option>
                  {itemTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                      {t.isDefault ? " ★" : ""}
                    </option>
                  ))}
                </>
              )}
            </select>
            )}

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
            departmentName={currentItemType?.label ?? ALL_DEPARTMENTS_LABEL}
            userInitial={userInitial}
            canReadNotifications={canReadNotifications}
            posLinks={headerPosLinks}
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
            layout={
              isStockManager && visibleBottomTabs.length >= 4
                ? "compact"
                : "default"
            }
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
            branchLocked={isStockManager || isCashier || isButcherCashier || isGroceryClerk}
            branches={branches}
            branchId={branchId}
            branchesLoading={branchesLoading}
            onBranchChange={setBranchId}
            showBranchPicker={
              !isStockManager &&
              !isCashier &&
              !isButcherCashier &&
              !isGroceryClerk &&
              multiBranch
            }
            itemTypes={itemTypes}
            itemTypeId={itemTypeId}
            itemTypesLoading={itemTypesLoading}
            onItemTypeChange={setItemTypeId}
            departmentLocked={departmentLocked}
            onLogout={onLogout}
            itemIsActive={itemIsActive}
            compactNav={isStockManager || isCashier || isButcherCashier || isGroceryClerk}
          />
        </div>
      </div>
    </div>
  );
}
