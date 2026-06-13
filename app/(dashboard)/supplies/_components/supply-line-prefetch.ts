import { differenceInCalendarDays } from "date-fns";

import {
  fetchBatchTable,
  fetchCurrentSellingPrice,
  fetchItemById,
  fetchItemSupplierLinks,
  fetchSellPriceSuggestion,
  type BatchTableRow,
} from "@/lib/api";
import { parseISODate } from "@/lib/analytics-date-range";
import { addYmdDays, todayYmdLocal } from "@/lib/ymd-date";

export type SupplyLinePrefill = {
  unitStr: string;
  sellPriceStr: string;
  expiry: string;
  hints: {
    cost?: string;
    shelf?: string;
    expiry?: string;
  };
};

function parseMoney(v: number | string | null | undefined): number | null {
  if (v == null) {
    return null;
  }
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function moneyStr(v: number | null): string {
  return v != null ? v.toFixed(2) : "";
}

function pickSupplierLinkCost(
  links: Awaited<ReturnType<typeof fetchItemSupplierLinks>>,
  supplierId?: string | null,
): { value: number | null; hint?: string } {
  const active = links.filter((l) => l.active);
  const forSupplier = supplierId?.trim()
    ? active.find((l) => l.supplierId === supplierId.trim())
    : undefined;
  const link = forSupplier ?? active.find((l) => l.primary) ?? active[0];
  if (!link) {
    return { value: null };
  }
  const last = parseMoney(link.lastCostPrice);
  if (last != null) {
    return { value: last, hint: "Last cost from supplier link" };
  }
  const def = parseMoney(link.defaultCostPrice);
  if (def != null) {
    return { value: def, hint: "Default cost from supplier link" };
  }
  return { value: null };
}

function inferExpiryFromBatches(
  rows: BatchTableRow[],
  itemId: string,
): { ymd: string; hint: string } | null {
  const forItem = rows.filter(
    (r) =>
      r.itemId === itemId &&
      r.expiryDate?.trim() &&
      r.receivedAt?.trim() &&
      Number(parseMoney(r.quantityRemaining) ?? 0) > 0,
  );
  if (forItem.length === 0) {
    return null;
  }

  const latest = [...forItem].sort(
    (a, b) =>
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  )[0];

  const received = new Date(latest.receivedAt);
  const expiry = parseISODate(latest.expiryDate!.trim());
  if (!Number.isFinite(received.getTime()) || !Number.isFinite(expiry.getTime())) {
    return null;
  }

  const shelfDays = differenceInCalendarDays(
    expiry,
    new Date(received.getFullYear(), received.getMonth(), received.getDate()),
  );
  if (shelfDays <= 0) {
    return null;
  }

  return {
    ymd: addYmdDays(todayYmdLocal(), shelfDays),
    hint: `~${shelfDays} day shelf life from last batch`,
  };
}

export async function prefetchSupplyLineDefaults({
  itemId,
  itemSku,
  supplierId,
  branchId,
}: {
  itemId: string;
  itemSku: string;
  supplierId?: string | null;
  branchId?: string | null;
}): Promise<SupplyLinePrefill> {
  const bid = branchId?.trim() ?? "";
  const sid = supplierId?.trim() ?? "";

  const [suggest, detail, supplierLinks, batches, currentSell] =
    await Promise.all([
      fetchSellPriceSuggestion(
        itemId,
        sid || undefined,
        bid || undefined,
      ).catch(() => null),
      fetchItemById(itemId, bid ? { branchId: bid } : undefined).catch(
        () => null,
      ),
      fetchItemSupplierLinks(itemId).catch(() => []),
      bid
        ? fetchBatchTable({
            branchId: bid,
            search: itemSku.trim() || undefined,
            size: 40,
            page: 0,
          }).catch(() => null)
        : Promise.resolve(null),
      bid
        ? fetchCurrentSellingPrice(itemId, bid, { toast: false }).catch(
            () => null,
          )
        : Promise.resolve(null),
    ]);

  const linkCost = pickSupplierLinkCost(supplierLinks, sid);
  const latestUnit = parseMoney(suggest?.latestUnitCost);
  const catalogCost = parseMoney(detail?.buyingPrice);

  let cost = linkCost.value ?? latestUnit ?? catalogCost;
  let costHint = linkCost.hint;
  if (cost != null && !costHint) {
    if (latestUnit != null && cost === latestUnit) {
      costHint = "Latest unit cost";
    } else if (catalogCost != null && cost === catalogCost) {
      costHint = "Catalog buying price";
    }
  }

  const suggested = parseMoney(suggest?.suggestedSellPrice);
  const current = parseMoney(suggest?.currentSellPrice);
  const shelfFromApi = parseMoney(currentSell?.price);
  const shelf = current ?? suggested ?? shelfFromApi;

  let shelfHint: string | undefined;
  if (current != null) {
    shelfHint = "Current shelf price";
  } else if (suggested != null) {
    shelfHint = suggest?.ruleName
      ? `Suggested (${suggest.ruleName})`
      : "Suggested shelf price";
  } else if (shelfFromApi != null) {
    shelfHint = "Branch shelf price";
  }

  const expiryGuess = batches?.rows?.length
    ? inferExpiryFromBatches(batches.rows, itemId)
    : null;

  return {
    unitStr: moneyStr(cost),
    sellPriceStr: moneyStr(shelf),
    expiry: expiryGuess?.ymd ?? "",
    hints: {
      cost: costHint,
      shelf: shelfHint,
      expiry: expiryGuess?.hint,
    },
  };
}
