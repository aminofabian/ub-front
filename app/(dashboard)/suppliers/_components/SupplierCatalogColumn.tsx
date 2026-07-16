"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CornerDownRight,
  Link2,
  Package,
  Search,
  Tag,
  Zap,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";

import {
  fetchCategories,
  fetchItemById,
  fetchItemsPage,
  patchItemSupplierLink,
  type CategoryRecord,
  type CatalogListScope,
} from "@/lib/api";
import type { ItemSummaryRecord, SupplierItemLinkRecord, SupplierRecord } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";

import {
  nsdInput,
  nsdSelect,
  nsdTableHead,
  SupplyEmptyState,
  SupplyLoadingInline,
  SupplyTableSkeleton,
} from "../../supplies/_components/new-supply-drawer-ui";

import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";
import { sortCatalogRowsParentFirst } from "../../products/_components/catalog-list-styles";
import { SupEmptyState, SupSection } from "./supplier-layout-primitives";
import {
  canAdminEditSupplierLinkStock,
  SupplierLinkStockCell,
} from "./SupplierLinkStockCell";
import {
  supChipActive,
  supChipIdle,
  supFieldLabel,
  supInput,
  supTableHead,
  supTableRow,
} from "./supplier-ui-tokens";

const CATALOG_PAGE_SIZE = 50;

type CatalogSortPreset =
  | "name-asc"
  | "name-desc"
  | "sku-asc"
  | "sku-desc"
  | "category-asc"
  | "category-desc";

function sortsForPreset(preset: CatalogSortPreset): Array<{ property: string; direction: "asc" | "desc" }> {
  switch (preset) {
    case "name-asc":
      return [
        { property: "name", direction: "asc" },
        { property: "sku", direction: "asc" },
      ];
    case "name-desc":
      return [
        { property: "name", direction: "desc" },
        { property: "sku", direction: "desc" },
      ];
    case "sku-asc":
      return [{ property: "sku", direction: "asc" }];
    case "sku-desc":
      return [{ property: "sku", direction: "desc" }];
    case "category-asc":
      return [
        { property: "categoryId", direction: "asc" },
        { property: "name", direction: "asc" },
        { property: "sku", direction: "asc" },
      ];
    case "category-desc":
      return [
        { property: "categoryId", direction: "desc" },
        { property: "name", direction: "desc" },
        { property: "sku", direction: "desc" },
      ];
    default:
      return [
        { property: "name", direction: "asc" },
        { property: "sku", direction: "asc" },
      ];
  }
}

function collectVariantIdsUnderParent(
  parentId: string,
  catalogRows: ItemSummaryRecord[],
  cache: Record<string, string[]>,
): string[] {
  const cached = cache[parentId];
  if (cached !== undefined) {
    return cached;
  }
  const ids: string[] = [];
  for (const r of catalogRows) {
    if (r.variantOfItemId === parentId) {
      ids.push(r.id);
    }
  }
  return ids;
}

