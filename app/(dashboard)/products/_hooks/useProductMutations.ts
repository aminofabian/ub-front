"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  patchItemSupplierLink,
  postSellingPrice,
  postStockIncrease,
  uploadItemImageToCloudinary,
  type BranchRecord,
  type ItemDetailRecord,
  type ItemSummaryRecord,
  type ItemSupplierLinkRecord,
  type ItemTypeRecord,
  type SupplierRecord,
} from "@/lib/api";
import {
  isGarbageProductName,
  normalizeProductDisplayName,
} from "@/lib/catalog-display";
import {
  type ParentDraft,
  type ProductDrawerId,
  type ProductEditDraft,
  type PackageDraft,
  type VariantDraft,
  EMPTY_PARENT,
} from "../_types";
import {
  buildCreatePackageVariantBody,
  buildCreateVariantBody,
  bundlePatchFromVariantDraft,
  formatMutationError,
  resolveCatalogParentId,
} from "../_utils";
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
  syncListRowFromDetail: (row: ItemSummaryRecord) => void;
  refreshSelectedDetail: (
    itemIdOverride?: string | null,
  ) => Promise<ItemDetailRecord | null>;
  setMessage: (msg: string) => void;
  selectProduct: (id: string | null) => void;
  activeDrawer: ProductDrawerId | null;
  setActiveDrawer: (d: ProductDrawerId | null) => void;
  itemTypes: ItemTypeRecord[];
  dashboardItemTypeId: string;
  headerBranchId: string;
};

