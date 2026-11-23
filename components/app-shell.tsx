"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BedDouble,
  Building2,
  CalendarDays,
  ChefHat,
  ClipboardList,
  Clock,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  Lock,
  MapPin,
  Package,
  PackageCheck,
  Pill,
  Receipt,
  ScanLine,
  Scissors,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Store,
  Tags,
  Truck,
  UserRound,
  Users,
  UtensilsCrossed,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { BranchRequiredBanner } from "@/components/branch-required-banner";
import { SetupRequirementHost } from "@/components/setup/setup-requirement-host";
import { BranchSwitcher } from "@/components/branches/branch-switcher";
import { DesktopLicenseBanner } from "@/components/desktop/desktop-license-banner";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { SubscriptionStatusBanner } from "@/components/subscription-status-banner";
import { SubscriptionPlanFitBanner } from "@/components/subscription-plan-fit-banner";
import { SetupProgressContextStrip } from "@/components/setup-progress/setup-progress-context-strip";
import { DesktopReadOnlyOverlay } from "@/components/desktop/desktop-read-only-overlay";
import { KioskPayHeaderBalance } from "@/components/payments/kiosk-pay-header-balance";
import { SmsCreditsHeader } from "@/components/messaging/sms-credits-header";
import { SokoMindGuide } from "@/components/sokomind-guide";
import { DesktopNavRail } from "@/components/shell/desktop-nav-rail";
import {
  HeaderPosLinks,
  type HeaderPosLink,
  type MoreQuickLink,
  TabletAppHeader,
  TabletBottomNav,
  TabletMoreSheet,
} from "@/components/shell/tablet-app-chrome";
import {
  ShellWorkspaceDrawer,
  type ShellWorkspaceId,
} from "@/components/shell/shell-workspace-drawer";

import {
  useOptionalTenant,
  useFeatureFlags,
} from "@/components/providers/tenant-provider";
import { NotificationBell } from "@/components/notification-bell";
import { ChromeSlot } from "@/components/shell/chrome-slot";
import { useSupportUnreadBreakdown } from "@/hooks/use-support-unread";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  ALL_DEPARTMENTS_LABEL,
  ALL_SHELF_ZONES_LABEL,
  UNASSIGNED_SHELF_ZONE_VALUE,
} from "@/hooks/use-session-scope";
import {
  headerAisleSelectionValid,
  useHeaderShelfZoneOptions,
} from "@/hooks/use-department-aisles";
import { APP_ROUTES } from "@/lib/config";
import {
  groceryClerkStockAccessEnabled,
  stockManagerActivityEnabled,
  stockManagerStockPageEnabled,
  stockManagerStoreRoomEnabled,
} from "@/lib/inventory-access";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import {
  canLinkSupplierProducts,
  canWriteSuppliers,
} from "@/lib/supplier-access";
import {
  BUTCHER_POS_FEATURE_FLAG,
  isButcherPosEnabled,
} from "@/lib/butcher-feature";
import {
  logoutRemoteAndRedirectToLogin,
  type BranchRecord,
} from "@/lib/api";
import { OPEN_SHELL_MORE_EVENT } from "@/lib/branch-guidance";
import {
  isFoodBusiness,
  isFoodLedBusiness,
  isFoodOnlyBusiness,
  isLodgingBusiness,
  isClinicBusiness,
  isPharmacyBusiness,
  isSupplierBusiness,
  isWholesaleOnlyBusiness,
  isServiceBusiness,
  isTableServiceBusiness,
  isServiceOnlyBusiness,
  sellsGoodsBusiness,
} from "@/lib/business-store-type";
import { AddProductLineButton } from "@/components/shell/add-product-line-button";
import { isServiceCashier, serviceCashierMayOpen, SERVICE_CASHIER_ROUTES, trimNavForServiceOnly } from "@/lib/service-nav";
import { trimNavForFoodOnly } from "@/lib/food-nav";
import { hasPermission, Permission } from "@/lib/permissions";
import { IS_DESKTOP } from "@/lib/runtime";
import { resolveActiveNavSectionId } from "@/lib/nav-active-section";
import { cn } from "@/lib/utils";
import {
  OPERATOR_SURFACE_CLASS,
  OPERATOR_SURFACE_STYLE,
} from "@/lib/operator-surface";

const BRANCHES_LINK = {
  href: APP_ROUTES.branches,
  label: "Branches",
  group: "Access and locations",
} as const;

type NavItem = {
  href: string;
  label: string;
  /** Submenu section label — items with the same group render under one heading. */
  group?: string;
  /** Tenant feature flag the item depends on. Item is hidden when the flag exists and is false. */
  featureFlag?: string;
  /** Consecutive items in this group render as a vertical step flow with arrows. */
  flow?: boolean;
};

type NavSection = {
  id: string;
  title: string;
  shortLabel: string;
  blurb: string;
  hidePanelHeading?: boolean;
  icon: LucideIcon;
  /** Default route when tapping the section in the icon rail. */
  entryHref: string;
  items: readonly NavItem[];
};

/** In a service-only shop these two are the day's work, so they follow Business in the icon rail. */
const SERVICE_LEAD_SECTIONS: readonly string[] = ["services", "customers"];
/** A restaurant, café or bar works from its floor, counter and kitchen: that section leads its rail. */
const FOOD_LEAD_SECTIONS: readonly string[] = ["restaurant"];
/** A lodging tenant's daily work starts at the front desk; pull it up the rail, out of the leftovers. */
const LODGING_LEAD_SECTIONS: readonly string[] = ["front-desk"];
const FOOD_AND_LODGING_LEAD_SECTIONS: readonly string[] = ["restaurant", "front-desk"];
/** A chemist's daily work is the pharmacy section; it follows Business in the rail. */
const PHARMACY_LEAD_SECTIONS: readonly string[] = ["pharmacy"];
/** A clinic's daily work is the Today list; a chemist that is also a clinic leads with both. */
const CLINIC_LEAD_SECTIONS: readonly string[] = ["clinic"];
const CLINIC_AND_PHARMACY_LEAD_SECTIONS: readonly string[] = ["clinic", "pharmacy"];

/** Retail-counter sections a wholesale-only shop does not have: shifts and tills, and customer tabs. */
const WHOLESALE_ONLY_HIDDEN_SECTIONS: readonly string[] = ["ops", "credits"];

/**
 * How the shared sections read in a wholesale-only shop. The pages are the same; only the words change,
 * so the menu speaks of a business that supplies shops and not of a shop with a counter.
 */
const WHOLESALE_SECTION_WORDING: Readonly<Record<string, { title?: string; blurb: string }>> = {
  overview: { blurb: "How the business is doing" },
  org: { title: "Your business", blurb: "Business details, people, and locations" },
  catalog: { blurb: "What you sell to shops and how it's grouped" },
  procurement: { blurb: "What you order in, receive, and owe" },
  inventory: { blurb: "What you have to sell, counts, and what to restock" },
  payments: { blurb: "Money received and how you get paid" },
  customers: { blurb: "People who buy from you, history, and segments" },
  sales: { blurb: "What you sold and reports" },
};

/** A supplier's daily work is its trade desk: orders, buyers and the shops it supplies. It leads the rail. */
const SUPPLIER_LEAD_SECTIONS: readonly string[] = ["supplier"];

