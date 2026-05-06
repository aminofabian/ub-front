"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import {
  Building2,
  Camera,
  CircleDollarSign,
  Filter,
  LayoutGrid,
  Layers,
  List,
  Loader2,
  MousePointerClick,
  Package,
  PackagePlus,
  Pencil,
  PencilLine,
  Rows3,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";

import {
  DashboardNotice,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  addItemSupplierLink,
  ApiRequestError,
  createItem,
  createItemVariant,
  deleteItem,
  deleteItemImage,
  fetchBranches,
  fetchCategories,
  fetchItemById,
  fetchItemSupplierLinks,
  fetchItemTypes,
  fetchItemsPage,
  fetchSuggestedNextSku,
  fetchSuppliers,
  itemListThumbnailUrl,
  patchItem,
  postSellingPrice,
  postStockIncrease,
  uploadItemImageToCloudinary,
  type BranchRecord,
  type CatalogListScope,
  type CategoryRecord,
  type CreateVariantPayload,
  type ItemDetailRecord,
  type ItemImageRecord,
  type ItemSupplierLinkRecord,
  type ItemSummaryRecord,
  type ItemTypeRecord,
  type PatchItemPayload,
  type SupplierRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

import { VirtualizedCatalogBody } from "./_components/VirtualizedCatalogBody";
import { VariantDrawerForm } from "./variant-drawer-form";

type ProductDrawerId = "create-parent" | "edit-product" | "photos" | "add-variant";

type ProductEditDraft = {
  name?: string;
  barcode?: string;
  description?: string;
  active?: boolean;
  webPublished?: boolean;
  bundlePriceStr: string;
  imageKey: string;
  categoryId: string;
};

const EMPTY_EDIT_DRAFT: ProductEditDraft = {
  bundlePriceStr: "",
  imageKey: "",
  description: "",
  active: true,
  webPublished: false,
  categoryId: "",
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatAmount(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function galleryImageUrl(img: ItemImageRecord): string | null {
  const secure = img.secureUrl?.trim();
  if (secure) {
    return secure;
  }
  const key = img.s3Key?.trim();
  if (key?.startsWith("http")) {
    return key;
  }
  return null;
}

function coverImageUrl(detail: ItemDetailRecord): string | null {
  const k = detail.imageKey?.trim();
  if (k?.startsWith("http")) {
    return k;
  }
  const sorted = detail.images ? [...detail.images].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  for (const img of sorted) {
    const u = galleryImageUrl(img);
    if (u) {
      return u;
    }
  }
  return null;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function optionalPositiveNumber(raw: string, label: string): number | undefined {
  const t = raw.trim();
  if (!t) {
    return undefined;
  }
  const n = Number(t);
  if (!Number.isFinite(n)) {
    throw new Error(`${label} must be a valid number.`);
  }
  return n;
}

type ParentDraft = {
  name: string;
  sku: string;
  barcode: string;
  itemTypeId: string;
  categoryId: string;
  supplierId: string;
  supplierSku: string;
  defaultCostPrice: string;
  setPrimarySupplier: boolean;
};

const EMPTY_PARENT: ParentDraft = {
  name: "",
  sku: "",
  barcode: "",
  itemTypeId: "",
  categoryId: "",
  supplierId: "",
  supplierSku: "",
  defaultCostPrice: "",
  setPrimarySupplier: true,
};

type VariantDraft = {
  sku: string;
  variantName: string;
  name: string;
  barcode: string;
  description: string;
  categoryId: string;
  unitType: string;
  minStockLevel: string;
  reorderLevel: string;
  reorderQty: string;
  imageKey: string;
  bundleQty: string;
  bundlePrice: string;
  bundleName: string;
  sellingPrice: string;
  sellBranchId: string;
  sellEffectiveFrom: string;
  supplierId: string;
  supplierSku: string;
  defaultCostPrice: string;
  setPrimarySupplier: boolean;
  openingQty: string;
  openingBranchId: string;
  openingUnitCost: string;
};

const VARIANT_DRAFT_FIELDS: Omit<VariantDraft, "sellEffectiveFrom"> = {
  sku: "",
  variantName: "",
  name: "",
  barcode: "",
  description: "",
  categoryId: "",
  unitType: "",
  minStockLevel: "",
  reorderLevel: "",
  reorderQty: "",
  imageKey: "",
  bundleQty: "",
  bundlePrice: "",
  bundleName: "",
  sellingPrice: "",
  sellBranchId: "",
  supplierId: "",
  supplierSku: "",
  defaultCostPrice: "",
  setPrimarySupplier: true,
  openingQty: "",
  openingBranchId: "",
  openingUnitCost: "",
};

function emptyVariantDraft(): VariantDraft {
  return { ...VARIANT_DRAFT_FIELDS, sellEffectiveFrom: todayIsoDate() };
}

function buildCreateVariantBody(draft: VariantDraft): CreateVariantPayload {
  const variantName = draft.variantName.trim();
  if (!variantName) {
    throw new Error("Variant label is required.");
  }
  const body: CreateVariantPayload = { variantName };
  const sku = draft.sku.trim();
  if (sku) {
    body.sku = sku;
  }
  const disp = draft.name.trim();
  if (disp) {
    body.name = disp;
  }
  const bc = draft.barcode.trim();
  if (bc) {
    body.barcode = bc;
  }
  const desc = draft.description.trim();
  if (desc) {
    body.description = desc;
  }
  const cat = draft.categoryId.trim();
  if (cat) {
    body.categoryId = cat;
  }
  const ut = draft.unitType.trim();
  if (ut) {
    body.unitType = ut;
  }
  const ik = draft.imageKey.trim();
  if (ik) {
    body.imageKey = ik;
  }
  const minL = optionalPositiveNumber(draft.minStockLevel, "Min stock level");
  if (minL !== undefined) {
    body.minStockLevel = minL;
  }
  const rL = optionalPositiveNumber(draft.reorderLevel, "Reorder level");
  if (rL !== undefined) {
    body.reorderLevel = rL;
  }
  const rQ = optionalPositiveNumber(draft.reorderQty, "Reorder qty");
  if (rQ !== undefined) {
    body.reorderQty = rQ;
  }
  return body;
}

function bundlePatchFromVariantDraft(draft: VariantDraft): PatchItemPayload | null {
  const patch: PatchItemPayload = {};
  const bq = draft.bundleQty.trim();
  if (bq) {
    const n = Number(bq);
    if (!Number.isFinite(n)) {
      throw new Error("Bundle qty must be a valid number.");
    }
    patch.bundleQty = n;
  }
  const bp = draft.bundlePrice.trim();
  if (bp) {
    const n = Number(bp);
    if (!Number.isFinite(n)) {
      throw new Error("Bundle price must be a valid number.");
    }
    patch.bundlePrice = n;
  }
  const bn = draft.bundleName.trim();
  if (bn) {
    patch.bundleName = bn;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

const VARIANT_INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground";

const panelClass = cn(
  "rounded-3xl border border-border/70 bg-card/90 shadow-md shadow-black/[0.03] ring-1 ring-black/[0.03] backdrop-blur-sm",
  "dark:bg-card/80 dark:shadow-black/20 dark:ring-white/[0.06]",
);

const filterLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90";

const quickInputClass = cn(
  "w-full rounded-xl border border-input/80 bg-background px-3 py-2 text-sm shadow-sm",
  "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
);

type QuickEditKey =
  | "productName"
  | "barcode"
  | "bundleQty"
  | "bundlePrice"
  | "minStock"
  | "reorder"
  | null;

export default function ProductsPage() {
  const { me, business } = useDashboard();
  const currencyCode = business?.currency?.trim() || "";
  const canCatalogRead = hasPermission(me?.permissions, Permission.CatalogItemsRead);
  const canCatalogWrite = hasPermission(me?.permissions, Permission.CatalogItemsWrite);
  const canLinkSupplier = hasPermission(me?.permissions, Permission.CatalogItemsLinkSuppliers);
  const canListSuppliers = hasPermission(me?.permissions, Permission.SuppliersRead);
  const canSetSellPrice = hasPermission(me?.permissions, Permission.PricingSellPriceSet);
  const canInventoryWrite = hasPermission(me?.permissions, Permission.InventoryWrite);

  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [listRows, setListRows] = useState<ItemSummaryRecord[]>([]);
  const [listTotalElements, setListTotalElements] = useState(0);
  const [listLast, setListLast] = useState(true);
  const [listLoadingInitial, setListLoadingInitial] = useState(true);
  const [listLoadingMore, setListLoadingMore] = useState(false);
  const nextPageRef = useRef(0);
  const [suppliersForLink, setSuppliersForLink] = useState<SupplierRecord[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
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
  const [variantParentDisplayName, setVariantParentDisplayName] = useState<string | null>(null);
  const [parentDraft, setParentDraft] = useState<ParentDraft>(EMPTY_PARENT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDetailRecord | null>(null);
  const [supplierLinks, setSupplierLinks] = useState<ItemSupplierLinkRecord[]>([]);
  const [patchDraft, setPatchDraft] = useState<ProductEditDraft>(EMPTY_EDIT_DRAFT);
  const [variantDraft, setVariantDraft] = useState<VariantDraft>(() => emptyVariantDraft());
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [message, setMessage] = useState("");
  const [catalogImageUploadBusy, setCatalogImageUploadBusy] = useState(false);
  const [pendingCatalogImage, setPendingCatalogImage] = useState<File | null>(null);
  const [pendingVariantImage, setPendingVariantImage] = useState<File | null>(null);
  const [variantCreateBusy, setVariantCreateBusy] = useState(false);
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false);
  const [nextAutoSkuHint, setNextAutoSkuHint] = useState<string | null>(null);
  const [catalogImageAlt, setCatalogImageAlt] = useState("");
  const [catalogImagePrimary, setCatalogImagePrimary] = useState(true);
  const [activeDrawer, setActiveDrawer] = useState<ProductDrawerId | null>(null);
  const [quickEdit, setQuickEdit] = useState<QuickEditKey>(null);
  const [quickProductName, setQuickProductName] = useState("");
  const [quickBarcode, setQuickBarcode] = useState("");
  const [quickBundleQty, setQuickBundleQty] = useState("");
  const [quickBundlePrice, setQuickBundlePrice] = useState("");
  const [quickMinStock, setQuickMinStock] = useState("");
  const [quickReorderLevel, setQuickReorderLevel] = useState("");
  const [quickReorderQty, setQuickReorderQty] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [parentVariants, setParentVariants] = useState<ItemSummaryRecord[] | null>(null);
  const [variantInlineEditId, setVariantInlineEditId] = useState<string | null>(null);
  const [variantEditName, setVariantEditName] = useState("");
  const [variantEditBarcode, setVariantEditBarcode] = useState("");

  const selectProduct = useCallback((id: string | null) => {
    setQuickEdit(null);
    setVariantInlineEditId(null);
    setSelectedId(id);
  }, []);

  const parentBannerName = variantParentDisplayName;

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }, [categories]);

  const categoryById = useMemo(() => {
    const map = new Map<string, CategoryRecord>();
    for (const c of categories) {
      map.set(c.id, c);
    }
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
  }, [
    debouncedSearch,
    filterCategoryId,
    includeCategoryDescendants,
    catalogScope,
    barcodeExact,
    filterNoBarcode,
    filterIncludeInactive,
  ]);

  const loadMoreCatalog = useCallback(async () => {
    if (listLast || listLoadingMore || listLoadingInitial || nextPageRef.current <= 0) {
      return;
    }
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
  }, [
    listLast,
    listLoadingMore,
    listLoadingInitial,
    debouncedSearch,
    filterCategoryId,
    includeCategoryDescendants,
    catalogScope,
    barcodeExact,
    filterNoBarcode,
    filterIncludeInactive,
  ]);

  const onToggleRowSelect = useCallback((id: string) => {
    setRowSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  const isListRowActive = useCallback(
    (row: ItemSummaryRecord) => {
      if (selectedId === row.id) {
        return true;
      }
      if (!selectedId || !detail) {
        return false;
      }
      return detail.variantOfItemId === row.id;
    },
    [selectedId, detail],
  );

  const loadSuppliersForLink = useCallback(async () => {
    if (!canListSuppliers) {
      return;
    }
    setSuppliersLoading(true);
    try {
      setSuppliersForLink(await fetchSuppliers());
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Failed to load suppliers.");
      }
    } finally {
      setSuppliersLoading(false);
    }
  }, [canListSuppliers]);

  useEffect(() => {
    if (!canListSuppliers) {
      return;
    }
    if (activeDrawer !== "create-parent" && activeDrawer !== "add-variant") {
      return;
    }
    const id = window.setTimeout(() => {
      void loadSuppliersForLink();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeDrawer, canListSuppliers, loadSuppliersForLink]);

  useEffect(() => {
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) {
          setBranches(list.filter((b) => b.active));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBranches([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSelectedDetail = useCallback(async () => {
    if (!selectedId) {
      return;
    }
    const row = await fetchItemById(selectedId);
    setDetail(row);
    setPatchDraft({
      name: row.name,
      barcode: row.barcode,
      description: row.description,
      active: row.active ?? true,
      webPublished: row.webPublished ?? false,
      bundlePriceStr:
        row.bundlePrice != null && row.bundlePrice !== ""
          ? String(row.bundlePrice)
          : "",
      imageKey: row.imageKey ?? "",
      categoryId: row.categoryId ?? "",
    });
    const parentOfVariant = row.variantOfItemId?.trim();
    if (parentOfVariant) {
      try {
        const parentRow = await fetchItemById(parentOfVariant);
        setParentVariants(parentRow.variants ?? []);
        setVariantParentDisplayName(parentRow.name?.trim() || null);
      } catch {
        setParentVariants([]);
        setVariantParentDisplayName(null);
      }
    } else {
      setParentVariants(null);
      setVariantParentDisplayName(null);
    }
  }, [selectedId]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- remote bootstrap (types/categories)
    void loadCategoriesAndTypes().catch((error) => {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Failed to load categories.");
      }
    });
  }, [loadCategoriesAndTypes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- remote catalog reload on filters
    void refreshFullCatalog().catch((error) => {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Failed to load catalog.");
      }
    });
  }, [refreshFullCatalog]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = event.target;
      if (
        tag instanceof HTMLInputElement ||
        tag instanceof HTMLTextAreaElement ||
        tag instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        document.getElementById("catalog-omni")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (itemTypes.length === 0) {
      return;
    }
    setParentDraft((previous) =>
      previous.itemTypeId ? previous : { ...previous, itemTypeId: itemTypes[0].id },
    );
  }, [itemTypes]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setSupplierLinks([]);
      setPatchDraft(EMPTY_EDIT_DRAFT);
      setPendingCatalogImage(null);
      setCatalogImageAlt("");
      setParentVariants(null);
      setVariantParentDisplayName(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const row = await fetchItemById(selectedId);
        if (cancelled) {
          return;
        }
        setDetail(row);
        setPatchDraft({
          name: row.name,
          barcode: row.barcode,
          description: row.description,
          active: row.active ?? true,
          webPublished: row.webPublished ?? false,
          bundlePriceStr:
            row.bundlePrice != null && row.bundlePrice !== ""
              ? String(row.bundlePrice)
              : "",
          imageKey: row.imageKey ?? "",
          categoryId: row.categoryId ?? "",
        });
        const parentOfVariant = row.variantOfItemId?.trim();
        if (parentOfVariant) {
          try {
            const parentRow = await fetchItemById(parentOfVariant);
            if (!cancelled) {
              setParentVariants(parentRow.variants ?? []);
              setVariantParentDisplayName(parentRow.name?.trim() || null);
            }
          } catch {
            if (!cancelled) {
              setParentVariants([]);
              setVariantParentDisplayName(null);
            }
          }
        } else if (!cancelled) {
          setParentVariants(null);
          setVariantParentDisplayName(null);
        }
        try {
          const links = await fetchItemSupplierLinks(selectedId);
          if (!cancelled) {
            setSupplierLinks(links);
          }
        } catch {
          if (!cancelled) {
            setSupplierLinks([]);
          }
        }
      } catch (error) {
        if (!cancelled) {
          if (!(error instanceof ApiRequestError)) {
            setMessage(error instanceof Error ? error.message : "Failed to load item.");
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!canCatalogRead) {
      return;
    }
    if (activeDrawer !== "create-parent" && activeDrawer !== "add-variant") {
      return;
    }
    const isVariantDrawer = activeDrawer === "add-variant";
    /** Same parent resolution as create variant (selected row may be a variant). */
    const addVariantParentId =
      detail?.variantOfItemId?.trim() || detail?.id?.trim() || selectedId?.trim() || "";
    if (isVariantDrawer && !addVariantParentId) {
      setNextAutoSkuHint(null);
      return;
    }
    const categoryId =
      !isVariantDrawer && parentDraft.categoryId.trim()
        ? parentDraft.categoryId.trim()
        : undefined;
    const parentItemId = isVariantDrawer ? addVariantParentId : undefined;
    const variantName =
      isVariantDrawer && variantDraft.variantName.trim()
        ? variantDraft.variantName.trim()
        : undefined;

    /** Variant label changes often while typing; parent/category switches stay snappy. */
    const delayMs = isVariantDrawer ? 320 : 0;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const { suggestedSku } = await fetchSuggestedNextSku({
            categoryId,
            parentItemId,
            variantName,
          });
          if (!cancelled) {
            setNextAutoSkuHint(suggestedSku);
          }
        } catch {
          if (!cancelled) {
            setNextAutoSkuHint(null);
          }
        }
      })();
    }, delayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    activeDrawer,
    canCatalogRead,
    parentDraft.categoryId,
    detail?.id,
    detail?.variantOfItemId,
    selectedId,
    variantDraft.variantName,
  ]);

  useEffect(() => {
    const hint = nextAutoSkuHint?.trim();
    if (!hint) {
      return;
    }
    const id = window.setTimeout(() => {
      if (activeDrawer === "create-parent") {
        setParentDraft((p) => (p.sku.trim() === "" ? { ...p, sku: hint } : p));
      } else if (activeDrawer === "add-variant") {
        setVariantDraft((p) => (p.sku.trim() === "" ? { ...p, sku: hint } : p));
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeDrawer, nextAutoSkuHint]);

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setDebouncedSearch(search.trim());
  };

  const onCreateParent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const savedItemTypeId = parentDraft.itemTypeId;
    try {
      const categoryChosen = parentDraft.categoryId.trim();
      const skuTrim = parentDraft.sku.trim();
      const created = await createItem({
        name: parentDraft.name,
        ...(skuTrim ? { sku: skuTrim } : {}),
        itemTypeId: parentDraft.itemTypeId,
        barcode: parentDraft.barcode || undefined,
        ...(categoryChosen ? { categoryId: categoryChosen } : {}),
      });
      const supplierChosen = parentDraft.supplierId.trim();
      if (canLinkSupplier && supplierChosen) {
        const costRaw = parentDraft.defaultCostPrice.trim();
        let defaultCostPrice: number | undefined;
        if (costRaw) {
          const n = Number(costRaw);
          if (!Number.isFinite(n)) {
            throw new Error("Default cost must be a valid number.");
          }
          defaultCostPrice = n;
        }
        try {
          await addItemSupplierLink(created.id, {
            supplierId: supplierChosen,
            setPrimary: parentDraft.setPrimarySupplier,
            supplierSku: parentDraft.supplierSku.trim() || undefined,
            defaultCostPrice,
          });
        } catch (linkErr) {
          await refreshFullCatalog();
          selectProduct(created.id);
          setParentDraft({ ...EMPTY_PARENT, itemTypeId: savedItemTypeId });
          setMessage(
            linkErr instanceof Error
              ? `Product created. Supplier link failed: ${linkErr.message}`
              : "Product created but supplier link failed.",
          );
          return;
        }
      }
      setParentDraft({ ...EMPTY_PARENT, itemTypeId: savedItemTypeId });
      await refreshFullCatalog();
      selectProduct(created.id);
      setActiveDrawer(null);
      setMessage(
        canLinkSupplier && supplierChosen
          ? "Product created and linked to supplier."
          : "Product created.",
      );
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Create product failed.");
      }
    }
  };

  const onPatchItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) {
      return;
    }
    setMessage("");
    const body: PatchItemPayload = {
      name: patchDraft.name,
      barcode: patchDraft.barcode,
      description: patchDraft.description,
      active: patchDraft.active,
      webPublished: patchDraft.webPublished,
      imageKey: patchDraft.imageKey,
      categoryId: patchDraft.categoryId.trim(),
    };
    const bps = patchDraft.bundlePriceStr.trim();
    if (bps) {
      const n = Number(bps);
      if (!Number.isFinite(n)) {
        setMessage("Bundle price must be a valid number.");
        return;
      }
      body.bundlePrice = n;
    }
    try {
      await patchItem(selectedId, body);
      await refreshFullCatalog();
      const next = await fetchItemById(selectedId);
      setDetail(next);
      try {
        setSupplierLinks(await fetchItemSupplierLinks(selectedId));
      } catch {
        setSupplierLinks([]);
      }
      setPatchDraft({
        name: next.name,
        barcode: next.barcode,
        description: next.description,
        active: next.active ?? true,
        webPublished: next.webPublished ?? false,
        bundlePriceStr:
          next.bundlePrice != null && next.bundlePrice !== ""
            ? String(next.bundlePrice)
            : "",
        imageKey: next.imageKey ?? "",
        categoryId: next.categoryId ?? "",
      });
      setActiveDrawer(null);
      setMessage("Product updated.");
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Update failed.");
      }
    }
  };

  const onAddVariant = async (event: React.FormEvent) => {
    event.preventDefault();
    const parentItemId = detail?.variantOfItemId?.trim() || detail?.id || selectedId;
    if (!parentItemId) {
      setMessage("Select a product first.");
      return;
    }
    setMessage("");
    setVariantCreateBusy(true);
    const warnings: string[] = [];
    try {
      let body: CreateVariantPayload;
      try {
        body = buildCreateVariantBody(variantDraft);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Invalid variant fields.");
        return;
      }

      let bundlePatch: PatchItemPayload | null;
      try {
        bundlePatch = bundlePatchFromVariantDraft(variantDraft);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Invalid bundle fields.");
        return;
      }

      const oq = variantDraft.openingQty.trim();
      if (oq) {
        if (!variantDraft.openingBranchId.trim()) {
          setMessage("Opening stock requires a branch.");
          return;
        }
        const qtyNum = Number(oq);
        if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
          setMessage("Opening qty must be a positive number.");
          return;
        }
        const ucRaw =
          variantDraft.openingUnitCost.trim() || variantDraft.defaultCostPrice.trim();
        if (!ucRaw) {
          setMessage("Opening stock needs a unit cost (or default buy price).");
          return;
        }
        const unitCost = Number(ucRaw);
        if (!Number.isFinite(unitCost) || unitCost <= 0) {
          setMessage("Unit cost must be a positive number.");
          return;
        }
      }

      const sup = variantDraft.supplierId.trim();
      if (sup && canLinkSupplier) {
        const costRaw = variantDraft.defaultCostPrice.trim();
        if (costRaw) {
          const n = Number(costRaw);
          if (!Number.isFinite(n)) {
            setMessage("Default cost must be a valid number.");
            return;
          }
        }
      }

      const created = await createItemVariant(parentItemId, body);
      const vid = created.id;

      if (bundlePatch) {
        try {
          await patchItem(vid, bundlePatch);
        } catch (err) {
          warnings.push(
            `Bundle fields not saved: ${err instanceof Error ? err.message : "error"}.`,
          );
        }
      }

      const sp = variantDraft.sellingPrice.trim();
      if (sp) {
        if (!canSetSellPrice) {
          warnings.push("Selling price skipped (no permission).");
        } else {
          const from = variantDraft.sellEffectiveFrom.trim() || todayIsoDate();
          try {
            await postSellingPrice({
              itemId: vid,
              branchId: variantDraft.sellBranchId.trim() || null,
              price: sp,
              effectiveFrom: from,
            });
          } catch (err) {
            warnings.push(
              `Selling price: ${err instanceof Error ? err.message : "save failed"}.`,
            );
          }
        }
      }

      if (sup) {
        if (!canLinkSupplier) {
          warnings.push("Supplier / buy price skipped (no permission).");
        } else {
          const costRaw = variantDraft.defaultCostPrice.trim();
          let defaultCostPrice: number | undefined;
          if (costRaw) {
            defaultCostPrice = Number(costRaw);
          }
          try {
            await addItemSupplierLink(vid, {
              supplierId: sup,
              setPrimary: variantDraft.setPrimarySupplier,
              supplierSku: variantDraft.supplierSku.trim() || undefined,
              defaultCostPrice,
            });
          } catch (err) {
            warnings.push(
              `Supplier link: ${err instanceof Error ? err.message : "failed"}.`,
            );
          }
        }
      }

      if (oq) {
        if (!canInventoryWrite) {
          warnings.push("Opening stock skipped (no permission).");
        } else {
          const branch = variantDraft.openingBranchId.trim();
          const ucRaw =
            variantDraft.openingUnitCost.trim() || variantDraft.defaultCostPrice.trim();
          const unitCost = Number(ucRaw);
          try {
            await postStockIncrease({
              branchId: branch,
              itemId: vid,
              quantity: oq,
              unitCost,
              notes: "Opening stock when creating variant",
            });
          } catch (err) {
            warnings.push(
              `Opening stock: ${err instanceof Error ? err.message : "failed"}.`,
            );
          }
        }
      }

      if (pendingVariantImage) {
        try {
          await uploadItemImageToCloudinary(vid, pendingVariantImage, { primary: true });
        } catch (err) {
          warnings.push(
            `Photo upload: ${err instanceof Error ? err.message : "failed"}.`,
          );
        }
      }

      setVariantDraft(emptyVariantDraft());
      setPendingVariantImage(null);
      const next = await fetchItemById(parentItemId);
      setDetail(next);
      try {
        setSupplierLinks(await fetchItemSupplierLinks(parentItemId));
      } catch {
        setSupplierLinks([]);
      }
      await refreshFullCatalog();
      setActiveDrawer(null);
      setMessage(["Variant created.", ...warnings].filter(Boolean).join(" "));
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Variant create failed.");
      }
    } finally {
      setVariantCreateBusy(false);
    }
  };

  const onDeleteItem = async () => {
    if (!selectedId || !window.confirm("Delete this item?")) {
      return;
    }
    setMessage("");
    try {
      await deleteItem(selectedId, false);
      selectProduct(null);
      setDetail(null);
      setActiveDrawer(null);
      await refreshFullCatalog();
      setMessage("Item deleted.");
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Delete failed.");
      }
    }
  };

  const onBulkDeleteSelected = async () => {
    if (!canCatalogWrite || rowSelection.size === 0 || bulkDeleteBusy) {
      return;
    }
    const ids = [...rowSelection];
    const byId = new Map(listRows.map((r) => [r.id, r]));
    const parentIds = new Set<string>();
    const variantIds = new Set<string>();
    for (const id of ids) {
      const row = byId.get(id);
      if (row?.variantOfItemId) {
        variantIds.add(id);
      } else {
        parentIds.add(id);
      }
    }
    const parentsWithChildRows = [...parentIds].filter((pid) =>
      listRows.some((r) => r.variantOfItemId === pid),
    ).length;
    const lines = [
      `Delete ${ids.length} selected catalog row(s)?`,
      "Items are soft-deleted (hidden from normal lists).",
    ];
    if (parentsWithChildRows > 0) {
      lines.push(
        `${parentsWithChildRows} group row(s) in this list also remove their option SKUs.`,
      );
    }
    if (!window.confirm(lines.join("\n\n"))) {
      return;
    }

    setBulkDeleteBusy(true);
    setMessage("");
    const failed = new Set<string>();
    try {
      for (const pid of parentIds) {
        try {
          await deleteItem(pid, true);
        } catch {
          failed.add(pid);
        }
      }
      for (const vid of variantIds) {
        const row = byId.get(vid);
        if (row?.variantOfItemId && parentIds.has(row.variantOfItemId) && !failed.has(row.variantOfItemId)) {
          continue;
        }
        try {
          await deleteItem(vid, false);
        } catch {
          failed.add(vid);
        }
      }

      if (selectedId != null && ids.includes(selectedId) && !failed.has(selectedId)) {
        selectProduct(null);
        setDetail(null);
        setActiveDrawer(null);
      }
      setRowSelection(new Set());
      await refreshFullCatalog();

      const ok = ids.length - failed.size;
      if (failed.size) {
        setMessage(
          `Deleted ${ok} of ${ids.length}. Some rows could not be removed — refresh and try again.`,
        );
      } else {
        setMessage(ids.length === 1 ? "Item deleted." : `${ids.length} items deleted.`);
      }
    } finally {
      setBulkDeleteBusy(false);
    }
  };

  const onUploadCatalogImage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !pendingCatalogImage) {
      setMessage("Choose an image file first.");
      return;
    }
    setCatalogImageUploadBusy(true);
    setMessage("");
    try {
      await uploadItemImageToCloudinary(selectedId, pendingCatalogImage, {
        altText: catalogImageAlt.trim() || undefined,
        primary: catalogImagePrimary,
      });
      setPendingCatalogImage(null);
      setCatalogImageAlt("");
      await refreshSelectedDetail();
      await refreshFullCatalog();
      setMessage("Photo uploaded to Cloudinary — only the URL and fingerprint metadata are stored here.");
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Upload failed.");
      }
    } finally {
      setCatalogImageUploadBusy(false);
    }
  };

  const onRemoveGalleryImage = async (imageId: string) => {
    if (!selectedId || !window.confirm("Remove this photo from the product?")) {
      return;
    }
    setMessage("");
    try {
      await deleteItemImage(selectedId, imageId);
      await refreshSelectedDetail();
      await refreshFullCatalog();
      setMessage("Image removed.");
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Could not remove image.");
      }
    }
  };

  const openQuickEdit = (key: Exclude<QuickEditKey, null>) => {
    if (!detail || !canCatalogWrite) {
      return;
    }
    setQuickEdit(key);
    if (key === "productName") {
      setQuickProductName(detail.name?.trim() ?? "");
    }
    if (key === "barcode") {
      setQuickBarcode(detail.barcode?.trim() ?? "");
    }
    if (key === "bundleQty") {
      setQuickBundleQty(detail.bundleQty != null ? String(detail.bundleQty) : "");
    }
    if (key === "bundlePrice") {
      const bp = toNumber(detail.bundlePrice);
      setQuickBundlePrice(bp != null ? String(bp) : "");
    }
    if (key === "minStock") {
      const m = toNumber(detail.minStockLevel);
      setQuickMinStock(m != null ? String(m) : "");
    }
    if (key === "reorder") {
      const rl = toNumber(detail.reorderLevel);
      const rq = toNumber(detail.reorderQty);
      setQuickReorderLevel(rl != null ? String(rl) : "");
      setQuickReorderQty(rq != null ? String(rq) : "");
    }
  };

  const cancelQuickEdit = () => {
    setQuickEdit(null);
  };

  const runQuickPatch = async (body: PatchItemPayload, successMessage: string) => {
    if (!selectedId || !canCatalogWrite) {
      return;
    }
    setQuickSaving(true);
    setMessage("");
    try {
      await patchItem(selectedId, body);
      await refreshFullCatalog();
      await refreshSelectedDetail();
      setQuickEdit(null);
      setMessage(successMessage);
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Update failed.");
      }
    } finally {
      setQuickSaving(false);
    }
  };

  const saveQuickProductName = () => {
    const name = quickProductName.trim();
    if (!name) {
      setMessage("Display name is required.");
      return;
    }
    void runQuickPatch({ name }, "Display name updated.");
  };

  const saveQuickBarcode = () =>
    void runQuickPatch({ barcode: quickBarcode.trim() || "" }, "Barcode updated.");

  const saveQuickBundleQty = () => {
    const raw = quickBundleQty.trim();
    if (!raw) {
      setMessage("Pack quantity is required (use Details drawer for advanced edits).");
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      setMessage("Pack quantity must be a positive whole number.");
      return;
    }
    void runQuickPatch({ bundleQty: n }, "Pack quantity updated.");
  };

  const saveQuickBundlePrice = () => {
    const raw = quickBundlePrice.trim();
    if (!raw) {
      setMessage("Enter a shelf price or cancel.");
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      setMessage("Shelf price must be a valid non-negative number.");
      return;
    }
    void runQuickPatch({ bundlePrice: n }, "Shelf price updated.");
  };

  const saveQuickMinStock = () => {
    const raw = quickMinStock.trim();
    if (!raw) {
      setMessage("Enter a min stock level or cancel.");
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      setMessage("Min stock must be a valid non-negative number.");
      return;
    }
    void runQuickPatch({ minStockLevel: n }, "Min stock level updated.");
  };

  const saveQuickReorder = () => {
    const rlRaw = quickReorderLevel.trim();
    const rqRaw = quickReorderQty.trim();
    const body: PatchItemPayload = {};
    if (rlRaw) {
      const rl = Number(rlRaw);
      if (!Number.isFinite(rl) || rl < 0) {
        setMessage("Reorder level must be a valid non-negative number.");
        return;
      }
      body.reorderLevel = rl;
    }
    if (rqRaw) {
      const rq = Number(rqRaw);
      if (!Number.isFinite(rq) || rq < 0) {
        setMessage("Reorder quantity must be a valid non-negative number.");
        return;
      }
      body.reorderQty = rq;
    }
    if (Object.keys(body).length === 0) {
      setMessage("Enter reorder level or reorder quantity.");
      return;
    }
    void runQuickPatch(body, "Reorder settings updated.");
  };

  const cancelVariantInlineEdit = () => {
    setVariantInlineEditId(null);
  };

  const startVariantRowEdit = (v: ItemSummaryRecord, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!canCatalogWrite) {
      return;
    }
    setVariantInlineEditId(v.id);
    setVariantEditName(v.name ?? "");
    setVariantEditBarcode(v.barcode?.trim() ?? "");
  };

  const saveVariantInline = async () => {
    if (!variantInlineEditId || !detail || !canCatalogWrite) {
      return;
    }
    const name = variantEditName.trim();
    if (!name) {
      setMessage("Display name is required.");
      return;
    }
    setQuickSaving(true);
    setMessage("");
    try {
      await patchItem(variantInlineEditId, {
        name,
        barcode: variantEditBarcode.trim() || "",
      });
      await refreshFullCatalog();
      const parentId = detail.variantOfItemId?.trim() || detail.id;
      const p = await fetchItemById(parentId);
      if (detail.variantOfItemId) {
        setParentVariants(p.variants ?? []);
      } else {
        setDetail((d) => (d && d.id === p.id ? { ...d, variants: p.variants } : d));
      }
      if (selectedId === variantInlineEditId) {
        const next = await fetchItemById(variantInlineEditId);
        setDetail(next);
        try {
          setSupplierLinks(await fetchItemSupplierLinks(variantInlineEditId));
        } catch {
          setSupplierLinks([]);
        }
      }
      setVariantInlineEditId(null);
      setMessage("Option updated.");
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setMessage(error instanceof Error ? error.message : "Update failed.");
      }
    } finally {
      setQuickSaving(false);
    }
  };

  const variantRows = useMemo(() => {
    if (!detail) {
      return [];
    }
    if (detail.variantOfItemId) {
      return parentVariants ?? [];
    }
    return detail.variants ?? [];
  }, [detail, parentVariants]);

  const sortedImages = detail?.images
    ? [...detail.images].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const sellPrice = detail ? toNumber(detail.bundlePrice) : null;
  const primaryLink = supplierLinks.find((l) => l.primary);
  const primaryCost = primaryLink ? toNumber(primaryLink.defaultCostPrice) : null;
  const marginPct =
    sellPrice != null && sellPrice > 0 && primaryCost != null
      ? ((sellPrice - primaryCost) / sellPrice) * 100
      : null;

  return (
    <>
      <div className="relative -mx-6 flex min-h-[calc(100dvh-4.25rem)] w-[calc(100%+3rem)] max-w-none flex-col gap-3 px-4 pb-4 sm:px-6">
        <div
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[120px] w-[min(100%,48rem)] max-w-full -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,hsl(var(--primary)/0.08),transparent_70%)] opacity-90 dark:opacity-60"
          aria-hidden
        />

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div
            className={cn(
              "relative shrink-0 overflow-hidden rounded-xl border border-border/70 p-3 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.04] sm:p-3",
              "bg-gradient-to-br from-card via-card to-primary/[0.03] backdrop-blur-sm dark:from-card/95 dark:via-card/90 dark:to-primary/[0.04] dark:ring-white/[0.06]",
            )}
          >
            <div
              className="pointer-events-none absolute -right-12 -top-12 size-28 rounded-full bg-primary/[0.05] blur-2xl"
              aria-hidden
            />
            <header className="relative space-y-2">
              <DashboardPageHero
                compact
                icon={Package}
                eyebrow="Catalog"
                title="Products"
                description={
                  <p>
                    <span className="text-foreground/85">Grid</span> uses{" "}
                    <span className="font-medium text-amber-900 dark:text-amber-200">labels</span> (amber) for shared
                    merchandising rows, <span className="font-medium text-emerald-800 dark:text-emerald-300">standalone</span>{" "}
                    products (green), and <span className="font-medium text-violet-800 dark:text-violet-300">options</span>{" "}
                    (violet). Click any row to edit. Use{" "}
                    <span className="font-medium text-foreground">Sellable SKUs only</span> to hide label rows.
                  </p>
                }
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-2">
                <DashboardQuickLinks
                  compact
                  links={[
                    { href: APP_ROUTES.categories, label: "Categories", desc: "Tree & aisles", icon: LayoutGrid },
                    { href: APP_ROUTES.suppliers, label: "Suppliers", desc: "Costs & links", icon: Building2 },
                    { href: APP_ROUTES.pricing, label: "Pricing", desc: "Rules & sell price", icon: CircleDollarSign },
                  ]}
                />
                <Button
                  type="button"
                  className="h-9 shrink-0 gap-1.5 self-stretch rounded-lg px-4 text-sm shadow-md shadow-primary/15 sm:self-auto"
                  disabled={itemTypes.length === 0}
                  onClick={() => setActiveDrawer("create-parent")}
                >
                  <PackagePlus className="size-3.5" />
                  New product
                </Button>
              </div>
            </header>
          </div>

          <section className={cn(panelClass, "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden")}>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-stretch lg:gap-3 lg:p-4">
              <aside className="flex max-h-[40vh] w-full shrink-0 flex-col gap-3 overflow-y-auto border-border/40 lg:max-h-none lg:w-56 lg:border-r lg:pr-3 xl:w-64">
                <div className="flex items-center gap-2 text-foreground">
                  <Filter className="size-4 text-primary" aria-hidden />
                  <h2 className="text-sm font-semibold">Filters</h2>
                </div>
                <form className="space-y-3" onSubmit={onSearchSubmit}>
                  <label className="flex flex-col gap-1.5">
                    <span className={filterLabelClass}>Search</span>
                    <input
                      id="catalog-omni"
                      className={quickInputClass}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Name, SKU, barcode…"
                      aria-label="Search catalog"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={filterLabelClass}>Exact barcode</span>
                    <input
                      className={cn(quickInputClass, "font-mono text-xs")}
                      value={barcodeExact}
                      onChange={(event) => setBarcodeExact(event.target.value)}
                      placeholder="POS lookup"
                      aria-label="Filter by exact barcode"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={filterLabelClass}>Category</span>
                    <select
                      className={cn(quickInputClass, "cursor-pointer py-2.5")}
                      value={filterCategoryId}
                      onChange={(event) => setFilterCategoryId(event.target.value)}
                      aria-label="Filter by category"
                    >
                      <option value="">All categories</option>
                      {sortedCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {!c.active ? " (inactive)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={filterLabelClass}>Scope</span>
                    <select
                      className={cn(quickInputClass, "cursor-pointer py-2.5")}
                      value={catalogScope}
                      onChange={(event) => setCatalogScope(event.target.value as CatalogListScope)}
                      aria-label="Catalog list scope"
                    >
                      <option value="ALL">Full tree (default)</option>
                      <option value="SKUS_ONLY">Sellable SKUs only</option>
                      <option value="PARENTS_ONLY">Group labels only</option>
                      <option value="VARIANTS_ONLY">Option SKUs only</option>
                    </select>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-input"
                      checked={includeCategoryDescendants}
                      onChange={(event) => setIncludeCategoryDescendants(event.target.checked)}
                      disabled={!filterCategoryId.trim()}
                    />
                    Include subcategories
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-input"
                      checked={filterNoBarcode}
                      onChange={(event) => setFilterNoBarcode(event.target.checked)}
                    />
                    Missing barcode
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-input"
                      checked={filterIncludeInactive}
                      onChange={(event) => setFilterIncludeInactive(event.target.checked)}
                    />
                    Include inactive
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="submit" size="sm" className="rounded-lg">
                      Apply search
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        setSearch("");
                        setDebouncedSearch("");
                        setBarcodeExact("");
                        setFilterCategoryId("");
                        setCatalogScope("ALL");
                        setIncludeCategoryDescendants(true);
                        setFilterNoBarcode(false);
                        setFilterIncludeInactive(false);
                        setMessage("");
                        void loadCategoriesAndTypes().then(() => refreshFullCatalog());
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </form>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  <kbd className="rounded border bg-muted px-1 font-sans">/</kbd> focuses search. Scroll the grid to load
                  the next page.
                </p>
              </aside>
              <div className="flex min-h-[12rem] min-w-0 flex-1 flex-col gap-2 lg:min-h-0 lg:overflow-hidden lg:pr-1">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    <span className="text-foreground">{listTotalElements}</span> in view
                    {listRows.length < listTotalElements ? (
                      <span className="text-muted-foreground"> · {listRows.length} loaded</span>
                    ) : null}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={listDensity === "comfortable" ? "secondary" : "ghost"}
                      className="h-8 gap-1 px-2"
                      onClick={() => setListDensity("comfortable")}
                      aria-label="Comfortable row height"
                    >
                      <Rows3 className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={listDensity === "dense" ? "secondary" : "ghost"}
                      className="h-8 gap-1 px-2"
                      onClick={() => setListDensity("dense")}
                      aria-label="Dense rows"
                    >
                      <List className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 lg:hidden"
                      disabled={!detail}
                      onClick={() =>
                        document
                          .getElementById("product-workspace-editor")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                    >
                      Edit selected
                    </Button>
                  </div>
                </div>
                {rowSelection.size > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">{rowSelection.size} selected</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {canCatalogWrite ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="h-7 gap-1 text-xs"
                          disabled={bulkDeleteBusy}
                          onClick={() => void onBulkDeleteSelected()}
                        >
                          {bulkDeleteBusy ? (
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                          ) : (
                            <Trash2 className="size-3" aria-hidden />
                          )}
                          Delete selected
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={bulkDeleteBusy}
                        onClick={() => setRowSelection(new Set())}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="min-h-0 flex-1">
                  <VirtualizedCatalogBody
                  rows={listRows}
                  categoryById={categoryById}
                  selectedId={selectedId}
                  selectedIds={rowSelection}
                  density={listDensity}
                  onRowClick={(id) => selectProduct(id)}
                  onToggleRowSelect={onToggleRowSelect}
                  isRowActive={isListRowActive}
                  loadingMore={listLoadingMore}
                  hasMore={!listLast}
                  onLoadMore={loadMoreCatalog}
                  initialLoading={listLoadingInitial}
                />
                </div>
              </div>
              <div
                id="product-workspace-editor"
                className="scroll-mt-4 flex min-h-[min(48vh,26rem)] w-full shrink-0 flex-col border-t border-border/50 pt-3 lg:min-h-0 lg:max-w-none lg:flex-[0_1_26rem] lg:border-l lg:border-t-0 lg:pt-0 lg:pl-4 xl:flex-[0_1_30rem] 2xl:flex-[0_1_34rem]"
              >
                <div
                  className={cn(
                    "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/85 shadow-inner",
                    "dark:bg-card/75",
                  )}
                >
                  <div className="shrink-0 border-b border-border/50 bg-muted/25 px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
                        <span className="mr-2 inline-flex size-5 items-center justify-center rounded-md bg-primary/15 text-[10px] font-bold text-primary sm:size-6 sm:text-xs">
                          2
                        </span>
                        Inspect &amp; edit
                      </h2>
                      {detail ?
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            detail.variantOfItemId ?
                              "bg-violet-500/20 text-violet-900 ring-1 ring-violet-500/30 dark:text-violet-100"
                            : "bg-emerald-500/20 text-emerald-950 ring-1 ring-emerald-600/25 dark:text-emerald-100",
                          )}
                        >
                          {detail.variantOfItemId ? "Option" : "Group"}
                        </span>
                      : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {detail ? (
                        <>
                          <span className="font-medium text-foreground">{detail.name}</span>
                          {detail.variantName ? (
                            <span className="text-muted-foreground"> ({detail.variantName})</span>
                          ) : null}
                          . Price, shelf life, stock, and variants — scroll inside this panel when needed.
                        </>
                      ) : (
                        <>
                          Select a row in the catalog, or start with{" "}
                          <span className="font-medium text-foreground">New product</span>.
                        </>
                      )}
                    </p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    <div className="space-y-6 p-4 sm:p-5">
          {!detail ? (
            <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04]">
                <MousePointerClick className="size-8 text-primary/70" aria-hidden />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Choose something from the catalog</p>
                <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Pick a row in the catalog, or create a <span className="font-medium text-foreground">standalone</span>{" "}
                  product (one sellable SKU to start).
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground">No row selected yet</p>
                <Button
                  type="button"
                  variant="default"
                  disabled={itemTypes.length === 0}
                  onClick={() => setActiveDrawer("create-parent")}
                  className="gap-2 rounded-xl shadow-sm"
                >
                  <PackagePlus className="size-4" aria-hidden />
                  New product
                </Button>
              </div>
            </div>
          ) : (
            <>
              {detail.variantOfItemId ? (
                <div className="flex gap-2 rounded-xl border border-violet-500/40 bg-violet-500/[0.1] px-3 py-2.5 text-xs text-violet-950 dark:text-violet-100">
                  <Layers className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden />
                  <div>
                    <p className="font-semibold">Option SKU</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-violet-800/95 dark:text-violet-200/95">
                      This row is a <strong>sellable option</strong> under a group label. Labels use a{" "}
                      <span className="whitespace-nowrap font-medium text-emerald-700 dark:text-emerald-300">
                        green edge
                      </span>{" "}
                      in the list; options use{" "}
                      <span className="whitespace-nowrap font-medium text-violet-700 dark:text-violet-300">
                        violet
                      </span>
                      .
                    </p>
                  </div>
                </div>
              ) : variantRows.length > 0 ? (
                <div className="flex gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/[0.08] px-3 py-2.5 text-xs text-emerald-950 dark:text-emerald-50">
                  <Package className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
                  <div>
                    <p className="font-semibold">Group label</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-emerald-900/90 dark:text-emerald-100/90">
                      This green row is only the <strong>shared name / merchandising</strong> for{" "}
                      <strong>{variantRows.length} option SKU(s)</strong>. What you stock and sell day to day is usually
                      each violet option below—not this row.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/[0.08] px-3 py-2.5 text-xs text-emerald-950 dark:text-emerald-50">
                  <Package className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
                  <div>
                    <p className="font-semibold">Standalone product</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-emerald-900/90 dark:text-emerald-100/90">
                      <strong>One sellable SKU</strong> with no separate options. Use{" "}
                      <span className="font-medium">Add another SKU</span> when you need more stocked lines under the
                      same display name.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-muted shadow-inner">
                    {coverImageUrl(detail) ? (
                      <Image
                        src={coverImageUrl(detail)!}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="size-6 text-muted-foreground/50" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="truncate text-base font-semibold tracking-tight">{detail.name}</h3>
                    <p className="font-mono text-xs text-muted-foreground">
                      {detail.sku}
                      {detail.variantName ? ` · ${detail.variantName}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {detail.active === false ? (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          Inactive
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                      {detail.webPublished ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Online shop
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                  <div className="flex flex-col gap-1.5 sm:items-end">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Full record
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setActiveDrawer("edit-product")}
                      >
                        <PencilLine className="size-3.5" />
                        All fields
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setActiveDrawer("photos")}
                      >
                        <Camera className="size-3.5" />
                        Photos
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:items-end">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Grow this product
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 shadow-sm"
                      onClick={() => setActiveDrawer("add-variant")}
                    >
                      <Layers className="size-3.5" />
                      Add another SKU
                    </Button>
                    {detail.variantOfItemId && parentBannerName ? (
                      <p className="max-w-[14rem] text-right text-[10px] leading-snug text-muted-foreground">
                        New SKUs attach to{" "}
                        <span className="font-medium text-foreground">{parentBannerName}</span>, not this option.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {detail.variantOfItemId ? (
                <div className="flex gap-3 rounded-xl border border-primary/25 bg-primary/[0.07] px-3 py-3 text-xs leading-relaxed text-foreground">
                  <Layers className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <p>
                    You&apos;re viewing one <span className="font-semibold text-primary">sellable SKU</span>
                    {parentBannerName ? (
                      <>
                        {" "}
                        under <span className="font-medium">{parentBannerName}</span>
                      </>
                    ) : null}
                    . The table at the bottom lists every option SKU for that same group — click another row to switch.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CircleDollarSign className="size-4 text-primary" aria-hidden />
                  Money snapshot
                </h3>
                <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      Shelf price: <strong className="text-foreground">{formatAmount(sellPrice)}</strong>
                    </span>
                    {primaryLink ? (
                      <span>
                        Primary cost:{" "}
                        <strong className="text-foreground">{formatAmount(primaryCost)}</strong>
                        {marginPct != null ? (
                          <span className="text-muted-foreground"> ({marginPct.toFixed(1)}% margin)</span>
                        ) : null}
                      </span>
                    ) : supplierLinks.length === 0 ? (
                      <span>No supplier links.</span>
                    ) : (
                      <span>Pick a primary supplier to see margin.</span>
                    )}
                  </div>
                  {canCatalogWrite ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
                      onClick={() => openQuickEdit("bundlePrice")}
                    >
                      <Pencil className="size-3" aria-hidden />
                      Change price
                    </Button>
                  ) : null}
                </div>
              </div>

              {canCatalogWrite ? (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Wrench className="size-4 text-primary" aria-hidden />
                    Fast edits
                  </h3>
                  <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      One field at a time — Edit, type, Save. For category or long description, use{" "}
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                        onClick={() => setActiveDrawer("edit-product")}
                      >
                        All fields
                      </button>
                      .
                    </p>
                    {quickSaving ? (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
                        Saving…
                      </span>
                    ) : null}
                  </div>
                  <dl className="mt-4 space-y-3">
                    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <dt className="text-xs font-medium text-muted-foreground">Display name</dt>
                      <dd className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        {quickEdit === "productName" ? (
                          <>
                            <input
                              className={cn(quickInputClass, "sm:max-w-md")}
                              value={quickProductName}
                              onChange={(event) => setQuickProductName(event.target.value)}
                              placeholder="Customer-facing title"
                              aria-label="Display name"
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 gap-1 rounded-lg"
                                disabled={quickSaving}
                                onClick={saveQuickProductName}
                              >
                                <Save className="size-3.5" aria-hidden />
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-lg"
                                disabled={quickSaving}
                                onClick={cancelQuickEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="truncate text-sm font-medium text-foreground">{detail.name}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
                              onClick={() => openQuickEdit("productName")}
                            >
                              <Pencil className="size-3" aria-hidden />
                              Edit
                            </Button>
                          </>
                        )}
                      </dd>
                    </div>

                    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <dt className="text-xs font-medium text-muted-foreground">Barcode</dt>
                      <dd className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        {quickEdit === "barcode" ? (
                          <>
                            <input
                              className={cn(quickInputClass, "sm:max-w-xs")}
                              value={quickBarcode}
                              onChange={(event) => setQuickBarcode(event.target.value)}
                              placeholder="Scan or type…"
                              aria-label="Barcode"
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 gap-1 rounded-lg"
                                disabled={quickSaving}
                                onClick={() => void saveQuickBarcode()}
                              >
                                <Save className="size-3.5" aria-hidden />
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-lg"
                                disabled={quickSaving}
                                onClick={cancelQuickEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="truncate font-mono text-sm text-foreground">
                              {detail.barcode?.trim() || "—"}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
                              onClick={() => openQuickEdit("barcode")}
                            >
                              <Pencil className="size-3" aria-hidden />
                              Edit
                            </Button>
                          </>
                        )}
                      </dd>
                    </div>

                    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <dt className="text-xs font-medium text-muted-foreground">Units per pack</dt>
                      <dd className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        {quickEdit === "bundleQty" ? (
                          <>
                            <input
                              className={cn(quickInputClass, "sm:w-28")}
                              inputMode="numeric"
                              value={quickBundleQty}
                              onChange={(event) => setQuickBundleQty(event.target.value)}
                              placeholder="e.g. 6"
                              aria-label="Units per pack"
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 gap-1 rounded-lg"
                                disabled={quickSaving}
                                onClick={saveQuickBundleQty}
                              >
                                <Save className="size-3.5" aria-hidden />
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-lg"
                                disabled={quickSaving}
                                onClick={cancelQuickEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium tabular-nums text-foreground">
                              {detail.bundleQty != null ? detail.bundleQty : "—"}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
                              onClick={() => openQuickEdit("bundleQty")}
                            >
                              <Pencil className="size-3" aria-hidden />
                              Edit
                            </Button>
                          </>
                        )}
                      </dd>
                    </div>

                    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <dt className="text-xs font-medium text-muted-foreground">Shelf price</dt>
                      <dd className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        {quickEdit === "bundlePrice" ? (
                          <>
                            <input
                              className={cn(quickInputClass, "sm:max-w-[10rem]")}
                              inputMode="decimal"
                              value={quickBundlePrice}
                              onChange={(event) => setQuickBundlePrice(event.target.value)}
                              placeholder="0.00"
                              aria-label="Shelf price"
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 gap-1 rounded-lg"
                                disabled={quickSaving}
                                onClick={saveQuickBundlePrice}
                              >
                                <Save className="size-3.5" aria-hidden />
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-lg"
                                disabled={quickSaving}
                                onClick={cancelQuickEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium tabular-nums text-foreground">
                              {formatAmount(sellPrice)}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
                              onClick={() => openQuickEdit("bundlePrice")}
                            >
                              <Pencil className="size-3" aria-hidden />
                              Edit
                            </Button>
                          </>
                        )}
                      </dd>
                    </div>

                    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <dt className="text-xs font-medium text-muted-foreground">Min stock level</dt>
                      <dd className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        {quickEdit === "minStock" ? (
                          <>
                            <input
                              className={cn(quickInputClass, "sm:max-w-[10rem]")}
                              inputMode="decimal"
                              value={quickMinStock}
                              onChange={(event) => setQuickMinStock(event.target.value)}
                              placeholder="Reorder hint"
                              aria-label="Min stock level"
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 gap-1 rounded-lg"
                                disabled={quickSaving}
                                onClick={saveQuickMinStock}
                              >
                                <Save className="size-3.5" aria-hidden />
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-lg"
                                disabled={quickSaving}
                                onClick={cancelQuickEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium tabular-nums text-foreground">
                              {formatAmount(toNumber(detail.minStockLevel))}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
                              onClick={() => openQuickEdit("minStock")}
                            >
                              <Pencil className="size-3" aria-hidden />
                              Edit
                            </Button>
                          </>
                        )}
                      </dd>
                    </div>

                    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background/80 p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <dt className="text-xs font-medium text-muted-foreground">Reorder</dt>
                      <dd className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
                        {quickEdit === "reorder" ? (
                          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
                            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                              Level
                              <input
                                className={quickInputClass}
                                inputMode="decimal"
                                value={quickReorderLevel}
                                onChange={(event) => setQuickReorderLevel(event.target.value)}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                              Qty
                              <input
                                className={quickInputClass}
                                inputMode="decimal"
                                value={quickReorderQty}
                                onChange={(event) => setQuickReorderQty(event.target.value)}
                              />
                            </label>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 gap-1 rounded-lg"
                                disabled={quickSaving}
                                onClick={saveQuickReorder}
                              >
                                <Save className="size-3.5" aria-hidden />
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-lg"
                                disabled={quickSaving}
                                onClick={cancelQuickEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
                            <span className="text-xs text-muted-foreground">
                              Lvl{" "}
                              <strong className="text-foreground">
                                {formatAmount(toNumber(detail.reorderLevel))}
                              </strong>
                              {" · "}Qty{" "}
                              <strong className="text-foreground">
                                {formatAmount(toNumber(detail.reorderQty))}
                              </strong>
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
                              onClick={() => openQuickEdit("reorder")}
                            >
                              <Pencil className="size-3" aria-hidden />
                              Edit
                            </Button>
                          </div>
                        )}
                      </dd>
                    </div>
                  </dl>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                  Quick edits need <code className="text-[11px]">{Permission.CatalogItemsWrite}</code>. You can still
                  browse and open drawers if your role allows.
                </p>
              )}

              {supplierLinks.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground">Supplier links</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground"
                      onClick={() => setActiveDrawer("edit-product")}
                    >
                      Edit in Details
                    </Button>
                  </div>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="py-1 pr-2">Supplier</th>
                          <th className="py-1 pr-2">Primary</th>
                          <th className="py-1 pr-2">Supplier SKU</th>
                          <th className="py-1 pr-2">Default cost</th>
                          <th className="py-1">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierLinks.map((link) => (
                          <tr key={link.id} className="border-b border-muted/50">
                            <td className="py-1 pr-2">{link.supplierName}</td>
                            <td className="py-1 pr-2">{link.primary ? "Yes" : "—"}</td>
                            <td className="py-1 pr-2">{link.supplierSku ?? "—"}</td>
                            <td className="py-1 pr-2">
                              {formatAmount(toNumber(link.defaultCostPrice))}
                            </td>
                            <td className="py-1">{link.active ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-foreground">Option SKUs</h4>
                <p className="mt-1 max-w-prose text-xs text-muted-foreground">
                  <strong className="text-foreground">Tap a row</strong> to inspect that SKU.{" "}
                  <strong className="text-foreground">Edit</strong> updates display name and barcode inline; SKU and
                  option label stay in the Details drawer.
                </p>
                <div className="mt-3 overflow-x-auto rounded-xl border border-border/60 bg-background">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="w-10 py-2 pl-3 pr-2" aria-label="Photo" />
                        <th className="py-2 pr-2 font-medium">Name</th>
                        <th className="py-2 pr-2 font-medium">Option</th>
                        <th className="py-2 pr-2 font-medium">SKU</th>
                        <th className="py-2 pr-2 font-medium">Barcode</th>
                        <th className="py-2 pr-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                            {detail.variantOfItemId && parentVariants === null ?
                              "Loading options…"
                            : "No options yet — open Add option to create one."}
                          </td>
                        </tr>
                      ) : (
                        variantRows.map((v) => {
                          const vThumb = itemListThumbnailUrl(v);
                          const vSelected = selectedId === v.id;
                          const editing = variantInlineEditId === v.id;
                          return (
                            <Fragment key={v.id}>
                              <tr
                                role="button"
                                tabIndex={0}
                                className={cn(
                                  "cursor-pointer border-b border-muted/50 transition-colors last:border-0",
                                  "hover:bg-muted/35",
                                  vSelected ? "bg-primary/[0.08] ring-1 ring-inset ring-primary/15" : "",
                                  editing ? "bg-muted/25" : "",
                                )}
                                onClick={() => {
                                  if (!editing) {
                                    selectProduct(v.id);
                                  }
                                }}
                                onKeyDown={(event) => {
                                  if (editing) {
                                    return;
                                  }
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    selectProduct(v.id);
                                  }
                                }}
                              >
                                <td className="py-2 pl-3 pr-2 align-middle">
                                  {vThumb ? (
                                    <span className="relative block h-9 w-9 overflow-hidden rounded border bg-muted">
                                      <Image
                                        src={vThumb}
                                        alt=""
                                        width={36}
                                        height={36}
                                        className="object-cover"
                                      />
                                    </span>
                                  ) : (
                                    <span className="block h-9 w-9 rounded border border-dashed border-muted-foreground/20 bg-muted/20" />
                                  )}
                                </td>
                                <td className="py-2 pr-2 align-middle font-medium text-foreground">{v.name}</td>
                                <td className="py-2 pr-2 align-middle">{v.variantName ?? "—"}</td>
                                <td className="py-2 pr-2 align-middle font-mono text-[11px]">{v.sku}</td>
                                <td className="py-2 pr-2 align-middle font-mono text-[11px]">
                                  {v.barcode ?? "—"}
                                </td>
                                <td className="py-2 pr-3 text-right align-middle">
                                  {canCatalogWrite ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1 rounded-full px-3"
                                      onClick={(event) => startVariantRowEdit(v, event)}
                                    >
                                      <Pencil className="size-3" aria-hidden />
                                      Edit
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              </tr>
                              {editing ? (
                                <tr className="border-b border-muted/40 bg-muted/20">
                                  <td colSpan={6} className="px-3 py-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                                      <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-[11px] font-medium text-muted-foreground">
                                        Display name
                                        <input
                                          className={quickInputClass}
                                          value={variantEditName}
                                          onChange={(event) => setVariantEditName(event.target.value)}
                                          aria-label="Variant display name"
                                        />
                                      </label>
                                      <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-[11px] font-medium text-muted-foreground">
                                        Barcode
                                        <input
                                          className={cn(quickInputClass, "font-mono")}
                                          value={variantEditBarcode}
                                          onChange={(event) => setVariantEditBarcode(event.target.value)}
                                          placeholder="Scan or type…"
                                          aria-label="Variant barcode"
                                        />
                                      </label>
                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="h-9 gap-1 rounded-lg"
                                          disabled={quickSaving}
                                          onClick={() => void saveVariantInline()}
                                        >
                                          {quickSaving ? (
                                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                                          ) : (
                                            <Save className="size-3.5" aria-hidden />
                                          )}
                                          Save
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="h-9 rounded-lg"
                                          disabled={quickSaving}
                                          onClick={cancelVariantInlineEdit}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                    <p className="mt-3 text-[11px] text-muted-foreground">
                                      Option label and SKU are set at creation — adjust them from{" "}
                                      <button
                                        type="button"
                                        className="font-medium text-primary underline-offset-2 hover:underline"
                                        onClick={() => setActiveDrawer("edit-product")}
                                      >
                                        Details
                                      </button>{" "}
                                      if your workflow allows.
                                    </p>
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {message ? <DashboardNotice text={message} /> : null}
        </div>
      </div>

    <FormDrawer
      open={activeDrawer === "create-parent"}
      onOpenChange={(open) => {
        if (!open) setActiveDrawer(null);
      }}
      title="New product"
      description="Creates one standalone sellable SKU. If you later add options, this row becomes the shared group label; stock and barcodes usually live on each option row."
      contextLabel="Catalog · Step 1"
      icon={<PackagePlus className="size-5 text-primary" aria-hidden />}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setActiveDrawer(null)}>
            Cancel
          </Button>
          <Button type="submit" form="create-parent-form" disabled={itemTypes.length === 0}>
            Create product
          </Button>
        </div>
      }
    >
      <form id="create-parent-form" className="space-y-5" onSubmit={onCreateParent}>
        {itemTypes.length === 0 ? (
          <p className="text-sm text-destructive">
            No item types in tenant — seed catalog (Slice 4) before creating products.
          </p>
        ) : null}
        <FormDrawerFields legend="Identity" hint="Starts as one sellable SKU. Adding options later turns this row into the shared group label.">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground" htmlFor="drawer-item-type">
            Item type
            <select
              id="drawer-item-type"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={parentDraft.itemTypeId}
              onChange={(event) =>
                setParentDraft((previous) => ({
                  ...previous,
                  itemTypeId: event.target.value,
                }))
              }
              required
            >
              {itemTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label} ({type.key})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Display name
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="Customer-facing title"
              value={parentDraft.name}
              onChange={(event) =>
                setParentDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              required
              aria-label="New product name"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">SKU</span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono sm:min-w-[8rem]"
                  placeholder="Optional — auto number if empty"
                  value={parentDraft.sku}
                  onChange={(event) =>
                    setParentDraft((previous) => ({ ...previous, sku: event.target.value }))
                  }
                  aria-label="New product SKU"
                />
                {nextAutoSkuHint ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 gap-1 px-2.5 text-xs"
                    onClick={() =>
                      setParentDraft((previous) => ({ ...previous, sku: nextAutoSkuHint }))
                    }
                  >
                    Use {nextAutoSkuHint}
                  </Button>
                ) : null}
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Leave empty to save with the next free numeric code
                {nextAutoSkuHint ? ` (currently ${nextAutoSkuHint})` : ""}.
              </p>
            </div>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Barcode
              <input
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder="Optional"
                value={parentDraft.barcode}
                onChange={(event) =>
                  setParentDraft((previous) => ({ ...previous, barcode: event.target.value }))
                }
                aria-label="New product barcode"
              />
            </label>
          </div>
        </FormDrawerFields>

        <FormDrawerFields legend="Merchandising" hint="Categories power kiosk rails and shop navigation.">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground" htmlFor="drawer-parent-category">
            Category
            <select
              id="drawer-parent-category"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={parentDraft.categoryId}
              onChange={(event) =>
                setParentDraft((previous) => ({ ...previous, categoryId: event.target.value }))
              }
            >
              <option value="">— None —</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {!category.active ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </label>
        </FormDrawerFields>

        {canLinkSupplier ? (
          <FormDrawerFields
            legend="Supplier shortcut"
            hint={
              <>
                Optional live link via{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">POST /supplier-links</code>. Leave
                blank to wire vendors later.
              </>
            }
          >
            {canListSuppliers ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={suppliersLoading}
                onClick={() => void loadSuppliersForLink()}
              >
                {suppliersLoading ? "Loading…" : "Refresh supplier list"}
              </Button>
            ) : null}
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Supplier
              <select
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={
                  suppliersForLink.some((s) => s.id === parentDraft.supplierId)
                    ? parentDraft.supplierId
                    : ""
                }
                onChange={(event) =>
                  setParentDraft((p) => ({ ...p, supplierId: event.target.value }))
                }
              >
                <option value="">— None —</option>
                {suppliersForLink.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Supplier ID (override)
              <input
                className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs"
                placeholder="UUID"
                value={parentDraft.supplierId}
                onChange={(event) =>
                  setParentDraft((p) => ({ ...p, supplierId: event.target.value }))
                }
                aria-label="Supplier ID"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Supplier SKU
                <input
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={parentDraft.supplierSku}
                  onChange={(event) =>
                    setParentDraft((p) => ({ ...p, supplierSku: event.target.value }))
                  }
                  aria-label="Supplier SKU"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Default cost
                <input
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={parentDraft.defaultCostPrice}
                  onChange={(event) =>
                    setParentDraft((p) => ({ ...p, defaultCostPrice: event.target.value }))
                  }
                  aria-label="Default cost from supplier"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={parentDraft.setPrimarySupplier}
                onChange={(event) =>
                  setParentDraft((p) => ({ ...p, setPrimarySupplier: event.target.checked }))
                }
              />
              Set as primary supplier
            </label>
          </FormDrawerFields>
        ) : null}
      </form>
    </FormDrawer>

    <FormDrawer
      open={activeDrawer === "edit-product" && detail !== null}
      onOpenChange={(open) => {
        if (!open) setActiveDrawer(null);
      }}
      title="Product details"
      description={
        detail
          ? `Editing SKU ${detail.sku}${detail.variantName ? ` · ${detail.variantName}` : ""}`
          : ""
      }
      contextLabel="Inspector"
      icon={<PencilLine className="size-5 text-primary" aria-hidden />}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setActiveDrawer(null)}>
            Close
          </Button>
          <Button type="submit" form="edit-product-form">
            Save changes
          </Button>
          <Button type="button" variant="destructive" onClick={() => void onDeleteItem()}>
            Delete
          </Button>
        </div>
      }
    >
      {detail ? (
        <form id="edit-product-form" className="space-y-4" onSubmit={onPatchItem}>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Name
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={patchDraft.name ?? ""}
              onChange={(event) =>
                setPatchDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              aria-label="Product name"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Barcode
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
              value={patchDraft.barcode ?? ""}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  barcode: event.target.value,
                }))
              }
              aria-label="Barcode"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Long description
            <textarea
              className="min-h-[6rem] resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={patchDraft.description ?? ""}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              aria-label="Product description"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Category
            <select
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={patchDraft.categoryId}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  categoryId: event.target.value,
                }))
              }
              aria-label="Product category"
            >
              <option value="">— None —</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {!category.active ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Bundle / selling price (optional)
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              inputMode="decimal"
              placeholder="Leave empty to leave unchanged on save"
              value={patchDraft.bundlePriceStr}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  bundlePriceStr: event.target.value,
                }))
              }
              aria-label="Bundle price"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Cover URL / legacy key
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground"
              placeholder="HTTPS cover or legacy key"
              value={patchDraft.imageKey}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  imageKey: event.target.value,
                }))
              }
              aria-label="Image key"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={patchDraft.active ?? true}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  active: event.target.checked,
                }))
              }
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={patchDraft.webPublished ?? false}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  webPublished: event.target.checked,
                }))
              }
            />
            Show on online shop (when storefront is enabled)
          </label>
        </form>
      ) : null}
    </FormDrawer>

    <FormDrawer
      open={activeDrawer === "photos" && detail !== null}
      onOpenChange={(open) => {
        if (!open) setActiveDrawer(null);
      }}
      title="Photo studio"
      description="Upload once — we stash Cloudinary metadata plus a colour accent you will see shimmer on cards."
      contextLabel="Media"
      icon={<Camera className="size-5 text-primary" aria-hidden />}
      footer={
        <p className="text-[11px] text-muted-foreground">
          Requires{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            APP_MEDIA_CLOUDINARY_ENABLED
          </code>{" "}
          on the API.
        </p>
      }
    >
      {detail ? (
        <div className="space-y-5">
          <div className="space-y-3 rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/50 via-background to-amber-50/35 p-4 dark:border-violet-900/40 dark:from-violet-950/25 dark:to-amber-950/15">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">Live cover</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Dominant colours paint subtle shadows around thumbnails across kiosk lanes.
              </p>
            </div>
            {coverImageUrl(detail) ? (
              <div
                className="relative mx-auto h-44 w-full max-w-sm overflow-hidden rounded-xl border-2 border-background shadow-xl"
                style={{
                  boxShadow: `0 18px 42px -16px ${sortedImages.find((i) => i.predominantColorHex)?.predominantColorHex ?? "rgba(99,102,241,0.45)"}`,
                }}
              >
                <Image
                  src={coverImageUrl(detail)!}
                  alt="Cover"
                  fill
                  className="object-cover"
                  sizes="320px"
                  priority
                />
              </div>
            ) : detail.imageKey ? (
              <p className="text-xs text-muted-foreground">
                Cover (legacy):{" "}
                <span className="font-mono break-all text-foreground">{detail.imageKey}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No hero image yet — beam one in below.</p>
            )}
          </div>

          <form
            className="space-y-3 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 p-4"
            onSubmit={(e) => onUploadCatalogImage(e).catch(() => undefined)}
          >
            <p className="text-sm font-medium text-foreground">Beam a new photo</p>
            <input
              type="file"
              accept="image/*"
              className="max-w-full text-xs file:mr-2 file:rounded file:border file:bg-background file:px-2 file:py-1"
              onChange={(event) => setPendingCatalogImage(event.target.files?.[0] ?? null)}
            />
            {pendingCatalogImage ? (
              <p className="text-[11px] text-muted-foreground">Selected: {pendingCatalogImage.name}</p>
            ) : null}
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="Alt text (optional)"
              value={catalogImageAlt}
              onChange={(event) => setCatalogImageAlt(event.target.value)}
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={catalogImagePrimary}
                onChange={(event) => setCatalogImagePrimary(event.target.checked)}
              />
              Set as cover / listing thumbnail
            </label>
            <Button type="submit" size="sm" className="w-fit" disabled={catalogImageUploadBusy || !pendingCatalogImage}>
              {catalogImageUploadBusy ? "Uploading…" : "Upload to Cloudinary"}
            </Button>
          </form>

          {sortedImages.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {sortedImages.map((img) => {
                const url = galleryImageUrl(img);
                const accent = img.predominantColorHex?.trim() ?? "#818cf8";
                return (
                  <figure
                    key={img.id}
                    className="relative overflow-hidden rounded-lg border bg-background p-2 shadow-sm transition hover:shadow-md"
                    style={{ borderColor: `${accent}66` }}
                  >
                    {url ? (
                      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                        <Image
                          src={url}
                          alt={img.altText ?? "Product"}
                          fill
                          className="object-cover"
                          sizes="180px"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-square items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                        No preview
                      </div>
                    )}
                    <figcaption className="mt-2 space-y-1 pr-14 text-[10px] text-muted-foreground">
                      <div className="font-mono text-[9px] break-all text-foreground">
                        {img.provider === "cloudinary" ? img.publicId ?? img.s3Key : img.s3Key}
                      </div>
                      {img.phash ? (
                        <div>
                          Fingerprint · <span className="font-mono">{img.phash.slice(0, 14)}…</span>
                        </div>
                      ) : null}
                      {img.bytes != null ? (
                        <div>
                          {(img.bytes / 1024).toFixed(1)} KB
                          {img.format ? ` · ${img.format}` : ""}
                          {img.width && img.height ? ` · ${img.width}×${img.height}` : ""}
                        </div>
                      ) : null}
                    </figcaption>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute bottom-2 right-2 h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => onRemoveGalleryImage(img.id).catch(() => undefined)}
                    >
                      Remove
                    </Button>
                  </figure>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No gallery slots yet.</p>
          )}
        </div>
      ) : null}
    </FormDrawer>

    <FormDrawer
      open={activeDrawer === "add-variant" && detail !== null}
      onOpenChange={(open) => {
        if (!open) setActiveDrawer(null);
      }}
      title="Add an option"
      description="Adds another sellable option under this group label — use when the product has multiple stocked SKUs (size, colour, etc.)."
      contextLabel="Variants · Step 2"
      icon={<Layers className="size-5 text-primary" aria-hidden />}
      width="wide"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setActiveDrawer(null)}>
            Cancel
          </Button>
          <Button type="submit" form="add-variant-form" disabled={variantCreateBusy}>
            {variantCreateBusy ? "Creating…" : "Create variant"}
          </Button>
        </div>
      }
    >
      {detail ? (
        <VariantDrawerForm
          variantDraft={variantDraft}
          setVariantDraft={setVariantDraft}
          suggestedNextSku={nextAutoSkuHint}
          sortedCategories={sortedCategories}
          branches={branches}
          suppliersForLink={suppliersForLink}
          suppliersLoading={suppliersLoading}
          loadSuppliersForLink={loadSuppliersForLink}
          canLinkSupplier={canLinkSupplier}
          canListSuppliers={canListSuppliers}
          canSetSellPrice={canSetSellPrice}
          canInventoryWrite={canInventoryWrite}
          currencyCode={currencyCode}
          pendingVariantImage={pendingVariantImage}
          setPendingVariantImage={setPendingVariantImage}
          onSubmit={onAddVariant}
          inputClassName={VARIANT_INPUT_CLASS}
        />
      ) : null}
    </FormDrawer>

    </>
  );
}
