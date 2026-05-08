"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiRequestError,
  addItemSupplierLink,
  createItem,
  createItemVariant,
  deleteItem,
  deleteItemImage,
  fetchBranches,
  fetchItemById,
  fetchItemSupplierLinks,
  fetchSuggestedNextSku,
  fetchSuppliers,
  patchItem,
  postSellingPrice,
  postStockIncrease,
  uploadItemImageToCloudinary,
  type BranchRecord,
  type ItemDetailRecord,
  type ItemSummaryRecord,
  type ItemSupplierLinkRecord,
  type SupplierRecord,
} from "@/lib/api";
import {
  type ParentDraft,
  type ProductDrawerId,
  type ProductEditDraft,
  type VariantDraft,
  EMPTY_PARENT,
} from "../_types";
import { buildCreateVariantBody, bundlePatchFromVariantDraft } from "../_utils";
import { emptyVariantDraft } from "../_types";

type Dependencies = {
  selectedId: string | null;
  detail: ItemDetailRecord | null;
  patchDraft: ProductEditDraft;
  setPatchDraft: (d: ProductEditDraft) => void;
  setDetail: (d: ItemDetailRecord | null) => void;
  setSupplierLinks: (links: ItemSupplierLinkRecord[]) => void;
  setParentVariants: (v: ItemSummaryRecord[] | null) => void;
  setVariantParentDisplayName: (n: string | null) => void;
  rowSelection: Set<string>;
  setRowSelection: (s: Set<string>) => void;
  listRows: ItemSummaryRecord[];
  canCatalogWrite: boolean;
  canLinkSupplier: boolean;
  canListSuppliers: boolean;
  canSetSellPrice: boolean;
  canInventoryWrite: boolean;
  currencyCode: string;
  refreshFullCatalog: () => Promise<void>;
  refreshSelectedDetail: () => Promise<void>;
  setMessage: (msg: string) => void;
  selectProduct: (id: string | null) => void;
  activeDrawer: ProductDrawerId | null;
  setActiveDrawer: (d: ProductDrawerId | null) => void;
  itemTypes: { id: string }[];
};

