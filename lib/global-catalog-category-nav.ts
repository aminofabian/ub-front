import type { GlobalCategoryRecord } from "@/lib/api";

export type GlobalCategoryNavNode = GlobalCategoryRecord & {
  depth: number;
};

/**
 * Depth-first order for the catalog sidebar: parents before children,
 * siblings by position then name. Orphans (missing parent) render as roots.
 */
export function flattenGlobalCategoriesForNav(
  categories: GlobalCategoryRecord[],
): GlobalCategoryNavNode[] {
  if (categories.length === 0) return [];

  const byParent = new Map<string | null, GlobalCategoryRecord[]>();
  const ids = new Set(categories.map((c) => c.id));

  for (const cat of categories) {
    const rawParent = cat.parentId?.trim() || null;
    const parentKey = rawParent && ids.has(rawParent) ? rawParent : null;
    const bucket = byParent.get(parentKey) ?? [];
    bucket.push(cat);
    byParent.set(parentKey, bucket);
  }

  const sortSiblings = (rows: GlobalCategoryRecord[]) =>
    [...rows].sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

  const out: GlobalCategoryNavNode[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const cat of sortSiblings(byParent.get(parentId) ?? [])) {
      out.push({ ...cat, depth });
      walk(cat.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