export function SupplierCatalogColumn({
  detail,
  canReadCatalog,
  canLinkProducts,
  itemLinks,
  linksBusy,
  onRemoveLink,
  onSetPrimaryLink,
  onLinkCatalogItems,
  onRefreshLinks,
}: {
  detail: SupplierRecord | null;
  canReadCatalog: boolean;
  canLinkProducts: boolean;
  itemLinks: SupplierItemLinkRecord[];
  linksBusy: boolean;
  onRemoveLink: (row: SupplierItemLinkRecord) => void;
  onSetPrimaryLink: (row: SupplierItemLinkRecord) => void;
  onLinkCatalogItems: (
    itemIds: string[],
    opts: { supplierSku?: string; defaultCostPrice?: number; setPrimaryForFirst?: boolean },
  ) => Promise<void>;
  onRefreshLinks?: () => void;
}) {
  // Scope the product picker to the department chosen in the app header.
  const { branchId: headerBranchId, itemTypeId: headerItemTypeId, me } =
    useDashboard();
  const scopedBranchId = headerBranchId?.trim() || undefined;
  const scopedItemTypeId = headerItemTypeId?.trim() || undefined;
  const canEditLinkStock = canAdminEditSupplierLinkStock(me);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState("");
  const [categoryFilterId, setCategoryFilterId] = useState("");
  const [categoryIncludeDescendants, setCategoryIncludeDescendants] = useState(true);
  const [sortPreset, setSortPreset] = useState<CatalogSortPreset>("name-asc");
  const [catalogScope, setCatalogScope] = useState<CatalogListScope>("ALL");
  const [catalogRows, setCatalogRows] = useState<ItemSummaryRecord[]>([]);
  const [catalogMeta, setCatalogMeta] = useState<{
    last: boolean;
    totalElements: number;
    number: number;
  } | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoadingMore, setCatalogLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  /** Variant item ids under each group label (parent id), from item detail — used for select-all / unselect-all. */
  const [variantIdsByParentId, setVariantIdsByParentId] = useState<Record<string, string[]>>({});
  const [groupLabelFetchParentId, setGroupLabelFetchParentId] = useState<string | null>(null);
  const [linkSku, setLinkSku] = useState("");
  const [linkCostStr, setLinkCostStr] = useState("");
  const [linkPrimary, setLinkPrimary] = useState(false);
  const [catalogBrowserOpen, setCatalogBrowserOpen] = useState(false);
  const [linkFormError, setLinkFormError] = useState<string | null>(null);
  const [quickLinkIds, setQuickLinkIds] = useState<Set<string>>(() => new Set());
  const [editLinkDrawerOpen, setEditLinkDrawerOpen] = useState(false);
  const [editLinkDrawerRow, setEditLinkDrawerRow] = useState<SupplierItemLinkRecord | null>(null);
  const [editLinkDrawerSku, setEditLinkDrawerSku] = useState("");
  const [editLinkDrawerCost, setEditLinkDrawerCost] = useState("");
  const [editLinkDrawerPackUnit, setEditLinkDrawerPackUnit] = useState("");
  const [editLinkDrawerPackSize, setEditLinkDrawerPackSize] = useState("");
  const [editLinkDrawerBusy, setEditLinkDrawerBusy] = useState(false);
  const [editLinkDrawerError, setEditLinkDrawerError] = useState<string | null>(null);

  const loadGen = useRef(0);

  const linkedIds = useMemo(() => new Set(itemLinks.map((l) => l.itemId)), [itemLinks]);

  const sortedCategoryOptions = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [categories],
  );

  const displayCatalogRows = useMemo(
    () => sortCatalogRowsParentFirst(catalogRows),
    [catalogRows],
  );

  const linkableOnPage = displayCatalogRows.filter((r) => !linkedIds.has(r.id));
  const allLinkableSelected =
    linkableOnPage.length > 0 && linkableOnPage.every((r) => selectedIds.has(r.id));

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedCatalogSearch(catalogSearch.trim()), 320);
    return () => window.clearTimeout(id);
  }, [catalogSearch]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedCatalogSearch, categoryFilterId, categoryIncludeDescendants, sortPreset, catalogScope]);

  useEffect(() => {
    if (!canReadCatalog) {
      return;
    }
    let cancelled = false;
    fetchCategories()
      .then((list) => {
        if (!cancelled) {
          setCategories(list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canReadCatalog]);

  const supplierId = detail?.id;

  useEffect(() => {
    setSelectedIds(new Set());
    setLinkSku("");
    setLinkCostStr("");
    setLinkPrimary(false);
    setCatalogSearch("");
    setDebouncedCatalogSearch("");
    setCategoryFilterId("");
    setCatalogScope("ALL");
    setSortPreset("name-asc");
    setVariantIdsByParentId({});
  }, [supplierId]);

  useEffect(() => {
    if (!supplierId || !canReadCatalog) {
      setCatalogRows([]);
      setCatalogMeta(null);
      return;
    }
    const gen = ++loadGen.current;
    setCatalogLoading(true);
    const search = debouncedCatalogSearch.length > 0 ? debouncedCatalogSearch : undefined;
    const cat = categoryFilterId.trim();
    fetchItemsPage(search, {
      page: 0,
      size: CATALOG_PAGE_SIZE,
      ...(cat ? { categoryId: cat, includeCategoryDescendants: categoryIncludeDescendants } : {}),
      catalogScope,
      excludeLinkedSupplierId: supplierId,
      sort: sortsForPreset(sortPreset),
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      ...(scopedItemTypeId ? { itemTypeId: scopedItemTypeId } : {}),
    })
      .then((page) => {
        if (gen !== loadGen.current) {
          return;
        }
        setCatalogRows(page.content);
        setCatalogMeta({
          last: page.last,
          totalElements: page.totalElements,
          number: page.number,
        });
      })
      .catch(() => {
        if (gen !== loadGen.current) {
          return;
        }
        setCatalogRows([]);
        setCatalogMeta(null);
      })
      .finally(() => {
        if (gen === loadGen.current) {
          setCatalogLoading(false);
        }
      });
  }, [
    supplierId,
    canReadCatalog,
    debouncedCatalogSearch,
    categoryFilterId,
    categoryIncludeDescendants,
    sortPreset,
    catalogScope,
    scopedBranchId,
    scopedItemTypeId,
  ]);

  const loadMore = useCallback(async () => {
    if (!supplierId || !canReadCatalog || !catalogMeta || catalogMeta.last || catalogLoadingMore) {
      return;
    }
    const nextPage = catalogMeta.number + 1;
    const gen = loadGen.current;
    setCatalogLoadingMore(true);
    try {
      const search = debouncedCatalogSearch.length > 0 ? debouncedCatalogSearch : undefined;
      const cat = categoryFilterId.trim();
      const page = await fetchItemsPage(search, {
        page: nextPage,
        size: CATALOG_PAGE_SIZE,
        ...(cat ? { categoryId: cat, includeCategoryDescendants: categoryIncludeDescendants } : {}),
        catalogScope,
        excludeLinkedSupplierId: supplierId,
        sort: sortsForPreset(sortPreset),
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
        ...(scopedItemTypeId ? { itemTypeId: scopedItemTypeId } : {}),
      });
      if (gen !== loadGen.current) {
        return;
      }
      setCatalogRows((prev) => [...prev, ...page.content]);
      setCatalogMeta({
        last: page.last,
        totalElements: page.totalElements,
        number: page.number,
      });
    } catch {
      if (gen === loadGen.current) {
        /* keep existing rows */
      }
    } finally {
      if (gen === loadGen.current) {
        setCatalogLoadingMore(false);
      }
    }
  }, [
    supplierId,
    canReadCatalog,
    catalogMeta,
    catalogLoadingMore,
    debouncedCatalogSearch,
    categoryFilterId,
    categoryIncludeDescendants,
    sortPreset,
    catalogScope,
    scopedBranchId,
    scopedItemTypeId,
  ]);

  const toggleRow = (itemId: string) => {
    if (linkedIds.has(itemId)) {
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleGroupLabelRow = useCallback(
    async (parentId: string) => {
      if (linksBusy) {
        return;
      }
      setGroupLabelFetchParentId(parentId);
      try {
        let ids = variantIdsByParentId[parentId];
        if (ids === undefined) {
          const detail = await fetchItemById(parentId);
          ids = (detail.variants ?? []).map((v) => v.id);
          setVariantIdsByParentId((prev) => ({ ...prev, [parentId]: ids }));
        }
        setSelectedIds((prev) => {
          const next = new Set(prev);
          const selectable = ids.filter((id) => !linkedIds.has(id));
          const allOn =
            selectable.length > 0 && selectable.every((variantId) => next.has(variantId));
          if (allOn) {
            for (const vid of ids) {
              next.delete(vid);
            }
          } else {
            for (const vid of selectable) {
              next.add(vid);
            }
          }
          return next;
        });
      } catch {
        /* keep selection; item may be unavailable */
      } finally {
        setGroupLabelFetchParentId((cur) => (cur === parentId ? null : cur));
      }
    },
    [linksBusy, linkedIds, variantIdsByParentId],
  );

  const toggleSelectAllOnPage = () => {
    const linkable = catalogRows.filter((r) => !linkedIds.has(r.id)).map((r) => r.id);
    if (linkable.length === 0) {
      return;
    }
    const allOn = linkable.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOn) {
        linkable.forEach((id) => next.delete(id));
      } else {
        linkable.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const onSubmitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkFormError(null);
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !canLinkProducts) {
      return;
    }
    let defaultCostPrice: number | undefined;
    const costRaw = linkCostStr.trim();
    if (costRaw.length > 0) {
      const n = Number(costRaw);
      if (!Number.isFinite(n) || n < 0) {
        setLinkFormError("Default cost must be a valid non-negative number.");
        return;
      }
      defaultCostPrice = n;
    }
    const setPrimaryForFirst = linkPrimary && ids.length === 1;
    try {
      await onLinkCatalogItems(ids, {
        supplierSku: linkSku.trim() || undefined,
        defaultCostPrice,
        setPrimaryForFirst,
      });
      setSelectedIds(new Set());
      setLinkSku("");
      setLinkCostStr("");
      setLinkPrimary(false);
      setCatalogBrowserOpen(false);
    } catch {
      /* feedback from page */
    }
  };

  const doQuickLink = async (itemId: string) => {
    if (!canLinkProducts || linkedIds.has(itemId)) return;
    setQuickLinkIds((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
    try {
      await onLinkCatalogItems([itemId], {});
    } catch {
      /* feedback from page */
    } finally {
      setQuickLinkIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const openEditLinkDrawer = (row: SupplierItemLinkRecord) => {
    setEditLinkDrawerRow(row);
    setEditLinkDrawerSku(row.supplierSku ?? "");
    setEditLinkDrawerCost(
      row.defaultCostPrice != null ? String(row.defaultCostPrice) : "",
    );
    setEditLinkDrawerPackUnit(row.packUnit ?? "");
    setEditLinkDrawerPackSize(
      row.packSize != null ? String(row.packSize) : "",
    );
    setEditLinkDrawerError(null);
    setEditLinkDrawerOpen(true);
  };

  const saveEditLinkDrawer = async () => {
    if (!editLinkDrawerRow || editLinkDrawerBusy) return;
    setEditLinkDrawerError(null);
    setEditLinkDrawerBusy(true);
    try {
      const costRaw = editLinkDrawerCost.trim();
      let defaultCostPrice: number | undefined;
      if (costRaw.length > 0) {
        const n = Number(costRaw);
        if (!Number.isFinite(n) || n < 0) {
          setEditLinkDrawerError("Default cost must be a valid non-negative number.");
          return;
        }
        defaultCostPrice = n;
      }
      const packUnitRaw = editLinkDrawerPackUnit.trim();
      const packSizeRaw = editLinkDrawerPackSize.trim();
      let packSize: number | undefined;
      if (packSizeRaw.length > 0) {
        const n = Number(packSizeRaw);
        if (!Number.isFinite(n) || n <= 0) {
          setEditLinkDrawerError("Pack size must be a valid positive number.");
          return;
        }
        packSize = n;
      }
      await patchItemSupplierLink(editLinkDrawerRow.itemId, editLinkDrawerRow.id, {
        supplierSku: editLinkDrawerSku.trim() || undefined,
        defaultCostPrice,
        packUnit: packUnitRaw || undefined,
        packSize,
      });
      setEditLinkDrawerOpen(false);
      setEditLinkDrawerRow(null);
      setEditLinkDrawerSku("");
      setEditLinkDrawerCost("");
      setEditLinkDrawerPackUnit("");
      setEditLinkDrawerPackSize("");
      onRefreshLinks?.();
    } catch {
      /* feedback from page if wired */
    } finally {
      setEditLinkDrawerBusy(false);
    }
  };

  function renderCatalogLinkFooter() {
    if (!canLinkProducts) {
      return (
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Browse only — linking requires permission.</p>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg px-4"
            onClick={() => setCatalogBrowserOpen(false)}
          >
            Close
          </Button>
        </div>
      );
    }

    return (
      <form
        id="supplier-catalog-link-form"
        className="flex w-full flex-col gap-1.5"
        onSubmit={(e) => void onSubmitLink(e)}
      >
        {selectedIds.size > 0 ? (
          <details className="group text-xs">
            <summary className="cursor-pointer list-none text-muted-foreground [&::-webkit-details-marker]:hidden">
              <span className="underline-offset-2 group-open:underline">Optional: SKU &amp; cost</span>
            </summary>
            <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
              <input
                className={cn(nsdInput, "h-8 text-xs")}
                value={linkSku}
                onChange={(e) => setLinkSku(e.target.value)}
                disabled={linksBusy}
                placeholder="Supplier SKU"
                aria-label="Supplier SKU"
              />
              <input
                className={cn(nsdInput, "h-8 text-xs tabular-nums")}
                inputMode="decimal"
                value={linkCostStr}
                onChange={(e) => setLinkCostStr(e.target.value)}
                disabled={linksBusy}
                placeholder="Default cost"
                aria-label="Default cost"
              />
              {selectedIds.size === 1 ? (
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground sm:col-span-2">
                  <input
                    type="checkbox"
                    className="size-3 rounded-sm border border-border"
                    checked={linkPrimary}
                    onChange={(e) => setLinkPrimary(e.target.checked)}
                    disabled={linksBusy}
                  />
                  Primary supplier
                </label>
              ) : null}
            </div>
          </details>
        ) : null}

        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            <span className="font-mono text-sm font-bold tabular-nums text-foreground">
              {selectedIds.size}
            </span>{" "}
            selected
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg px-3 text-xs"
            onClick={() => setCatalogBrowserOpen(false)}
          >
            Close
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-8 shrink-0 gap-1 rounded-lg px-3 text-xs font-semibold"
            disabled={linksBusy || selectedIds.size === 0}
          >
            <Link2 className="size-3" aria-hidden />
            {linksBusy ? "…" : selectedIds.size <= 1 ? "Link" : `Link ${selectedIds.size}`}
          </Button>
        </div>
      </form>
    );
  }

  function renderCatalogBrowser() {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 space-y-1 border-b border-border bg-muted/15 px-2 py-1.5">
          {sortedCategoryOptions.length > 0 ? (
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setCategoryFilterId("")}
                className={cn(categoryFilterId === "" ? supChipActive : supChipIdle, "shrink-0 px-2 py-0.5 text-xs")}
              >
                All
              </button>
              {sortedCategoryOptions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setCategoryFilterId(categoryFilterId === c.id ? "" : c.id)
                  }
                  className={cn(categoryFilterId === c.id ? supChipActive : supChipIdle, "shrink-0 px-2 py-0.5 text-xs")}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative min-w-[7rem] max-w-[12rem] flex-1">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                className={cn(nsdInput, "h-8 pl-7 text-xs")}
                placeholder="Search…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                aria-label="Search catalog"
              />
            </div>
            <select
              className={cn(nsdSelect, "h-8 w-[6.75rem] shrink-0 text-xs")}
              value={sortPreset}
              onChange={(e) => setSortPreset(e.target.value as CatalogSortPreset)}
              aria-label="Sort catalog"
            >
              <option value="name-asc">A→Z</option>
              <option value="name-desc">Z→A</option>
              <option value="sku-asc">SKU ↑</option>
              <option value="sku-desc">SKU ↓</option>
              <option value="category-asc">Cat ↑</option>
              <option value="category-desc">Cat ↓</option>
            </select>
            <select
              className={cn(nsdSelect, "h-8 w-[7rem] shrink-0 text-xs")}
              value={catalogScope}
              onChange={(e) => setCatalogScope(e.target.value as CatalogListScope)}
              aria-label="Catalog scope"
            >
              <option value="ALL">All</option>
              <option value="SKUS_ONLY">SKUs</option>
              <option value="PARENTS_ONLY">Labels</option>
              <option value="VARIANTS_ONLY">Options</option>
            </select>
            {categoryFilterId ? (
              <label className="flex shrink-0 cursor-pointer items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-3 rounded-sm border border-border"
                  checked={categoryIncludeDescendants}
                  onChange={(e) => setCategoryIncludeDescendants(e.target.checked)}
                />
                +sub
              </label>
            ) : null}
            {catalogMeta ? (
              <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                {catalogRows.length}/{catalogMeta.totalElements}
              </span>
            ) : null}
          </div>
        </div>

        {catalogLoading && catalogRows.length === 0 ? (
                <>
                  <SupplyLoadingInline label="Loading catalog…" />
                  <SupplyTableSkeleton rows={6} />
                </>
              ) : catalogRows.length === 0 ? (
                <SupplyEmptyState
                  icon={Package}
                  title="No products match"
                  description="Widen search, reset category, or switch catalog scope."
                  className="m-2 border-0 py-6"
                />
              ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className={cn("sticky top-0 z-10", nsdTableHead)}>
                  <tr>
                    {canLinkProducts ? (
                      <th className="w-8 px-1.5 py-1.5 font-semibold">
                        <input
                          type="checkbox"
                          className="size-3 rounded border-input"
                          checked={allLinkableSelected}
                          onChange={() => toggleSelectAllOnPage()}
                          disabled={linksBusy || linkableOnPage.length === 0}
                          title="Select all on this page (not already linked)"
                          aria-label="Select all linkable on page"
                        />
                      </th>
                    ) : (
                      <th className="w-6 px-1.5 py-1.5 font-semibold" />
                    )}
                    <th className="px-1.5 py-1.5 font-semibold">Product</th>
                    <th className="hidden px-2 py-1.5 font-semibold md:table-cell">SKU</th>
                    {canLinkProducts ? (
                      <th className="w-10 px-1 py-1.5 font-semibold" />
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {displayCatalogRows.map((row) => {
                    const linked = linkedIds.has(row.id);
                    const isGroupLabel = row.groupLabelOnly === true;
                    const isVariant = Boolean(row.variantOfItemId);
                    const ariaForSelect =
                      isVariant ?
                        `Select option ${row.sku}: ${itemCatalogDisplayTitle(row)}`
                      : isGroupLabel ?
                        `Select all option SKUs under group ${row.sku}: ${row.name}`
                      : `Select standalone ${row.sku}: ${row.name}`;
                    const variantIdsUnderLabel = isGroupLabel
                      ? collectVariantIdsUnderParent(row.id, catalogRows, variantIdsByParentId)
                      : [];
                    const selectableUnderLabel = isGroupLabel
                      ? variantIdsUnderLabel.filter((id) => !linkedIds.has(id))
                      : [];
                    const groupLabelAllOn =
                      isGroupLabel &&
                      selectableUnderLabel.length > 0 &&
                      selectableUnderLabel.every((vid) => selectedIds.has(vid));
                    const groupLabelSomeOn =
                      isGroupLabel &&
                      selectableUnderLabel.some((vid) => selectedIds.has(vid)) &&
                      !groupLabelAllOn;
                    const rowSelectionHighlight =
                      !linked &&
                      (selectedIds.has(row.id) ||
                        (isGroupLabel && selectableUnderLabel.some((vid) => selectedIds.has(vid))));
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          supTableRow,
                          isVariant ?
                            cn(
                              "border-l-[3px] border-l-primary/70 bg-gradient-to-r from-primary/[0.11] via-primary/[0.04] to-transparent",
                            )
                          : isGroupLabel ?
                            cn(
                              "border-l-[3px] border-l-primary/50 bg-gradient-to-r from-primary/[0.10] via-primary/[0.04] to-transparent",
                            )
                          : cn(
                              "border-l-[3px] border-l-primary/40 bg-primary/[0.05]",
                            ),
                          linked && "bg-muted/25 text-muted-foreground",
                          rowSelectionHighlight && "bg-primary/[0.06] ring-1 ring-inset ring-primary/20",
                        )}
                      >
                        {canLinkProducts ? (
                          <td className="px-1.5 py-1 align-middle">
                            <input
                              type="checkbox"
                              className="size-3 rounded border-input"
                              ref={(el) => {
                                if (!el) {
                                  return;
                                }
                                if (isGroupLabel) {
                                  el.indeterminate = groupLabelSomeOn;
                                } else {
                                  el.indeterminate = false;
                                }
                              }}
                              checked={isGroupLabel ? groupLabelAllOn : selectedIds.has(row.id)}
                              disabled={
                                linksBusy ||
                                linked ||
                                (isGroupLabel &&
                                  (groupLabelFetchParentId === row.id || selectableUnderLabel.length === 0))
                              }
                              title={
                                isGroupLabel ?
                                  "Select or clear every option SKU in this group (loads the full variant list once)."
                                : undefined
                              }
                              onChange={() =>
                                isGroupLabel ? void toggleGroupLabelRow(row.id) : toggleRow(row.id)
                              }
                              aria-label={ariaForSelect}
                            />
                          </td>
                        ) : (
                          <td className="px-1.5 py-1" />
                        )}
                        <td className="px-1.5 py-1">
                          <div className="flex min-w-0 items-center gap-1">
                            {isVariant ? (
                              <CornerDownRight className="size-3 shrink-0 text-primary/85" aria-hidden />
                            ) : isGroupLabel ? (
                              <Tag className="size-3 shrink-0 text-primary/75" aria-hidden />
                            ) : (
                              <Package className="size-3 shrink-0 text-primary" aria-hidden />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium leading-tight text-foreground">
                                {itemCatalogDisplayTitle(row)}
                              </span>
                              {row.sku?.trim() ? (
                                <span className="block truncate font-mono text-xs text-muted-foreground md:hidden">
                                  {row.sku.trim()}
                                </span>
                              ) : null}
                            </span>
                            {linked ? (
                              <span className="shrink-0 text-xs font-semibold uppercase text-primary">
                                ✓
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="hidden max-w-[8rem] truncate px-2 py-1 font-mono text-xs text-muted-foreground md:table-cell">
                          {row.sku || "—"}
                        </td>
                        {canLinkProducts ? (
                          <td className="px-1 py-1 align-middle">
                            {!linked ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                disabled={quickLinkIds.has(row.id) || linksBusy}
                                title="Quick link"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void doQuickLink(row.id);
                                }}
                              >
                                {quickLinkIds.has(row.id) ? (
                                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary/60" />
                                ) : (
                                  <Zap className="size-3.5" />
                                )}
                              </Button>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        {catalogMeta && !catalogMeta.last && catalogRows.length > 0 ? (
          <div className="shrink-0 border-t border-border px-2 py-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 w-full rounded-lg text-xs"
              disabled={catalogLoadingMore || catalogLoading}
              onClick={() => void loadMore()}
            >
              {catalogLoadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (!detail) {
    return (
      <SupEmptyState
        icon={Link2}
        title="Select a supplier"
        description="Pick a vendor to link products and manage catalog relationships."
        className="min-h-[14rem] border-0 bg-transparent"
      />
    );
  }

  if (!canReadCatalog) {
    return (
      <SupEmptyState
        icon={Package}
        title="Catalog access required"
        description={
          <>
            Your role needs{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {Permission.CatalogItemsRead}
            </code>{" "}
            to view or manage product links.
          </>
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
      <SupSection
        compact
        title="Linked"
        action={
          <div className="flex items-center gap-1">
            {itemLinks.length > 0 ? (
              <span className="rounded bg-muted/50 px-1 py-px text-xs font-semibold tabular-nums text-muted-foreground ring-1 ring-border/50">
                {itemLinks.length}
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="h-6 gap-0.5 rounded-md px-1.5 text-xs font-semibold"
              onClick={() => setCatalogBrowserOpen(true)}
            >
              <Link2 className="size-2.5" aria-hidden />
              Browse
            </Button>
          </div>
        }
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      >
        {itemLinks.length === 0 ? (
          <p className="px-2 py-3 text-center text-sm text-muted-foreground">
            No links yet. Browse to attach products.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <table className="w-full border-collapse text-left text-xs">
              <thead className={cn("sticky top-0 z-10", supTableHead)}>
                <tr>
                  <th className="border border-border px-1.5 py-1 font-semibold">
                    Product
                  </th>
                  <th className="w-[4.25rem] border border-border px-1.5 py-1 text-right font-semibold">
                    Stock
                  </th>
                  <th className="w-20 border border-border px-1.5 py-1 text-right font-semibold">
                    Cost
                  </th>
                  {canLinkProducts ? (
                    <th className="w-[4.5rem] border border-border px-1.5 py-1 text-right font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {itemLinks.map((row) => (
                  <tr key={row.id} className={supTableRow}>
                    <td className="max-w-0 border border-border/70 px-1.5 py-0.5">
                      <div className="flex min-w-0 items-center gap-1">
                        <span
                          className="truncate font-medium text-foreground"
                          title={row.itemName || row.itemId}
                        >
                          {row.itemName || row.itemId}
                        </span>
                        {row.primary ? (
                          <span
                            className="shrink-0 border border-primary/25 bg-primary/10 px-1 py-px text-[8px] font-bold uppercase text-primary"
                            title="Primary supplier for this product"
                          >
                            1°
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="border border-border/70 px-1.5 py-0.5 text-right align-middle">
                      <SupplierLinkStockCell
                        link={row}
                        branchId={scopedBranchId}
                        canEdit={canEditLinkStock}
                        disabled={linksBusy}
                        onUpdated={() => onRefreshLinks?.()}
                      />
                    </td>
                    <td className="border border-border/70 px-1.5 py-0.5 text-right font-mono tabular-nums text-muted-foreground">
                      {row.defaultCostPrice != null && row.defaultCostPrice !== ""
                        ? String(row.defaultCostPrice)
                        : "—"}
                    </td>
                    {canLinkProducts ? (
                      <td className="border border-border/70 px-1.5 py-0.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="size-6 rounded-none p-0 text-muted-foreground"
                            title="Edit link"
                            onClick={() => openEditLinkDrawer(row)}
                          >
                            <Pencil className="size-3" aria-hidden />
                            <span className="sr-only">Edit</span>
                          </Button>
                          {!row.primary ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-6 rounded-none p-0 text-muted-foreground"
                              title="Set as primary supplier"
                              disabled={linksBusy || !row.active}
                              onClick={() => void onSetPrimaryLink(row)}
                            >
                              <Star className="size-3" aria-hidden />
                              <span className="sr-only">Set primary</span>
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="size-6 rounded-none p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Remove link"
                            disabled={linksBusy}
                            onClick={() => void onRemoveLink(row)}
                          >
                            <Trash2 className="size-3" aria-hidden />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SupSection>

      {canLinkProducts ? (
        <FormDrawer
          open={editLinkDrawerOpen}
          onOpenChange={(open) => {
            setEditLinkDrawerOpen(open);
            if (!open) {
              setEditLinkDrawerRow(null);
              setEditLinkDrawerSku("");
              setEditLinkDrawerCost("");
              setEditLinkDrawerPackUnit("");
              setEditLinkDrawerPackSize("");
              setEditLinkDrawerError(null);
            }
          }}
          title="Edit supplier link"
          description={`Update supplier SKU, cost, and purchase unit for ${editLinkDrawerRow?.itemName || "this product"}.`}
          contextLabel="Link details"
          icon={<Pencil className="size-5 text-primary" aria-hidden />}
          banner={
            editLinkDrawerError ? (
              <FormDrawerMessageBanner text={editLinkDrawerError} sharp />
            ) : undefined
          }
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditLinkDrawerOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={editLinkDrawerBusy}
                onClick={() => void saveEditLinkDrawer()}
              >
                {editLinkDrawerBusy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={supFieldLabel}>Supplier SKU</span>
              <input
                className={supInput}
                value={editLinkDrawerSku}
                onChange={(e) => setEditLinkDrawerSku(e.target.value)}
                placeholder="Vendor's SKU for this product"
                aria-label="Supplier SKU"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={supFieldLabel}>Default cost</span>
              <input
                className={cn(supInput, "tabular-nums")}
                inputMode="decimal"
                value={editLinkDrawerCost}
                onChange={(e) => setEditLinkDrawerCost(e.target.value)}
                placeholder="0.00"
                aria-label="Default cost"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={supFieldLabel}>Purchase unit</span>
              <input
                className={supInput}
                value={editLinkDrawerPackUnit}
                onChange={(e) => setEditLinkDrawerPackUnit(e.target.value)}
                placeholder="e.g. crate, kg"
                aria-label="Purchase unit"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={supFieldLabel}>Stock per unit</span>
              <input
                className={cn(supInput, "tabular-nums")}
                inputMode="decimal"
                value={editLinkDrawerPackSize}
                onChange={(e) => setEditLinkDrawerPackSize(e.target.value)}
                placeholder="e.g. 25 (kg per crate)"
                aria-label="Stock per purchase unit"
              />
            </label>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            When set, receiving uses this conversion (e.g. 2 crates × 25 kg = 50 kg stock).
          </p>
        </FormDrawer>
      ) : null}
      <FormDrawer
        open={catalogBrowserOpen}
        onOpenChange={(open) => {
          setCatalogBrowserOpen(open);
          if (!open) {
            setSelectedIds(new Set());
            setLinkSku("");
            setLinkCostStr("");
            setLinkPrimary(false);
            setLinkFormError(null);
          }
        }}
        title={detail ? `Link · ${detail.name}` : "Browse catalog"}
        contextLabel={detail?.name ? undefined : "Supplier links"}
        width="large"
        appearance="sharp"
        banner={
          linkFormError && catalogBrowserOpen ?
            <FormDrawerMessageBanner text={linkFormError} sharp />
          : undefined
        }
        footer={renderCatalogLinkFooter()}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {renderCatalogBrowser()}
        </div>
      </FormDrawer>
    </div>
  );
}