const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: "overview",
    title: "Business",
    shortLabel: "Business",
    blurb: "Pulse of the business",
    icon: LayoutDashboard,
    entryHref: APP_ROUTES.business,
    items: [{ href: APP_ROUTES.business, label: "Business" }],
  },
  // A supplier's shop only (see isNavItemVisible): for every other shop both items are hidden, so the
  // section is dropped. The places inside the trade desk (Today, Orders, Buyers and money, Shops you
  // supply) are its own line of navigation, so the rail carries one way in.
  {
    id: "supplier",
    title: "Wholesale",
    shortLabel: "Trade",
    blurb: "Orders, buyers and the shops you supply",
    icon: Truck,
    entryHref: APP_ROUTES.storefrontTradeOrders,
    items: [
      { href: APP_ROUTES.storefrontTradeOrders, label: "Trade desk" },
      { href: APP_ROUTES.storefrontSupplierPage, label: "Your page" },
    ],
  },
  {
    id: "org",
    title: "Your shop",
    shortLabel: "Setup",
    blurb: "Shop details, people, and locations",
    hidePanelHeading: true,
    icon: Building2,
    entryHref: APP_ROUTES.business,
    items: [
      { href: APP_ROUTES.business, label: "Business", group: "Profile" },
      {
        href: APP_ROUTES.businessSettings,
        label: "Settings",
        group: "Profile",
      },
      {
        href: APP_ROUTES.paymentsSettings,
        label: "Payments",
        group: "Profile",
      },
      {
        href: APP_ROUTES.businessConfiguration,
        label: "How the shop runs",
        group: "Configuration",
      },
      {
        href: APP_ROUTES.businessFormats,
        label: "Business formats",
        group: "Configuration",
      },
      {
        href: APP_ROUTES.businessBranding,
        label: "Branding",
        group: "Configuration",
      },
      {
        href: APP_ROUTES.businessThemes,
        label: "Themes",
        group: "Configuration",
      },
      {
        href: APP_ROUTES.businessMobile,
        label: "Store app",
        group: "Configuration",
      },
      {
        href: APP_ROUTES.businessDomains,
        label: "Domains",
        group: "Configuration",
      },
      {
        href: APP_ROUTES.promoCampaigns,
        label: "Promotions",
        group: "Configuration",
      },
      {
        href: APP_ROUTES.desktopSettings,
        label: "Desktop & LAN",
        group: "Configuration",
      },
      {
        href: APP_ROUTES.integrationsEasyTax,
        label: "Tax (eTIMS)",
        group: "Configuration",
      },
      BRANCHES_LINK,
      {
        href: APP_ROUTES.users,
        label: "Users",
        group: "Access and locations",
      },
      {
        href: APP_ROUTES.payroll,
        label: "Payroll",
        group: "Access and locations",
      },
      {
        href: APP_ROUTES.myProfile,
        label: "My profile",
        group: "Access and locations",
      },
      {
        href: APP_ROUTES.inbox,
        label: "WhatsApp inbox",
        group: "Inbox",
      },
      {
        href: APP_ROUTES.inboxSettings,
        label: "WhatsApp settings",
        group: "Inbox",
      },
      {
        href: APP_ROUTES.inboxAutomations,
        label: "Automations",
        group: "Inbox",
      },
      {
        href: APP_ROUTES.inboxBroadcasts,
        label: "Broadcasts",
        group: "Inbox",
      },
      {
        href: APP_ROUTES.messages,
        label: "Messages",
        group: "Inbox",
      },
      {
        href: APP_ROUTES.support,
        label: "Support",
        group: "Inbox",
      },
      {
        href: APP_ROUTES.businessLogs,
        label: "Activity",
        group: "Monitoring",
      },
      {
        href: APP_ROUTES.businessImport,
        label: "Bring in data",
        group: "Data",
      },
      {
        href: APP_ROUTES.inventoryStockTakeDailyAuditReview,
        label: "Today's count review",
        group: "Data",
      },
    ],
  },
  {
    id: "catalog",
    title: "Products",
    shortLabel: "Products",
    blurb: "Add what you sell and how it's grouped",
    icon: Package,
    entryHref: APP_ROUTES.products,
    items: [
      { href: APP_ROUTES.products, label: "Add products" },
      { href: APP_ROUTES.priceTags, label: "Price tags" },
      { href: APP_ROUTES.barcodes, label: "Barcodes" },
      { href: APP_ROUTES.itemTypes, label: "Departments" },
      { href: APP_ROUTES.aisles, label: "Shelf zones" },
      { href: APP_ROUTES.categories, label: "Categories" },
    ],
  },
  {
    // Service businesses only (kinyozi, salon, spa) — see isNavItemVisible.
    id: "services",
    title: "Services",
    shortLabel: "Services",
    blurb: "What you offer and what your team earns",
    icon: Scissors,
    entryHref: APP_ROUTES.services,
    items: [
      { href: APP_ROUTES.servicesFloor, label: "Floor" },
      { href: APP_ROUTES.servicesAppointments, label: "Bookings" },
      { href: APP_ROUTES.servicesCalendar, label: "Calendar" },
      { href: APP_ROUTES.servicesSell, label: "Ring a service" },
      { href: APP_ROUTES.services, label: "Services" },
      { href: APP_ROUTES.commissions, label: "Commissions" },
      { href: APP_ROUTES.myEarnings, label: "My earnings" },
    ],
  },
  {
    // Food businesses only (restaurant, café, fast food, bar) — see isNavItemVisible.
    id: "restaurant",
    title: "Restaurant",
    shortLabel: "Restaurant",
    blurb: "Orders, the kitchen and your menu",
    icon: UtensilsCrossed,
    entryHref: APP_ROUTES.restaurantCounter,
    items: [
      { href: APP_ROUTES.restaurantFloor, label: "Floor" },
      { href: APP_ROUTES.restaurantCounter, label: "Counter" },
      { href: APP_ROUTES.restaurantKitchen, label: "Kitchen" },
      { href: APP_ROUTES.restaurantMenu, label: "Menu" },
      { href: APP_ROUTES.restaurantReports, label: "Menu sales" },
    ],
  },
  {
    // Lodging businesses only (a guest house, or a bar with rooms above it) — see isNavItemVisible.
    id: "front-desk",
    title: "Front desk",
    shortLabel: "Rooms",
    blurb: "Who's in, arriving, leaving",
    icon: BedDouble,
    entryHref: APP_ROUTES.rooms,
    items: [{ href: APP_ROUTES.rooms, label: "Front desk" }],
  },
  {
    id: "procurement",
    title: "Buying",
    shortLabel: "Buying",
    blurb: "Order → receive → records",
    icon: Truck,
    entryHref: APP_ROUTES.order,
    items: [
      {
        href: APP_ROUTES.order,
        label: "Order",
        group: "Buying",
        flow: true,
      },
      {
        href: APP_ROUTES.orderReceive,
        label: "Receive",
        group: "Buying",
        flow: true,
      },
      {
        href: APP_ROUTES.purchasingAddSupplies,
        label: "Supply records",
        group: "Buying",
        flow: true,
      },
      {
        href: APP_ROUTES.purchasingSpend,
        label: "Supply spend",
        group: "Buying",
      },
      {
        href: APP_ROUTES.findSuppliers,
        label: "Find suppliers",
        group: "Suppliers",
      },
      { href: APP_ROUTES.suppliers, label: "Suppliers", group: "Suppliers" },
      {
        href: APP_ROUTES.purchasingIntelligence,
        label: "Compare suppliers",
        group: "Suppliers",
      },
      // Orders a connected supplier sent this shop to confirm (ADR 0041).
      { href: APP_ROUTES.purchasingTradeOrders, label: "Orders from suppliers", group: "Suppliers" },
      {
        href: APP_ROUTES.purchasingRecordPayment,
        label: "Advance / deposit",
        group: "Money",
      },
      {
        href: APP_ROUTES.purchasingApAging,
        label: "Unpaid bills",
        group: "Money",
      },
    ],
  },
  {
    id: "inventory",
    title: "Stock",
    shortLabel: "Stock",
    blurb: "What's in the shop, counts, and what to restock",
    icon: Warehouse,
    entryHref: APP_ROUTES.inventoryStock,
    items: [
      {
        href: APP_ROUTES.inventoryStockTakeBatches,
        label: "Count in batches",
        group: "Counts",
      },
      {
        href: APP_ROUTES.inventoryStockTakeDailyAudit,
        label: "Daily audit",
        group: "Counts",
      },
      {
        href: APP_ROUTES.inventoryStockTakeDailyAuditReview,
        label: "Count review",
        group: "Counts",
      },
      {
        href: APP_ROUTES.inventoryStockTakeRestock,
        label: "What to buy",
        group: "Counts",
      },
      {
        href: APP_ROUTES.inventoryOrderPad,
        label: "Shopping list",
        group: "Counts",
      },
      {
        href: APP_ROUTES.inventoryStockTake,
        label: "Full count",
        group: "Counts",
      },
      {
        href: APP_ROUTES.inventoryStockTakeInvestigations,
        label: "Odd counts",
        group: "Counts",
      },
      {
        href: APP_ROUTES.inventoryStockTakeReconciliation,
        label: "Fix the count",
        group: "Counts",
      },
      {
        href: APP_ROUTES.inventorySupplyBatches,
        label: "Deliveries",
        group: "In the shop",
      },
      {
        href: APP_ROUTES.inventoryStock,
        label: "Stock levels",
        group: "In the shop",
      },
      {
        href: APP_ROUTES.inventoryRestock,
        label: "Out of stock",
        group: "In the shop",
      },
      {
        href: APP_ROUTES.inventoryMissingBarcodes,
        label: "No barcode",
        group: "In the shop",
      },
      {
        href: APP_ROUTES.inventoryValuation,
        label: "What stock is worth",
        group: "Worth & moves",
      },
      {
        href: APP_ROUTES.inventoryCostIssues,
        label: "Selling too cheap",
        group: "Worth & moves",
      },
      {
        href: APP_ROUTES.inventoryTransfers,
        label: "Move between shops",
        group: "Worth & moves",
      },
    ],
  },
  {
    id: "store",
    title: "Store",
    shortLabel: "Store",
    blurb: "Store room register",
    icon: Store,
    entryHref: APP_ROUTES.store,
    items: [{ href: APP_ROUTES.store, label: "Store" }],
  },
  {
    id: "pharmacy",
    title: "Pharmacy",
    shortLabel: "Pharmacy",
    blurb: "Medicines, stock safety and the dispensing log",
    icon: Pill,
    entryHref: APP_ROUTES.pharmacy,
    // One page with sections: each item opens a section with ?tab=. See isNavItemVisible for
    // who sees which, and itemIsActive for how the bare path stays the overview only.
    // Labels match the tabs on the page.
    items: [
      { href: APP_ROUTES.pharmacy, label: "Overview" },
      { href: `${APP_ROUTES.pharmacy}?tab=medicines`, label: "Medicines" },
      { href: `${APP_ROUTES.pharmacy}?tab=stock`, label: "Stock safety", group: "Stock" },
      { href: `${APP_ROUTES.pharmacy}?tab=recall`, label: "Recall", group: "Stock" },
      { href: `${APP_ROUTES.pharmacy}?tab=ordering`, label: "Ordering", group: "Stock" },
      { href: `${APP_ROUTES.pharmacy}?tab=dispensing`, label: "Dispensing log", group: "Dispensing" },
      { href: `${APP_ROUTES.pharmacy}?tab=patients`, label: "Patients", group: "Dispensing" },
      { href: `${APP_ROUTES.pharmacy}?tab=followups`, label: "Follow-ups", group: "Dispensing" },
      { href: `${APP_ROUTES.pharmacy}?tab=register`, label: "Controlled register", group: "Dispensing" },
      { href: `${APP_ROUTES.pharmacy}?tab=compliance`, label: "Compliance", group: "Records" },
      { href: `${APP_ROUTES.pharmacy}?tab=claims`, label: "Scheme claims", group: "Records" },
      { href: `${APP_ROUTES.pharmacy}?tab=settings`, label: "Settings" },
    ],
  },
  {
    id: "clinic",
    title: "Clinic",
    shortLabel: "Clinic",
    blurb: "Today's visits, bookings and the clinic's services",
    icon: Stethoscope,
    entryHref: APP_ROUTES.clinic,
    // One page with ?tab= sections, like Pharmacy. See isNavItemVisible and itemIsActive.
    items: [
      { href: APP_ROUTES.clinic, label: "Today" },
      { href: `${APP_ROUTES.clinic}?tab=appointments`, label: "Appointments" },
      { href: `${APP_ROUTES.clinic}?tab=services`, label: "Services" },
      { href: `${APP_ROUTES.clinic}?tab=takings`, label: "Takings" },
      { href: `${APP_ROUTES.clinic}?tab=settings`, label: "Settings" },
    ],
  },
  {
    id: "ops",
    title: "Shifts",
    shortLabel: "Shifts",
    blurb: "Who is on the till, then shelf prices and discounts",
    icon: Clock,
    entryHref: APP_ROUTES.shifts,
    items: [
      { href: APP_ROUTES.shifts, label: "Open & close", group: "Floor" },
      { href: APP_ROUTES.drawerOpens, label: "Drawer log", group: "Floor" },
      { href: APP_ROUTES.pricing, label: "Shelf prices", group: "Floor" },
      { href: APP_ROUTES.discounts, label: "Discounts", group: "Floor" },
    ],
  },
  {
    id: "payments",
    title: "Money in",
    shortLabel: "Money",
    blurb: "Today's takings, kiosk pay, airtime, and how you get paid",
    icon: CreditCard,
    entryHref: APP_ROUTES.expenses,
    items: [
      { href: APP_ROUTES.paymentsDayLedger, label: "Today's takings" },
      { href: APP_ROUTES.expenses, label: "Expenses & profit" },
      { href: APP_ROUTES.taxVat, label: "VAT report" },
      { href: APP_ROUTES.profitPocketing, label: "Pocketing calendar" },
      { href: APP_ROUTES.fixedCosts, label: "Fixed costs" },
      { href: APP_ROUTES.paymentsKioskPay, label: "Kiosk Pay" },
      { href: APP_ROUTES.airtime, label: "Airtime" },
      { href: APP_ROUTES.onlineAirtime, label: "Online airtime" },
      { href: APP_ROUTES.paymentsSettings, label: "How you get paid" },
    ],
  },
  {
    id: "customers",
    title: "Customers",
    shortLabel: "Customers",
    blurb: "People who shop with you, history, and segments",
    icon: Users,
    entryHref: APP_ROUTES.customers,
    items: [
      { href: APP_ROUTES.customers, label: "All customers" },
      { href: APP_ROUTES.customerSegments, label: "Segments" },
      { href: APP_ROUTES.customerSms, label: "SMS" },
      { href: APP_ROUTES.customerEmailCampaigns, label: "Email campaigns" },
      { href: APP_ROUTES.analyticsCustomers, label: "Shoppers" },
      { href: APP_ROUTES.customerPhones, label: "Phone numbers" },
    ],
  },
  {
    id: "credits",
    title: "On credit",
    shortLabel: "Credit",
    blurb: "Who owes you, tabs, and people who say they paid",
    icon: Wallet,
    entryHref: APP_ROUTES.creditsOnTab,
    items: [
      { href: APP_ROUTES.creditsOnTab, label: "On tab" },
      { href: APP_ROUTES.creditsPaymentClaims, label: "They say they paid" },
    ],
  },
  {
    id: "sales",
    title: "Sales",
    shortLabel: "Sales",
    blurb: "What you sold, tills, and reports",
    icon: ShoppingBag,
    entryHref: APP_ROUTES.sales,
    items: [
      { href: APP_ROUTES.sales, label: "Sales", group: "Reports" },
      {
        href: APP_ROUTES.salesByHour,
        label: "By the hour",
        group: "Reports",
      },
      {
        href: APP_ROUTES.salesTransactions,
        label: "Receipts",
        group: "Reports",
      },
      {
        href: APP_ROUTES.salesPendingCarts,
        label: "Unfinished sales",
        featureFlag: "pos_drafts.ui_visible",
        group: "Reports",
      },
      {
        href: APP_ROUTES.analytics,
        label: "Trends",
        group: "Reports",
      },
      {
        href: APP_ROUTES.analyticsActivity,
        label: "Activity",
        group: "Reports",
      },
      {
        href: APP_ROUTES.salesReports,
        label: "Sales by category",
        group: "Reports",
      },
      {
        href: APP_ROUTES.storefrontWebOrders,
        label: "Online pickups",
        featureFlag: "shop",
        group: "Reports",
      },
      { href: APP_ROUTES.salesQuick, label: "Quick sale", group: "Tills" },
      { href: APP_ROUTES.cashier, label: "Sell", group: "Tills" },
      {
        href: APP_ROUTES.butcher,
        label: "Butcher counter",
        featureFlag: BUTCHER_POS_FEATURE_FLAG,
        group: "Counters",
      },
      {
        href: APP_ROUTES.butcherSuppliers,
        label: "Butcher suppliers",
        featureFlag: BUTCHER_POS_FEATURE_FLAG,
        group: "Counters",
      },
      {
        href: APP_ROUTES.grocery,
        label: "Clerk",
        group: "Counters",
      },
      {
        href: APP_ROUTES.groceryInvoices,
        label: "Clerk invoices",
        group: "Counters",
      },
    ],
  },
];

