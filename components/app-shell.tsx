"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { logoutRemote } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

const BRANCHES_LINK = { href: APP_ROUTES.branches, label: "Branches" } as const;

const ALL_NAV_ITEMS = [
  { href: APP_ROUTES.business, label: "Business settings" },
  { href: APP_ROUTES.businessDomains, label: "Domains" },
  BRANCHES_LINK,
  { href: APP_ROUTES.users, label: "Users" },
  { href: APP_ROUTES.products, label: "Products" },
  { href: APP_ROUTES.categories, label: "Categories" },
  { href: APP_ROUTES.suppliers, label: "Suppliers" },
  { href: APP_ROUTES.customers, label: "Customers" },
  { href: APP_ROUTES.purchasingIntelligence, label: "Supplier intelligence" },
  { href: APP_ROUTES.purchasingApAging, label: "AP aging" },
  { href: APP_ROUTES.purchasingRecordPayment, label: "Record payment" },
  { href: APP_ROUTES.inventoryValuation, label: "Stock valuation" },
  { href: APP_ROUTES.inventoryTransfers, label: "Stock transfers" },
  { href: APP_ROUTES.inventoryStockTake, label: "Stock take" },
  { href: APP_ROUTES.pricing, label: "Pricing" },
  { href: APP_ROUTES.shifts, label: "Shifts" },
  { href: APP_ROUTES.salesReports, label: "Sales by category" },
  { href: APP_ROUTES.storefrontWebOrders, label: "Pickup orders (web)" },
  { href: APP_ROUTES.salesQuick, label: "Quick sale" },
  { href: APP_ROUTES.cashier, label: "Cashier (PWA)" },
] as const;

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    business,
    me,
    loading,
    canListUsers,
    canManageBusinessSettings,
    canViewCategories,
    canViewPurchasingIntelligence,
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

  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.href === APP_ROUTES.businessDomains) {
      return canManageBusinessSettings;
    }
    if (item.href === APP_ROUTES.users) {
      return canListUsers;
    }
    if (item.href === APP_ROUTES.categories) {
      return canViewCategories;
    }
    if (item.href === APP_ROUTES.suppliers) {
      return canViewSuppliers;
    }
    if (item.href === APP_ROUTES.customers) {
      return canViewCustomers;
    }
    if (item.href === APP_ROUTES.purchasingIntelligence) {
      return canViewPurchasingIntelligence;
    }
    if (item.href === APP_ROUTES.purchasingApAging) {
      return canViewApAging;
    }
    if (item.href === APP_ROUTES.purchasingRecordPayment) {
      return canRecordSupplierPayment;
    }
    if (item.href === APP_ROUTES.inventoryValuation) {
      return canViewInventoryValuation;
    }
    if (item.href === APP_ROUTES.inventoryTransfers) {
      return canViewInventoryTransfers;
    }
    if (item.href === APP_ROUTES.inventoryStockTake) {
      return canViewStockTake;
    }
    if (item.href === APP_ROUTES.pricing) {
      return canViewPricing;
    }
    if (item.href === APP_ROUTES.shifts) {
      return canViewShifts;
    }
    if (item.href === APP_ROUTES.salesReports) {
      return canViewSalesIntelligence;
    }
    if (item.href === APP_ROUTES.storefrontWebOrders) {
      return canViewStorefrontOrders;
    }
    if (item.href === APP_ROUTES.salesQuick) {
      return canQuickSale;
    }
    if (item.href === APP_ROUTES.cashier) {
      return canQuickSale;
    }
    return true;
  });

  const onLogout = async () => {
    await logoutRemote();
    router.push(APP_ROUTES.login);
  };

  const headerSubtitle = loading
    ? "Loading session…"
    : [business?.name, me?.email].filter(Boolean).join(" · ");

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="w-64 border-r bg-background p-4">
        <h1 className="text-lg font-semibold">UB Admin</h1>
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                pathname === item.href && "bg-accent text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
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
