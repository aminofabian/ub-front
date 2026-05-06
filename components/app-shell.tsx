"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  Banknote,
  Building2,
  ChevronDown,
  Package,
  ShoppingBag,
  SlidersHorizontal,
  Warehouse,
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
      { href: APP_ROUTES.purchasingIntelligence, label: "Supplier intelligence" },
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
      { href: APP_ROUTES.storefrontWebOrders, label: "Pickup orders (web)", featureFlag: "shop" },
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
};

function featureFlagAllows(flags: Record<string, boolean> | undefined, key: string | undefined): boolean {
  if (!key) {
    return true;
  }
  if (!flags || !(key in flags)) {
    return true;
  }
  return flags[key] === true;
}

function isNavItemVisible(item: NavItem, g: NavGate): boolean {
  if (!featureFlagAllows(g.featureFlags, item.featureFlag)) {
    return false;
  }
  if (item.href === APP_ROUTES.businessDomains || item.href === APP_ROUTES.businessBranding) {
    return g.canManageBusinessSettings;
  }
  if (item.href === APP_ROUTES.users) {
    return g.canListUsers;
  }
  if (item.href === APP_ROUTES.categories) {
    return g.canViewCategories;
  }
  if (item.href === APP_ROUTES.suppliers) {
    return g.canViewSuppliers;
  }
  if (item.href === APP_ROUTES.customers) {
    return g.canViewCustomers;
  }
  if (item.href === APP_ROUTES.purchasingIntelligence) {
    return g.canViewPurchasingIntelligence;
  }
  if (item.href === APP_ROUTES.purchasingAddSupplies) {
    return g.canAddSupplies;
  }
  if (item.href === APP_ROUTES.purchasingApAging) {
    return g.canViewApAging;
  }
  if (item.href === APP_ROUTES.purchasingRecordPayment) {
    return g.canRecordSupplierPayment;
  }
  if (item.href === APP_ROUTES.inventoryValuation) {
    return g.canViewInventoryValuation;
  }
  if (item.href === APP_ROUTES.inventoryTransfers) {
    return g.canViewInventoryTransfers;
  }
  if (item.href === APP_ROUTES.inventoryStockTake) {
    return g.canViewStockTake;
  }
  if (item.href === APP_ROUTES.pricing) {
    return g.canViewPricing;
  }
  if (item.href === APP_ROUTES.shifts) {
    return g.canViewShifts;
  }
  if (item.href === APP_ROUTES.salesReports) {
    return g.canViewSalesIntelligence;
  }
  if (item.href === APP_ROUTES.storefrontWebOrders) {
    return g.canViewStorefrontOrders;
  }
  if (item.href === APP_ROUTES.salesQuick || item.href === APP_ROUTES.cashier) {
    return g.canQuickSale;
  }
  return true;
}

function itemIsActive(pathname: string, href: string): boolean {
  return pathname === href;
}

function sectionHasActiveItem(pathname: string, items: readonly NavItem[]): boolean {
  return items.some((item) => pathname === item.href);
}

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const tenant = useOptionalTenant();
  const tenantTitle = tenant?.branding?.displayName ?? tenant?.tenantName ?? "UB Admin";
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
  ]);

  const activeSectionId = useMemo(() => {
    for (const s of visibleSections) {
      if (sectionHasActiveItem(pathname, s.items)) {
        return s.id;
      }
    }
    return null;
  }, [pathname, visibleSections]);

  const [userExpandedSectionIds, setUserExpandedSectionIds] = useState<ReadonlySet<string>>(() => new Set());

  const toggleSection = useCallback(
    (id: string) => {
      const section = visibleSections.find((s) => s.id === id);
      if (section && sectionHasActiveItem(pathname, section.items)) {
        return;
      }
      setUserExpandedSectionIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
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

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r bg-background">
        <div className="border-b p-4">
          <h1 className="text-lg font-semibold leading-tight tracking-tight">{tenantTitle}</h1>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">Navigate by area — groups collapse to reduce noise.</p>
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
                  title={routeOpen ? "This group stays open while you are on a page inside it." : undefined}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40",
                      sectionActive && "border-primary/25 bg-primary/10 text-primary",
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
                    <span className="mt-1 block text-[11px] font-normal leading-snug text-muted-foreground">{section.blurb}</span>
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
                              active && "bg-accent font-medium text-accent-foreground",
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
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background px-6 py-3">
          <p className="text-sm text-muted-foreground">
            Phase 1 / Slice 6
            {headerSubtitle ? ` · ${headerSubtitle}` : ""}
          </p>
          <Button variant="outline" onClick={onLogout}>
            Log out
          </Button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
