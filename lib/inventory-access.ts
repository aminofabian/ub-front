import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Layers,
  Package,
  PackageCheck,
  PackagePlus,
  PackageX,
  ScanLine,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import type { BusinessRecord, MeResponse } from "@/lib/api";
import { canPathAPurchasing } from "@/lib/receive-stock-access";

export type InventoryQuickLink = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
};

/** Rank controls visual weight on the stock hub (not equal cards). */
export type StockHubRank = "hero" | "pair" | "list";

export type StockHubAction = {
  id: string;
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  rank: StockHubRank;
};

export const STOCK_PAGE_QUICK_LINKS: readonly InventoryQuickLink[] = [
  {
    href: APP_ROUTES.inventoryRestock,
    label: "Out of stock",
    desc: "Restock zeros",
    icon: PackageX,
  },
  {
    href: APP_ROUTES.inventoryMissingBarcodes,
    label: "Missing barcodes",
    desc: "Variants to label",
    icon: ScanLine,
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
    desc: "What you sell",
    icon: Package,
  },
];

/**
 * Action desk for `/inventory/stock` — jobs first, spreadsheet second.
 * Filtered per role via {@link inventoryHubActionsForUser}.
 */
export const STOCK_HUB_ACTIONS: readonly StockHubAction[] = [
  {
    id: "take-stock",
    href: `${APP_ROUTES.inventoryStock}?view=levels`,
    label: "Inventory",
    hint: "Find a product and set what’s on the shelf now",
    icon: ClipboardList,
    rank: "hero",
  },
  {
    id: "place-order",
    href: APP_ROUTES.order,
    label: "Place order",
    hint: "Build a PO, send it, then receive when it arrives",
    icon: ShoppingCart,
    rank: "pair",
  },
  {
    id: "receive-order",
    href: APP_ROUTES.orderReceive,
    label: "Receive goods",
    hint: "Unpack against an order — or walk-in with no PO",
    icon: PackageCheck,
    rank: "pair",
  },
  {
    id: "full-count",
    href: APP_ROUTES.inventoryStockTake,
    label: "Full count",
    hint: "Count in batches across days until every SKU is done",
    icon: ClipboardList,
    rank: "list",
  },
  {
    id: "daily-audit",
    href: APP_ROUTES.inventoryStockTakeDailyAudit,
    label: "Daily audit",
    hint: "Sample check for today’s variance",
    icon: ClipboardCheck,
    rank: "list",
  },
  {
    id: "restock-analysis",
    href: APP_ROUTES.inventoryStockTakeRestock,
    label: "Restock analysis",
    hint: "What to reorder after a count",
    icon: TrendingUp,
    rank: "list",
  },
  {
    id: "out-of-stock",
    href: APP_ROUTES.inventoryRestock,
    label: "Out of stock",
    hint: "Zeros that need a fill",
    icon: PackageX,
    rank: "list",
  },
  {
    id: "add-supply",
    href: APP_ROUTES.purchasingAddSupplies,
    label: "Walk-in supply",
    hint: "Goods in with no purchase order",
    icon: PackagePlus,
    rank: "list",
  },
  {
    id: "missing-barcodes",
    href: APP_ROUTES.inventoryMissingBarcodes,
    label: "Missing barcodes",
    hint: "Label variants before the till",
    icon: ScanLine,
    rank: "list",
  },
  {
    id: "supply-batches",
    href: APP_ROUTES.inventorySupplyBatches,
    label: "Supply batches",
    hint: "Cost layers and remaining qty",
    icon: Layers,
    rank: "list",
  },
  {
    id: "valuation",
    href: APP_ROUTES.inventoryValuation,
    label: "Valuation",
    hint: "What’s on the shelf in money",
    icon: BarChart3,
    rank: "list",
  },
  {
    id: "transfers",
    href: APP_ROUTES.inventoryTransfers,
    label: "Transfers",
    hint: "Move stock between branches",
    icon: ArrowRightLeft,
    rank: "list",
  },
  {
    id: "products",
    href: APP_ROUTES.products,
    label: "Products",
    hint: "Catalog, prices, and barcodes",
    icon: Package,
    rank: "list",
  },
];

const STOCK_MANAGER_INVENTORY_HREFS: readonly string[] = [
  APP_ROUTES.inventoryStock,
  APP_ROUTES.inventoryRestock,
  APP_ROUTES.inventoryMissingBarcodes,
  APP_ROUTES.inventoryStockTake,
  APP_ROUTES.inventoryStockTakeMyStats,
  APP_ROUTES.inventoryStockTakeDailyAudit,
  APP_ROUTES.inventoryStockTakeRestock,
  APP_ROUTES.purchasingAddSupplies,
  APP_ROUTES.order,
  APP_ROUTES.orderReceive,
];

