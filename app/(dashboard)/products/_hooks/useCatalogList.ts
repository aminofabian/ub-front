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

export function useCatalogList() {
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
  const [listDensity, setListDensity] = useState<"comfortable" | "dense">("comfortable");
  const [message, setMessage] = useState("");

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
  }, [debouncedSearch, filterCategoryId, includeCategoryDescendants, catalogScope, barcodeExact, filterNoBarcode, filterIncludeInactive]);

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
  }, [listLast, listLoadingMore, listLoadingInitial, debouncedSearch, filterCategoryId, includeCategoryDescendants, catalogScope, barcodeExact, filterNoBarcode, filterIncludeInactive]);

  const onToggleRowSelect = useCallback((id: string) => {
    setRowSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
    listRows, listTotalElements, listLast, listLoadingInitial, listLoadingMore,
    search, setSearch, debouncedSearch, setDebouncedSearch,
    filterCategoryId, setFilterCategoryId,
    includeCategoryDescendants, setIncludeCategoryDescendants,
    catalogScope, setCatalogScope,
    barcodeExact, setBarcodeExact,
    filterNoBarcode, setFilterNoBarcode,
    filterIncludeInactive, setFilterIncludeInactive,
    rowSelection, setRowSelection, onToggleRowSelect,
    listDensity, setListDensity,
    message, setMessage,
    loadCategoriesAndTypes, refreshFullCatalog, loadMoreCatalog, resetFilters,
  };
}

export type CatalogListApi = ReturnType<typeof useCatalogList>;
