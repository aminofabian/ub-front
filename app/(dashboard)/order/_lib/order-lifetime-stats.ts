import type {
  PathAPurchaseOrderDetailRecord,
  PathAPurchaseOrderListRowRecord,
  PathBSupplyListRowRecord,
  PurchasingIntelligenceDashboardResponse,
  SupplierItemLinkRecord,
} from "@/lib/api";
import type { OrderCartPackMeta, OrderCartQty } from "@/lib/order-cart-storage";
import { toOrderStatNum } from "@/app/(dashboard)/order/_hooks/use-order-pipeline-stats";

export type PoReceivePhase =
  | "draft"
  | "in_flight"
  | "partial"
  | "received"
  | "cancelled";

export function poReceivePhase(
  row: PathAPurchaseOrderListRowRecord,
): PoReceivePhase {
  const status = row.status?.trim().toLowerCase();
  if (status === "cancelled") return "cancelled";
  if (status === "draft") return "draft";
  const ordered = toOrderStatNum(row.totalOrdered);
  const received = toOrderStatNum(row.totalReceived);
  if (ordered > 0 && received >= ordered) return "received";
  if (received > 0) return "partial";
  return "in_flight";
}

export function poPhaseLabel(phase: PoReceivePhase): string {
  switch (phase) {
    case "draft":
      return "Draft";
    case "in_flight":
      return "Sent";
    case "partial":
      return "Partial";
    case "received":
      return "Received";
    case "cancelled":
      return "Cancelled";
  }
}

export type OrderLifetimeStats = {
  ordersPlaced: number;
  draftCount: number;
  sentCount: number;
  cancelledCount: number;
  fullyReceived: number;
  partiallyReceived: number;
  inFlightCount: number;
  confirmedInvoices: number;
  confirmedValue: number;
  paidValue: number;
  openBalance: number;
  paidCount: number;
  partialPayCount: number;
  unpaidCount: number;
  totalSpend: number;
  spendTrend: { date: string; spend: number }[];
};

export function summarizeLifetimeStats(
  sent: PathAPurchaseOrderListRowRecord[],
  draft: PathAPurchaseOrderListRowRecord[],
  cancelled: PathAPurchaseOrderListRowRecord[],
  supplies: PathBSupplyListRowRecord[],
  intelligence: PurchasingIntelligenceDashboardResponse | null,
): OrderLifetimeStats {
  const allOrders = [...sent, ...draft, ...cancelled];
  let confirmedValue = 0;
  let paidValue = 0;
  let openBalance = 0;
  let paidCount = 0;
  let partialPayCount = 0;
  let unpaidCount = 0;

  for (const row of supplies) {
    confirmedValue += toOrderStatNum(row.grandTotal);
    paidValue += toOrderStatNum(row.amountPaid);
    openBalance += toOrderStatNum(row.balanceOpen);
    const ps = row.paymentStatus?.trim().toUpperCase();
    if (ps === "PAID") paidCount += 1;
    else if (ps === "PARTIAL") partialPayCount += 1;
    else unpaidCount += 1;
  }

  const fullyReceived = sent.filter((row) => poReceivePhase(row) === "received")
    .length;
  const partiallyReceived = sent.filter((row) => poReceivePhase(row) === "partial")
    .length;
  const inFlightCount = sent.filter((row) => {
    const phase = poReceivePhase(row);
    return phase === "in_flight" || phase === "partial";
  }).length;

  const intelligenceSpend = intelligence?.summary?.totalSpend;
  const totalSpend =
    intelligenceSpend != null && toOrderStatNum(intelligenceSpend) > 0
      ? toOrderStatNum(intelligenceSpend)
      : confirmedValue;

  const spendTrend = (intelligence?.spendTrend ?? []).map((point) => ({
    date: point.date,
    spend: toOrderStatNum(point.spend),
  }));

  return {
    ordersPlaced: allOrders.length,
    draftCount: draft.length,
    sentCount: sent.length,
    cancelledCount: cancelled.length,
    fullyReceived,
    partiallyReceived,
    inFlightCount,
    confirmedInvoices: supplies.length,
    confirmedValue,
    paidValue,
    openBalance,
    paidCount,
    partialPayCount,
    unpaidCount,
    totalSpend,
    spendTrend,
  };
}

export function applyPoDetailToCart(
  po: PathAPurchaseOrderDetailRecord,
  links: SupplierItemLinkRecord[],
): {
  cart: OrderCartQty;
  packs: OrderCartPackMeta;
  matched: number;
  missed: number;
  estimatedTotal: number;
} {
  const cart: OrderCartQty = {};
  const packs: OrderCartPackMeta = {};
  let matched = 0;
  let missed = 0;
  let estimatedTotal = 0;

  for (const line of po.lines) {
    const qty = toOrderStatNum(line.qtyOrdered);
    if (qty <= 0) continue;
    const link = links.find((entry) => entry.itemId === line.itemId);
    if (!link) {
      missed += 1;
      continue;
    }
    cart[line.itemId] = qty;
    matched += 1;
    const unit = toOrderStatNum(line.unitEstimatedCost);
    estimatedTotal += qty * unit;
  }

  return { cart, packs, matched, missed, estimatedTotal };
}

export function sortPastOrders(
  rows: PathAPurchaseOrderListRowRecord[],
): PathAPurchaseOrderListRowRecord[] {
  return [...rows].sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    if (aTime !== bTime) return bTime - aTime;
    return b.poNumber.localeCompare(a.poNumber);
  });
}
