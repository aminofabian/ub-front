import type { RestockSuggestionRecord } from "@/lib/api";

import { aisleKey, aisleName, UNASSIGNED_AISLE_KEY } from "./digest-format";

export type ShelfZoneFilter = {
  id: string;
  name: string;
  count: number;
};

export function buildShelfZoneFilters(
  suggestions: RestockSuggestionRecord[],
): ShelfZoneFilter[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const s of suggestions) {
    const key = aisleKey(s);
    const cur = map.get(key) ?? { name: aisleName(s), count: 0 };
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([id, { name, count }]) => ({ id, name, count }))
    .sort((a, b) => {
      if (a.id === UNASSIGNED_AISLE_KEY) return 1;
      if (b.id === UNASSIGNED_AISLE_KEY) return -1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
}