export function useProductMutations(d: Dependencies) {
  const {
    selectedId,
    detail,
    patchDraft,
    setPatchDraft,
    setDetail,
    setSupplierLinks,
    setParentVariants,
    setVariantParentDisplayName,
    rowSelection,
    setRowSelection,
    listRows,
    canCatalogWrite,
    canLinkSupplier,
    canListSuppliers,
    canSetSellPrice,
    canInventoryWrite,
    refreshFullCatalog,
    refreshSelectedDetail,
    setMessage,
    selectProduct,
    activeDrawer,
    setActiveDrawer,
    itemTypes,
  } = d;

  const [suppliersForLink, setSuppliersForLink] = useState<SupplierRecord[]>(
    [],
  );
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [pendingCatalogImage, setPendingCatalogImage] = useState<File | null>(
    null,
  );
  const [pendingVariantImage, setPendingVariantImage] = useState<File | null>(
    null,
  );
  const [catalogImageUploadBusy, setCatalogImageUploadBusy] = useState(false);
  const [catalogImageAlt, setCatalogImageAlt] = useState("");
  const [catalogImagePrimary, setCatalogImagePrimary] = useState(true);
  const [variantDraft, setVariantDraft] = useState<VariantDraft>(() =>
    emptyVariantDraft(),
  );
  const [variantCreateBusy, setVariantCreateBusy] = useState(false);
  const [variantInlineEditId, setVariantInlineEditId] = useState<string | null>(
    null,
  );
  const [variantEditName, setVariantEditName] = useState("");
  const [parentDraft, setParentDraft] = useState<ParentDraft>(EMPTY_PARENT);
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false);
  const [nextAutoSkuHint, setNextAutoSkuHint] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [quickSavingVariant, setQuickSavingVariant] = useState(false);

  // ─── load suppliers when relevant drawer opens ───────────────────────────
  const loadSuppliersForLink = useCallback(async () => {
    if (!canListSuppliers) return;
    setSuppliersLoading(true);
    try {
      setSuppliersForLink(await fetchSuppliers());
    } catch (e) {
      if (!(e instanceof ApiRequestError))
        setMessage(
          e instanceof Error ? e.message : "Failed to load suppliers.",
        );
    } finally {
      setSuppliersLoading(false);
    }
  }, [canListSuppliers, setMessage]);

  useEffect(() => {
    if (!canListSuppliers) return;
    if (activeDrawer !== "create-parent" && activeDrawer !== "add-variant")
      return;
    const id = window.setTimeout(() => {
      void loadSuppliersForLink();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeDrawer, canListSuppliers, loadSuppliersForLink]);

  // ─── load branches ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) setBranches(list.filter((b) => b.active));
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── auto-SKU hint ──────────────────────────────────────────────────────
  useEffect(() => {
    if (activeDrawer !== "create-parent" && activeDrawer !== "add-variant")
      return;
    const isVD = activeDrawer === "add-variant";
    const parentItemId =
      detail?.variantOfItemId?.trim() ||
      detail?.id?.trim() ||
      selectedId?.trim() ||
      "";
    if (isVD && !parentItemId) {
      setNextAutoSkuHint(null);
      return;
    }
    const catId =
      !isVD && parentDraft.categoryId.trim()
        ? parentDraft.categoryId.trim()
        : undefined;
    const pid = isVD ? parentItemId : undefined;
    const vn =
      isVD && variantDraft.variantName.trim()
        ? variantDraft.variantName.trim()
        : undefined;
    const delay = isVD ? 320 : 0;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const { suggestedSku } = await fetchSuggestedNextSku({
            categoryId: catId,
            parentItemId: pid,
            variantName: vn,
          });
          if (!cancelled) setNextAutoSkuHint(suggestedSku);
        } catch {
          if (!cancelled) setNextAutoSkuHint(null);
        }
      })();
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [
    activeDrawer,
    detail,
    selectedId,
    parentDraft.categoryId,
    variantDraft.variantName,
  ]);

  // ─── seed itemTypeId ────────────────────────────────────────────────────
  useEffect(() => {
    if (itemTypes.length === 0) return;
    setParentDraft((prev) =>
      prev.itemTypeId ? prev : { ...prev, itemTypeId: itemTypes[0].id },
    );
  }, [itemTypes]);

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE PARENT
  // ══════════════════════════════════════════════════════════════════════════
  const onCreateParent = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setMessage("");
      const savedType = parentDraft.itemTypeId;
      try {
        const created = await createItem({
          name: parentDraft.name,
          ...(parentDraft.sku.trim() ? { sku: parentDraft.sku.trim() } : {}),
          itemTypeId: parentDraft.itemTypeId,
          barcode: parentDraft.barcode || undefined,
          ...(parentDraft.categoryId.trim()
            ? { categoryId: parentDraft.categoryId.trim() }
            : {}),
        });
        const sup = parentDraft.supplierId.trim();
        if (canLinkSupplier && sup) {
          const costRaw = parentDraft.defaultCostPrice.trim();
          let cost: number | undefined;
          if (costRaw) {
            const n = Number(costRaw);
            if (!Number.isFinite(n))
              throw new Error("Default cost must be a valid number.");
            cost = n;
          }
          try {
            await addItemSupplierLink(created.id, {
              supplierId: sup,
              setPrimary: parentDraft.setPrimarySupplier,
              supplierSku: parentDraft.supplierSku.trim() || undefined,
              defaultCostPrice: cost,
            });
          } catch (linkErr) {
            await refreshFullCatalog();
            selectProduct(created.id);
            setParentDraft({ ...EMPTY_PARENT, itemTypeId: savedType });
            setMessage(
              linkErr instanceof Error
                ? `Product created. Supplier link failed: ${linkErr.message}`
                : "Product created but supplier link failed.",
            );
            return;
          }
        }
        setParentDraft({ ...EMPTY_PARENT, itemTypeId: savedType });
        await refreshFullCatalog();
        selectProduct(created.id);
        setActiveDrawer(null);
        setMessage(
          canLinkSupplier && sup
            ? "Product created and linked."
            : "Product created.",
        );
      } catch (err) {
        if (!(err instanceof ApiRequestError))
          setMessage(err instanceof Error ? err.message : "Create failed.");
      }
    },
    [
      parentDraft,
      canLinkSupplier,
      refreshFullCatalog,
      selectProduct,
      setActiveDrawer,
      setMessage,
    ],
  );

  // ══════════════════════════════════════════════════════════════════════════
  // PATCH
  // ══════════════════════════════════════════════════════════════════════════
  const onPatchItem = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedId) return;
      setMessage("");
      const body: Record<string, unknown> = {
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
        await patchItem(selectedId, body as never);
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
      } catch (err) {
        if (!(err instanceof ApiRequestError))
          setMessage(err instanceof Error ? err.message : "Update failed.");
      }
    },
    [
      selectedId,
      patchDraft,
      refreshFullCatalog,
      setDetail,
      setSupplierLinks,
      setPatchDraft,
      setActiveDrawer,
      setMessage,
    ],
  );

  // ══════════════════════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════════════════════
  const onDeleteItem = useCallback(async () => {
    if (
      !selectedId ||
      !window.confirm("Delete this product? Cannot be undone.")
    )
      return;
    setMessage("");
    try {
      await deleteItem(selectedId);
      await refreshFullCatalog();
      selectProduct(null);
      setActiveDrawer(null);
      setMessage("Deleted.");
    } catch (err) {
      if (!(err instanceof ApiRequestError))
        setMessage(err instanceof Error ? err.message : "Delete failed.");
    }
  }, [
    selectedId,
    refreshFullCatalog,
    selectProduct,
    setActiveDrawer,
    setMessage,
  ]);

  // ══════════════════════════════════════════════════════════════════════════
  // BULK DELETE
  // ══════════════════════════════════════════════════════════════════════════
  const onBulkDeleteSelected = useCallback(async () => {
    if (rowSelection.size === 0 || !canCatalogWrite) return;
    const ids = [...rowSelection];
    if (!window.confirm(`Delete ${ids.length} item(s)? Cannot be undone.`))
      return;
    setBulkDeleteBusy(true);
    setMessage("");
    const byId = new Map(listRows.map((r) => [r.id, r]));
    const parentIds = ids.filter((id) => !byId.get(id)?.variantOfItemId);
    const variantIds = ids.filter((id) => byId.get(id)?.variantOfItemId);
    const orphanCheck = parentIds.filter((pid) =>
      listRows.some(
        (r) => r.variantOfItemId === pid && !rowSelection.has(r.id),
      ),
    );
    if (
      orphanCheck.length > 0 &&
      !window.confirm(`Some groups have unselected options. Continue?`)
    ) {
      setBulkDeleteBusy(false);
      return;
    }
    const failed: string[] = [];
    for (const id of [...variantIds, ...parentIds]) {
      try {
        await deleteItem(id);
      } catch {
        failed.push(byId.get(id)?.name ?? id);
      }
    }
    await refreshFullCatalog();
    if (rowSelection.has(selectedId ?? "")) selectProduct(null);
    setRowSelection(new Set());
    setBulkDeleteBusy(false);
    setMessage(
      failed.length === 0
        ? `Deleted ${ids.length} item(s).`
        : `Partial success. Failed: ${failed.join(", ")}`,
    );
  }, [
    rowSelection,
    canCatalogWrite,
    listRows,
    selectedId,
    refreshFullCatalog,
    selectProduct,
    setRowSelection,
    setMessage,
  ]);

  // ══════════════════════════════════════════════════════════════════════════
  // ADD VARIANT
  // ══════════════════════════════════════════════════════════════════════════
  const onAddVariant = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const pid = detail?.variantOfItemId?.trim() || detail?.id || selectedId;
      if (!pid) {
        setMessage("Select a product first.");
        return;
      }
      setMessage("");
      setVariantCreateBusy(true);
      const warnings: string[] = [];
      try {
        let body;
        try {
          body = buildCreateVariantBody(variantDraft);
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Invalid variant.");
          return;
        }
        let bp;
        try {
          bp = bundlePatchFromVariantDraft(variantDraft);
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Invalid bundle.");
          return;
        }
        if (
          variantDraft.openingQty.trim() &&
          !variantDraft.openingBranchId.trim()
        ) {
          setMessage("Opening stock requires a branch.");
          return;
        }
        const created = await createItemVariant(pid, body);
        const vid = created.id;
        if (bp) {
          try {
            await patchItem(vid, bp);
          } catch {
            warnings.push("Bundle patch failed.");
          }
        }
        const sp = variantDraft.sellingPrice.trim();
        if (canSetSellPrice && sp && variantDraft.sellBranchId.trim()) {
          const ef = variantDraft.sellEffectiveFrom.trim();
          try {
            await postSellingPrice({
              itemId: vid,
              branchId: variantDraft.sellBranchId.trim(),
              price: Number(sp),
              effectiveFrom: ef,
            });
          } catch {
            warnings.push("Pricing failed.");
          }
        }
        if (canLinkSupplier && variantDraft.supplierId.trim()) {
          const costRaw = variantDraft.defaultCostPrice.trim();
          try {
            await addItemSupplierLink(vid, {
              supplierId: variantDraft.supplierId.trim(),
              setPrimary: variantDraft.setPrimarySupplier,
              supplierSku: variantDraft.supplierSku.trim() || undefined,
              defaultCostPrice: costRaw ? Number(costRaw) : undefined,
            });
          } catch {
            warnings.push("Supplier link failed.");
          }
        }
        if (
          canInventoryWrite &&
          variantDraft.openingQty.trim() &&
          variantDraft.openingBranchId.trim()
        ) {
          const qty = Number(variantDraft.openingQty.trim());
          const uc =
            variantDraft.openingUnitCost.trim() ||
            variantDraft.defaultCostPrice.trim();
          const ucVal = Number(uc);
          try {
            const payload: {
              branchId: string;
              itemId: string;
              quantity: number | string;
              unitCost?: number;
              notes?: string;
            } = {
              branchId: variantDraft.openingBranchId.trim(),
              itemId: vid,
              quantity: qty,
              notes: "Opening stock from product creation",
            };
            if (uc && Number.isFinite(ucVal)) payload.unitCost = ucVal;
            await postStockIncrease(
              payload as {
                branchId: string;
                itemId: string;
                quantity: string | number;
                unitCost: string | number;
                notes?: string | null | undefined;
              },
            );
          } catch {
            warnings.push("Opening stock failed.");
          }
        }
        await refreshFullCatalog();
        selectProduct(vid);
        setActiveDrawer(null);
        setVariantDraft(emptyVariantDraft());
        setMessage(
          warnings.length
            ? `Created. Warnings: ${warnings.join(" ")}`
            : "Variant created.",
        );
      } catch (err) {
        if (!(err instanceof ApiRequestError))
          setMessage(
            err instanceof Error ? err.message : "Create variant failed.",
          );
      } finally {
        setVariantCreateBusy(false);
      }
    },
    [
      detail,
      selectedId,
      variantDraft,
      canSetSellPrice,
      canLinkSupplier,
      canInventoryWrite,
      refreshFullCatalog,
      selectProduct,
      setActiveDrawer,
      setMessage,
    ],
  );

  // ══════════════════════════════════════════════════════════════════════════
  // IMAGE UPLOAD / REMOVE
  // ══════════════════════════════════════════════════════════════════════════
  const onUploadCatalogImage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedId || !pendingCatalogImage) {
        setMessage("Choose an image first.");
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
        setMessage("Photo uploaded.");
      } catch (err) {
        if (!(err instanceof ApiRequestError))
          setMessage(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setCatalogImageUploadBusy(false);
      }
    },
    [
      selectedId,
      pendingCatalogImage,
      catalogImageAlt,
      catalogImagePrimary,
      refreshSelectedDetail,
      refreshFullCatalog,
      setMessage,
    ],
  );

  const onRemoveGalleryImage = useCallback(
    async (imageId: string) => {
      if (!selectedId || !window.confirm("Remove this photo?")) return;
      setMessage("");
      try {
        await deleteItemImage(selectedId, imageId);
        await refreshSelectedDetail();
        await refreshFullCatalog();
        setMessage("Image removed.");
      } catch (err) {
        if (!(err instanceof ApiRequestError))
          setMessage(
            err instanceof Error ? err.message : "Could not remove image.",
          );
      }
    },
    [selectedId, refreshSelectedDetail, refreshFullCatalog, setMessage],
  );

  // ══════════════════════════════════════════════════════════════════════════
  // VARIANT INLINE EDIT
  // ══════════════════════════════════════════════════════════════════════════
  const startVariantRowEdit = useCallback(
    (v: ItemSummaryRecord, event?: React.MouseEvent) => {
      event?.stopPropagation();
      if (!canCatalogWrite) return;
      setVariantInlineEditId(v.id);
      setVariantEditName(v.name ?? "");
    },
    [canCatalogWrite],
  );

  const cancelVariantInlineEdit = useCallback(
    () => setVariantInlineEditId(null),
    [],
  );

  const saveVariantInline = useCallback(async () => {
    if (!variantInlineEditId || !detail || !canCatalogWrite) return;
    const name = variantEditName.trim();
    if (!name) {
      setMessage("Display name required.");
      return;
    }
    setQuickSavingVariant(true);
    setMessage("");
    try {
      await patchItem(variantInlineEditId, { name });
      await refreshFullCatalog();
      const parentId = detail.variantOfItemId?.trim() || detail.id;
      const p = await fetchItemById(parentId);
      if (detail.variantOfItemId) {
        setParentVariants(p.variants ?? []);
      } else {
        setDetail({ ...detail, variants: p.variants });
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
    } catch (err) {
      if (!(err instanceof ApiRequestError))
        setMessage(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setQuickSavingVariant(false);
    }
  }, [
    variantInlineEditId,
    detail,
    canCatalogWrite,
    variantEditName,
    selectedId,
    refreshFullCatalog,
    setParentVariants,
    setDetail,
    setSupplierLinks,
    setMessage,
  ]);

  return {
    suppliersForLink,
    suppliersLoading,
    loadSuppliersForLink,
    pendingCatalogImage,
    setPendingCatalogImage,
    pendingVariantImage,
    setPendingVariantImage,
    catalogImageUploadBusy,
    catalogImageAlt,
    setCatalogImageAlt,
    catalogImagePrimary,
    setCatalogImagePrimary,
    variantDraft,
    setVariantDraft,
    variantCreateBusy,
    variantInlineEditId,
    variantEditName,
    setVariantEditName,
    parentDraft,
    setParentDraft,
    bulkDeleteBusy,
    nextAutoSkuHint,
    branches,
    quickSavingVariant,
    onCreateParent,
    onPatchItem,
    onDeleteItem,
    onBulkDeleteSelected,
    onAddVariant,
    onUploadCatalogImage,
    onRemoveGalleryImage,
    startVariantRowEdit,
    cancelVariantInlineEdit,
    saveVariantInline,
  };
}

export type ProductMutationsApi = ReturnType<typeof useProductMutations>;