type NavGate = {
  featureFlags: Record<string, boolean> | undefined;
  /** The business sells services (kinyozi, salon, spa…). */
  isServiceBusiness: boolean;
  /** Every format of the business is a service format: it has no shelves. */
  isServiceOnly: boolean;
  canManageServices: boolean;
  /** The business takes orders and prepares food or drink (restaurant, café, fast food, bar). */
  isFoodBusiness: boolean;
  /** The business lets rooms (a guest house, or a bar with rooms above it). */
  isLodgingBusiness: boolean;
  /** One of the business's formats is a pharmacy / chemist. */
  isPharmacyBusiness: boolean;
  /** The business is a supplier's wholesale shop (ADR 0038). */
  isSupplierBusiness: boolean;
  /** Which Pharmacy sections this person can open; mirrors the checks in PharmacyWorkspace. */
  pharmacyNav: { stock: boolean; recall: boolean; records: boolean; compliance: boolean };
  /** One of the business's formats is a clinic, and this person holds a clinic hat. */
  clinicNav: { enter: boolean; manage: boolean };
  /** The business sells physical goods off a shelf — a retail shop, or one that opted into a product line. */
  sellsGoods: boolean;
  canManageMenu: boolean;
  canWorkKitchen: boolean;
  canTakeOrders: boolean;
  canReadSalesReports: boolean;
  canSell: boolean;
  canReadCommissions: boolean;
  /** Sees their own earnings page (a barber, or a cashier who also serves). */
  canReadOwnCommissions: boolean;
  canListUsers: boolean;
  canViewPayroll: boolean;
  canReadFinanceExpenses: boolean;
  canWriteFinanceExpenses: boolean;
  canReadFinanceReports: boolean;
  canManageBusinessSettings: boolean;
  canViewAuditLog: boolean;
  canViewCategories: boolean;
  canViewPurchasingIntelligence: boolean;
  canAddSupplies: boolean;
  canPathBRead: boolean;
  canPathAOrder: boolean;
  canViewApAging: boolean;
  canViewSuppliers: boolean;
  canViewMarketplace: boolean;
  canViewCustomers: boolean;
  canViewMessages: boolean;
  canReviewPaymentClaims: boolean;
  canRecordSupplierPayment: boolean;
  canViewInventoryValuation: boolean;
  canViewInventoryTransfers: boolean;
  canViewSupplyBatches: boolean;
  canViewStockTake: boolean;
  canApproveStockTake: boolean;
  canViewOrderPad: boolean;
  canViewPricing: boolean;
  canManageDiscounts: boolean;
  canViewShifts: boolean;
  canViewAnalytics: boolean;
  canViewSalesIntelligence: boolean;
  canViewStorefrontOrders: boolean;
  canViewStoreRoom: boolean;
  canManageCrmInbox: boolean;
  canManageCrmAutomation: boolean;
  canSendCrmBroadcast: boolean;
  canQuickSale: boolean;
  canViewPosDrafts: boolean;
  canAccessGrocery: boolean;
  canManageImports: boolean;
  canViewPaymentGateways: boolean;
  canViewEasyTaxIntegrations: boolean;
  canViewAirtime: boolean;
  roleKey: string | undefined;
  groceryClerkStockAccess: boolean;
  stockManagerStockPage: boolean;
  stockManagerActivity: boolean;
  stockManagerStoreRoom: boolean;
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
  APP_ROUTES.paymentsKioskPay,
  APP_ROUTES.promoCampaigns,
  APP_ROUTES.businessDomains,
  APP_ROUTES.storefrontWebOrders,
  APP_ROUTES.storefrontTradeOrders,
  APP_ROUTES.purchasingTradeOrders,
  APP_ROUTES.onlineAirtime,
];

const DESKTOP_ONLY_NAV_HREFS: readonly string[] = [APP_ROUTES.desktopSettings];

/**
 * Pages that only make sense for a business that sells goods off a shelf — the retail catalogue,
 * shelf prices, the retail till, storefront product orders. A restaurant or a service shop that
 * has not turned products on never sees these. A mini-mart, any other shop, and a shop that has
 * not picked a format always does. Pages shared with a kitchen (Buying, Stock counts, suppliers)
 * are deliberately NOT here — a restaurant still buys and counts what it cooks.
 */
const GOODS_ONLY_NAV_HREFS: readonly string[] = [
  APP_ROUTES.products,
  APP_ROUTES.priceTags,
  APP_ROUTES.barcodes,
  APP_ROUTES.itemTypes,
  APP_ROUTES.aisles,
  APP_ROUTES.categories,
  APP_ROUTES.pricing,
  APP_ROUTES.discounts,
  APP_ROUTES.salesQuick,
  APP_ROUTES.cashier,
  APP_ROUTES.storefrontWebOrders,
  APP_ROUTES.salesPendingCarts,
  APP_ROUTES.businessMobile,
  APP_ROUTES.store,
];

/** Whole sections that vanish for a non-goods shop (their every page is retail). */
const GOODS_ONLY_NAV_SECTIONS: readonly string[] = ["catalog", "store"];

