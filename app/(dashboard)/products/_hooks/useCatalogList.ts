"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiRequestError,
  fetchCatalogListStats,
  fetchCategories,
  fetchItemsPage,
  fetchItemTypes,
  type CatalogListScope,
  type CatalogRowType,
  type CategoryRecord,
  type ItemSummaryRecord,
  type ItemTypeRecord,
} from "@/lib/api";
import {
  buildVariantIdsByParentId,
  CATALOG_LIST_DISPLAY_TYPES,
  isCatalogParentSelectorRow,
  resolveVariantIdsForParent,
  sortCatalogRowsParentFirst,
  type CatalogListDisplayType,
} from "../_components/catalog-list-styles";
import {
  findCatalogLetterIndex,
  type CatalogLetterKey,
} from "../_components/catalog-letter-index";

const DISPLAY_TYPE_TO_API: Record<CatalogListDisplayType, CatalogRowType> = {
  parent: "PARENT",
  variant: "VARIANT",
  standalone: "STANDALONE",
};

function catalogRowTypesForApi(
  filter: ReadonlySet<CatalogListDisplayType>,
): CatalogRowType[] | null | undefined {
  if (filter.size === 0) return null;
  if (filter.size === CATALOG_LIST_DISPLAY_TYPES.length) return undefined;
  return CATALOG_LIST_DISPLAY_TYPES.filter((t) => filter.has(t)).map(
    (t) => DISPLAY_TYPE_TO_API[t],
  );
}

