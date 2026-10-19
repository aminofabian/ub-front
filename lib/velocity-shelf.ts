import type { ItemVelocityRow } from "@/lib/api";

export type ShelfSignal = "empty" | "short" | "moving" | "steady";

type PaceRow = Pick<ItemVelocityRow, "currentStock" | "last7Qty" | "last30Qty">;
type SignalRow = Pick<
  ItemVelocityRow,
  "currentStock" | "todayQty" | "yesterdayQty" | "last7Qty" | "last30Qty"
>;

export function velocityQty(n: number | string | null | undefined): number {
  if (n == null || n === "") return 0;
  const value = typeof n === "number" ? n : Number(n);
  return Number.isFinite(value) ? value : 0;
}

/** Units per day from the last week, or the last month when this week is quiet. */
export function dailyPace(row: Pick<ItemVelocityRow, "last7Qty" | "last30Qty">): number {
  const week = velocityQty(row.last7Qty);
  if (week > 0) return week / 7;
  const month = velocityQty(row.last30Qty);
  if (month > 0) return month / 30;
  return 0;
}

/** Days of on-hand stock at the recent pace. Null when nothing has sold. */
export function coverDays(row: PaceRow): number | null {
  const pace = dailyPace(row);
  if (pace <= 0) return null;
  return velocityQty(row.currentStock) / pace;
}

export function shelfSignal(row: SignalRow): ShelfSignal {
  const stock = velocityQty(row.currentStock);
  const soldRecently =
    velocityQty(row.last30Qty) > 0 || velocityQty(row.todayQty) > 0;
  if (stock <= 0 && soldRecently) return "empty";
  const cover = coverDays(row);
  if (cover != null && cover < 3 && stock > 0) return "short";
  if (
    velocityQty(row.todayQty) > 0 &&
    velocityQty(row.todayQty) > velocityQty(row.yesterdayQty)
  ) {
    return "moving";
  }
  return "steady";
}

export function coverPhrase(row: SignalRow): string | null {
  if (shelfSignal(row) === "empty") return "None on the shelf";
  const cover = coverDays(row);
  if (cover == null) return null;
  if (cover < 1) return "Under a day left";
  const days = Math.round(cover);
  return days === 1 ? "1 day left" : `${days} days left`;
}

export function shelfFocusCounts(rows: readonly SignalRow[]) {
  let empty = 0;
  let short = 0;
  let moving = 0;
  for (const row of rows) {
    const signal = shelfSignal(row);
    if (signal === "empty") empty += 1;
    else if (signal === "short") short += 1;
    else if (signal === "moving") moving += 1;
  }
  return { empty, short, moving };
}
