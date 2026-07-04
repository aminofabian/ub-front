import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  BarChart3,
  ClipboardList,
  Layers,
  Package,
  PackageX,
} from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import type { BusinessRecord, MeResponse } from "@/lib/api";

export type InventoryQuickLink = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
};

export const STOCK_PAGE_QUICK_LINKS: readonly InventoryQuickLink[] = [
  {
    href: APP_ROUTES.inventoryRestock,
    label: "Out of stock",
    desc: "Restock zeros",
    icon: PackageX,
  },
  {
    href: APP_ROUTES.inventoryStockTake,
    label: "Stock take",
    desc: "Counts",
    icon: ClipboardList,
  },
  {
    href: APP_ROUTES.inventorySupplyBatches,
    label: "Supply batches",
    desc: "Cost layers",
    icon: Layers,
  },
  {
    href: APP_ROUTES.inventoryValuation,
    label: "Valuation",
    desc: "Extension value",
    icon: BarChart3,
  },
  {
    href: APP_ROUTES.inventoryTransfers,
    label: "Transfers",
    desc: "Move stock",
    icon: ArrowRightLeft,
  },
  {
    href: APP_ROUTES.products,
    label: "Products",
    desc: "Catalog",
    icon: Package,
  },
];

const STOCK_MANAGER_INVENTORY_HREFS: readonly string[] = [
  APP_ROUTES.inventoryStock,
  APP_ROUTES.inventoryRestock,
  APP_ROUTES.inventoryStockTake,
  APP_ROUTES.inventoryStockTakeDailyAudit,
  APP_ROUTES.purchasingAddSupplies,
];

const GROCERY_CLERK_QUICK_LINK_HREFS: readonly string[] = [
  APP_ROUTES.inventoryStock,
  APP_ROUTES.inventoryRestock,
];

function isInventoryHrefAllowed(
  href: string,
  allowedHrefs: readonly string[],
): boolean {
  return allowedHrefs.some(
    (allowed) => href === allowed || href.startsWith(`${allowed}?`),
  );
}

export function filterInventoryQuickLinksForUser(
  me: MeResponse | null | undefined,
  links: readonly InventoryQuickLink[],
): InventoryQuickLink[] {
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  if (roleKey === "stock_manager") {
    return links.filter((link) =>
      isInventoryHrefAllowed(link.href, STOCK_MANAGER_INVENTORY_HREFS),
    );
  }
  if (roleKey === "grocery_clerk") {
    return links.filter((link) =>
      isInventoryHrefAllowed(link.href, GROCERY_CLERK_QUICK_LINK_HREFS),
    );
  }
  return [...links];
}

export function stockLevelsSettings(
  business: BusinessRecord | null | undefined,
) {
  return business?.inventory?.stockLevels;
}

export function canEditStockLevels(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (hasPermission(me?.permissions, Permission.InventoryWrite)) {
    return true;
  }
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const settings = stockLevelsSettings(business);
  if (roleKey === "stock_manager") {
    return Boolean(settings?.allowStockEditForStockManager);
  }
  if (roleKey === "grocery_clerk") {
    return Boolean(settings?.allowStockEditForGroceryClerk);
  }
  return false;
}

export function canViewStockLevels(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  if (hasPermission(me?.permissions, Permission.InventoryRead)) {
    return true;
  }
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  if (roleKey === "grocery_clerk") {
    return Boolean(stockLevelsSettings(business)?.allowStockEditForGroceryClerk);
  }
  return false;
}

export function groceryClerkStockAccessEnabled(
  business: BusinessRecord | null | undefined,
): boolean {
  return Boolean(stockLevelsSettings(business)?.allowStockEditForGroceryClerk);
}

export function allowNegativeStockForSales(
  business: BusinessRecord | null | undefined,
): boolean {
  return Boolean(stockLevelsSettings(business)?.allowNegativeStock);
}

export function canStockManagerSeeSystemStockDuringCount(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  if (roleKey === "owner" || roleKey === "admin") {
    return true;
  }
  if (hasPermission(me?.permissions, Permission.StocktakeApprove)) {
    return true;
  }
  if (roleKey === "stock_manager") {
    return Boolean(business?.inventory?.stocktake?.showSystemStockToStockManager);
  }
  return false;
}

export function inventoryQuickLinksForUser(
  me: MeResponse | null | undefined,
): InventoryQuickLink[] {
  return filterInventoryQuickLinksForUser(me, STOCK_PAGE_QUICK_LINKS);
}
