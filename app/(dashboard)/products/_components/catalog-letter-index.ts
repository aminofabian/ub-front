import {
  resolveCatalogItemName,
  resolveCatalogVariantListTitle,
} from "@/lib/catalog-display";
import type { ItemSummaryRecord } from "@/lib/api";

export const CATALOG_LETTER_KEYS = [
  "#",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

export type CatalogLetterKey = (typeof CATALOG_LETTER_KEYS)[number];

/** First character bucket for A–Z jump navigation (`#` = non-letter). */
export function catalogRowLetterKey(row: ItemSummaryRecord): CatalogLetterKey {
  const label = row.variantOfItemId
    ? resolveCatalogVariantListTitle(row, { parentInList: false }).combined
    : resolveCatalogItemName(row).label;
  const ch = label.trim().charAt(0).toUpperCase();
  if (ch >= "A" && ch <= "Z") return ch as CatalogLetterKey;
  return "#";
}

export function findCatalogLetterIndex(
  rows: readonly ItemSummaryRecord[],
  letter: CatalogLetterKey,
): number {
  return rows.findIndex((row) => catalogRowLetterKey(row) === letter);
}

/** Letters that already appear in the loaded (display-sorted) rows. */
export function catalogLettersPresent(
  rows: readonly ItemSummaryRecord[],
): Set<CatalogLetterKey> {
  const present = new Set<CatalogLetterKey>();
  for (const row of rows) {
    present.add(catalogRowLetterKey(row));
    if (present.size >= CATALOG_LETTER_KEYS.length) break;
  }
  return present;
}
