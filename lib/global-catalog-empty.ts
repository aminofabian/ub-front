import type { GlobalCatalogMetaRecord } from "@/lib/api";

/**
 * True when the resolved regional catalog has no packs and no products to browse
 * (e.g. empty `ug-retail` shell) — not a search/filter empty state.
 */
export function isGlobalCatalogShellEmpty(args: {
  meta: GlobalCatalogMetaRecord | null | undefined;
  productCount: number;
  totalElements: number | null | undefined;
  search: string;
  categoryId: string | null | undefined;
  packId: string | null | undefined;
}): boolean {
  if (args.search.trim()) return false;
  if (args.categoryId) return false;
  if (args.packId) return false;
  if (!args.meta) return false;
  const packsEmpty = (args.meta.packs?.length ?? 0) === 0;
  const categoriesEmpty = (args.meta.categories?.length ?? 0) === 0;
  const productsEmpty =
    args.productCount === 0 &&
    (args.totalElements == null || args.totalElements === 0);
  return packsEmpty && categoriesEmpty && productsEmpty;
}