const GROCERY_CLERK_QUICK_LINK_HREFS: readonly string[] = [
  APP_ROUTES.inventoryStock,
  APP_ROUTES.inventoryRestock,
  APP_ROUTES.inventoryStockTake,
  APP_ROUTES.orderReceive,
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
  business?: BusinessRecord | null,
): InventoryQuickLink[] {
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  if (roleKey === "stock_manager") {
    const stockPageOn = stockManagerStockPageEnabled(business);
    const canPathA = canPathAPurchasing(me, business);
    const allowed = STOCK_MANAGER_INVENTORY_HREFS.filter((href) => {
      if (
        href === APP_ROUTES.inventoryStock ||
        href === APP_ROUTES.inventoryRestock ||
        href === APP_ROUTES.inventoryMissingBarcodes
      ) {
        return stockPageOn;
      }
      if (href === APP_ROUTES.order || href === APP_ROUTES.orderReceive) {
        return canPathA;
      }
      return true;
    });
    return links.filter((link) => isInventoryHrefAllowed(link.href, allowed));
  }
  if (roleKey === "grocery_clerk") {
    return links.filter((link) =>
      isInventoryHrefAllowed(link.href, GROCERY_CLERK_QUICK_LINK_HREFS),
    );
  }
  return [...links];
}

function hubActionHrefBase(href: string): string {
  const q = href.indexOf("?");
  return q >= 0 ? href.slice(0, q) : href;
}

export function inventoryHubActionsForUser(
  me: MeResponse | null | undefined,
  business?: BusinessRecord | null,
): StockHubAction[] {
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const asQuickLinks: InventoryQuickLink[] = STOCK_HUB_ACTIONS.map((a) => ({
    href: hubActionHrefBase(a.href),
    label: a.label,
    desc: a.hint,
    icon: a.icon,
  }));
  const allowed = new Set(
    filterInventoryQuickLinksForUser(me, asQuickLinks, business).map(
      (l) => l.href,
    ),
  );

  // Owners / admins see the full desk. Role filters already applied above.
  if (roleKey !== "stock_manager" && roleKey !== "grocery_clerk") {
    return [...STOCK_HUB_ACTIONS];
  }

  return STOCK_HUB_ACTIONS.filter((a) =>
    allowed.has(hubActionHrefBase(a.href)),
  );
}

export function inventoryQuickLinksForUser(
  me: MeResponse | null | undefined,
  business?: BusinessRecord | null,
): InventoryQuickLink[] {
  return filterInventoryQuickLinksForUser(me, STOCK_PAGE_QUICK_LINKS, business);
}

export function stockLevelsSettings(
  business: BusinessRecord | null | undefined,
) {
  return business?.inventory?.stockLevels;
}

/** Activity page for stock managers — default on when unset. */
export function stockManagerActivityEnabled(
  business: BusinessRecord | null | undefined,
): boolean {
  return stockLevelsSettings(business)?.allowActivityForStockManager !== false;
}

/** Stock / restock / missing-barcode pages for stock managers — default on. */
export function stockManagerStockPageEnabled(
  business: BusinessRecord | null | undefined,
): boolean {
  return stockLevelsSettings(business)?.allowStockPageForStockManager !== false;
}

/**
 * Whether a stock manager may actually work the back room, i.e. record a take-out.
 *
 * Deliberately mirrors the backend delegation one-for-one —
 * `InventoryRoleAccessService.grantsDelegatedInventoryWrite` reads
 * `allowStockEditForStockManager` and nothing else — so nav visibility and the
 * ability to record a movement cannot drift apart. Note this is *stricter* than
 * {@link stockManagerStockPageEnabled}, which governs read-only stock pages and
 * defaults on.
 */
export function stockManagerStoreRoomEnabled(
  business: BusinessRecord | null | undefined,
): boolean {
  return Boolean(stockLevelsSettings(business)?.allowStockEditForStockManager);
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
    return (
      stockManagerStockPageEnabled(business) &&
      Boolean(settings?.allowStockEditForStockManager)
    );
  }
  if (roleKey === "grocery_clerk") {
    return groceryClerkStockAccessEnabled(business);
  }
  return false;
}

export function canViewStockLevels(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  if (roleKey === "stock_manager") {
    return (
      stockManagerStockPageEnabled(business) &&
      hasPermission(me?.permissions, Permission.InventoryRead)
    );
  }
  if (hasPermission(me?.permissions, Permission.InventoryRead)) {
    return true;
  }
  if (roleKey === "grocery_clerk") {
    return groceryClerkStockAccessEnabled(business);
  }
  return false;
}

export function groceryClerkStockAccessEnabled(
  business: BusinessRecord | null | undefined,
): boolean {
  return stockLevelsSettings(business)?.allowStockEditForGroceryClerk !== false;
}

export function allowNegativeStockForSales(
  business: BusinessRecord | null | undefined,
): boolean {
  return stockLevelsSettings(business)?.allowNegativeStock !== false;
}

export function canStockManagerSeeSystemStockDuringCount(
  me: MeResponse | null | undefined,
  business: BusinessRecord | null | undefined,
): boolean {
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  if (roleKey === "owner" || roleKey === "admin") {
    return true;
  }
  // Stock managers ship with stocktake.approve; that must not bypass the toggle.
  if (roleKey === "stock_manager") {
    return Boolean(business?.inventory?.stocktake?.showSystemStockToStockManager);
  }
  if (hasPermission(me?.permissions, Permission.StocktakeApprove)) {
    return true;
  }
  return false;
}