export function useCatalogList(
  catalogBranchId?: string | null,
  catalogItemTypeId?: string | null,
) {
  const branchIdForStock = catalogBranchId?.trim() || undefined;
  const itemTypeIdForList = catalogItemTypeId?.trim() || undefined;
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
  const [filterInactiveOnly, setFilterInactiveOnly] = useState(false);
  const [filterNoPrice, setFilterNoPrice] = useState(false);
  const [filterZeroStock, setFilterZeroStock] = useState(false);
  const [filterLowStock, setFilterLowStock] = useState(false);

  const [rowSelection, setRowSelection] = useState<Set<string>>(() => new Set());
  const [variantIdsByParentId, setVariantIdsByParentId] = useState<
    Record<string, string[]>
  >({});
  const [listDensity, setListDensity] = useState<"comfortable" | "dense">("dense");
  const [message, setMessage] = useState("");
  const [rowTypeFilter, setRowTypeFilter] = useState<
    Set<CatalogListDisplayType>
  >(() => new Set(CATALOG_LIST_DISPLAY_TYPES));
  const [catalogStats, setCatalogStats] = useState({
    parents: 0,
    variants: 0,
    standalones: 0,
    missingBarcode: 0,
    inactive: 0,
    missingPrice: 0,
    zeroStock: 0,
    lowStock: 0,
  });
  const [letterJumpBusy, setLetterJumpBusy] = useState(false);

  const listRowsRef = useRef(listRows);
  listRowsRef.current = listRows;
  const listLastRef = useRef(listLast);
  listLastRef.current = listLast;
  const letterJumpInFlightRef = useRef(false);

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
  const catalogRowsRef = useRef(catalogRows);
  catalogRowsRef.current = catalogRows;

  const rowTypeFilterActive =
    rowTypeFilter.size > 0 && rowTypeFilter.size < CATALOG_LIST_DISPLAY_TYPES.length;

  const attentionFiltersActive =
    filterNoBarcode ||
    filterInactiveOnly ||
    filterNoPrice ||
    filterZeroStock ||
    filterLowStock;

  const stockFiltersNeedBranch =
    (filterZeroStock || filterLowStock) && !branchIdForStock;

  const listStatsOpts = useMemo(
    () => ({
      categoryId: filterCategoryId.trim() || undefined,
      includeCategoryDescendants,
      catalogScope,
      barcode: barcodeExact.trim() || undefined,
      branchId: branchIdForStock,
      // Typed search should find the product even if it was created under a
      // different department than the header scope (common for POS quick-create).
      itemTypeId: debouncedSearch.trim() ? undefined : itemTypeIdForList,
    }),
    [
      filterCategoryId,
      includeCategoryDescendants,
      catalogScope,
      barcodeExact,
      branchIdForStock,
      itemTypeIdForList,
      debouncedSearch,
    ],
  );

  const listFetchOpts = useMemo(
    () => ({
      ...listStatsOpts,
      noBarcode: filterNoBarcode,
      inactiveOnly: filterInactiveOnly,
      noPrice: filterNoPrice,
      zeroStock: filterZeroStock && !!branchIdForStock,
      lowStock: filterLowStock && !!branchIdForStock,
    }),
    [
      listStatsOpts,
      filterNoBarcode,
      filterInactiveOnly,
      filterNoPrice,
      filterZeroStock,
      filterLowStock,
      branchIdForStock,
    ],
  );

  const toggleRowTypeFilter = useCallback((type: CatalogListDisplayType) => {
    setRowTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

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
    const rowTypes = catalogRowTypesForApi(rowTypeFilter);
    try {
      if (rowTypes === null) {
        setListRows([]);
        setListTotalElements(0);
        setListLast(true);
        setRowSelection(new Set());
      } else {
        const page = await fetchItemsPage(debouncedSearch || undefined, {
          ...listFetchOpts,
          catalogRowTypes: rowTypes,
          page: 0,
          size: 80,
        });
        setListRows(page.content);
        setListTotalElements(page.totalElements);
        setListLast(page.last);
        nextPageRef.current = page.last ? 0 : 1;
        setRowSelection(new Set());
      }
      const stats = await fetchCatalogListStats(debouncedSearch || undefined, listStatsOpts);
      setCatalogStats(stats);
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Failed to load catalog.");
      }
    } finally {
      setListLoadingInitial(false);
    }
  }, [debouncedSearch, listFetchOpts, listStatsOpts, rowTypeFilter]);

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
          stockQty: row.stockQty ?? existing.stockQty,
          bundlePrice: row.bundlePrice ?? existing.bundlePrice,
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
    const rowTypes = catalogRowTypesForApi(rowTypeFilter);
    if (rowTypes === null) return;
    setListLoadingMore(true);
    try {
      const pagen = nextPageRef.current;
      const page = await fetchItemsPage(debouncedSearch || undefined, {
        ...listFetchOpts,
        catalogRowTypes: rowTypes,
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
  }, [listLast, listLoadingMore, listLoadingInitial, debouncedSearch, listFetchOpts, rowTypeFilter]);

  /**
   * Ensure rows for `letter` are loaded (paging ahead if needed), then return
   * the display-list index to scroll to. Returns -1 when the letter has no rows.
   */
  const jumpToLetter = useCallback(
    async (letter: CatalogLetterKey): Promise<number> => {
      const locate = () =>
        findCatalogLetterIndex(catalogRowsRef.current, letter);

      let index = locate();
      if (index >= 0) return index;
      if (letterJumpInFlightRef.current) return -1;

      const rowTypes = catalogRowTypesForApi(rowTypeFilter);
      if (rowTypes === null) return -1;

      letterJumpInFlightRef.current = true;
      setLetterJumpBusy(true);
      try {
        // Keep the same page size as normal paging so Spring offsets stay aligned.
        while (index < 0 && !listLastRef.current && nextPageRef.current > 0) {
          const pagen = nextPageRef.current;
          const page = await fetchItemsPage(debouncedSearch || undefined, {
            ...listFetchOpts,
            catalogRowTypes: rowTypes,
            page: pagen,
            size: 80,
          });
          const merged = [...listRowsRef.current, ...page.content];
          listRowsRef.current = merged;
          setListRows(merged);
          setListLast(page.last);
          listLastRef.current = page.last;
          nextPageRef.current = page.last ? 0 : pagen + 1;
          // Keep catalogRowsRef in sync before the next React render.
          catalogRowsRef.current = sortCatalogRowsParentFirst(merged);
          index = locate();
        }
        return index;
      } catch (error) {
        if (!(error instanceof ApiRequestError)) {
          setMessage(
            error instanceof Error ? error.message : "Failed to jump to letter.",
          );
        }
        return -1;
      } finally {
        letterJumpInFlightRef.current = false;
        setLetterJumpBusy(false);
      }
    },
    [debouncedSearch, listFetchOpts, rowTypeFilter],
  );

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
    setFilterInactiveOnly(false);
    setFilterNoPrice(false);
    setFilterZeroStock(false);
    setFilterLowStock(false);
    setRowTypeFilter(new Set(CATALOG_LIST_DISPLAY_TYPES));
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

  const rowTypeCounts = useMemo(
    () => ({
      parent: catalogStats.parents,
      variant: catalogStats.variants,
      standalone: catalogStats.standalones,
    }),
    [catalogStats],
  );

  return {
    itemTypes, categories, sortedCategories, categoryById,
    listRows: catalogRows,
    displayRows: catalogRows,
    listRowsRaw: listRows,
    catalogStats,
    rowTypeCounts,
    rowTypeFilter,
    rowTypeFilterActive,
    attentionFiltersActive,
    stockFiltersNeedBranch,
    toggleRowTypeFilter,
    setRowTypeFilter,
    listTotalElements, listLast, listLoadingInitial, listLoadingMore,
    letterJumpBusy,
    search, setSearch, debouncedSearch, setDebouncedSearch,
    filterCategoryId, setFilterCategoryId,
    includeCategoryDescendants, setIncludeCategoryDescendants,
    catalogScope, setCatalogScope,
    barcodeExact, setBarcodeExact,
    filterNoBarcode, setFilterNoBarcode,
    filterInactiveOnly, setFilterInactiveOnly,
    filterNoPrice, setFilterNoPrice,
    filterZeroStock, setFilterZeroStock,
    filterLowStock, setFilterLowStock,
    rowSelection, setRowSelection, onToggleRowSelect, variantIdsByParent,
    listDensity, setListDensity,
    message, setMessage,
    loadCategoriesAndTypes, refreshFullCatalog, syncListRowFromDetail, loadMoreCatalog, jumpToLetter, resetFilters,
  };
}

export type CatalogListApi = ReturnType<typeof useCatalogList>;
