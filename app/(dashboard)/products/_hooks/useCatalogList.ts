"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiRequestError,
  fetchCategories,
  fetchItemsPage,
  fetchItemTypes,
  type CatalogListScope,
  type CategoryRecord,
  type ItemSummaryRecord,
  type ItemTypeRecord,
} from "@/lib/api";
import {
  buildVariantIdsByParentId,
  isCatalogParentSelectorRow,
  resolveVariantIdsForParent,
  sortCatalogRowsParentFirst,
} from "../_components/catalog-list-styles";

export function useCatalogList(catalogBranchId?: string | null) {
  const branchIdForStock = catalogBranchId?.trim() || undefined;
  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [listRows, setListRows] = useState<ItemSummaryRecord[]>([]);
  const [listTotalElements, setListTotalElements] = useState(0);
  const [listLast, setListLast] = useState(true);
  const [listLoadingInitial, setListLoadingInitial] = useState(true);
  const [listLoadingMore, setListLoadingMore] = useState(false);
  const nextPageRef = useRef(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [includeCategoryDescendants, setIncludeCategoryDescendants] = useState(true);
  const [catalogScope, setCatalogScope] = useState<CatalogListScope>("ALL");
  const [barcodeExact, setBarcodeExact] = useState("");
  const [filterNoBarcode, setFilterNoBarcode] = useState(false);
  const [filterIncludeInactive, setFilterIncludeInactive] = useState(false);

  const [rowSelection, setRowSelection] = useState<Set<string>>(() => new Set());
  const [variantIdsByParentId, setVariantIdsByParentId] = useState<
    Record<string, string[]>
  >({});
  const [listDensity, setListDensity] = useState<"comfortable" | "dense">("comfortable");
  const [message, setMessage] = useState("");

  const variantIdsByParent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [parentId, ids] of Object.entries(variantIdsByParentId)) {
      if (ids.length > 0) map.set(parentId, ids);
    }
    return map;
  }, [variantIdsByParentId]);

  /** Parents first, then their variants — API default sort is flat by name. */
  const catalogRows = useMemo(
    () => sortCatalogRowsParentFirst(listRows),
    [listRows],
  );

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    [categories],
  );

  const categoryById = useMemo(() => {
    const map = new Map<string, CategoryRecord>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const loadCategoriesAndTypes = useCallback(async () => {
    const [types, cats] = await Promise.all([fetchItemTypes(), fetchCategories()]);
    setItemTypes(types);
    setCategories(cats);
  }, []);

  const refreshFullCatalog = useCallback(async () => {
    setListLoadingInitial(true);
    setMessage("");
    nextPageRef.current = 0;
    try {
      const page = await fetchItemsPage(debouncedSearch || undefined, {
        categoryId: filterCategoryId.trim() || undefined,
        includeCategoryDescendants,
        catalogScope,
        barcode: barcodeExact.trim() || undefined,
        noBarcode: filterNoBarcode,
        includeInactive: filterIncludeInactive,
        branchId: branchIdForStock,
        page: 0,
        size: 80,
      });
      setListRows(page.content);
      setListTotalElements(page.totalElements);
      setListLast(page.last);
      nextPageRef.current = page.last ? 0 : 1;
      setRowSelection(new Set());
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Failed to load catalog.");
      }
    } finally {
      setListLoadingInitial(false);
    }
  }, [debouncedSearch, filterCategoryId, includeCategoryDescendants, catalogScope, barcodeExact, filterNoBarcode, filterIncludeInactive, branchIdForStock]);

  /** Patch one loaded list row in place — keeps scroll position and loaded pages. */
  const syncListRowFromDetail = useCallback(
    (row: ItemSummaryRecord & { currentStock?: number | string | null }) => {
      const categoryName =
        row.categoryName?.trim() ||
        (row.categoryId
          ? categories.find((c) => c.id === row.categoryId)?.name
          : undefined);
      setListRows((prev) => {
        const i = prev.findIndex((r) => r.id === row.id);
        if (i < 0) return prev;
        const existing = prev[i];
        const next = [...prev];
        next[i] = {
          ...existing,
          name: row.name,
          sku: row.sku,
          barcode: row.barcode,
          variantName: row.variantName,
          variantOfItemId: row.variantOfItemId,
          categoryId: row.categoryId ?? null,
          categoryName: categoryName ?? existing.categoryName,
          imageKey: row.imageKey,
          active: row.active,
          webPublished: row.webPublished,
          stockQty: row.stockQty ?? row.currentStock ?? existing.stockQty,
          packageVariant: row.packageVariant ?? existing.packageVariant,
          packageUnitsPerSale:
            row.packageUnitsPerSale ?? existing.packageUnitsPerSale,
          baseStockQty: row.baseStockQty ?? existing.baseStockQty,
        };
        return next;
      });
    },
    [categories],
  );

  const loadMoreCatalog = useCallback(async () => {
    if (listLast || listLoadingMore || listLoadingInitial || nextPageRef.current <= 0) return;
    setListLoadingMore(true);
    try {
      const pagen = nextPageRef.current;
      const page = await fetchItemsPage(debouncedSearch || undefined, {
        categoryId: filterCategoryId.trim() || undefined,
        includeCategoryDescendants,
        catalogScope,
        barcode: barcodeExact.trim() || undefined,
        noBarcode: filterNoBarcode,
        includeInactive: filterIncludeInactive,
        branchId: branchIdForStock,
        page: pagen,
        size: 80,
      });
      setListRows((prev) => [...prev, ...page.content]);
      setListLast(page.last);
      nextPageRef.current = page.last ? 0 : pagen + 1;
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Failed to load more.");
      }
    } finally {
      setListLoadingMore(false);
    }
  }, [listLast, listLoadingMore, listLoadingInitial, debouncedSearch, filterCategoryId, includeCategoryDescendants, catalogScope, barcodeExact, filterNoBarcode, filterIncludeInactive, branchIdForStock]);

  useEffect(() => {
    const fromRows = buildVariantIdsByParentId(listRows);
    setVariantIdsByParentId((prev) => {
      const next = { ...prev };
      for (const [parentId, ids] of fromRows) {
        const existing = next[parentId];
        if (!existing || ids.length >= existing.length) {
          next[parentId] = ids;
        }
      }
      return next;
    });
  }, [listRows]);

  const onToggleRowSelect = useCallback(
    async (id: string) => {
      const row = listRows.find((r) => r.id === id);
      if (!row) return;

      const localVariantIds = listRows
        .filter((r) => r.variantOfItemId?.trim() === id)
        .map((r) => r.id);
      const cachedVariantIds = variantIdsByParentId[id];
      const isGroupLabel = row.groupLabelOnly === true;
      const variantCount =
        cachedVariantIds?.length ?? localVariantIds.length;
      const isParentSelector = isCatalogParentSelectorRow(row, variantCount);

      let variantIds = cachedVariantIds ?? localVariantIds;
      if (isParentSelector) {
        variantIds = await resolveVariantIdsForParent(id, listRows);
        setVariantIdsByParentId((prev) => ({ ...prev, [id]: variantIds }));
      }

      setRowSelection((prev) => {
        if (!isParentSelector) {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }

        const targetIds = isGroupLabel ? variantIds : [id, ...variantIds];
        const allOn =
          targetIds.length > 0 && targetIds.every((tid) => prev.has(tid));
        const next = new Set(prev);
        if (allOn) {
          for (const tid of targetIds) next.delete(tid);
        } else {
          for (const tid of targetIds) next.add(tid);
        }
        return next;
      });
    },
    [listRows, variantIdsByParentId],
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setBarcodeExact("");
    setFilterCategoryId("");
    setCatalogScope("ALL");
    setIncludeCategoryDescendants(true);
    setFilterNoBarcode(false);
    setFilterIncludeInactive(false);
    setMessage("");
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    void loadCategoriesAndTypes().catch((error) => {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Failed to load categories.");
      }
    });
  }, [loadCategoriesAndTypes]);

  useEffect(() => {
    void refreshFullCatalog().catch((error) => {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Failed to load catalog.");
      }
    });
  }, [refreshFullCatalog]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = event.target;
      if (tag instanceof HTMLInputElement || tag instanceof HTMLTextAreaElement || tag instanceof HTMLSelectElement) return;
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        document.getElementById("catalog-omni")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return {
    itemTypes, categories, sortedCategories, categoryById,
    listRows: catalogRows,
    listRowsRaw: listRows,
    listTotalElements, listLast, listLoadingInitial, listLoadingMore,
    search, setSearch, debouncedSearch, setDebouncedSearch,
    filterCategoryId, setFilterCategoryId,
    includeCategoryDescendants, setIncludeCategoryDescendants,
    catalogScope, setCatalogScope,
    barcodeExact, setBarcodeExact,
    filterNoBarcode, setFilterNoBarcode,
    filterIncludeInactive, setFilterIncludeInactive,
    rowSelection, setRowSelection, onToggleRowSelect, variantIdsByParent,
    listDensity, setListDensity,
    message, setMessage,
    loadCategoriesAndTypes, refreshFullCatalog, syncListRowFromDetail, loadMoreCatalog, resetFilters,
  };
}

export type CatalogListApi = ReturnType<typeof useCatalogList>;
