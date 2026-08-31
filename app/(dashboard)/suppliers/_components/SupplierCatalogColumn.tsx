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
  ArrowRight,
} from "lucide-react";

import {
  createItemPackOption,
  deleteItemPackOption,
  fetchCategories,
  fetchItemById,
  fetchItemPackOptions,
  fetchItemsPage,
  fetchSuppliers,
  patchItemPackOption,
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

import { joinProductNameParts } from "@/lib/catalog-display";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";
import { SupplierDisplayName } from "@/components/suppliers/supplier-display-name";
import {
  displaySupplierName,
  isSystemUnassignedSupplier,
} from "@/lib/supplier-display";
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

/** Prefer link default, then last purchase, then catalog buying price. */
function resolveLinkDisplayCost(link: SupplierItemLinkRecord): {
  value: number;
  source: "default" | "last" | "catalog";
} | null {
  const candidates: Array<{
    raw: number | string | null | undefined;
    source: "default" | "last" | "catalog";
  }> = [
    { raw: link.defaultCostPrice, source: "default" },
    { raw: link.lastCostPrice, source: "last" },
    { raw: link.catalogBuyingPrice, source: "catalog" },
  ];
  for (const { raw, source } of candidates) {
    if (raw == null || String(raw).trim() === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) {
      return { value: n, source };
    }
  }
  return null;
}

function formatLinkCost(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function resolveLinkShelfPrice(
  link: SupplierItemLinkRecord,
): number | null {
  const raw = link.catalogShelfPrice;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function resolveLinkPack(
  link: SupplierItemLinkRecord,
): { size: number; unit: string } | null {
  const size = Number(link.packSize);
  if (!Number.isFinite(size) || size <= 1) return null;
  const unit = (link.packUnit ?? "pcs").trim() || "pcs";
  return { size, unit };
}

function fmtPackSize(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/** Editable pack row in the edit-link drawer; {@code id} is null for unsaved rows. */
type PackOptionDraft = {
  id: string | null;
  unitsPerPack: string;
  packUnit: string;
  label: string;
  defaultPackPrice: string;
  sortOrder: number;
};

function packDraftEqual(a: PackOptionDraft, b: PackOptionDraft): boolean {
  return (
    a.unitsPerPack === b.unitsPerPack &&
    a.packUnit === b.packUnit &&
    a.label === b.label &&
    a.defaultPackPrice === b.defaultPackPrice &&
    a.sortOrder === b.sortOrder
  );
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
  onMoveUnassignedItems,
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
  /** Bulk-assign items out of the "Suppliers Not Linked" bucket to a real supplier. */
  onMoveUnassignedItems: (itemIds: string[], targetSupplierId: string) => Promise<void>;
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
  const [editLinkDrawerBusy, setEditLinkDrawerBusy] = useState(false);
  const [editLinkDrawerError, setEditLinkDrawerError] = useState<string | null>(null);
  /** Pack shapes being edited for the drawer's item (saved + unsaved rows). */
  const [editLinkPacks, setEditLinkPacks] = useState<PackOptionDraft[]>([]);
  /** Original saved drafts by option id — used to diff adds/edits/removals on save. */
  const [editLinkPacksOriginals, setEditLinkPacksOriginals] = useState<
    Record<string, PackOptionDraft>
  >({});
  /** "Suppliers Not Linked" bucket — items can be bulk-moved to a real supplier. */
  const [supplierChoices, setSupplierChoices] = useState<SupplierRecord[]>([]);
  const [moveTargetSupplierId, setMoveTargetSupplierId] = useState("");
  const [moveSelectedIds, setMoveSelectedIds] = useState<Set<string>>(() => new Set());
  const [moveFormError, setMoveFormError] = useState<string | null>(null);

  const loadGen = useRef(0);

  const isUnassignedBucket = isSystemUnassignedSupplier({
    code: detail?.code,
    name: detail?.name,
  });

  const linkedIds = useMemo(() => new Set(itemLinks.map((l) => l.itemId)), [itemLinks]);
  const allMoveSelected =
    itemLinks.length > 0 && itemLinks.every((l) => moveSelectedIds.has(l.itemId));

  const sortedCategoryOptions = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [categories],
  );

  const displayCatalogRows = useMemo(
    () => sortCatalogRowsParentFirst(catalogRows),
    [catalogRows],
  );

  const linkableOnPage = displayCatalogRows.filter(
    (r) => !r.groupLabelOnly && !linkedIds.has(r.id),
  );
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
    setMoveSelectedIds(new Set());
    setMoveTargetSupplierId("");
    setMoveFormError(null);
  }, [supplierId]);

  // Target supplier choices for the unassigned bucket (real suppliers only).
  useEffect(() => {
    if (!isUnassignedBucket || !canLinkProducts) {
      setSupplierChoices([]);
      return;
    }
    let cancelled = false;
    fetchSuppliers()
      .then((list) => {
        if (!cancelled) {
          setSupplierChoices(list.filter((s) => !isSystemUnassignedSupplier(s)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSupplierChoices([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isUnassignedBucket, canLinkProducts]);

  useEffect(() => {
    if (!supplierId || !canReadCatalog || isUnassignedBucket) {
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
    isUnassignedBucket,
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
    const linkable = catalogRows
      .filter((r) => !r.groupLabelOnly && !linkedIds.has(r.id))
      .map((r) => r.id);
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

  const toggleMoveRow = (itemId: string) => {
    setMoveSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleMoveAll = () => {
    setMoveSelectedIds((prev) => {
      const allOn = itemLinks.length > 0 && itemLinks.every((l) => prev.has(l.itemId));
      return allOn ? new Set() : new Set(itemLinks.map((l) => l.itemId));
    });
  };

  const onSubmitMove = async () => {
    setMoveFormError(null);
    const ids = Array.from(moveSelectedIds);
    if (ids.length === 0 || !moveTargetSupplierId.trim()) {
      setMoveFormError("Choose a supplier and select at least one item.");
      return;
    }
    try {
      await onMoveUnassignedItems(ids, moveTargetSupplierId);
      setMoveSelectedIds(new Set());
      setMoveTargetSupplierId("");
    } catch {
      /* feedback from page */
    }
  };

  const openEditLinkDrawer = async (row: SupplierItemLinkRecord) => {
    setEditLinkDrawerRow(row);
    setEditLinkDrawerSku(row.supplierSku ?? "");
    const cost = resolveLinkDisplayCost(row);
    setEditLinkDrawerCost(cost != null ? String(cost.value) : "");
    setEditLinkDrawerError(null);
    setEditLinkPacks([]);
    setEditLinkPacksOriginals({});
    setEditLinkDrawerOpen(true);
    try {
      const options = await fetchItemPackOptions(row.itemId);
      const drafts: PackOptionDraft[] = options.map((o, index) => ({
        id: o.id,
        unitsPerPack: String(o.unitsPerPack),
        packUnit: o.packUnit,
        label: o.label ?? "",
        defaultPackPrice:
          o.defaultPackPrice != null ? String(o.defaultPackPrice) : "",
        sortOrder: index,
      }));
      setEditLinkPacks(drafts);
      setEditLinkPacksOriginals(
        Object.fromEntries(drafts.map((d) => [d.id!, d])),
      );
    } catch {
      /* item has no saved packs (or fetch failed) — drawer opens with empty list */
    }
  };

  const patchPackDraft = (index: number, patch: Partial<PackOptionDraft>) => {
    setEditLinkPacks((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    );
  };

  const movePackDraft = (index: number, delta: -1 | 1) => {
    setEditLinkPacks((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const moved = next[index]!;
      next[index] = next[target]!;
      next[target] = moved;
      return next.map((d, i) => ({ ...d, sortOrder: i }));
    });
  };

  const removePackDraft = (index: number) => {
    setEditLinkPacks((prev) =>
      prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, sortOrder: i })),
    );
  };

  const addPackDraft = () => {
    setEditLinkPacks((prev) => [
      ...prev,
      {
        id: null,
        unitsPerPack: "",
        packUnit: "pack",
        label: "",
        defaultPackPrice: "",
        sortOrder: prev.length,
      },
    ]);
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
      for (const d of editLinkPacks) {
        const size = Number(d.unitsPerPack);
        if (d.unitsPerPack.trim() === "" || !Number.isFinite(size) || size <= 1) {
          setEditLinkDrawerError("Each pack size must be more than 1 piece.");
          return;
        }
        if (d.packUnit.trim() === "") {
          setEditLinkDrawerError("Each pack needs a unit label (e.g. pack, tray).");
          return;
        }
        const priceRaw = d.defaultPackPrice.trim();
        if (priceRaw !== "" && (!Number.isFinite(Number(priceRaw)) || Number(priceRaw) < 0)) {
          setEditLinkDrawerError("Pack price must be 0 or more.");
          return;
        }
      }

      const originals = editLinkPacksOriginals;
      const removed = Object.values(originals).filter(
        (o) => !editLinkPacks.some((d) => d.id === o.id),
      );
      const added = editLinkPacks.filter((d) => d.id == null);
      const changed = editLinkPacks.filter(
        (d) => d.id != null && !packDraftEqual(originals[d.id!]!, d),
      );

      const itemId = editLinkDrawerRow.itemId;
      await Promise.all([
        ...added.map((d) =>
          createItemPackOption(itemId, {
            packUnit: d.packUnit.trim(),
            unitsPerPack: Number(d.unitsPerPack),
            label: d.label.trim() || null,
            defaultPackPrice:
              d.defaultPackPrice.trim() !== ""
                ? Number(d.defaultPackPrice)
                : null,
            sortOrder: d.sortOrder,
          }),
        ),
        ...changed.map((d) =>
          patchItemPackOption(itemId, d.id!, {
            packUnit: d.packUnit.trim(),
            unitsPerPack: Number(d.unitsPerPack),
            label: d.label.trim() || null,
            defaultPackPrice:
              d.defaultPackPrice.trim() !== ""
                ? Number(d.defaultPackPrice)
                : null,
            sortOrder: d.sortOrder,
          }),
        ),
        ...removed.map((o) => deleteItemPackOption(itemId, o.id!)),
      ]);

      // Legacy read-through scalars stay in sync with the smallest active pack.
      const smallest = [...editLinkPacks].sort(
        (a, b) => Number(a.unitsPerPack) - Number(b.unitsPerPack),
      )[0];
      await patchItemSupplierLink(itemId, editLinkDrawerRow.id, {
        supplierSku: editLinkDrawerSku.trim() || undefined,
        defaultCostPrice,
        packUnit: smallest ? smallest.packUnit.trim() || undefined : undefined,
        packSize: smallest ? Number(smallest.unitsPerPack) : undefined,
      });
      setEditLinkDrawerOpen(false);
      setEditLinkDrawerRow(null);
      setEditLinkDrawerSku("");
      setEditLinkDrawerCost("");
      setEditLinkPacks([]);
      setEditLinkPacksOriginals({});
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
                            {!linked && !isGroupLabel ? (
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
        title={isUnassignedBucket ? "Unassigned items" : "Linked"}
        action={
          <div className="flex items-center gap-1">
            {itemLinks.length > 0 ? (
              <span className="rounded bg-muted/50 px-1 py-px text-xs font-semibold tabular-nums text-muted-foreground ring-1 ring-border/50">
                {itemLinks.length}
              </span>
            ) : null}
            {!isUnassignedBucket ? (
              <Button
                type="button"
                size="sm"
                className="h-6 gap-0.5 rounded-md bg-[var(--order-ink,#15231f)] px-1.5 text-xs font-semibold text-white shadow-none hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_88%,#000)]"
                onClick={() => setCatalogBrowserOpen(true)}
              >
                <Link2 className="size-2.5" aria-hidden />
                Browse
              </Button>
            ) : null}
          </div>
        }
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      >
        {itemLinks.length === 0 ? (
          <p className="px-2 py-3 text-center text-sm text-muted-foreground">
            {isUnassignedBucket
              ? "No unassigned items — every product has a real supplier."
              : "No links yet. Browse to attach products."}
          </p>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <table className="w-full border-collapse text-left text-xs">
                <thead className={cn("sticky top-0 z-10", supTableHead)}>
                  <tr>
                    {isUnassignedBucket && canLinkProducts ? (
                      <th className="w-8 border border-border px-1.5 py-1 font-semibold">
                        <input
                          type="checkbox"
                          className="size-3 rounded-sm border border-border"
                          checked={allMoveSelected}
                          onChange={toggleMoveAll}
                          disabled={linksBusy}
                          title="Select all unassigned items"
                          aria-label="Select all unassigned items"
                        />
                      </th>
                    ) : null}
                    <th className="border border-border px-1.5 py-1 font-semibold">
                      Product
                    </th>
                  <th className="w-[4.25rem] border border-border px-1.5 py-1 text-right font-semibold">
                    Stock
                  </th>
                  <th
                    className="w-[4.5rem] border border-border px-1.5 py-1 text-right font-semibold"
                    title="Supplier default cost, else last purchase, else catalog buying price"
                  >
                    Cost
                  </th>
                  <th
                    className="w-[4.5rem] border border-border px-1.5 py-1 text-right font-semibold"
                    title="Catalog shelf / sell price"
                  >
                    Sell
                  </th>
                  {canLinkProducts ? (
                    <th className="w-[4.5rem] border border-border px-1.5 py-1 text-right font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {[...itemLinks]
                  .sort((a, b) => {
                    const ap = (a.parentItemName || a.itemName || "").toLowerCase();
                    const bp = (b.parentItemName || b.itemName || "").toLowerCase();
                    if (ap !== bp) return ap.localeCompare(bp);
                    return (a.itemName || "").localeCompare(b.itemName || "");
                  })
                  .map((row) => {
                    const pack = resolveLinkPack(row);
                    const packs = row.packs && row.packs.length > 0 ? row.packs : null;
                    const sell = resolveLinkShelfPrice(row);
                    return (
                  <tr key={row.id} className={supTableRow}>
                    {isUnassignedBucket && canLinkProducts ? (
                      <td className="border border-border/70 px-1.5 py-0.5 align-middle">
                        <input
                          type="checkbox"
                          className="size-3 rounded-sm border border-border"
                          checked={moveSelectedIds.has(row.itemId)}
                          onChange={() => toggleMoveRow(row.itemId)}
                          disabled={linksBusy}
                          aria-label={`Select ${row.itemName || row.itemId}`}
                        />
                      </td>
                    ) : null}
                    <td className="max-w-0 border border-border/70 px-1.5 py-0.5">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex min-w-0 items-center gap-1">
                          {row.variantOfItemId ? (
                            <CornerDownRight
                              className="size-3 shrink-0 text-primary/70"
                              aria-hidden
                            />
                          ) : null}
                          {packs ? (
                            <span
                              className="inline-flex shrink-0 items-center gap-1 border border-amber-900/35 bg-amber-50 px-1 py-px font-mono text-[9px] font-black tabular-nums text-amber-950 dark:border-amber-200/30 dark:bg-amber-950/50 dark:text-amber-100"
                              title={`Pack options: ${packs.map((p) => `${fmtPackSize(p.unitsPerPack)} ${p.packUnit}`).join(", ")}`}
                            >
                              {packs.map((p) => `×${fmtPackSize(p.unitsPerPack)}`).join(" · ")}
                            </span>
                          ) : pack ? (
                            <span
                              className="inline-flex shrink-0 items-center border border-amber-900/35 bg-amber-50 px-1 py-px font-mono text-[9px] font-black tabular-nums text-amber-950 dark:border-amber-200/30 dark:bg-amber-950/50 dark:text-amber-100"
                              title={`Sold as a pack of ${pack.size} ${pack.unit}`}
                            >
                              ×{fmtPackSize(pack.size)}
                            </span>
                          ) : null}
                          <span
                            className="truncate font-medium text-foreground"
                            title={row.itemName || row.itemId}
                          >
                            {row.itemName || row.itemId}
                          </span>
                          {row.packageVariant ? (
                            <span
                              className="shrink-0 border border-primary/25 bg-primary/10 px-1 py-px text-[8px] font-bold uppercase text-primary"
                              title="Package / pack variant"
                            >
                              Pack
                            </span>
                          ) : null}
                          {row.primary ? (
                            <span
                              className="shrink-0 border border-primary/25 bg-primary/10 px-1 py-px text-[8px] font-bold uppercase text-primary"
                              title="Primary supplier for this product"
                            >
                              1°
                            </span>
                          ) : null}
                        </div>
                        {row.parentItemName?.trim() ? (
                          <p
                            className="truncate pl-4 text-[10px] text-muted-foreground"
                            title={`Parent product: ${row.parentItemName.trim()}`}
                          >
                            Parent ·{" "}
                            {joinProductNameParts(
                              row.parentItemName,
                              row.variantName,
                            )}
                          </p>
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
                    <td className="border border-border/70 px-1.5 py-0.5 text-right align-middle">
                      {(() => {
                        const cost = resolveLinkDisplayCost(row);
                        if (!cost) {
                          return (
                            <span
                              className="font-mono text-xs tabular-nums text-muted-foreground/60"
                              title="No default cost, last purchase, or catalog buying price"
                            >
                              —
                            </span>
                          );
                        }
                        const sourceLabel =
                          cost.source === "default"
                            ? "Supplier default cost"
                            : cost.source === "last"
                              ? "Last purchase cost"
                              : "Catalog buying price";
                        return (
                          <div
                            className="flex flex-col items-end leading-tight"
                            title={
                              pack
                                ? `${sourceLabel} · pack of ${pack.size}`
                                : sourceLabel
                            }
                          >
                            <span className="font-mono text-xs tabular-nums text-foreground">
                              {formatLinkCost(cost.value)}
                            </span>
                            {pack ? (
                              <span className="text-[9px] font-medium uppercase tracking-wide text-amber-900/70 dark:text-amber-100/70">
                                / pack
                              </span>
                            ) : cost.source !== "default" ? (
                              <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                                {cost.source === "last" ? "Last" : "Catalog"}
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="border border-border/70 px-1.5 py-0.5 text-right align-middle">
                      {sell != null ? (
                        <div
                          className="flex flex-col items-end leading-tight"
                          title="Catalog shelf / sell price"
                        >
                          <span className="font-mono text-xs tabular-nums text-foreground">
                            {formatLinkCost(sell)}
                          </span>
                          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                            Shelf
                          </span>
                        </div>
                      ) : (
                        <span
                          className="font-mono text-xs tabular-nums text-muted-foreground/60"
                          title="No catalog shelf price"
                        >
                          —
                        </span>
                      )}
                    </td>
                    {canLinkProducts ? (
                      <td className="border border-border/70 px-1.5 py-0.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="size-6 rounded-md p-0 text-muted-foreground"
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
                              className="size-6 rounded-md p-0 text-muted-foreground"
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
                            className="size-6 rounded-md p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
                    );
                  })}
              </tbody>
            </table>
          </div>
          {isUnassignedBucket && canLinkProducts ? (
            <div className="shrink-0 border-t border-border/70 bg-muted/20 px-2 py-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                  <span className="font-mono font-bold tabular-nums text-foreground">
                    {moveSelectedIds.size}
                  </span>{" "}
                  selected — assign to a supplier to remove them from this bucket
                </span>
                <select
                  className={cn(nsdSelect, "h-7 min-w-[9rem] text-xs")}
                  value={moveTargetSupplierId}
                  onChange={(e) => setMoveTargetSupplierId(e.target.value)}
                  disabled={linksBusy || supplierChoices.length === 0}
                  aria-label="Move to supplier"
                >
                  <option value="">Move to supplier…</option>
                  {supplierChoices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 shrink-0 gap-1 rounded-lg px-2.5 text-xs font-semibold"
                  disabled={
                    linksBusy ||
                    moveSelectedIds.size === 0 ||
                    !moveTargetSupplierId.trim()
                  }
                  onClick={() => void onSubmitMove()}
                >
                  <ArrowRight className="size-3" aria-hidden />
                  {linksBusy
                    ? "Moving…"
                    : moveSelectedIds.size <= 1
                      ? "Move"
                      : `Move ${moveSelectedIds.size}`}
                </Button>
              </div>
              {moveFormError ? (
                <p className="mt-1 text-[11px] text-destructive">{moveFormError}</p>
              ) : null}
            </div>
          ) : null}
          </>
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
              setEditLinkPacks([]);
              setEditLinkPacksOriginals({});
              setEditLinkDrawerError(null);
            }
          }}
          title="Edit supplier link"
          description={`Update supplier SKU, cost, and pack sizes for ${editLinkDrawerRow?.itemName || "this product"}.`}
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
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className={supFieldLabel}>Pack sizes (optional)</span>
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1 border border-primary/35 bg-primary/5 px-2 text-[11px] font-semibold text-primary transition hover:bg-primary/10"
                onClick={addPackDraft}
              >
                <Package className="size-3" aria-hidden />
                Add size
              </button>
            </div>
            {editLinkPacks.length === 0 ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                No packs — this product sells loose only.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {editLinkPacks.map((d, index) => (
                  <div
                    key={d.id ?? `new-${index}`}
                    className="flex items-center gap-1 border border-border/60 bg-muted/20 p-1"
                  >
                    <div className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => movePackDraft(index, -1)}
                        aria-label="Move pack up"
                        className="flex size-4 items-center justify-center text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === editLinkPacks.length - 1}
                        onClick={() => movePackDraft(index, 1)}
                        aria-label="Move pack down"
                        className="flex size-4 items-center justify-center text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                    <input
                      className={cn(supInput, "w-14 px-1 text-center tabular-nums")}
                      inputMode="decimal"
                      value={d.unitsPerPack}
                      onChange={(e) =>
                        patchPackDraft(index, { unitsPerPack: e.target.value })
                      }
                      placeholder="12"
                      aria-label="Pieces per pack"
                    />
                    <input
                      className={cn(supInput, "w-16 px-1")}
                      value={d.packUnit}
                      onChange={(e) =>
                        patchPackDraft(index, { packUnit: e.target.value })
                      }
                      placeholder="pack"
                      aria-label="Pack unit"
                    />
                    <input
                      className={cn(supInput, "min-w-0 flex-1 px-1")}
                      value={d.label}
                      onChange={(e) =>
                        patchPackDraft(index, { label: e.target.value })
                      }
                      placeholder="Label (optional)"
                      aria-label="Pack label"
                    />
                    <input
                      className={cn(supInput, "w-16 px-1 text-right tabular-nums")}
                      inputMode="decimal"
                      value={d.defaultPackPrice}
                      onChange={(e) =>
                        patchPackDraft(index, { defaultPackPrice: e.target.value })
                      }
                      placeholder="Price"
                      aria-label="Pack price"
                    />
                    <button
                      type="button"
                      onClick={() => removePackDraft(index)}
                      aria-label="Remove pack size"
                      className="flex size-6 shrink-0 items-center justify-center text-muted-foreground transition hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Optional. Packs appear on the stall and in the receive till. Receiving
            converts packs → shelf units (e.g. 2 packs × 12 = 24 stock) and stores
            the pack price ÷ pieces as the unit cost.
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
        title={
          detail
            ? `Link · ${displaySupplierName({ name: detail.name, code: detail.code })}`
            : "Browse catalog"
        }
        contextLabel={
          detail?.name
            ? displaySupplierName({ name: detail.name, code: detail.code })
            : "Supplier links"
        }
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
