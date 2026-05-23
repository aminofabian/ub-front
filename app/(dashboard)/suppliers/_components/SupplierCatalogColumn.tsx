"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CornerDownRight,
  Layers,
  Link2,
  Package,
  Search,
  Tag,
  Zap,
  Pencil,
  Check,
  X,
} from "lucide-react";

import {
  fetchCategories,
  fetchItemById,
  fetchItemsPage,
  itemListThumbnailUrl,
  patchItemSupplierLink,
  type CategoryRecord,
  type CatalogListScope,
} from "@/lib/api";
import type { ItemSummaryRecord, SupplierItemLinkRecord, SupplierRecord } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";

import {
  nsdFieldLabel,
  nsdInput,
  nsdSelect,
  nsdTableHead,
  nsdTableRow,
  SupplyDrawerSection,
  SupplyEmptyState,
  SupplyLoadingInline,
  SupplyTableSkeleton,
  SupplyWorkflowRail,
} from "../../supplies/_components/new-supply-drawer-ui";

import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";
import { SupEmptyState, SupLoadingBlock, SupSection } from "./supplier-layout-primitives";
import {
  supCard,
  supChipActive,
  supChipIdle,
  supFieldLabel,
  supInput,
  supSectionCard,
  supSelect,
  supTableHead,
  supTableRow,
  supBtnPrimary,
  supKicker,
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
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditSku, setInlineEditSku] = useState("");
  const [inlineEditCost, setInlineEditCost] = useState("");
  const [inlineEditBusy, setInlineEditBusy] = useState(false);
  const [editLinkDrawerOpen, setEditLinkDrawerOpen] = useState(false);
  const [editLinkDrawerRow, setEditLinkDrawerRow] = useState<SupplierItemLinkRecord | null>(null);
  const [editLinkDrawerSku, setEditLinkDrawerSku] = useState("");
  const [editLinkDrawerCost, setEditLinkDrawerCost] = useState("");
  const [editLinkDrawerBusy, setEditLinkDrawerBusy] = useState(false);

  const loadGen = useRef(0);

  const linkedIds = useMemo(() => new Set(itemLinks.map((l) => l.itemId)), [itemLinks]);

  const sortedCategoryOptions = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [categories],
  );

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

  const startInlineEdit = (row: SupplierItemLinkRecord) => {
    setInlineEditId(row.id);
    setInlineEditSku(row.supplierSku ?? "");
    setInlineEditCost(row.defaultCostPrice != null ? String(row.defaultCostPrice) : "");
  };

  const cancelInlineEdit = () => {
    setInlineEditId(null);
    setInlineEditSku("");
    setInlineEditCost("");
  };

  const saveInlineEdit = async (row: SupplierItemLinkRecord) => {
    if (!canLinkProducts || inlineEditBusy) return;
    setInlineEditBusy(true);
    try {
      const costRaw = inlineEditCost.trim();
      let defaultCostPrice: number | undefined;
      if (costRaw.length > 0) {
        const n = Number(costRaw);
        if (!Number.isFinite(n) || n < 0) {
          return;
        }
        defaultCostPrice = n;
      }
      await patchItemSupplierLink(row.itemId, row.id, {
        supplierSku: inlineEditSku.trim() || undefined,
        defaultCostPrice,
      });
      setInlineEditId(null);
      setInlineEditSku("");
      setInlineEditCost("");
      onRefreshLinks?.();
    } catch {
      /* feedback from page if wired */
    } finally {
      setInlineEditBusy(false);
    }
  };

  const saveEditLinkDrawer = async () => {
    if (!editLinkDrawerRow || editLinkDrawerBusy) return;
    setEditLinkDrawerBusy(true);
    try {
      const costRaw = editLinkDrawerCost.trim();
      let defaultCostPrice: number | undefined;
      if (costRaw.length > 0) {
        const n = Number(costRaw);
        if (!Number.isFinite(n) || n < 0) {
          return;
        }
        defaultCostPrice = n;
      }
      await patchItemSupplierLink(editLinkDrawerRow.itemId, editLinkDrawerRow.id, {
        supplierSku: editLinkDrawerSku.trim() || undefined,
        defaultCostPrice,
      });
      setEditLinkDrawerOpen(false);
      setEditLinkDrawerRow(null);
      setEditLinkDrawerSku("");
      setEditLinkDrawerCost("");
      onRefreshLinks?.();
    } catch {
      /* feedback from page if wired */
    } finally {
      setEditLinkDrawerBusy(false);
    }
  };

  const catalogWorkflowSteps = useMemo(
    () => [
      { id: "filter", label: "Filter", done: catalogRows.length > 0 || debouncedCatalogSearch.length > 0 },
      { id: "select", label: "Select", done: selectedIds.size > 0 },
      { id: "link", label: "Link", done: false },
    ],
    [catalogRows.length, debouncedCatalogSearch, selectedIds.size],
  );

  function renderLinkPanel({ showSubmit }: { showSubmit: boolean }) {
    if (!canLinkProducts) {
      return null;
    }
    return (
      <SupplyDrawerSection
        title="Link to supplier"
        hint={
          selectedIds.size > 0
            ? `${selectedIds.size} product${selectedIds.size === 1 ? "" : "s"} selected`
            : "Select rows in the catalog, then set optional supplier SKU and cost."
        }
      >
        <form
          id="supplier-catalog-link-form"
          className="space-y-4"
          onSubmit={(e) => void onSubmitLink(e)}
        >
          <div className="space-y-3">
            <label className="flex flex-col gap-1.5">
              <span className={nsdFieldLabel}>Supplier SKU (optional)</span>
              <input
                className={nsdInput}
                value={linkSku}
                onChange={(e) => setLinkSku(e.target.value)}
                disabled={linksBusy}
                aria-label="Supplier SKU"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={nsdFieldLabel}>Default cost (optional)</span>
              <input
                className={cn(nsdInput, "tabular-nums")}
                inputMode="decimal"
                value={linkCostStr}
                onChange={(e) => setLinkCostStr(e.target.value)}
                disabled={linksBusy}
                aria-label="Default cost"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 rounded-sm border border-border"
                checked={linkPrimary}
                onChange={(e) => setLinkPrimary(e.target.checked)}
                disabled={selectedIds.size !== 1 || linksBusy}
              />
              Set as primary supplier (single selection only)
            </label>
          </div>
          {showSubmit ? (
            <Button
              type="submit"
              className={cn(supBtnPrimary, "w-full")}
              disabled={linksBusy || selectedIds.size === 0}
            >
              <Link2 className="size-4" aria-hidden />
              {linksBusy
                ? "Linking…"
                : selectedIds.size <= 1
                  ? "Link selected"
                  : `Link ${selectedIds.size} products`}
            </Button>
          ) : null}
        </form>
      </SupplyDrawerSection>
    );
  }

  function renderCatalogBrowser() {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-5">
        <SupplyWorkflowRail steps={catalogWorkflowSteps} />

        {catalogMeta ? (
          <p className="text-xs text-muted-foreground">
            <span className={supKicker}>Catalog</span>{" "}
            <span className="tabular-nums font-medium text-foreground">
              {catalogRows.length} of {catalogMeta.totalElements}
            </span>{" "}
            shown · already-linked SKUs hidden
          </p>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-5">
          <div className="flex min-h-0 flex-col gap-4">
            <SupplyDrawerSection
              step={1}
              title="Find products"
              hint="Search, filter by category, or change catalog scope."
            >
              {/* Category quick-filter chips */}
              {sortedCategoryOptions.length > 0 ? (
                <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFilterId("")}
                    className={cn(categoryFilterId === "" ? supChipActive : supChipIdle)}
                  >
                    All categories
                  </button>
                  {sortedCategoryOptions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setCategoryFilterId(categoryFilterId === c.id ? "" : c.id)
                      }
                      className={cn(categoryFilterId === c.id ? supChipActive : supChipIdle)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
                  <span className={nsdFieldLabel}>Search</span>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <input
                      className={cn(nsdInput, "pl-9")}
                      placeholder="Name, SKU, barcode…"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      aria-label="Filter catalog"
                    />
                  </div>
                </label>
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className={nsdFieldLabel}>Category</span>
                  <select
                    className={nsdSelect}
                value={categoryFilterId}
                onChange={(e) => setCategoryFilterId(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {sortedCategoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className={nsdFieldLabel}>Sort</span>
                  <select
                    className={nsdSelect}
                value={sortPreset}
                onChange={(e) => setSortPreset(e.target.value as CatalogSortPreset)}
                aria-label="Sort catalog"
              >
                <option value="name-asc">Name A→Z</option>
                <option value="name-desc">Name Z→A</option>
                <option value="sku-asc">SKU A→Z</option>
                <option value="sku-desc">SKU Z→A</option>
                <option value="category-asc">Category A→Z, then name</option>
                <option value="category-desc">Category Z→A, then name</option>
              </select>
            </label>
                <label className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                  <span className={nsdFieldLabel}>Scope</span>
                  <select
                    className={nsdSelect}
                value={catalogScope}
                onChange={(e) => setCatalogScope(e.target.value as CatalogListScope)}
                aria-label="Catalog list scope"
              >
                <option value="ALL">Full tree (default)</option>
                <option value="SKUS_ONLY">Sellable SKUs only</option>
                <option value="PARENTS_ONLY">Group labels only</option>
                <option value="VARIANTS_ONLY">Option SKUs only</option>
                  </select>
                </label>
              </div>
              {categoryFilterId ? (
                <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    className="size-4 rounded-sm border border-border"
                    checked={categoryIncludeDescendants}
                    onChange={(e) => setCategoryIncludeDescendants(e.target.checked)}
                  />
                  Include subcategories
                </label>
              ) : null}
            </SupplyDrawerSection>

            <SupplyDrawerSection
              step={2}
              title="Catalog"
              hint="Labels select all options below. Use quick link for one-off attaches."
              bodyClassName="flex min-h-0 flex-col p-0"
              className="flex min-h-[min(50vh,28rem)] flex-1 flex-col"
            >
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
                  className="m-4 border-0"
                />
              ) : (
            <>
              <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-muted/35 px-3 py-2 text-[10px] leading-snug text-muted-foreground">
                <span className="font-bold uppercase tracking-[0.12em] text-foreground/80">Legend</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-1 rounded-sm bg-amber-500 shadow-sm dark:bg-amber-400" aria-hidden />
                  <span>
                    <span className="font-semibold text-amber-950 dark:text-amber-100">Label</span> — selects all
                    options below
                  </span>
                </span>
                <span className="text-muted-foreground/60">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-1 rounded-sm bg-emerald-600 shadow-sm dark:bg-emerald-500" aria-hidden />
                  <span>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">Standalone</span>
                  </span>
                </span>
                <span className="text-muted-foreground/60">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <CornerDownRight className="size-3.5 shrink-0 text-violet-500/85 dark:text-violet-400/90" aria-hidden />
                  <span>
                    <span className="font-semibold text-violet-900 dark:text-violet-200">Option</span>
                  </span>
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className={cn("sticky top-0 z-10", nsdTableHead)}>
                  <tr>
                    {canLinkProducts ? (
                      <th className="w-10 px-3 py-2.5 font-semibold">
                        <input
                          type="checkbox"
                          className="size-3.5 rounded border-input"
                          checked={allLinkableSelected}
                          onChange={() => toggleSelectAllOnPage()}
                          disabled={linksBusy || linkableOnPage.length === 0}
                          title="Select all on this page (not already linked)"
                          aria-label="Select all linkable on page"
                        />
                      </th>
                    ) : (
                      <th className="w-8 px-3 py-2.5 font-semibold" />
                    )}
                    <th className="px-3 py-2.5 font-semibold">Product</th>
                    <th className="px-3 py-2.5 font-semibold">SKU</th>
                    <th className="px-3 py-2.5 font-semibold">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogRows.map((row) => {
                    const thumb = itemListThumbnailUrl(row);
                    const linked = linkedIds.has(row.id);
                    const isGroupLabel = row.groupLabelOnly === true;
                    const isVariant = Boolean(row.variantOfItemId);
                    const catLabel =
                      row.categoryName?.trim() ||
                      sortedCategoryOptions.find((c) => c.id === row.categoryId)?.name ||
                      (row.categoryId ? row.categoryId.slice(0, 8) + "…" : "—");
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
                              "border-l-[3px] border-l-violet-500/70 bg-gradient-to-r from-violet-500/[0.11] via-violet-500/[0.04] to-transparent",
                              "dark:border-l-violet-400/75 dark:from-violet-500/[0.14] dark:via-violet-950/25 dark:to-transparent",
                            )
                          : isGroupLabel ?
                            cn(
                              "border-l-[3px] border-l-amber-500/70 bg-gradient-to-r from-amber-500/[0.12] via-amber-500/[0.05] to-transparent",
                              "dark:border-l-amber-400/65 dark:from-amber-500/[0.14] dark:via-amber-950/20",
                            )
                          : cn(
                              "border-l-[3px] border-l-emerald-600/65 bg-emerald-500/[0.05] dark:border-l-emerald-500/55 dark:bg-emerald-500/[0.08]",
                            ),
                          linked && "bg-muted/25 text-muted-foreground",
                          rowSelectionHighlight && "bg-primary/[0.06] ring-1 ring-inset ring-primary/20",
                        )}
                      >
                        {canLinkProducts ? (
                          <td className="px-3 py-2.5 align-middle">
                            <input
                              type="checkbox"
                              className="rounded border-input"
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
                          <td className="px-3 py-2.5" />
                        )}
                        <td className="px-3 py-2.5">
                          <div className="flex items-start gap-2">
                            {thumb ? (
                              <span className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-lg border bg-muted">
                                <Image src={thumb} alt="" width={36} height={36} className="object-cover" />
                              </span>
                            ) : (
                              <span className="mt-0.5 h-9 w-9 shrink-0 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30" />
                            )}
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  "flex flex-wrap items-center gap-x-1.5 gap-y-0.5",
                                  isVariant ? "items-start" : "items-center",
                                )}
                              >
                                {isVariant ? (
                                  <span
                                    className="relative mt-0.5 flex shrink-0 text-violet-500/70 dark:text-violet-400/85"
                                    aria-hidden
                                  >
                                    <CornerDownRight className="size-3.5 drop-shadow-[0_0_6px_rgba(139,92,246,0.25)]" />
                                  </span>
                                ) : null}
                                {isVariant ? (
                                  <Layers
                                    className="mt-0.5 size-3.5 shrink-0 text-violet-600 dark:text-violet-400"
                                    aria-hidden
                                  />
                                ) : isGroupLabel ? (
                                  <Tag className="size-3.5 shrink-0 text-amber-800 dark:text-amber-200" aria-hidden />
                                ) : (
                                  <Package
                                    className="size-3.5 shrink-0 text-emerald-700 dark:text-emerald-400"
                                    aria-hidden
                                  />
                                )}
                                {isVariant ? (
                                  <span className="mt-0.5 shrink-0 rounded-md bg-violet-500/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-violet-950 ring-1 ring-violet-500/35 dark:text-violet-100 dark:ring-violet-400/30">
                                    Option
                                  </span>
                                ) : isGroupLabel ? (
                                  <span className="shrink-0 rounded-md bg-amber-500/25 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-950 ring-1 ring-amber-600/30 dark:text-amber-50 dark:ring-amber-400/40">
                                    Label
                                  </span>
                                ) : (
                                  <span className="shrink-0 rounded-md bg-emerald-500/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-950 ring-1 ring-emerald-600/30 dark:text-emerald-50 dark:ring-emerald-400/35">
                                    Standalone
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "min-w-0 font-medium leading-snug text-foreground",
                                    isVariant ? "mt-0.5 text-[13px]" : "",
                                  )}
                                >
                                  {itemCatalogDisplayTitle(row)}
                                </span>
                                {linked ? (
                                  <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-800 dark:text-emerald-300">
                                    Linked
                                  </span>
                                ) : canLinkProducts ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-6 gap-1 rounded-full px-2 text-[10px] font-semibold"
                                    disabled={quickLinkIds.has(row.id) || linksBusy}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void doQuickLink(row.id);
                                    }}
                                  >
                                    {quickLinkIds.has(row.id) ? (
                                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary/60" />
                                    ) : (
                                      <Zap className="size-3" />
                                    )}
                                    Quick link
                                  </Button>
                                ) : null}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top font-mono text-[11px] text-muted-foreground">
                          {row.sku || "—"}
                        </td>
                        <td className="max-w-[10rem] truncate px-3 py-2.5 align-top text-muted-foreground">
                          {catLabel}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              {catalogMeta && !catalogMeta.last ? (
                <div className="shrink-0 border-t border-border bg-muted/20 px-4 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg font-medium"
                    disabled={catalogLoadingMore || catalogLoading}
                    onClick={() => void loadMore()}
                  >
                    {catalogLoadingMore ? "Loading…" : "Load more results"}
                  </Button>
                </div>
              ) : null}
                </>
              )}
            </SupplyDrawerSection>
          </div>

          {renderLinkPanel({ showSubmit: true })}
        </div>

        {canLinkProducts ? (
          <>
            {/* Edit existing link drawer */}
            <FormDrawer
              open={editLinkDrawerOpen}
              onOpenChange={(open) => {
                setEditLinkDrawerOpen(open);
                if (!open) {
                  setEditLinkDrawerRow(null);
                  setEditLinkDrawerSku("");
                  setEditLinkDrawerCost("");
                }
              }}
              title="Edit supplier link"
              description={`Update supplier SKU and default cost for ${editLinkDrawerRow?.itemName || "this product"}.`}
              contextLabel="Link details"
              icon={<Pencil className="size-5 text-primary" aria-hidden />}
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
              <div className="space-y-4">
                <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
                  <span className={supFieldLabel}>Supplier SKU</span>
                  <input
                    className={supInput}
                    value={editLinkDrawerSku}
                    onChange={(e) => setEditLinkDrawerSku(e.target.value)}
                    placeholder="Vendor's SKU for this product"
                    aria-label="Supplier SKU"
                  />
                </label>
                <label className="flex min-w-[9rem] flex-col gap-1.5">
                  <span className={supFieldLabel}>Default cost</span>
                  <input
                    className={cn(supInput, "w-full max-w-[10rem] tabular-nums")}
                    inputMode="decimal"
                    value={editLinkDrawerCost}
                    onChange={(e) => setEditLinkDrawerCost(e.target.value)}
                    placeholder="0.00"
                    aria-label="Default cost"
                  />
                </label>
              </div>
            </FormDrawer>
          </>
        ) : (
          <p className="shrink-0 border-t border-border/50 bg-muted/10 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Permission required.</span>{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
              {Permission.CatalogItemsLinkSuppliers}
            </code>{" "}
            to link products from this workspace.
          </p>
        )}
      </div>
    );
  }

  if (!detail) {
    return (
      <SupEmptyState
        icon={Link2}
        title="Select a supplier"
        description="Choose a vendor from the directory to manage linked products and browse your catalog."
        className="min-h-[14rem]"
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
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              {Permission.CatalogItemsRead}
            </code>{" "}
            to view or manage product links.
          </>
        }
      />
    );
  }

  const linkableOnPage = catalogRows.filter((r) => !linkedIds.has(r.id));
  const allLinkableSelected =
    linkableOnPage.length > 0 && linkableOnPage.every((r) => selectedIds.has(r.id));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <SupSection
        title="Linked products"
        hint="SKUs tied to this vendor — set primary supplier and default cost per item."
        action={
          itemLinks.length > 0 ? (
            <span className="rounded-md bg-muted/50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground ring-1 ring-border/50">
              {itemLinks.length}
            </span>
          ) : null
        }
        bodyClassName="p-0 sm:p-0"
      >
        {itemLinks.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-5">
            No linked products yet. Browse the catalog below to attach items.
          </p>
        ) : (
          <div className="overflow-x-auto border-t border-border/45">
            <table className="w-full text-left text-xs">
              <thead className={supTableHead}>
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Product</th>
                  <th className="px-3 py-2.5 font-semibold">SKU</th>
                  <th className="px-3 py-2.5 font-semibold">Primary</th>
                  <th className="px-3 py-2.5 font-semibold">Supplier SKU</th>
                  <th className="px-3 py-2.5 font-semibold">Default cost</th>
                  {canLinkProducts ? <th className="px-3 py-2.5 font-semibold">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {itemLinks.map((row) => {
                  const isEditing = inlineEditId === row.id;
                  return (
                    <tr key={row.id} className={supTableRow}>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-foreground">{row.itemName || row.itemId}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{row.sku || "—"}</td>
                      <td className="px-3 py-2.5">
                        {row.primary ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            Primary
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <input
                            className={cn(supInput, "h-8 w-32 text-xs")}
                            value={inlineEditSku}
                            onChange={(e) => setInlineEditSku(e.target.value)}
                            placeholder="Supplier SKU"
                            aria-label="Supplier SKU"
                          />
                        ) : (
                          <span className="font-mono text-[11px]">{row.supplierSku ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <input
                            className={cn(supInput, "h-8 w-24 text-xs tabular-nums")}
                            inputMode="decimal"
                            value={inlineEditCost}
                            onChange={(e) => setInlineEditCost(e.target.value)}
                            placeholder="0.00"
                            aria-label="Default cost"
                          />
                        ) : (
                          <span className="tabular-nums">
                            {row.defaultCostPrice != null && row.defaultCostPrice !== ""
                              ? String(row.defaultCostPrice)
                              : "—"}
                          </span>
                        )}
                      </td>
                      {canLinkProducts ? (
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <div className="flex flex-wrap gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 gap-1 text-[11px]"
                                disabled={inlineEditBusy}
                                onClick={() => void saveInlineEdit(row)}
                              >
                                <Check className="size-3" /> Save
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px]"
                                disabled={inlineEditBusy}
                                onClick={cancelInlineEdit}
                              >
                                <X className="size-3" /> Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground"
                                title="Edit link"
                                onClick={() => startInlineEdit(row)}
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] font-medium"
                                disabled={linksBusy || row.primary || !row.active}
                                onClick={() => void onSetPrimaryLink(row)}
                              >
                                Set primary
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px] font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={linksBusy}
                                onClick={() => void onRemoveLink(row)}
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SupSection>

      <div
        className={cn(
          supCard,
          "flex shrink-0 flex-col gap-3 bg-gradient-to-br from-violet-500/[0.04] via-card to-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
        )}
      >
        <div>
          <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground">
            Link more products
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Search your full catalog, filter by category, and attach SKUs in bulk.
          </p>
        </div>
        <Button
          type="button"
          className="h-10 shrink-0 gap-2 rounded-lg px-5 font-semibold shadow-sm transition-shadow hover:shadow-md"
          onClick={() => setCatalogBrowserOpen(true)}
        >
          <Link2 className="size-4" aria-hidden />
          Browse catalog
        </Button>
      </div>
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
        title="Browse catalog"
        description={
          detail ?
            `Link products to ${detail.name}. Filter your catalog, select rows, then attach in one step.`
          : "Find products and link them to this supplier."
        }
        contextLabel="Supplier links"
        icon={<Link2 className="size-5 text-violet-600 dark:text-violet-400" aria-hidden />}
        width="half"
        appearance="sharp"
        banner={
          linkFormError && catalogBrowserOpen ?
            <FormDrawerMessageBanner text={linkFormError} sharp />
          : undefined
        }
        footer={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              {canLinkProducts ? (
                <>
                  <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                    {selectedIds.size}
                  </span>{" "}
                  selected
                  {catalogMeta ?
                    ` · ${catalogRows.length} of ${catalogMeta.totalElements} visible`
                  : null}
                </>
              ) : (
                "Browse only — linking requires permission."
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg px-4"
                onClick={() => setCatalogBrowserOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {renderCatalogBrowser()}
        </div>
      </FormDrawer>
    </div>
  );
}
