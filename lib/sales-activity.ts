import {
  fetchRecentSales,
  fetchRecentWebOrderLines,
  type RecentSaleRow,
} from "@/lib/api";
import { normalizeSaleChannel } from "@/lib/sale-channel-filter";

export async function fetchMergedSalesActivity(
  from: string,
  to: string,
  branchId: string | undefined,
  options: { includeOnlineStore: boolean; itemTypeId?: string },
): Promise<RecentSaleRow[]> {
  const branch = branchId?.trim() || undefined;
  const itemTypeId = options.itemTypeId?.trim() || undefined;

  const [posRows, webRows] = await Promise.all([
    fetchRecentSales(from, to, branch, itemTypeId),
    options.includeOnlineStore
      ? fetchRecentWebOrderLines(from, to, branch, itemTypeId).catch(
          () => [] as RecentSaleRow[],
        )
      : Promise.resolve([] as RecentSaleRow[]),
  ]);

  const pos = (Array.isArray(posRows) ? posRows : []).map((row) => ({
    ...row,
    channel: row.channel ?? "walk_in",
  }));

  const web = (Array.isArray(webRows) ? webRows : []).map((row) => ({
    ...row,
    channel: row.channel ?? "online_store",
  }));

  return [...pos, ...web].sort(
    (a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime(),
  );
}

export function tagRowChannel(row: RecentSaleRow): RecentSaleRow {
  return {
    ...row,
    channel: normalizeSaleChannel(row.channel),
  };
}