function isNavItemVisible(item: NavItem, gate: NavGate): boolean {
  if (!IS_DESKTOP && DESKTOP_ONLY_NAV_HREFS.includes(item.href)) {
    return false;
  }
  if (IS_DESKTOP && DESKTOP_HIDDEN_NAV_HREFS.includes(item.href)) {
    return false;
  }

  // A restaurant or a service shop with products still off hides the retail catalogue, shelf
  // prices and the retail till. Turning products on flips sellsGoods and they return. A mini-mart
  // or any other shop always keeps them. Pages shared with a kitchen (Buying, Stock) are not gated here.
  if (!gate.sellsGoods && GOODS_ONLY_NAV_HREFS.includes(item.href)) {
    return false;
  }

  // Restricted roles: only explicitly-allowed pages
  if (gate.roleKey === "stock_manager") {
    const allowed: string[] = [
      APP_ROUTES.inventoryStockTake,
      APP_ROUTES.inventoryStockTakeMyStats,
      APP_ROUTES.inventoryStockTakeBatches,
      APP_ROUTES.inventoryStockTakeDailyAudit,
      APP_ROUTES.myProfile,
      APP_ROUTES.myPay,
      APP_ROUTES.support,
    ];
    if (gate.stockManagerStockPage) {
      allowed.push(
        APP_ROUTES.inventoryStock,
        APP_ROUTES.inventoryRestock,
        APP_ROUTES.inventoryMissingBarcodes,
      );
    }
    if (gate.stockManagerActivity) {
      allowed.push(APP_ROUTES.analyticsActivity);
    }
    if (gate.canAddSupplies) {
      allowed.push(APP_ROUTES.purchasingAddSupplies);
      allowed.push(APP_ROUTES.supplierDirectory);
    }
    if (gate.canPathAOrder) {
      allowed.push(APP_ROUTES.order);
      allowed.push(APP_ROUTES.orderReceive);
    }
    if (
      gate.canViewSuppliers &&
      (gate.canWriteSuppliers || gate.canLinkSupplierProducts)
    ) {
      allowed.push(APP_ROUTES.suppliers);
      allowed.push(APP_ROUTES.findSuppliers);
    }
    if (gate.canViewOrderPad) {
      allowed.push(APP_ROUTES.inventoryOrderPad);
      allowed.push(APP_ROUTES.inventoryStockTakeRestock);
    }
    if (gate.stockManagerStoreRoom && gate.canViewStoreRoom) {
      allowed.push(APP_ROUTES.store);
    }
    return allowed.includes(item.href);
  }

  if (gate.roleKey === "cashier") {
    // In a shop that only sells services the cashier has the till and their profile, nothing else.
    if (gate.isServiceOnly) {
      return SERVICE_CASHIER_ROUTES.includes(item.href);
    }
    const allowed: string[] = [
      APP_ROUTES.cashier,
      APP_ROUTES.shifts,
      APP_ROUTES.grocery,
      APP_ROUTES.groceryInvoices,
    ];
    if (gate.canAddSupplies) {
      allowed.push(APP_ROUTES.purchasingAddSupplies);
      allowed.push(APP_ROUTES.supplierDirectory);
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
    const allowed: string[] = [APP_ROUTES.grocery, APP_ROUTES.groceryInvoices];
    if (gate.groceryClerkStockAccess) {
      allowed.push(APP_ROUTES.inventoryStock, APP_ROUTES.inventoryRestock);
    }
    return allowed.includes(item.href);
  }

  if (
    item.href === APP_ROUTES.servicesSell ||
    item.href === APP_ROUTES.servicesFloor ||
    item.href === APP_ROUTES.servicesAppointments ||
    item.href === APP_ROUTES.servicesCalendar
  )
    return gate.isServiceBusiness && gate.canSell;
  if (item.href === APP_ROUTES.services)
    return gate.isServiceBusiness && (gate.canManageServices || gate.canSell);
  if (item.href === APP_ROUTES.restaurantFloor)
    return gate.isFoodBusiness && (gate.canTakeOrders || gate.canSell);
  if (item.href === APP_ROUTES.restaurantCounter) return gate.isFoodBusiness && gate.canSell;
  if (item.href === APP_ROUTES.restaurantKitchen)
    return gate.isFoodBusiness && (gate.canWorkKitchen || gate.canSell);
  if (item.href === APP_ROUTES.restaurantMenu)
    return gate.isFoodBusiness && (gate.canManageMenu || gate.canWorkKitchen || gate.canSell);
  if (item.href === APP_ROUTES.restaurantReports)
    return gate.isFoodBusiness && (gate.canManageMenu || gate.canReadSalesReports);
  // The front desk: anyone who can set up the shop, take orders or sell — the same permissions
  // RoomsController serves it to. (Locked roles like cashier early-return above with their own
  // allowlist, so they can still reach /rooms by URL but don't get the link here, as with the floor.)
  if (item.href === APP_ROUTES.rooms)
    return gate.isLodgingBusiness && (gate.canManageMenu || gate.canTakeOrders || gate.canSell);
  if (item.href === APP_ROUTES.commissions)
    return gate.isServiceBusiness && gate.canReadCommissions;
  if (item.href === APP_ROUTES.myEarnings)
    return gate.isServiceBusiness && gate.canReadOwnCommissions;
  if (item.href === APP_ROUTES.overview) return true;
  if (item.href === APP_ROUTES.business) return true;
  if (
    item.href === APP_ROUTES.businessSettings ||
    item.href === APP_ROUTES.businessConfiguration
  )
    return gate.canManageBusinessSettings;
  if (item.href === APP_ROUTES.users) return gate.canListUsers;
  if (item.href === APP_ROUTES.payroll) return gate.canViewPayroll;
  if (item.href === APP_ROUTES.myProfile) return true;
  if (item.href === APP_ROUTES.fixedCosts) return gate.canReadFinanceExpenses;
  if (item.href === APP_ROUTES.expenses)
    return gate.canReadFinanceExpenses || gate.canReadFinanceReports;
  if (item.href === APP_ROUTES.profitPocketing)
    return gate.canReadFinanceReports || gate.canWriteFinanceExpenses;
  if (item.href === APP_ROUTES.taxVat) return gate.canReadFinanceReports;
  if (item.href === APP_ROUTES.businessImport) return gate.canManageImports;
  if (item.href === APP_ROUTES.inventoryStockTakeDailyAuditReview)
    return gate.canApproveStockTake;
  if (item.href === APP_ROUTES.categories) return gate.canViewCategories;
  if (item.href === APP_ROUTES.store) return gate.canViewStoreRoom;
  if (item.href.split("?")[0] === APP_ROUTES.clinic) {
    if (!gate.clinicNav.enter) return false;
    const section = new URLSearchParams(item.href.split("?")[1] ?? "").get("tab");
    if (section === "settings" || section === "takings") return gate.clinicNav.manage;
    return true;
  }
  if (item.href.split("?")[0] === APP_ROUTES.pharmacy) {
    // Same permission as the store room: the pharmacy pages read with catalog.items.read.
    if (!gate.isPharmacyBusiness || !gate.canViewStoreRoom) return false;
    // Each section is listed only for someone the page itself would show it to.
    const section = new URLSearchParams(item.href.split("?")[1] ?? "").get("tab");
    if (section === "stock" || section === "ordering") return gate.pharmacyNav.stock;
    if (section === "recall") return gate.pharmacyNav.recall;
    if (
      section === "dispensing" ||
      section === "patients" ||
      section === "followups" ||
      section === "register" ||
      section === "claims"
    ) {
      return gate.pharmacyNav.records;
    }
    if (section === "compliance") return gate.pharmacyNav.compliance;
    return true;
  }
  if (item.href === APP_ROUTES.purchasingTradeOrders) return gate.canPathAOrder;
  if (item.href === APP_ROUTES.purchasingIntelligence)
    return gate.canViewPurchasingIntelligence;
  if (item.href === APP_ROUTES.purchasingAddSupplies)
    return gate.canAddSupplies;
  if (item.href === APP_ROUTES.purchasingSpend)
    return (
      gate.canPathBRead ||
      gate.canViewPurchasingIntelligence ||
      gate.canViewApAging ||
      gate.canAddSupplies
    );
  if (item.href === APP_ROUTES.order || item.href === APP_ROUTES.orderReceive)
    return gate.canViewSuppliers && gate.canAddSupplies;
  if (item.href === APP_ROUTES.purchasingApAging) return gate.canViewApAging;
  if (item.href === APP_ROUTES.suppliers) return gate.canViewSuppliers;
  // Tenant marketplace directory — discover & inherit platform suppliers.
  if (item.href === APP_ROUTES.findSuppliers) return gate.canViewSuppliers;
  if (item.href === APP_ROUTES.marketplace) return gate.canViewSuppliers;
  if (item.href === APP_ROUTES.creditsOnTab)
    return gate.canViewSalesIntelligence || gate.canViewCustomers;
  if (item.href === APP_ROUTES.customers) return gate.canViewCustomers;
  if (item.href === APP_ROUTES.customerPhones) return gate.canViewCustomers;
  if (item.href === APP_ROUTES.customerSms) return gate.canViewCustomers;
  if (item.href === APP_ROUTES.customerEmailCampaigns)
    return gate.canViewCustomers;
  if (item.href === APP_ROUTES.customerSegments) return gate.canViewAnalytics;
  if (item.href === APP_ROUTES.messages) return gate.canViewMessages;
  if (item.href === APP_ROUTES.inboxSettings) return gate.canManageCrmInbox;
  if (item.href === APP_ROUTES.inboxAutomations)
    return gate.canManageCrmAutomation;
  if (item.href === APP_ROUTES.inboxBroadcasts) return gate.canSendCrmBroadcast;
  if (item.href === APP_ROUTES.businessLogs) return gate.canViewAuditLog;
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
  if (item.href === APP_ROUTES.inventoryOrderPad) return gate.canViewOrderPad;
  if (item.href === APP_ROUTES.inventoryStockTakeInvestigations)
    return gate.canApproveStockTake;
  if (item.href === APP_ROUTES.inventoryStockTakeReconciliation)
    return gate.canApproveStockTake;
  if (item.href === APP_ROUTES.inventoryCostIssues) return gate.canViewPricing;
  if (item.href === APP_ROUTES.inventoryMissingBarcodes)
    return gate.canViewInventoryValuation;
  if (item.href === APP_ROUTES.pricing) return gate.canViewPricing;
  if (item.href === APP_ROUTES.discounts) return gate.canManageDiscounts;
  if (item.href === APP_ROUTES.shifts) return gate.canViewShifts;
  if (item.href === APP_ROUTES.drawerOpens) return gate.canViewShifts;
  if (item.href === APP_ROUTES.analytics) return gate.canViewAnalytics;
  if (item.href === APP_ROUTES.analyticsActivity) {
    if (gate.roleKey === "stock_manager") return gate.stockManagerActivity;
    return gate.canViewSalesIntelligence || gate.canViewAnalytics;
  }
  if (item.href === APP_ROUTES.analyticsCustomers) return gate.canViewAnalytics;
  if (item.href === APP_ROUTES.sales) return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.paymentsSettings)
    return gate.canViewPaymentGateways;
  if (item.href === APP_ROUTES.paymentsKioskPay)
    return gate.canViewPaymentGateways;
  if (item.href === APP_ROUTES.integrationsEasyTax)
    return gate.canViewEasyTaxIntegrations;
  if (item.href === APP_ROUTES.airtime) return gate.canViewAirtime;
  if (item.href === APP_ROUTES.onlineAirtime) return gate.canViewAirtime;
  if (item.href === APP_ROUTES.paymentsDayLedger)
    return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.salesTransactions)
    return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.salesByHour)
    return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.salesPendingCarts) return gate.canViewPosDrafts;
  if (item.href === APP_ROUTES.salesReports)
    return gate.canViewSalesIntelligence;
  if (item.href === APP_ROUTES.storefrontWebOrders)
    return gate.canViewStorefrontOrders;
  if (item.href === APP_ROUTES.storefrontTradeOrders)
    return gate.isSupplierBusiness && gate.canViewStorefrontOrders;
  if (item.href === APP_ROUTES.storefrontSupplierPage)
    return gate.isSupplierBusiness && gate.canManageBusinessSettings === true;
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
    return isButcherPosEnabled(gate.featureFlags) && gate.canViewSuppliers;
  }
  return featureFlagAllows(item, gate.featureFlags);
}

function itemIsActive(
  pathname: string,
  href: string,
  search = "",
): boolean {
  const [hrefPath, hrefQuery = ""] = href.split("?");
  const path = pathname.split("?")[0] ?? pathname;
  const live = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  if (hrefPath === "/") return path === "/";
  if (hrefPath === APP_ROUTES.butcher) {
    return path === APP_ROUTES.butcher;
  }
  if (hrefPath === APP_ROUTES.order) {
    return path === hrefPath;
  }
  if (hrefPath === APP_ROUTES.shifts) {
    return path === hrefPath;
  }
  if (hrefPath === APP_ROUTES.purchasingAddSupplies) {
    return path === hrefPath;
  }
  if (hrefPath === APP_ROUTES.analytics) {
    return path === hrefPath;
  }
  // Product pages live under /products/p/. Price tags and the catalog must not light up "Add products".
  if (hrefPath === APP_ROUTES.products) {
    return path === hrefPath || path.startsWith(`${APP_ROUTES.products}/p/`);
  }

  // Clinic is one page with ?tab= sections; an open visit (?visit=) belongs to Today.
  if (hrefPath === APP_ROUTES.clinic && !hrefQuery) {
    const tab = live.get("tab");
    return path === hrefPath && (!tab || tab === "today");
  }

  // Pharmacy is one page with ?tab= sections. The bare path is its front page only.
  if (hrefPath === APP_ROUTES.pharmacy && !hrefQuery) {
    const tab = live.get("tab");
    return path === hrefPath && (!tab || tab === "overview");
  }

  // Home vs Take stock share /inventory/stock — distinguish by ?view=
  if (hrefPath === APP_ROUTES.inventoryStock) {
    const isLevels = live.get("view") === "levels";
    if (hrefQuery.includes("view=levels")) return path === hrefPath && isLevels;
    return path === hrefPath && !isLevels;
  }

  if (hrefQuery) {
    if (path !== hrefPath && !path.startsWith(`${hrefPath}/`)) return false;
    const want = new URLSearchParams(hrefQuery);
    for (const [k, v] of want.entries()) {
      if (live.get(k) !== v) return false;
    }
    return true;
  }

  return path === hrefPath || path.startsWith(`${hrefPath}/`);
}

type BottomTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  matchSectionIds: string[];
  workspace?: ShellWorkspaceId;
  /** Raised, filled center affordance (e.g. "Sell"). */
  primary?: boolean;
};

/** Stock manager: Home first; Order/Receive = Path A PO flow; Inventory = shelf qty. */
const STOCK_MANAGER_BOTTOM_TABS: readonly BottomTab[] = [
  {
    id: "home",
    label: "Count",
    icon: ClipboardList,
    href: APP_ROUTES.inventoryStockTakeBatches,
    matchSectionIds: ["inventory"],
  },
  {
    id: "take-stock",
    label: "Stock",
    icon: Warehouse,
    href: `${APP_ROUTES.inventoryStock}?view=levels`,
    matchSectionIds: ["inventory"],
  },
  {
    id: "order",
    label: "Order",
    icon: ShoppingCart,
    href: APP_ROUTES.order,
    matchSectionIds: ["procurement"],
  },
  {
    id: "receive",
    label: "Receive",
    icon: PackageCheck,
    href: APP_ROUTES.orderReceive,
    matchSectionIds: ["procurement"],
  },
  {
    id: "profile",
    label: "Profile",
    icon: UserRound,
    href: APP_ROUTES.myProfile,
    matchSectionIds: ["org"],
  },
  {
    id: "more",
    label: "More",
    icon: Tags,
    matchSectionIds: [
      "org",
      "payments",
      "procurement",
      "inventory",
      "store",
      "sales",
    ],
  },
];

