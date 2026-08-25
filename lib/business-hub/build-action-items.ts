import { APP_ROUTES } from "@/lib/config";
import type { ActionItem } from "@/components/business-hub/action-items-strip";
import type {
  BatchDashboardResponse,
  InventoryExpiryPipelineResponse,
  OwnerDashboardResponse,
} from "@/lib/api";

import { fmtCount, fmtKes, toNum } from "./formatters";

export type BuildActionItemsInput = {
  openShifts: number;
  lowStockCount: number;
  batchDashboard: BatchDashboardResponse | null;
  expiryPipeline: InventoryExpiryPipelineResponse | null;
  storefrontEnabled: boolean | undefined;
  openWebOrders: number;
  payablesOpen: number;
  canViewShifts: boolean;
  canViewSupplyBatches: boolean;
  canManageBusinessSettings: boolean;
  canViewApAging: boolean;
  canViewStorefrontOrders: boolean;
};

export function expiringBatchCount(
  batchDashboard: BatchDashboardResponse | null,
  expiryPipeline: InventoryExpiryPipelineResponse | null,
): number {
  const fromDashboard = batchDashboard?.expiringBatches?.length ?? 0;
  const buckets = expiryPipeline?.buckets ?? {};
  const due7d = buckets.due_7d?.batchCount ?? 0;
  const expired = buckets.expired?.batchCount ?? 0;
  return Math.max(fromDashboard, due7d + expired);
}

export function isHubSalesEmpty(
  revenue: number,
  orders: number | null,
  chartRevenue: number[],
): boolean {
  if (revenue > 0) return false;
  if ((orders ?? 0) > 0) return false;
  return chartRevenue.every((value) => value <= 0);
}

export function buildActionItems(input: BuildActionItemsInput): ActionItem[] {
  const items: ActionItem[] = [];
  const expiringCount = expiringBatchCount(
    input.batchDashboard,
    input.expiryPipeline,
  );

  if (input.canViewShifts && input.openShifts > 0) {
    items.push({
      id: "open-shifts",
      label: `${fmtCount(input.openShifts)} till${input.openShifts === 1 ? "" : "s"} still open`,
      detail: "Close or check the till",
      href: APP_ROUTES.shifts,
      tone: "warning",
    });
  }

  if (input.canViewSupplyBatches && input.lowStockCount > 0) {
    items.push({
      id: "low-stock",
      label: `${fmtCount(input.lowStockCount)} low-stock product${input.lowStockCount === 1 ? "" : "s"}`,
      detail: "Reorder before you run out",
      href: APP_ROUTES.inventoryRestock,
      tone: "warning",
    });
  }

  if (input.canViewSupplyBatches && expiringCount > 0) {
    items.push({
      id: "expiring",
      label: `${fmtCount(expiringCount)} item${expiringCount === 1 ? "" : "s"} going off soon`,
      detail: "Use or sell before they spoil",
      href: APP_ROUTES.inventorySupplyBatches,
      tone: "warning",
    });
  }

  if (input.canManageBusinessSettings && input.storefrontEnabled === false) {
    items.push({
      id: "storefront-off",
      label: "Online shop is off",
      detail: "Turn it on to take pickup orders",
      href: APP_ROUTES.businessSettings,
      tone: "info",
    });
  }

  if (input.canViewStorefrontOrders && input.openWebOrders > 0) {
    items.push({
      id: "web-orders",
      label: `${fmtCount(input.openWebOrders)} pickup order${input.openWebOrders === 1 ? "" : "s"} waiting`,
      detail: "Confirm, pack, or complete",
      href: APP_ROUTES.storefrontWebOrders,
      tone: "warning",
    });
  }

  const payables = toNum(input.payablesOpen);
  if (input.canViewApAging && payables > 0) {
    items.push({
      id: "payables",
      label: `${fmtKes(payables)} unpaid to suppliers`,
      detail: "Pay the bills you still owe",
      href: APP_ROUTES.purchasingApAging,
      tone: "info",
    });
  }

  return items;
}

export function payablesTotalOpen(
  ownerSummary: OwnerDashboardResponse | null,
): number {
  return toNum(ownerSummary?.payablesAging?.totalOpen);
}
