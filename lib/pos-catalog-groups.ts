import type { ItemSummaryRecord } from "@/lib/api";
import {
  cashierItemPrimaryLabel,
  cashierItemTitleParts,
} from "@/lib/cashier-item-display";

export type PosCatalogStandaloneHit = {
  kind: "standalone";
  item: ItemSummaryRecord;
};

export type PosCatalogVariantGroup = {
  kind: "variantGroup";
  parentId: string;
  title: string;
  variants: ItemSummaryRecord[];
};

export type PosCatalogHitBlock =
  | PosCatalogStandaloneHit
  | PosCatalogVariantGroup;

function variantOptionLabel(item: ItemSummaryRecord): string {
  const size = item.size?.trim();
  if (size) return size;
  const variant = item.variantName?.trim();
  if (variant) return variant;
  const { option } = cashierItemTitleParts(item);
  if (option) return option;
  return item.sku?.trim() || cashierItemPrimaryLabel(item);
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function sortVariants(variants: ItemSummaryRecord[]): ItemSummaryRecord[] {
  return [...variants].sort((a, b) =>
    naturalCompare(variantOptionLabel(a), variantOptionLabel(b)),
  );
}

function groupTitle(variants: ItemSummaryRecord[]): string {
  const first = variants[0];
  if (!first) return "Variants";
  const { primary } = cashierItemTitleParts(first);
  if (primary && primary !== variantOptionLabel(first)) {
    return primary;
  }
  // Fall back to shared name without trailing size/sku noise.
  const name = first.name?.trim();
  return name || cashierItemPrimaryLabel(first);
}

/**
 * Collapse linked variant siblings into one family block for hybrid POS lists.
 * Unlinked lookalikes stay standalone. `groupLabelOnly` parents are omitted when
 * any children for that parent are present in the hit set.
 */
export function groupPosCatalogHits(
  hits: ItemSummaryRecord[],
): PosCatalogHitBlock[] {
  if (hits.length === 0) return [];

  const byParent = new Map<string, ItemSummaryRecord[]>();
  const standalone: ItemSummaryRecord[] = [];
  const parentsSeen = new Set<string>();

  for (const hit of hits) {
    const parentId = hit.variantOfItemId?.trim();
    if (parentId) {
      const list = byParent.get(parentId) ?? [];
      list.push(hit);
      byParent.set(parentId, list);
      continue;
    }
    if (hit.groupLabelOnly) {
      parentsSeen.add(hit.id);
      continue;
    }
    standalone.push(hit);
  }

  const blocks: PosCatalogHitBlock[] = [];
  const emittedParents = new Set<string>();
  const consumedStandalone = new Set<string>();

  // Preserve roughly the original hit order: walk hits and emit groups/rows
  // the first time we encounter a member.
  for (const hit of hits) {
    const parentId = hit.variantOfItemId?.trim();
    if (parentId) {
      if (emittedParents.has(parentId)) continue;
      const siblings = byParent.get(parentId) ?? [hit];
      emittedParents.add(parentId);
      if (siblings.length >= 2) {
        blocks.push({
          kind: "variantGroup",
          parentId,
          title: groupTitle(siblings),
          variants: sortVariants(siblings),
        });
      } else {
        const only = siblings[0] ?? hit;
        blocks.push({ kind: "standalone", item: only });
      }
      continue;
    }

    if (hit.groupLabelOnly) {
      if (emittedParents.has(hit.id)) continue;
      const children = byParent.get(hit.id);
      if (children && children.length > 0) {
        emittedParents.add(hit.id);
        blocks.push({
          kind: "variantGroup",
          parentId: hit.id,
          title: cashierItemPrimaryLabel(hit) || hit.name || "Variants",
          variants: sortVariants(children),
        });
      }
      // Parent with no children in this page: skip (not sellable alone).
      continue;
    }

    if (consumedStandalone.has(hit.id)) continue;
    consumedStandalone.add(hit.id);
    blocks.push({ kind: "standalone", item: hit });
  }

  // Safety: any parent-keyed groups not yet emitted (shouldn't happen).
  for (const [parentId, siblings] of byParent) {
    if (emittedParents.has(parentId)) continue;
    if (siblings.length >= 2) {
      blocks.push({
        kind: "variantGroup",
        parentId,
        title: groupTitle(siblings),
        variants: sortVariants(siblings),
      });
    } else if (siblings[0]) {
      blocks.push({ kind: "standalone", item: siblings[0] });
    }
  }

  return blocks;
}

export function posVariantOptionLabel(item: ItemSummaryRecord): string {
  return variantOptionLabel(item);
}

export function formatPosStockQty(
  stockQty: number | string | null | undefined,
): string | null {
  if (stockQty == null || stockQty === "") return null;
  const n = typeof stockQty === "number" ? stockQty : Number(stockQty);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
