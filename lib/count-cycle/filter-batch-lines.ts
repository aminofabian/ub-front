import type { CountCycleBatchLine } from "@/lib/api";

export type BatchLineFilter = "todo" | "counted" | "all";

function isLineCounted(line: CountCycleBatchLine): boolean {
  return line.countedQty != null && line.countedQty !== "";
}

function matchesQuery(line: CountCycleBatchLine, query: string): boolean {
  if (!query) return true;
  return [line.itemName, line.itemSku, line.barcode, line.categoryName]
    .filter((field): field is string => Boolean(field))
    .some((field) => field.toLowerCase().includes(query));
}

/**
 * Lines left after the counted/to-count chip and the search box, batch order kept.
 * `keepIds` stay put regardless of the chip, so a row just counted doesn't vanish under the thumb.
 */
export function filterBatchLines(
  lines: CountCycleBatchLine[],
  filter: BatchLineFilter,
  rawQuery: string,
  keepIds: ReadonlySet<string> = new Set(),
): CountCycleBatchLine[] {
  const query = rawQuery.trim().toLowerCase();
  return lines.filter((line) => {
    if (keepIds.has(line.lineId)) return matchesQuery(line, query);
    if (filter === "todo" && isLineCounted(line)) return false;
    if (filter === "counted" && !isLineCounted(line)) return false;
    return matchesQuery(line, query);
  });
}