const BOTTOM_TABS: readonly BottomTab[] = [
  {
    id: "overview",
    label: "Business",
    icon: LayoutDashboard,
    href: APP_ROUTES.business,
    matchSectionIds: ["overview", "org"],
  },
  {
    id: "catalog",
    label: "Products",
    icon: Package,
    href: APP_ROUTES.products,
    matchSectionIds: ["catalog"],
  },
  {
    id: "inventory",
    label: "Stock",
    icon: Warehouse,
    href: APP_ROUTES.inventoryStock,
    matchSectionIds: ["inventory"],
  },
  {
    id: "ops",
    label: "Sell",
    icon: ScanLine,
    href: APP_ROUTES.cashier,
    workspace: "cashier",
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
    matchSectionIds: [
      "org",
      "payments",
      "procurement",
      "inventory",
      "store",
      "sales",
      "credits",
      "customers",
      "ops",
    ],
  },
];

type AppShellProps = { children: React.ReactNode };

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const router = useRouter();
  const isPathActive = useMemo(
    () => (path: string, href: string) => itemIsActive(path, href, search),
    [search],
  );
  const tenant = useOptionalTenant();
  const tenantTitle =
    tenant?.branding?.displayName ?? tenant?.tenantName ?? "UB Admin";
  const mergedFeatureFlags = useFeatureFlags();

  const {
    business,
    me,
    loading,
    canListUsers,
    canViewPayroll,
    canViewPayrollSelf,
    canReadFinanceExpenses,
    canWriteFinanceExpenses,
    canReadFinanceReports,
    canManageBusinessSettings,
    canViewAuditLog,
    canViewCategories,
    canViewPurchasingIntelligence,
    canPathARead,
    canPathAWrite,
    canPathBRead,
    canPathBWrite,
    canViewApAging,
    canViewSuppliers,
    canViewMarketplace,
    canViewCustomers,
    canViewMessages,
    canReviewPaymentClaims,
    canRecordSupplierPayment,
    canViewInventoryValuation,
    canViewInventoryTransfers,
    canViewSupplyBatches,
    canViewStockTake,
    canViewPricing,
    canManageDiscounts,
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
    refreshBranches,
    itemTypes,
    itemTypeId,
    setItemTypeId,
    itemTypesLoading,
    aisles,
    aisleId,
    setAisleId,
    aislesLoading,
  } = useDashboard();

  const isOwner = me?.role?.key === "owner";
  const isStockManager =
    me?.role?.key?.trim().toLowerCase() === "stock_manager";
  const isCashier = me?.role?.key?.trim().toLowerCase() === "cashier";
  const isButcherCashier =
    me?.role?.key?.trim().toLowerCase() === "butcher_cashier";
  const isGroceryClerk =
    me?.role?.key?.trim().toLowerCase() === "grocery_clerk";
  // Bottom nav + large-title header for phones and iPads (below xl / 1280px).
  // Laptops and desktop monitors get the sidebar. 11″ iPad landscape is 1194px,
  // so it stays on the tab bar; 1280px is where laptop windows begin.
  const desktopChromeVisible = "hidden xl:flex";
  const tabletChromeVisible = "xl:hidden";
  // Phone/iPad: edge-flush canvas + clearance for the fixed tab bar only.
  // Laptop (xl): classic inset padding; sidebar replaces the tab bar.
  const mainContentPadding =
    "px-3 pt-2 pb-[var(--shell-bottom-inset)] sm:px-4 sm:pt-3 xl:p-6 xl:pb-6";
  const homeHref = resolvePostAuthDestination(me, null, business);
  const canViewPaymentGateways = hasPermission(
    me?.permissions,
    Permission.PaymentsGatewaysRead,
  );
  const canWritePaymentGateways = hasPermission(
    me?.permissions,
    Permission.PaymentsGatewaysWrite,
  );
  const canViewEasyTaxIntegrations = hasPermission(
    me?.permissions,
    Permission.IntegrationsEasyTaxRead,
  );
  const canBuySmsCredits = hasPermission(
    me?.permissions,
    Permission.SmsCreditsPurchase,
  );
  const canViewSmsCreditLedger = hasPermission(
    me?.permissions,
    Permission.SmsCreditsLedgerRead,
  );
  const canViewAirtime =
    hasPermission(me?.permissions, Permission.AirtimeRead) ||
    hasPermission(me?.permissions, Permission.AirtimeSell);
  const showOwnerKioskPay = isOwner && canViewPaymentGateways;
  const canViewPosDrafts = hasPermission(
    me?.permissions,
    Permission.PosDraftsRead,
  );
  const canApproveStockTake = hasPermission(
    me?.permissions,
    Permission.StocktakeApprove,
  );
  const canViewOrderPad =
    hasPermission(me?.permissions, Permission.OrderPadRead) ||
    hasPermission(me?.permissions, Permission.OrderPadWrite) ||
    hasPermission(me?.permissions, Permission.OrderPadManage);
  // The store room page itself requires catalog.items.read.
  const canViewStoreRoom = hasPermission(
    me?.permissions,
    Permission.CatalogItemsRead,
  );
  const canManageCrmInbox = hasPermission(
    me?.permissions,
    Permission.CrmInboxManage,
  );
  const canManageCrmAutomation = hasPermission(
    me?.permissions,
    Permission.CrmAutomationManage,
  );
  const canSendCrmBroadcast = hasPermission(
    me?.permissions,
    Permission.CrmBroadcastSend,
  );

  const canAddSupplies = canPathBWrite && canViewSuppliers && canViewCategories;
  const canPathAOrder = canPathARead || canPathAWrite;
  const groceryClerkStockAccess = groceryClerkStockAccessEnabled(business);
  const stockManagerStockPage = stockManagerStockPageEnabled(business);
  const stockManagerActivity = stockManagerActivityEnabled(business);
  // Mirrors the backend delegation for `inventory.write`, so the nav item only
  // appears when a stock manager could actually record a movement.
  const stockManagerStoreRoom = stockManagerStoreRoomEnabled(business);
  const canWriteSuppliersDelegated = canWriteSuppliers(me, business);
  const canLinkSupplierProductsDelegated = canLinkSupplierProducts(
    me,
    business,
  );
  const supplierToolsEnabled =
    canViewSuppliers &&
    (canWriteSuppliersDelegated || canLinkSupplierProductsDelegated);

  // Mini-marts and other shops always sell goods. A restaurant or service shop does only once it
  // turns products on — until then its sidebar is the floor or the chairs, not the shelf.
  const productSidebar = sellsGoodsBusiness(business);
  // Service screens are off on the desktop app, so its sidebar stays the full one. Once products
  // are on, the shelf comes back and the service-only trim no longer removes it.
  const serviceOnlyShop = isServiceOnlyBusiness(business) && !productSidebar && !IS_DESKTOP;
  // A restaurant, café, fast-food counter or bar: its bottom bar leads to the floor, the kitchen
  // and the counter, where a product shop's leads to shelves and the retail till.
  const foodOnlyShop = isFoodOnlyBusiness(business) && !productSidebar && !IS_DESKTOP;
  // A tenant that lets rooms works from the front desk, so pull it up the rail (not into leftovers).
  const lodgingShop = isLodgingBusiness(business) && !IS_DESKTOP;
  // Food-led: a bar or restaurant whether or not it also lets rooms (ADR 0031). Lodging is an add-on,
  // so a bar-with-rooms still gets the food sidebar, not the full retail one — until it turns
  // products on. Drives nav trimming and the rail lead.
  const foodLedShop = isFoodLedBusiness(business) && !productSidebar && !IS_DESKTOP;
  // A restaurant or bar seats people, so its home is the floor; a café or counter pays first.
  const foodTableService = foodLedShop && isTableServiceBusiness(business);
  const canTakeRestaurantOrders = hasPermission(me?.permissions, Permission.RestaurantOrdersWrite);
  const canWorkRestaurantKitchen = hasPermission(me?.permissions, Permission.RestaurantKitchenUpdate);
  // A restaurant or a service shop with products still off can add them from the rail. Offered only
  // to someone who can manage settings, only in the cloud (the desktop sidebar always has retail),
  // and only while products are hidden. A mini-mart never sees it. Restricted operator roles
  // (cashier, clerk) run a flat rail and never manage formats, so they never see it either.
  const canManageFormats = isOwner || canManageBusinessSettings;
  const showAddProductLine =
    !IS_DESKTOP &&
    canManageFormats &&
    !productSidebar &&
    (isFoodBusiness(business) || isServiceBusiness(business));

  const visibleSections = useMemo(() => {
    const gate: NavGate = {
      featureFlags: mergedFeatureFlags,
      // Desktop sync does not carry tips, performers or staff earnings yet, so the service
      // screens stay off on the desktop app rather than lose that data on the way to the cloud.
      isServiceBusiness: isServiceBusiness(business) && !IS_DESKTOP,
      isServiceOnly: serviceOnlyShop,
      canManageServices: hasPermission(me?.permissions, Permission.ServicesCatalogManage),
      // Desktop sync does not carry menus, orders or kitchen tickets either, so the restaurant
      // screens stay off on the desktop app for the same reason.
      isFoodBusiness: isFoodBusiness(business) && !IS_DESKTOP,
      isLodgingBusiness: isLodgingBusiness(business) && !IS_DESKTOP,
      // The desktop till does not carry batch or dispensing data to the cloud yet.
      isPharmacyBusiness: isPharmacyBusiness(business) && !IS_DESKTOP,
      isSupplierBusiness: isSupplierBusiness(business),
      // Visits are held tickets with a patient; the desktop till carries neither.
      clinicNav: {
        enter:
          isClinicBusiness(business) &&
          !IS_DESKTOP &&
          (hasPermission(me?.permissions, Permission.ClinicReception) ||
            hasPermission(me?.permissions, Permission.ClinicConsult) ||
            hasPermission(me?.permissions, Permission.ClinicPrescribe) ||
            hasPermission(me?.permissions, Permission.ClinicPerform) ||
            hasPermission(me?.permissions, Permission.ClinicManage) ||
            hasPermission(me?.permissions, Permission.PharmacyDispense)),
        manage: hasPermission(me?.permissions, Permission.ClinicManage),
      },
      pharmacyNav: {
        stock: hasPermission(me?.permissions, Permission.InventoryRead),
        recall: hasPermission(me?.permissions, Permission.InventoryWrite),
        records: hasPermission(me?.permissions, Permission.PharmacyRecordsRead),
        compliance:
          hasPermission(me?.permissions, Permission.PharmacyDispense) ||
          hasPermission(me?.permissions, Permission.PharmacyManage),
      },
      // On the desktop app the full retail sidebar always stands (service/food screens are off there),
      // so never let a desktop tenant lose the catalogue. In the cloud, mini-marts and other shops
      // always have it; a restaurant or a service shop gets it once products are turned on.
      sellsGoods: IS_DESKTOP || productSidebar,
      canManageMenu: hasPermission(me?.permissions, Permission.RestaurantMenuManage),
      canWorkKitchen: hasPermission(me?.permissions, Permission.RestaurantKitchenUpdate),
      canTakeOrders: hasPermission(me?.permissions, Permission.RestaurantOrdersWrite),
      canReadSalesReports: hasPermission(me?.permissions, Permission.SalesIntelligenceRead),
      canSell: hasPermission(me?.permissions, Permission.SalesSell),
      canReadCommissions: hasPermission(me?.permissions, Permission.CommissionsRead),
      canReadOwnCommissions: hasPermission(me?.permissions, Permission.CommissionsReadOwn),
      canListUsers,
      canViewPayroll,
      canReadFinanceExpenses,
      canWriteFinanceExpenses,
      canReadFinanceReports,
      canManageBusinessSettings,
      canViewAuditLog,
      canViewCategories,
      canViewPurchasingIntelligence,
      canAddSupplies,
      canPathBRead,
      canPathAOrder,
      canViewApAging,
      canViewSuppliers,
      canViewMarketplace,
      canViewCustomers,
      canViewMessages,
      canReviewPaymentClaims,
      canRecordSupplierPayment,
      canViewInventoryValuation,
      canViewInventoryTransfers,
      canViewSupplyBatches,
      canViewStockTake,
      canApproveStockTake,
      canViewOrderPad,
      canViewPricing,
      canManageDiscounts,
      canViewShifts,
      canViewAnalytics,
      canViewSalesIntelligence,
      canViewStorefrontOrders,
      canViewStoreRoom,
      canQuickSale,
      canViewPosDrafts,
      canAccessGrocery,
      canManageImports,
      canViewPaymentGateways,
      canViewEasyTaxIntegrations,
      canViewAirtime,
      canManageCrmInbox,
      canManageCrmAutomation,
      canSendCrmBroadcast,
      roleKey: me?.role?.key?.trim().toLowerCase(),
      groceryClerkStockAccess,
      stockManagerStockPage,
      stockManagerActivity,
      stockManagerStoreRoom,
      canWriteSuppliers: canWriteSuppliersDelegated,
      canLinkSupplierProducts: canLinkSupplierProductsDelegated,
    };
    const permitted = NAV_SECTIONS.filter(
      (section) => gate.sellsGoods || !GOODS_ONLY_NAV_SECTIONS.includes(section.id),
    ).map((section) => {
      let items = section.items.filter((item) =>
        isNavItemVisible(item, gate),
      );
      // The batch workflow is the current full count; the legacy page would
      // light up alongside it and read as a second active destination.
      if (gate.roleKey === "stock_manager") {
        items = items.filter(
          (item) => item.href !== APP_ROUTES.inventoryStockTake,
        );
      }
      const preferredEntry =
        items.find((item) => item.href === section.entryHref)?.href ??
        items[0]?.href ??
        section.entryHref;
      return {
        ...section,
        items,
        entryHref: preferredEntry,
      };
    }).filter((s) => s.items.length > 0);
    // A shop that only sells services has no shelves: leave the shelf pages out of its menu.
    // A food-led shop (a bar or restaurant, rooms or not) keeps buying and stock, loses the shelf
    // pages, and keeps its front desk — lodging is an add-on, not a reason to show the retail shelf.
    const trimmed = trimNavForFoodOnly(trimNavForServiceOnly(permitted, serviceOnlyShop), foodLedShop, foodTableService);
    // A shop that only sells wholesale has no till, no shifts and no customer tabs: its buyers have
    // trade accounts under Trade. Leaving those sections out is what stops it reading as a mini mart.
    return isWholesaleOnlyBusiness(business) && !IS_DESKTOP
      ? trimmed
          .filter((section) => !WHOLESALE_ONLY_HIDDEN_SECTIONS.includes(section.id))
          .map((section) => {
            const wording = WHOLESALE_SECTION_WORDING[section.id];
            return wording ? { ...section, ...wording } : section;
          })
      : trimmed;
  }, [
    serviceOnlyShop,
    foodOnlyShop,
    foodLedShop,
    foodTableService,
    productSidebar,
    business,
    me?.permissions,
    mergedFeatureFlags,
    canListUsers,
    canViewPayroll,
    canReadFinanceExpenses,
    canWriteFinanceExpenses,
    canReadFinanceReports,
    canManageBusinessSettings,
    canViewAuditLog,
    canViewCategories,
    canViewPurchasingIntelligence,
    canAddSupplies,
    canPathBRead,
    canPathAOrder,
    canViewApAging,
    canViewSuppliers,
    canViewMarketplace,
    canViewCustomers,
    canViewMessages,
    canReviewPaymentClaims,
    canRecordSupplierPayment,
    canViewInventoryValuation,
    canViewInventoryTransfers,
    canViewSupplyBatches,
    canViewStockTake,
    canApproveStockTake,
    canViewOrderPad,
    canViewPricing,
    canManageDiscounts,
    canViewShifts,
    canViewAnalytics,
    canViewSalesIntelligence,
    canViewStorefrontOrders,
    canViewStoreRoom,
    canQuickSale,
    canViewPosDrafts,
    canAccessGrocery,
    canManageImports,
    canViewPaymentGateways,
    canViewEasyTaxIntegrations,
    canViewAirtime,
    canManageCrmInbox,
    canManageCrmAutomation,
    canSendCrmBroadcast,
    me?.role?.key,
    groceryClerkStockAccess,
    stockManagerStockPage,
    stockManagerActivity,
    stockManagerStoreRoom,
    canWriteSuppliersDelegated,
    canLinkSupplierProductsDelegated,
  ]);

  const activeSectionId = useMemo(
    () => resolveActiveNavSectionId(visibleSections, pathname, isPathActive),
    [pathname, visibleSections, isPathActive],
  );

  const allowedHrefs = useMemo(() => {
    const set = new Set<string>();
    for (const section of visibleSections) {
      for (const item of section.items) set.add(item.href);
    }
    return set;
  }, [visibleSections]);

  const moreQuickLinks = useMemo(() => {
    const candidates: MoreQuickLink[] = [
      {
        id: "sell",
        label: "Sell",
        hint: "Ring a sale",
        icon: ScanLine,
        workspace: "cashier",
        href: APP_ROUTES.cashier,
      },
      {
        id: "order",
        label: "Order",
        hint: "Buy from suppliers",
        icon: ShoppingCart,
        workspace: "order",
        href: APP_ROUTES.order,
      },
      {
        id: "receive",
        label: "Receive",
        hint: "Goods in",
        icon: PackageCheck,
        workspace: "receive",
        href: APP_ROUTES.orderReceive,
      },
      ...(canWriteSuppliersDelegated
        ? [
            {
              id: "new-supplier",
              label: "New supplier",
              hint: "Add who you buy from",
              icon: Truck,
              href: `${APP_ROUTES.suppliers}?new=1`,
            },
          ]
        : []),
      {
        id: "credits",
        label: "On tab",
        hint: "Collect credit",
        icon: CreditCard,
        workspace: "credits",
        href: APP_ROUTES.creditsOnTab,
      },
      {
        id: "settings",
        label: "Settings",
        hint: "Shop & storefront",
        icon: Settings2,
        workspace: "settings",
        href: APP_ROUTES.businessSettings,
      },
      {
        id: "configuration",
        label: "Config",
        hint: "Inventory & till",
        icon: SlidersHorizontal,
        workspace: "configuration",
        href: APP_ROUTES.businessConfiguration,
      },
      {
        id: "takings",
        label: "Takings",
        hint: "Today’s ledger",
        icon: Wallet,
        href: APP_ROUTES.paymentsDayLedger,
      },
      {
        id: "support",
        label: "Support",
        hint: "Ask for help",
        icon: LifeBuoy,
        action: "support",
      },
      {
        id: "guide",
        label: "Ask Guide",
        hint: "How do I…",
        icon: Sparkles,
        action: "guide",
      },
    ];
    return candidates.filter((link) => {
      if (link.action === "support" || link.action === "guide") return true;
      if (link.workspace === "cashier") return canQuickSale;
      if (!link.href) return false;
      // Quick links may carry a query (e.g. /suppliers?new=1 opens the create
      // drawer); gate on the base path so they still respect nav visibility.
      const baseHref = link.href.split("?")[0] ?? "";
      return allowedHrefs.has(link.href) || allowedHrefs.has(baseHref);
    });
  }, [allowedHrefs, canQuickSale, canWriteSuppliersDelegated]);

  const [moreOpen, setMoreOpen] = useState(false);
  const [shellWorkspace, setShellWorkspace] = useState<ShellWorkspaceId | null>(
    null,
  );

  useEffect(() => {
    const onOpenMore = () => setMoreOpen(true);
    window.addEventListener(OPEN_SHELL_MORE_EVENT, onOpenMore);
    return () => window.removeEventListener(OPEN_SHELL_MORE_EVENT, onOpenMore);
  }, []);

  const onLogout = async () => {
    await logoutRemoteAndRedirectToLogin();
  };

  const userDisplayName = me?.name?.trim() || me?.email?.trim() || tenantTitle;

  const headerSubtitle = loading
    ? "Loading session…"
    : [business?.name, userDisplayName].filter(Boolean).join(" · ");

  const userInitial = userDisplayName.charAt(0).toUpperCase();

  // Live unread badges for the Inbox destinations (org → Inbox nav rows + More).
  const inboxUnread = useSupportUnreadBreakdown();
  const navBadgeByHref: Readonly<Record<string, number>> = {
    ...(inboxUnread.total > 0
      ? { [APP_ROUTES.support]: inboxUnread.total }
      : {}),
    ...(inboxUnread.messages > 0
      ? { [APP_ROUTES.messages]: inboxUnread.messages }
      : {}),
  };

  const headerPosLinks = useMemo((): HeaderPosLink[] => {
    const links: HeaderPosLink[] = [];
    // A wholesale-only shop has no till: its way in is the trade desk, which leads the rail.
    if (isWholesaleOnlyBusiness(business) && !IS_DESKTOP) {
      return links;
    }
    if (canQuickSale) {
      // A restaurant rings dishes at its counter; the retail till behind "Sell" only knows products.
      links.push(
        foodOnlyShop
          ? { href: APP_ROUTES.restaurantCounter, label: "Counter", shortLabel: "Till", icon: UtensilsCrossed }
          : { href: APP_ROUTES.cashier, label: "Sell", icon: ScanLine },
      );
    }
    if (canAccessGrocery && !isButcherPosEnabled(mergedFeatureFlags)) {
      links.push({
        href: APP_ROUTES.grocery,
        label: "Clerk",
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
  }, [canQuickSale, canAccessGrocery, canViewSuppliers, mergedFeatureFlags, foodOnlyShop, business]);

  const visibleBottomTabs = useMemo(() => {
    const roleKey = me?.role?.key?.trim().toLowerCase();
    if (roleKey === "stock_manager") {
      const tabs: BottomTab[] = [];
      // Home is always first when the stock page is on.
      if (stockManagerStockPage) {
        tabs.push(STOCK_MANAGER_BOTTOM_TABS[0]); // Home
        tabs.push(STOCK_MANAGER_BOTTOM_TABS[1]); // Take stock
      }
      if (canPathAOrder) {
        tabs.push(STOCK_MANAGER_BOTTOM_TABS[2]); // Order (Path A)
        tabs.push(STOCK_MANAGER_BOTTOM_TABS[3]); // Receive (Path A + walk-in)
      } else if (canAddSupplies) {
        tabs.push({
          ...STOCK_MANAGER_BOTTOM_TABS[3],
          href: APP_ROUTES.purchasingAddSupplies,
          icon: Truck,
        });
      }
      tabs.push(STOCK_MANAGER_BOTTOM_TABS[5]); // More (profile lives here)
      return tabs;
    }
    if (roleKey === "cashier") {
      return BOTTOM_TABS.map((tab) => {
        if (tab.id === "sales") {
          return {
            ...tab,
            label: "Sell",
            icon: ScanLine,
            href: APP_ROUTES.cashier,
            workspace: undefined,
            primary: true,
          };
        }
        if (tab.id === "ops") {
          return {
            ...tab,
            label: "Shifts",
            icon: Clock,
            href: APP_ROUTES.shifts,
            workspace: undefined,
            matchSectionIds: ["ops"],
          };
        }
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
          icon: Clock,
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
          label: "Clerk",
          icon: ShoppingBag,
          href: APP_ROUTES.clerk,
          matchSectionIds: ["sales"],
        },
        {
          id: "invoices",
          label: "Invoices",
          icon: Receipt,
          href: APP_ROUTES.clerkInvoices,
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

    // Owners / admins / managers: Sell drawer when they can sell;
    // otherwise land on Shifts (clock the floor) before prices.
    // A service-only shop has a floor and a bookings book where a product shop has shelves.
    const tabs: readonly BottomTab[] =
      serviceOnlyShop && canQuickSale
        ? BOTTOM_TABS.map((tab) =>
            tab.id === "catalog"
              ? { id: "floor", label: "Floor", icon: Scissors, href: APP_ROUTES.servicesFloor, matchSectionIds: ["services"] }
              : tab.id === "inventory"
                ? {
                    id: "bookings",
                    label: "Bookings",
                    icon: CalendarDays,
                    href: APP_ROUTES.servicesAppointments,
                    matchSectionIds: ["services"],
                  }
                : tab,
          )
        : foodOnlyShop
          ? BOTTOM_TABS.map((tab) =>
              tab.id === "catalog" && (canTakeRestaurantOrders || canQuickSale)
                ? { id: "floor", label: "Floor", icon: LayoutGrid, href: APP_ROUTES.restaurantFloor, matchSectionIds: ["restaurant"] }
                : tab.id === "inventory" && (canWorkRestaurantKitchen || canQuickSale)
                  ? { id: "kitchen", label: "Kitchen", icon: ChefHat, href: APP_ROUTES.restaurantKitchen, matchSectionIds: ["restaurant"] }
                  : tab,
            )
          : !IS_DESKTOP && (isClinicBusiness(business) || isPharmacyBusiness(business))
            ? // A chemist's daily work is Pharmacy, a clinic's is Today: each takes the place of a
              // tab that is one tap away inside it (stock safety covers Stock; Products stays in More).
              BOTTOM_TABS.map((tab) =>
                tab.id === "inventory" && isPharmacyBusiness(business) && hasPermission(me?.permissions, Permission.CatalogItemsRead)
                  ? { id: "pharmacy", label: "Pharmacy", icon: Pill, href: APP_ROUTES.pharmacy, matchSectionIds: ["pharmacy"] }
                  : tab.id === "catalog" &&
                      isClinicBusiness(business) &&
                      (hasPermission(me?.permissions, Permission.ClinicReception) ||
                        hasPermission(me?.permissions, Permission.ClinicConsult) ||
                        hasPermission(me?.permissions, Permission.ClinicPerform) ||
                        hasPermission(me?.permissions, Permission.ClinicManage) ||
                        hasPermission(me?.permissions, Permission.PharmacyDispense))
                    ? { id: "clinic", label: "Clinic", icon: Stethoscope, href: APP_ROUTES.clinic, matchSectionIds: ["clinic"] }
                    : tab,
              )
            : BOTTOM_TABS;
    // A supplier's phone leads with the trade desk. In a wholesale-only shop it takes the place of
    // "Sell", which that shop does not have; a supplier with a counter keeps "Sell" and gives up
    // "Sales", which stays one tap away under More.
    const tradeTabReplaces =
      IS_DESKTOP || !isSupplierBusiness(business) || !canViewStorefrontOrders
        ? null
        : isWholesaleOnlyBusiness(business)
          ? "ops"
          : "sales";
    return tabs.map((tab): BottomTab => {
      if (tradeTabReplaces && tab.id === tradeTabReplaces) {
        return {
          id: "trade",
          label: "Trade",
          icon: Truck,
          href: APP_ROUTES.storefrontTradeOrders,
          matchSectionIds: ["supplier"],
          primary: tradeTabReplaces === "ops",
        };
      }
      if (tab.id !== "ops") return tab;
      if (canQuickSale && foodOnlyShop) {
        // The restaurant counter rings dishes; the retail till behind "Sell" only knows products.
        return {
          ...tab,
          label: "Counter",
          icon: UtensilsCrossed,
          href: APP_ROUTES.restaurantCounter,
          workspace: undefined,
          matchSectionIds: ["restaurant"],
          primary: true,
        };
      }
      if (canQuickSale) {
        return {
          ...tab,
          label: "Sell",
          icon: ScanLine,
          href: APP_ROUTES.cashier,
          workspace: "cashier" as const,
          matchSectionIds: ["ops", "sales"],
          primary: true,
        };
      }
      if (canViewShifts) {
        return {
          ...tab,
          label: "Shifts",
          icon: Clock,
          href: APP_ROUTES.shifts,
          workspace: undefined,
          matchSectionIds: ["ops"],
        };
      }
      if (canViewPricing) {
        return {
          ...tab,
          label: "Prices",
          icon: SlidersHorizontal,
          href: APP_ROUTES.pricing,
          workspace: undefined,
          matchSectionIds: ["ops"],
        };
      }
      return tab;
    }).filter((tab) => {
      if (tab.id === "ops") {
        return canQuickSale || canViewShifts || canViewPricing;
      }
      return true;
    }).filter((tab) => {
      // A shop with no product line drops the retail tabs the rail already hides — Products, and the
      // retail-till "Sell". A food/service shop keeps its remapped Floor/Counter tab (that tab's href
      // is no longer a retail route after the remap above), so only a true goods tab falls away.
      if (productSidebar || IS_DESKTOP) return true;
      if (!tab.href) return true;
      return !GOODS_ONLY_NAV_HREFS.includes(tab.href);
    });
  }, [
    me,
    business,
    productSidebar,
    canViewSuppliers,
    supplierToolsEnabled,
    canAddSupplies,
    canPathAOrder,
    stockManagerStockPage,
    stockManagerActivity,
    canViewOrderPad,
    canQuickSale,
    canViewShifts,
    canViewPricing,
    serviceOnlyShop,
    foodOnlyShop,
    canTakeRestaurantOrders,
    canWorkRestaurantKitchen,
    canViewStorefrontOrders,
  ]);

  // Which bottom tab is currently "active"
  const activeBottomTabId = useMemo(() => {
    if (shellWorkspace === "cashier") {
      const cashierTab = visibleBottomTabs.find(
        (tab) => tab.workspace === "cashier",
      );
      if (cashierTab) return cashierTab.id;
    }
    for (const tab of visibleBottomTabs) {
      if (tab.href && isPathActive(pathname, tab.href)) {
        return tab.id;
      }
    }
    for (const tab of visibleBottomTabs) {
      if (tab.matchSectionIds.includes(activeSectionId ?? "")) {
        return tab.id;
      }
    }
    return null;
  }, [pathname, visibleBottomTabs, activeSectionId, isPathActive, shellWorkspace]);

  // ── Phase 9: multi_branch gate ────────────────────────────────────────
  const multiBranch = mergedFeatureFlags.multi_branch !== false;

  // ── current selections for header display ─────────────────────────────────
  const currentBranch = branches.find((b) => b.id === branchId);
  const handleBranchCreated = async (branch: BranchRecord) => {
    await refreshBranches();
    setBranchId(branch.id);
  };
  const currentItemType = itemTypes.find((t) => t.id === itemTypeId);
  const { activeAisles, showUnassignedOption, departmentScoped } =
    useHeaderShelfZoneOptions(aisles, itemTypeId);
  const showShelfZonePicker =
    canViewCategories &&
    (aislesLoading ||
      departmentScoped.loading ||
      (aisles.some((a) => a.active) &&
        (!itemTypeId.trim() ||
          activeAisles.length > 0 ||
          showUnassignedOption)));
  const departmentLocked = isGroceryClerk && itemTypes.length === 1;

  useEffect(() => {
    if (!headerAisleSelectionValid(aisleId, itemTypeId, departmentScoped)) {
      setAisleId("");
    }
  }, [aisleId, itemTypeId, departmentScoped, setAisleId]);

  // ── Auto-redirect restricted roles away from unauthorized pages ──────────
  useEffect(() => {
    if (!me) return;
    const roleKey = me.role?.key?.trim().toLowerCase();

    if (roleKey === "stock_manager") {
      const allowed: string[] = [
        APP_ROUTES.inventoryStockTake,
        APP_ROUTES.inventoryStockTakeMyStats,
        APP_ROUTES.inventoryStockTakeDailyAudit,
        APP_ROUTES.myProfile,
        APP_ROUTES.myPay,
        APP_ROUTES.support,
      ];
      if (stockManagerStockPage) {
        allowed.push(APP_ROUTES.inventoryStock, APP_ROUTES.inventoryRestock);
        allowed.push(APP_ROUTES.inventoryMissingBarcodes);
      }
      if (stockManagerActivity) {
        allowed.push(APP_ROUTES.analyticsActivity);
      }
      if (canAddSupplies) {
        allowed.push(APP_ROUTES.purchasingAddSupplies);
        allowed.push(APP_ROUTES.supplierDirectory);
      }
      if (canPathAOrder) {
        allowed.push(APP_ROUTES.order);
        allowed.push(APP_ROUTES.orderReceive);
      }
      if (supplierToolsEnabled) {
        allowed.push(APP_ROUTES.suppliers);
        allowed.push(APP_ROUTES.findSuppliers);
      }
      if (canViewOrderPad) {
        allowed.push(APP_ROUTES.inventoryOrderPad);
        allowed.push(APP_ROUTES.inventoryStockTakeRestock);
      }
      // Must mirror `isNavItemVisible`: adding the nav item without this makes the
      // item bounce straight back to Stock levels.
      if (stockManagerStoreRoom && canViewStoreRoom) {
        allowed.push(APP_ROUTES.store);
      }
      const isAllowed = allowed.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
      );
      if (!isAllowed) {
        router.replace(APP_ROUTES.inventoryStock);
      }
      return;
    }

    if (isServiceCashier(roleKey, serviceOnlyShop)) {
      // The till and their profile only; any other address goes back to the till.
      if (!serviceCashierMayOpen(pathname)) {
        router.replace(APP_ROUTES.cashier);
      }
      return;
    }

    if (roleKey === "cashier") {
      const allowed: string[] = [
        APP_ROUTES.shifts,
        APP_ROUTES.cashier,
        ...(canAddSupplies
          ? [APP_ROUTES.purchasingAddSupplies, APP_ROUTES.supplierDirectory]
          : []),
        ...(canViewSuppliers ? [APP_ROUTES.suppliers] : []),
      ];
      const isAllowed = allowed.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
      );
      if (!isAllowed) {
        router.replace(APP_ROUTES.shifts);
      }
      return;
    }

    if (roleKey === "butcher_cashier") {
      const allowed = [
        APP_ROUTES.butcher,
        APP_ROUTES.butcherSuppliers,
        APP_ROUTES.shifts,
        ...(canAddSupplies
          ? [APP_ROUTES.purchasingAddSupplies, APP_ROUTES.supplierDirectory]
          : []),
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
      const allowed: string[] = [
        APP_ROUTES.grocery,
        APP_ROUTES.groceryInvoices,
      ];
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
    canPathAOrder,
    stockManagerStockPage,
    stockManagerActivity,
    stockManagerStoreRoom,
    canViewOrderPad,
    canViewStoreRoom,
    serviceOnlyShop,
  ]);

  return (
    <div
      className={cn(
        "tablet-app-root flex h-[100dvh] overflow-hidden bg-[var(--op-bg)]",
        OPERATOR_SURFACE_CLASS,
      )}
      style={OPERATOR_SURFACE_STYLE}
    >
      {/* ── Desktop sidebar — icon rail + sub-nav (xl+). iPads and phones use bottom nav. ── */}
      <ChromeSlot slot="desktop">
        <div className={cn("shrink-0", desktopChromeVisible)}>
          <DesktopNavRail
            leadSectionIds={
              isSupplierBusiness(business)
                ? SUPPLIER_LEAD_SECTIONS
                : serviceOnlyShop
                ? SERVICE_LEAD_SECTIONS
                : foodLedShop && lodgingShop
                  ? FOOD_AND_LODGING_LEAD_SECTIONS
                  : foodLedShop
                    ? FOOD_LEAD_SECTIONS
                    : lodgingShop
                      ? LODGING_LEAD_SECTIONS
                      : isClinicBusiness(business) && !IS_DESKTOP
                        ? isPharmacyBusiness(business)
                          ? CLINIC_AND_PHARMACY_LEAD_SECTIONS
                          : CLINIC_LEAD_SECTIONS
                        : isPharmacyBusiness(business) && !IS_DESKTOP
                          ? PHARMACY_LEAD_SECTIONS
                          : undefined
            }
            pathname={pathname}
            homeHref={homeHref}
            tenantTitle={tenantTitle}
            logoUrl={business?.branding?.logoUrl}
            faviconUrl={business?.branding?.faviconUrl}
            primaryColor={business?.branding?.primaryColor}
            storeTypes={business?.profile?.storeTypes}
            sections={visibleSections}
            flat={isCashier || isButcherCashier || isGroceryClerk}
            badgeByHref={navBadgeByHref}
            footerSlot={showAddProductLine ? <AddProductLineButton /> : undefined}
          />
        </div>
      </ChromeSlot>

      {/* ── Right panel — on iPad/tablet this becomes the rounded “app stage”. ── */}
      <div className="tablet-app-stage flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Desktop top header — paired with the sidebar, from xl (laptops) up. */}
        <ChromeSlot slot="desktop">
          <header
            className={cn(
              "h-11 items-center justify-between gap-3 border-b bg-background px-4",
              desktopChromeVisible,
            )}
          >
            <div className="flex min-w-0 items-baseline gap-2">
              <p className="min-w-0 truncate text-[13px] font-medium text-foreground">
                {headerSubtitle ? headerSubtitle : ""}
              </p>
              {currentBranch ? (
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="size-3 shrink-0" aria-hidden />
                  {currentBranch.name}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <HeaderPosLinks
                links={headerPosLinks}
                pathname={pathname}
                variant="desktop"
              />
              {showOwnerKioskPay ? (
                <ChromeSlot slot="desktop">
                  <KioskPayHeaderBalance
                    canWithdraw={canWritePaymentGateways}
                    currencyFallback={business?.currency?.trim() || "KES"}
                    variant="desktop"
                  />
                </ChromeSlot>
              ) : null}
              <ChromeSlot slot="desktop">
                <SmsCreditsHeader
                  canBuy={canBuySmsCredits}
                  canViewLedger={canViewSmsCreditLedger}
                  defaultPhone={me?.phone}
                  variant="desktop"
                />
              </ChromeSlot>
              <ChromeSlot slot="desktop">
                <NotificationBell />
              </ChromeSlot>
              {/* Phase 9: Branch selector — hidden for stock managers, cashiers and grocery clerks who are locked to their assigned branch */}
              {isStockManager ||
              isCashier ||
              isButcherCashier ||
              isGroceryClerk ? (
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
              ) : multiBranch ||
                (canManageBusinessSettings && branches.length === 0) ? (
                <BranchSwitcher
                  branches={branches}
                  branchId={branchId}
                  onChange={setBranchId}
                  loading={branchesLoading}
                  canManage={canManageBusinessSettings}
                  onCreated={handleBranchCreated}
                />
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

              {showShelfZonePicker ? (
                <select
                  className="h-8 max-w-[11rem] rounded-md border bg-background px-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                  value={aisleId}
                  onChange={(e) => setAisleId(e.target.value)}
                  disabled={
                    aislesLoading ||
                    (itemTypeId.trim() ? departmentScoped.loading : false) ||
                    activeAisles.length === 0
                  }
                  aria-label="Select shelf zone"
                  title={
                    itemTypeId.trim() && !departmentScoped.loading
                      ? "Zones with products in the selected department"
                      : undefined
                  }
                >
                  {activeAisles.length === 0 ? (
                    <option value="">
                      {aislesLoading || departmentScoped.loading
                        ? "Loading…"
                        : itemTypeId.trim()
                          ? "No zones in department"
                          : "No shelf zones"}
                    </option>
                  ) : (
                    <>
                      <option value="">{ALL_SHELF_ZONES_LABEL}</option>
                      {showUnassignedOption ? (
                        <option value={UNASSIGNED_SHELF_ZONE_VALUE}>
                          No shelf zone
                        </option>
                      ) : null}
                      {activeAisles.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.code})
                          {itemTypeId.trim() ? ` · ${a.productCount}` : ""}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              ) : null}

              <Button variant="outline" onClick={onLogout}>
                Log out
              </Button>
            </div>
          </header>
        </ChromeSlot>

        <ChromeSlot slot={["phone", "tablet"]}>
          <div className={tabletChromeVisible}>
            <TabletAppHeader
              tenantTitle={tenantTitle}
              businessName={business?.name}
              logoUrl={business?.branding?.logoUrl}
              faviconUrl={business?.branding?.faviconUrl}
              primaryColor={business?.branding?.primaryColor}
              storeTypes={business?.profile?.storeTypes}
              pageTitle={
                pathname === APP_ROUTES.inventoryStock &&
                searchParams.get("view") === "levels"
                  ? "Inventory"
                  : undefined
              }
              branchName={currentBranch?.name}
              departmentName={currentItemType?.label ?? ALL_DEPARTMENTS_LABEL}
              shelfZoneName={
                aisleId === UNASSIGNED_SHELF_ZONE_VALUE
                  ? "No shelf zone"
                  : aisleId
                    ? activeAisles.find((a) => a.id === aisleId)?.name
                    : undefined
              }
              userInitial={userInitial}
              headerTools={
                <>
                  {showOwnerKioskPay ? (
                    <ChromeSlot slot="tablet">
                      <KioskPayHeaderBalance
                        canWithdraw={canWritePaymentGateways}
                        currencyFallback={business?.currency?.trim() || "KES"}
                        variant="tablet"
                      />
                    </ChromeSlot>
                  ) : null}
                  <ChromeSlot slot="tablet">
                    <SmsCreditsHeader
                      canBuy={canBuySmsCredits}
                      canViewLedger={canViewSmsCreditLedger}
                      defaultPhone={me?.phone}
                      variant="tablet"
                    />
                  </ChromeSlot>
                </>
              }
              posLinks={headerPosLinks}
              onOpenMore={() => setMoreOpen(true)}
            />
          </div>
        </ChromeSlot>

        {IS_DESKTOP ? <DesktopLicenseBanner /> : null}
        <ImpersonationBanner />
        <SubscriptionStatusBanner />
        {isStockManager ? null : <SubscriptionPlanFitBanner />}
        <BranchRequiredBanner />
        <SetupRequirementHost />
        {canManageBusinessSettings ? <SetupProgressContextStrip /> : null}

        {/* ── Main content ───────────────────────────────────────────────────── */}
        <main
          className={cn(
            "tablet-app-main relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-[var(--op-bg)]",
            mainContentPadding,
          )}
          style={{
            ["--pos-primary" as string]: "#1D4B3B",
            ["--order-ink" as string]: "#121A16",
            ["--order-shelf" as string]: "#FCFAF5",
            ["--order-slip" as string]: "#FCFAF5",
            ["--catalog-primary" as string]: "#1D4B3B",
            ["--catalog-ink" as string]: "#121A16",
            ["--catalog-shelf" as string]: "#FCFAF5",
          }}
        >
          {IS_DESKTOP ? <DesktopReadOnlyOverlay /> : null}
          {children}
        </main>

        <ChromeSlot slot={["phone", "tablet"]}>
          <div className={tabletChromeVisible}>
            <TabletBottomNav
              tabs={visibleBottomTabs}
              activeTabId={activeBottomTabId}
              onMore={() => setMoreOpen(true)}
              onOpenWorkspace={setShellWorkspace}
              layout={
                isStockManager && visibleBottomTabs.length >= 4
                  ? "compact"
                  : "default"
              }
            />
          </div>
        </ChromeSlot>

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
            storeTypes={business?.profile?.storeTypes}
            sections={visibleSections}
            pathname={pathname}
            branchName={currentBranch?.name}
            branchLocked={
              isStockManager || isCashier || isButcherCashier || isGroceryClerk
            }
            branches={branches}
            branchId={branchId}
            branchesLoading={branchesLoading}
            onBranchChange={setBranchId}
            showBranchPicker={
              !isStockManager &&
              !isCashier &&
              !isButcherCashier &&
              !isGroceryClerk &&
              (multiBranch ||
                (canManageBusinessSettings && branches.length === 0))
            }
            canManageBranches={canManageBusinessSettings}
            onBranchCreated={handleBranchCreated}
            itemTypes={itemTypes}
            itemTypeId={itemTypeId}
            itemTypesLoading={itemTypesLoading}
            onItemTypeChange={setItemTypeId}
            departmentLocked={departmentLocked}
            aisles={activeAisles}
            aisleId={aisleId}
            aislesLoading={aislesLoading || departmentScoped.loading}
            showUnassignedAisleOption={showUnassignedOption}
            onAisleChange={setAisleId}
            showShelfZonePicker={showShelfZonePicker}
            onLogout={onLogout}
            itemIsActive={isPathActive}
            compactNav={
              isStockManager || isCashier || isButcherCashier || isGroceryClerk
            }
            badgeByHref={navBadgeByHref}
            myPayHref={canViewPayrollSelf ? APP_ROUTES.myPay : null}
            profileHref={APP_ROUTES.myProfile}
            quickLinks={moreQuickLinks}
            walletTools={
              <>
                {showOwnerKioskPay ? (
                  <KioskPayHeaderBalance
                    canWithdraw={canWritePaymentGateways}
                    currencyFallback={business?.currency?.trim() || "KES"}
                    variant="desktop"
                  />
                ) : null}
                <SmsCreditsHeader
                  canBuy={canBuySmsCredits}
                  canViewLedger={canViewSmsCreditLedger}
                  defaultPhone={me?.phone}
                  variant="desktop"
                />
              </>
            }
            onOpenWorkspace={setShellWorkspace}
          />
        </div>
      </div>
      <ShellWorkspaceDrawer
        workspace={shellWorkspace}
        onClose={() => setShellWorkspace(null)}
      />
      <SokoMindGuide />
    </div>
  );
}
