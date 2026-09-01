import type { CustomerSpendRow, TabPurchaseRowRecord } from "@/lib/api";

export type TopItemRow = {
  key: string;
  name: string;
  sku: string | null;
  quantity: number;
  spend: number;
};

export type CustomerPurchaseInsights = {
  visitCount: number;
  itemsBought: number;
  totalSpend: number;
  avgBasket: number;
  topItem: TopItemRow | null;
  topItems: TopItemRow[];
  hasMoreHistory: boolean;
};

function toNum(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function insightsFromPurchases(
  rows: TabPurchaseRowRecord[],
  hasMore: boolean,
): CustomerPurchaseInsights {
  const itemMap = new Map<string, TopItemRow>();
  let itemsBought = 0;
  let totalSpend = 0;

  for (const sale of rows) {
    totalSpend += toNum(sale.grandTotal);
    for (const line of sale.lines) {
      const qty = toNum(line.quantity);
      itemsBought += qty;
      const name = line.itemName?.trim() || "Item";
      const sku = line.itemSku?.trim() || null;
      const key = sku ? `sku:${sku}` : `name:${name.toLowerCase()}`;
      const spend = toNum(line.lineTotal);
      const prev = itemMap.get(key);
      if (prev) {
        prev.quantity += qty;
        prev.spend += spend;
      } else {
        itemMap.set(key, { key, name, sku, quantity: qty, spend });
      }
    }
  }

  const topItems = [...itemMap.values()].sort((a, b) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    return b.spend - a.spend;
  });

  const visitCount = rows.length;
  return {
    visitCount,
    itemsBought,
    totalSpend,
    avgBasket: visitCount > 0 ? totalSpend / visitCount : 0,
    topItem: topItems[0] ?? null,
    topItems: topItems.slice(0, 5),
    hasMoreHistory: hasMore,
  };
}

export function mergeSpendIntelligence(
  insights: CustomerPurchaseInsights,
  spendRow: CustomerSpendRow | null,
): CustomerPurchaseInsights {
  if (!spendRow) return insights;
  const spend = toNum(spendRow.spend);
  const saleCount = spendRow.saleCount ?? 0;
  return {
    ...insights,
    visitCount: Math.max(insights.visitCount, saleCount),
    totalSpend: spend > 0 ? spend : insights.totalSpend,
    avgBasket:
      saleCount > 0
        ? toNum(spendRow.avgBasket) || spend / saleCount
        : insights.avgBasket,
  };
}