export function useProductMutations(d: Dependencies) {
  const {
    selectedId,
    detail,
    patchDraft,
    setDetail,
    setSupplierLinks,
    setParentVariants,
    rowSelection,
    setRowSelection,
    listRows,
    canCatalogWrite,
    canLinkSupplier,
    canListSuppliers,
    canSetSellPrice,
    canInventoryWrite,
    refreshFullCatalog,
    syncListRowFromDetail,
    refreshSelectedDetail,
    setMessage,
    selectProduct,
    activeDrawer,
    setActiveDrawer,
    itemTypes,
    dashboardItemTypeId,
    headerBranchId,
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
  const [pendingCreateImage, setPendingCreateImage] = useState<File | null>(
    null,
  );
  const [catalogImageUploadBusy, setCatalogImageUploadBusy] = useState(false);
  const [catalogImageAlt, setCatalogImageAlt] = useState("");
  const [catalogImagePrimary, setCatalogImagePrimary] = useState(true);
  const [variantDraftRows, setVariantDraftRows] = useState<VariantDraft[]>(
    () => [emptyVariantDraft()],
  );
  const [variantCreateBusy, setVariantCreateBusy] = useState(false);
  const [parentCreateBusy, setParentCreateBusy] = useState(false);
  const parentCreateSubmittingRef = useRef(false);
  const variantCreateSubmittingRef = useRef(false);
  const [variantInlineEditId, setVariantInlineEditId] = useState<string | null>(
    null,
  );
  const [variantEditName, setVariantEditName] = useState("");
  const [parentDraft, setParentDraft] = useState<ParentDraft>(EMPTY_PARENT);
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false);
  const [nextAutoSkuHint, setNextAutoSkuHint] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [quickSavingVariant, setQuickSavingVariant] = useState(false);
  const [packageCreateBusy, setPackageCreateBusy] = useState(false);
  const [changeItemTypeBusy, setChangeItemTypeBusy] = useState(false);

  const defaultBranchId = useMemo(
    () => headerBranchId.trim() || branches[0]?.id?.trim() || "",
    [headerBranchId, branches],
  );

  const addVariantDraftRow = useCallback(() => {
    setVariantDraftRows((rows) => {
      if (rows.length === 0) {
        const draft = emptyVariantDraft();
        if (!defaultBranchId) return [draft];
        return [
          {
            ...draft,
            openingBranchId: defaultBranchId,
            sellBranchId: defaultBranchId,
          },
        ];
      }
      const t = rows[0];
      return [
        ...rows,
        {
          ...t,
          variantName: "",
          sku: "",
          barcode: "",
          name: "",
        },
      ];
    });
  }, [defaultBranchId]);

  const removeVariantDraftRow = useCallback((index: number) => {
    setVariantDraftRows((rows) => {
      if (rows.length <= 1 || index <= 0 || index >= rows.length) return rows;
      return rows.filter((_, i) => i !== index);
    });
  }, []);

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
      isVD && variantDraftRows[0]?.variantName.trim()
        ? variantDraftRows[0].variantName.trim()
        : undefined;
    const variantDraftBrand = variantDraftRows[0]?.brand;
    const variantDraftSize = variantDraftRows[0]?.size;
    const delay = isVD ? 320 : 0;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const { suggestedSku } = await fetchSuggestedNextSku({
            categoryId: catId,
            parentItemId: pid,
            variantName: vn,
            brand: isVD
              ? variantDraftBrand?.trim() || undefined
              : parentDraft.brand.trim() || undefined,
            size: isVD
              ? variantDraftSize?.trim() || undefined
              : parentDraft.size.trim() || undefined,
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
    parentDraft.brand,
    parentDraft.size,
    variantDraftRows,
  ]);

  // ─── seed itemTypeId ────────────────────────────────────────────────────
  useEffect(() => {
    if (itemTypes.length === 0) return;
    const defaultType = itemTypes.find((t) => t.isDefault) ?? itemTypes[0];
    const seedId =
      dashboardItemTypeId && itemTypes.some((t) => t.id === dashboardItemTypeId)
        ? dashboardItemTypeId
        : defaultType.id;
    setParentDraft((prev) => ({ ...prev, itemTypeId: seedId }));
  }, [itemTypes, dashboardItemTypeId]);

  // ─── seed openingBranchId from header / default branch ───
  useEffect(() => {
    if (!defaultBranchId) return;
    setParentDraft((prev) =>
      prev.openingBranchId.trim()
        ? prev
        : { ...prev, openingBranchId: defaultBranchId },
    );
  }, [defaultBranchId, activeDrawer]);

  // ─── seed variant draft branches when add-variant drawer opens ───
  useEffect(() => {
    if (activeDrawer !== "add-variant" || !defaultBranchId) return;
    setVariantDraftRows((rows) =>
      rows.map((r) => {
        const openingBranchId = r.openingBranchId.trim()
          ? r.openingBranchId
          : defaultBranchId;
        const sellBranchId = r.sellBranchId.trim()
          ? r.sellBranchId
          : defaultBranchId;
        if (
          openingBranchId === r.openingBranchId &&
          sellBranchId === r.sellBranchId
        ) {
          return r;
        }
        return { ...r, openingBranchId, sellBranchId };
      }),
    );
  }, [activeDrawer, defaultBranchId]);

  // ─── seed variant draft from parent when drawer opens ─────────────
  useEffect(() => {
    if (activeDrawer !== "add-variant") return;
    const parentBrand = detail?.brand;
    const parentCategoryId =
      detail?.variantOfItemId?.trim() ? "" : detail?.categoryId?.trim() || "";
    if (!parentBrand && !parentCategoryId) return;
    setVariantDraftRows((rows) =>
      rows.map((r, i) => {
        let next = r;
        if (i === 0 && parentBrand && r.brand === "") {
          next = { ...next, brand: parentBrand };
        }
        if (parentCategoryId && r.categoryId === "") {
          next = { ...next, categoryId: parentCategoryId };
        }
        return next;
      }),
    );
  }, [activeDrawer, detail?.brand, detail?.categoryId, detail?.variantOfItemId]);

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE PARENT
  // ══════════════════════════════════════════════════════════════════════════
  const onCreateParent = useCallback(
    async (e: React.FormEvent<HTMLFormElement>, opts?: { keepOpen?: boolean }) => {
      e.preventDefault();
      if (parentCreateSubmittingRef.current) return;
      parentCreateSubmittingRef.current = true;
      setParentCreateBusy(true);
      setMessage("");
      const savedType = parentDraft.itemTypeId;

      const parseNum = (
        raw: string,
        label: string,
        mustBeInt = false,
      ): number | undefined => {
        const t = raw.trim();
        if (!t) return undefined;
        const n = Number(t);
        if (!Number.isFinite(n) || (mustBeInt && !Number.isInteger(n))) {
          throw new Error(
            `${label} must be a valid${mustBeInt ? " whole" : ""} number.`,
          );
        }
        return mustBeInt ? Math.round(n) : n;
      };

      try {
        const isCreatingGroup = parentDraft.productStructure === "group";
        const displayName = normalizeProductDisplayName(parentDraft.name);
        if (!displayName || isGarbageProductName(displayName)) {
          setMessage("Enter a real product name — not a UUID or import id.");
          return;
        }
        if (isCreatingGroup && !parentDraft.categoryId.trim()) {
          setMessage("Choose a category for this group — variants will inherit it.");
          return;
        }

        const payload: Parameters<typeof createItem>[0] = isCreatingGroup
          ? {
              name: displayName,
              itemTypeId: parentDraft.itemTypeId,
              isSellable: false,
              ...(parentDraft.categoryId.trim()
                ? { categoryId: parentDraft.categoryId.trim() }
                : {}),
              ...(parentDraft.brand.trim()
                ? { brand: parentDraft.brand.trim() }
                : {}),
              ...(parentDraft.size.trim()
                ? { size: parentDraft.size.trim() }
                : {}),
              ...(parentDraft.description.trim()
                ? { description: parentDraft.description.trim() }
                : {}),
            }
          : {
              name: displayName,
              itemTypeId: parentDraft.itemTypeId,
              ...(parentDraft.sku.trim()
                ? { sku: parentDraft.sku.trim() }
                : {}),
              ...(parentDraft.barcode.trim()
                ? { barcode: parentDraft.barcode.trim() }
                : {}),
              ...(parentDraft.pluCode.trim()
                ? { pluCode: parentDraft.pluCode.trim() }
                : {}),
              ...(parentDraft.categoryId.trim()
                ? { categoryId: parentDraft.categoryId.trim() }
                : {}),
              ...(parentDraft.brand.trim()
                ? { brand: parentDraft.brand.trim() }
                : {}),
              ...(parentDraft.size.trim()
                ? { size: parentDraft.size.trim() }
                : {}),
              ...(parentDraft.description.trim()
                ? { description: parentDraft.description.trim() }
                : {}),
              ...(parentDraft.unitType.trim()
                ? { unitType: parentDraft.unitType.trim() }
                : {}),
              isWeighed: parentDraft.isWeighed,
              isSellable: parentDraft.isSellable,
              isStocked:
                parentDraft.isStocked ||
                Boolean(parentDraft.openingQty.trim()),
              buyingPrice: parseNum(parentDraft.buyingPrice, "Buy price"),
              bundleQty: parseNum(parentDraft.bundleQty, "Pack qty", true),
              bundlePrice: parseNum(parentDraft.bundlePrice, "Sell price"),
              ...(parentDraft.bundleName.trim()
                ? { bundleName: parentDraft.bundleName.trim() }
                : {}),
              minStockLevel: parseNum(parentDraft.minStockLevel, "Min stock"),
              reorderLevel: parseNum(parentDraft.reorderLevel, "Reorder level"),
              reorderQty: parseNum(parentDraft.reorderQty, "Reorder qty"),
            };

        const created = await createItem(payload);

        // Supplier link — standalone only
        const sup = parentDraft.supplierId.trim();
        if (!isCreatingGroup && canLinkSupplier && sup) {
          const cost =
            parseNum(parentDraft.defaultCostPrice, "Default cost") ??
            parseNum(parentDraft.buyingPrice, "Buy price");
          try {
            await addItemSupplierLink(created.id, {
              supplierId: sup,
              setPrimary: parentDraft.setPrimarySupplier,
              supplierSku: parentDraft.supplierSku.trim() || undefined,
              ...(cost != null ? { defaultCostPrice: cost } : {}),
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
        // Upload image if selected
        if (pendingCreateImage) {
          try {
            await uploadItemImageToCloudinary(created.id, pendingCreateImage, {
              primary: true,
            });
          } catch {
            // non-fatal — product is already created
          }
        }

        // Opening stock for standalone products
        if (
          !isCreatingGroup &&
          canInventoryWrite &&
          parentDraft.openingQty.trim() &&
          parentDraft.openingBranchId.trim()
        ) {
          const qty = Number(parentDraft.openingQty.trim());
          if (!Number.isFinite(qty) || qty <= 0) {
            setMessage("Opening quantity must be a positive number.");
          } else {
            const ucRaw = parentDraft.openingUnitCost.trim();
            const buy = parseNum(parentDraft.buyingPrice, "Buy price");
            const packQty = Math.max(
              1,
              parseNum(parentDraft.bundleQty, "Pack qty", true) ?? 1,
            );
            const unitCost =
              ucRaw === ""
                ? buy != null
                  ? buy / packQty
                  : 0
                : Number(ucRaw);
            if (!Number.isFinite(unitCost) || unitCost < 0) {
              setMessage("Opening unit cost must be a valid non-negative number.");
            } else {
              try {
                await postStockIncrease({
                  branchId: parentDraft.openingBranchId.trim(),
                  itemId: created.id,
                  quantity: qty,
                  unitCost,
                  notes: "Opening stock from product creation",
                });
              } catch (stockErr) {
                setMessage(
                  formatMutationError(
                    stockErr,
                    "Product created but opening stock failed.",
                  ),
                );
              }
            }
          }
        }
        if (
          !isCreatingGroup &&
          parentDraft.sellAsPackages &&
          canCatalogWrite
        ) {
          const pkgRows = parentDraft.packageRows.filter(
            (r) => r.name.trim() && r.unitsPerPackage.trim(),
          );
          for (const pkg of pkgRows) {
            try {
              const body = buildCreatePackageVariantBody(pkg);
              await createItemVariant(created.id, body);
            } catch (pkgErr) {
              setMessage(
                formatMutationError(
                  pkgErr,
                  `Product created but package “${pkg.name.trim()}” failed.`,
                ),
              );
            }
          }
        }
        setPendingCreateImage(null);
        setParentDraft({ ...EMPTY_PARENT, itemTypeId: savedType });
        await refreshFullCatalog();
        selectProduct(created.id);
        if (isCreatingGroup) {
          await refreshSelectedDetail(created.id);
          setVariantDraftRows([emptyVariantDraft()]);
          setPendingVariantImage(null);
          setActiveDrawer("add-variant");
          setMessage("Group created — add your first variant.");
        } else {
          if (!opts?.keepOpen) setActiveDrawer(null);
          const linked = canLinkSupplier && sup;
          setMessage(
            linked ? "Product created and linked." : "Product created.",
          );
        }
      } catch (err) {
        setMessage(formatMutationError(err, "Create failed."));
      } finally {
        parentCreateSubmittingRef.current = false;
        setParentCreateBusy(false);
      }
    },
    [
      parentDraft,
      canLinkSupplier,
      canInventoryWrite,
      pendingCreateImage,
      refreshFullCatalog,
      refreshSelectedDetail,
      selectProduct,
      setActiveDrawer,
      setMessage,
      setVariantDraftRows,
    ],
  );

  // ══════════════════════════════════════════════════════════════════════════
  // PATCH
  // ══════════════════════════════════════════════════════════════════════════
  const onPatchItem = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedId) return;
      if (!canCatalogWrite) {
        setMessage("You do not have permission to edit products.");
        return;
      }
      setMessage("");
      const body: Record<string, unknown> = {
        name: patchDraft.name,
        sku: patchDraft.sku,
        barcode: patchDraft.barcode,
        pluCode: patchDraft.pluCode?.trim() ?? "",
        description: patchDraft.description,
        active: patchDraft.active,
        webPublished: patchDraft.webPublished ?? true,
        imageKey: patchDraft.imageKey,
        categoryId: patchDraft.categoryId.trim(),
      };
      if (detail?.variantOfItemId?.trim()) {
        const vn = patchDraft.variantName?.trim() ?? "";
        if (!vn) {
          setMessage("Variant label is required.");
          return;
        }
        body.variantName = vn;
        const useSharedStock =
          patchDraft.packageVariant ?? detail.packageVariant ?? false;
        const unitsRaw = patchDraft.packagingUnitQtyStr.trim();
        if (useSharedStock || unitsRaw) {
          if (!unitsRaw) {
            setMessage("Enter base units deducted per sale (e.g. 1 or 30).");
            return;
          }
          const units = Number(unitsRaw);
          if (!Number.isFinite(units) || units <= 0 || !Number.isInteger(units)) {
            setMessage("Units per sale must be a positive whole number.");
            return;
          }
          body.packageVariant = true;
          body.packagingUnitQty = units;
          body.packagingUnitName =
            patchDraft.packagingUnitName.trim() || vn;
          body.isStocked = false;
        }
      }
      const setNum = (
        raw: string,
        key: string,
        label: string,
        mustBeInt = false,
      ): boolean => {
        const t = raw.trim();
        if (!t) return true;
        const n = Number(t);
        if (!Number.isFinite(n) || (mustBeInt && !Number.isInteger(n))) {
          setMessage(
            `${label} must be a valid${mustBeInt ? " whole" : ""} number.`,
          );
          return false;
        }
        body[key] = mustBeInt ? Math.round(n) : n;
        return true;
      };
      if (!setNum(patchDraft.bundlePriceStr, "bundlePrice", "Shelf price"))
        return;
      if (!setNum(patchDraft.bundleQtyStr, "bundleQty", "Pack qty", true))
        return;
      if (!setNum(patchDraft.buyingPriceStr, "buyingPrice", "Buying price"))
        return;
      if (!setNum(patchDraft.minStockLevelStr, "minStockLevel", "Min stock"))
        return;
      if (!setNum(patchDraft.reorderLevelStr, "reorderLevel", "Reorder level"))
        return;
      if (!setNum(patchDraft.reorderQtyStr, "reorderQty", "Reorder qty"))
        return;
      try {
        await patchItem(selectedId, body as never);
        // If buying price was set, also sync to primary supplier link
        if (body.buyingPrice != null) {
          const links = await fetchItemSupplierLinks(selectedId);
          const primary = links.find((l) => l.primary);
          if (primary) {
            const bpNum = Number(body.buyingPrice);
            if (Number.isFinite(bpNum)) {
              try {
                await patchItemSupplierLink(selectedId, primary.id, {
                  defaultCostPrice: bpNum,
                });
              } catch {
                // non-critical
              }
            }
          }
        }
        const updated = await refreshSelectedDetail();
        if (updated) syncListRowFromDetail(updated);
        setActiveDrawer(null);
        setMessage("Product updated.");
      } catch (err) {
        setMessage(formatMutationError(err, "Update failed."));
      }
    },
    [
      selectedId,
      canCatalogWrite,
      patchDraft,
      detail,
      syncListRowFromDetail,
      refreshSelectedDetail,
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
      if (variantCreateSubmittingRef.current) return;
      variantCreateSubmittingRef.current = true;
      setVariantCreateBusy(true);
      setMessage("");
      try {
        const sid = selectedId?.trim() || "";
        const did = detail?.id?.trim() || "";
        const pid =
          sid && did && sid !== did
            ? sid
            : detail?.variantOfItemId?.trim() || did || sid;
        if (!pid) {
          setMessage("Select a product first.");
          return;
        }
        const effectiveDrafts: VariantDraft[] = variantDraftRows.filter(
          (row) => row.variantName.trim(),
        );
        if (effectiveDrafts.length === 0) {
          setMessage("Add at least one variant name.");
          return;
        }
        for (const row of effectiveDrafts) {
          if (row.openingQty.trim() && !row.openingBranchId.trim()) {
            setMessage(
              `Opening stock for “${row.variantName.trim()}” needs a branch.`,
            );
            return;
          }
        }
        setMessage("");
        const warnings: string[] = [];
        try {
        let lastVid: string | null = null;
        for (let i = 0; i < effectiveDrafts.length; i++) {
          const variantDraft = effectiveDrafts[i];
          let body;
          try {
            body = buildCreateVariantBody(variantDraft);
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Invalid variant.");
            return;
          }
          let bp = null;
          if (!variantDraft.isPackageVariant) {
            try {
              bp = bundlePatchFromVariantDraft(variantDraft);
            } catch (err) {
              setMessage(err instanceof Error ? err.message : "Invalid bundle.");
              return;
            }
          }
          let created;
          try {
            created = await createItemVariant(pid, body);
          } catch (err) {
            if (!(err instanceof ApiRequestError))
              setMessage(
                err instanceof Error
                  ? `${variantDraft.variantName.trim()}: ${err.message}`
                  : "Create variant failed.",
              );
            await refreshFullCatalog();
            if (lastVid) selectProduct(lastVid);
            return;
          }
          const vid = created.id;
          lastVid = vid;
          if (bp) {
            try {
              await patchItem(vid, bp);
            } catch {
              warnings.push(
                `Bundle patch failed (${variantDraft.variantName.trim()}).`,
              );
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
              warnings.push(
                `Pricing failed (${variantDraft.variantName.trim()}).`,
              );
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
              warnings.push(
                `Supplier link failed (${variantDraft.variantName.trim()}).`,
              );
            }
          }
          if (
            !variantDraft.isPackageVariant &&
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
              warnings.push(
                `Opening stock failed (${variantDraft.variantName.trim()}).`,
              );
            }
          }
          if (i === 0 && pendingVariantImage) {
            try {
              await uploadItemImageToCloudinary(vid, pendingVariantImage, {
                primary: true,
              });
            } catch {
              warnings.push("Image upload failed for first variant.");
            }
          }
        }
        await refreshFullCatalog();
        if (lastVid) selectProduct(lastVid);
        setActiveDrawer(null);
        setVariantDraftRows([emptyVariantDraft()]);
        setPendingVariantImage(null);
        const n = effectiveDrafts.length;
        setMessage(
          warnings.length
            ? `Created ${n} variant${n === 1 ? "" : "s"}. Warnings: ${warnings.join(" ")}`
            : n === 1
              ? "Variant created."
              : `Created ${n} variants.`,
        );
        } catch (err) {
          if (!(err instanceof ApiRequestError))
            setMessage(
              err instanceof Error ? err.message : "Create variant failed.",
            );
        }
      } finally {
        variantCreateSubmittingRef.current = false;
        setVariantCreateBusy(false);
      }
    },
    [
      detail,
      selectedId,
      variantDraftRows,
      pendingVariantImage,
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
        const updated = await refreshSelectedDetail();
        if (updated) syncListRowFromDetail(updated);
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
      syncListRowFromDetail,
      setMessage,
    ],
  );

  const onRemoveGalleryImage = useCallback(
    async (imageId: string) => {
      if (!selectedId || !window.confirm("Remove this photo?")) return;
      setMessage("");
      try {
        await deleteItemImage(selectedId, imageId);
        const updated = await refreshSelectedDetail();
        if (updated) syncListRowFromDetail(updated);
        setMessage("Image removed.");
      } catch (err) {
        if (!(err instanceof ApiRequestError))
          setMessage(
            err instanceof Error ? err.message : "Could not remove image.",
          );
      }
    },
    [selectedId, refreshSelectedDetail, syncListRowFromDetail, setMessage],
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
        syncListRowFromDetail(next);
        try {
          setSupplierLinks(await fetchItemSupplierLinks(variantInlineEditId));
        } catch {
          setSupplierLinks([]);
        }
      } else {
        const variantRow = p.variants?.find((v) => v.id === variantInlineEditId);
        if (variantRow) syncListRowFromDetail(variantRow);
      }
      setVariantInlineEditId(null);
      setMessage("Variant updated.");
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
    syncListRowFromDetail,
    setParentVariants,
    setDetail,
    setSupplierLinks,
    setMessage,
  ]);

  const onCreatePackages = useCallback(
    async (parentId: string, rows: PackageDraft[]): Promise<boolean> => {
      if (!canCatalogWrite) {
        setMessage("You do not have permission to edit products.");
        return false;
      }
      const baseParentId = resolveCatalogParentId(detail, parentId);
      if (!baseParentId) {
        setMessage("Select the base product first.");
        return false;
      }
      const pkgRows = rows.filter(
        (r) => r.name.trim() && r.unitsPerPackage.trim(),
      );
      if (pkgRows.length === 0) {
        setMessage("Add at least one package with a name and unit count.");
        return false;
      }
      setPackageCreateBusy(true);
      setMessage("");
      const errors: string[] = [];
      let lastId: string | null = null;
      try {
        for (const pkg of pkgRows) {
          try {
            const body = buildCreatePackageVariantBody(pkg);
            const created = await createItemVariant(baseParentId, body);
            lastId = created.id;
          } catch (err) {
            errors.push(
              `${pkg.name.trim()}: ${formatMutationError(err, "Create failed.")}`,
            );
          }
        }
        await refreshSelectedDetail(baseParentId);
        await refreshFullCatalog();
        selectProduct(baseParentId);
        if (errors.length > 0) {
          setMessage(
            errors.length === pkgRows.length
              ? errors[0]!
              : `${pkgRows.length - errors.length} package(s) added. ${errors[0]}`,
          );
          return errors.length < pkgRows.length;
        }
        setMessage(
          pkgRows.length > 1 ? "Packages added." : "Package added.",
        );
        if (lastId) selectProduct(lastId);
        return true;
      } catch (err) {
        setMessage(formatMutationError(err, "Failed to add packages."));
        return false;
      } finally {
        setPackageCreateBusy(false);
      }
    },
    [
      canCatalogWrite,
      detail,
      refreshSelectedDetail,
      refreshFullCatalog,
      selectProduct,
      setMessage,
    ],
  );

  const onChangeItemType = useCallback(
    async (nextItemTypeId: string): Promise<boolean> => {
      if (!selectedId) {
        setMessage("Select a product first.");
        return false;
      }
      if (!canCatalogWrite) {
        setMessage("You do not have permission to edit products.");
        return false;
      }
      const tid = nextItemTypeId.trim();
      if (!tid) {
        setMessage("Pick a department.");
        return false;
      }
      const known = itemTypes.find((t) => t.id === tid);
      if (!known) {
        setMessage("Selected department no longer exists.");
        return false;
      }
      if (detail?.itemTypeId === tid) {
        // Nothing to change — treat as success so the modal closes.
        return true;
      }
      setChangeItemTypeBusy(true);
      setMessage("");
      try {
        await patchItem(selectedId, { itemTypeId: tid });
        const updated = await refreshSelectedDetail();
        if (updated) syncListRowFromDetail(updated);
        // The list filters by item type, so the row may have moved. Refresh.
        await refreshFullCatalog();
        setMessage(`Moved to ${known.label}.`);
        return true;
      } catch (err) {
        setMessage(formatMutationError(err, "Could not change department."));
        return false;
      } finally {
        setChangeItemTypeBusy(false);
      }
    },
    [
      selectedId,
      canCatalogWrite,
      detail?.itemTypeId,
      itemTypes,
      refreshSelectedDetail,
      syncListRowFromDetail,
      refreshFullCatalog,
      setMessage,
    ],
  );

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
    variantDraftRows,
    setVariantDraftRows,
    addVariantDraftRow,
    removeVariantDraftRow,
    variantCreateBusy,
    parentCreateBusy,
    variantInlineEditId,
    variantEditName,
    setVariantEditName,
    parentDraft,
    setParentDraft,
    bulkDeleteBusy,
    nextAutoSkuHint,
    branches,
    quickSavingVariant,
    pendingCreateImage,
    setPendingCreateImage,
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
    packageCreateBusy,
    onCreatePackages,
    onChangeItemType,
    changeItemTypeBusy,
  };
}

export type ProductMutationsApi = ReturnType<typeof useProductMutations>;
