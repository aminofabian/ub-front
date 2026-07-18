"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiRequestError,
  fetchAllocationPreview,
  fetchItemById,
  fetchItemSupplierLinks,
  patchItem,
  patchItemSupplierLink,
  postBatchDecrease,
  postStockIncrease,
  type ItemDetailRecord,
  type ItemSummaryRecord,
  type PatchItemPayload,
} from "@/lib/api";
import { isGarbageProductName, normalizeProductDisplayName } from "@/lib/catalog-display";
import { type QuickEditKey } from "../_types";
import {
  effectiveOnHand,
  formatMutationError,
  stockCatalogItemId,
  usesSharedPackageStock,
  toNumber,
} from "../_utils";

type Params = {
  selectedId: string | null;
  detail: ItemDetailRecord | null;
  /** Effective unit cost: supplier default, last purchase, or item buying price. */
  primaryCost: number | null;
  canCatalogWrite: boolean;
  canInventoryWrite: boolean;
  branches: { id: string; name: string }[];
  defaultBranchId?: string;
  syncListRowFromDetail: (row: ItemSummaryRecord) => void;
  refreshSelectedDetail: (
    itemIdOverride?: string | null,
  ) => Promise<ItemDetailRecord | null>;
  setMessage: (msg: string) => void;
};

export function useQuickEdit({
  selectedId,
  detail,
  primaryCost,
  canCatalogWrite,
  canInventoryWrite,
  branches,
  defaultBranchId,
  syncListRowFromDetail,
  refreshSelectedDetail,
  setMessage,
}: Params) {
  const [quickEdit, setQuickEdit] = useState<QuickEditKey>(null);
  const [quickProductName, setQuickProductName] = useState("");
  const [quickSku, setQuickSku] = useState("");
  const [quickBarcode, setQuickBarcode] = useState("");
  const [quickBundleQty, setQuickBundleQty] = useState("");
  const [quickBundlePrice, setQuickBundlePrice] = useState("");
  const [quickBuyingPrice, setQuickBuyingPrice] = useState("");
  const [quickMargin, setQuickMargin] = useState("");
  const [quickMinStock, setQuickMinStock] = useState("");
  const [quickReorderLevel, setQuickReorderLevel] = useState("");
  const [quickReorderQty, setQuickReorderQty] = useState("");
  // Stock adjustment state
  const [quickStock, setQuickStock] = useState("");
  const [quickStockBranchId, setQuickStockBranchId] = useState("");
  const [quickStockUnitCost, setQuickStockUnitCost] = useState("");
  const [quickStockBaseline, setQuickStockBaseline] = useState<number | null>(
    null,
  );
  const [quickStockBaselineLoading, setQuickStockBaselineLoading] =
    useState(false);
  const [quickSaving, setQuickSaving] = useState(false);

  // QEA drawer state
  const [quickEditAllOpen, setQuickEditAllOpen] = useState(false);
  const [qeaName, setQeaName] = useState("");
  const [qeaSku, setQeaSku] = useState("");
  const [qeaBarcode, setQeaBarcode] = useState("");
  const [qeaBundleQty, setQeaBundleQty] = useState("");
  const [qeaBundlePrice, setQeaBundlePrice] = useState("");
  const [qeaBuyingPrice, setQeaBuyingPrice] = useState("");
  const [qeaMinStock, setQeaMinStock] = useState("");
  const [qeaReorderLevel, setQeaReorderLevel] = useState("");
  const [qeaReorderQty, setQeaReorderQty] = useState("");
  const [qeaDescription, setQeaDescription] = useState("");
  const [qeaSaving, setQeaSaving] = useState(false);
  const [qeaError, setQeaError] = useState("");

  /** Keep primary supplier cost in sync — Commerce "Cost" reads supplier default/last first. */
  const syncPrimarySupplierCost = useCallback(
    async (itemId: string, unitCost: number) => {
      try {
        const links = await fetchItemSupplierLinks(itemId);
        const primary = links.find((l) => l.primary);
        if (!primary) return;
        await patchItemSupplierLink(itemId, primary.id, {
          defaultCostPrice: unitCost,
        });
      } catch {
        // Catalog buying price already saved; supplier sync is best-effort.
      }
    },
    [],
  );

  const runQuickPatch = useCallback(
    async (body: PatchItemPayload, successMsg: string) => {
      if (!selectedId) return;
      if (!canCatalogWrite) {
        setMessage("You do not have permission to edit products.");
        return;
      }
      setQuickSaving(true);
      setMessage("");
      try {
        await patchItem(selectedId, body);
        if (body.buyingPrice != null) {
          const bpNum = Number(body.buyingPrice);
          if (Number.isFinite(bpNum)) {
            await syncPrimarySupplierCost(selectedId, bpNum);
          }
        }
        const updated = await refreshSelectedDetail();
        if (updated) syncListRowFromDetail(updated);
        setQuickEdit(null);
        setMessage(successMsg);
      } catch (e) {
        setMessage(formatMutationError(e, "Update failed."));
      } finally {
        setQuickSaving(false);
      }
    },
    [
      selectedId,
      canCatalogWrite,
      syncPrimarySupplierCost,
      syncListRowFromDetail,
      refreshSelectedDetail,
      setMessage,
    ],
  );

  const openQuickEdit = useCallback(
    (key: Exclude<QuickEditKey, null>) => {
      if (!detail) return;
      // Stock adjustment uses inventory permission, others use catalog permission
      if (key !== "stock" && !canCatalogWrite) return;
      if (key === "stock" && !canInventoryWrite) return;
      setQuickEdit(key);
      const v = (n: number | null | undefined) => (n != null ? String(n) : "");
      if (key === "productName") setQuickProductName(detail.name?.trim() ?? "");
      if (key === "sku") setQuickSku(detail.sku?.trim() ?? "");
      if (key === "barcode") setQuickBarcode(detail.barcode?.trim() ?? "");
      if (key === "bundleQty") setQuickBundleQty(v(detail.bundleQty));
      if (key === "bundlePrice")
        setQuickBundlePrice(v(toNumber(detail.bundlePrice)));
      if (key === "buyingPrice") setQuickBuyingPrice(v(primaryCost));
      if (key === "margin") {
        const sell = toNumber(detail.bundlePrice);
        const cost = primaryCost;
        const pct =
          sell != null && sell > 0 && cost != null
            ? ((sell - cost) / sell) * 100
            : null;
        setQuickMargin(pct != null ? String(Math.round(pct * 10) / 10) : "");
      }
      if (key === "minStock")
        setQuickMinStock(v(toNumber(detail.minStockLevel)));
      if (key === "reorder") {
        setQuickReorderLevel(v(toNumber(detail.reorderLevel)));
        setQuickReorderQty(v(toNumber(detail.reorderQty)));
      }
      if (key === "stock") {
        const bid = defaultBranchId || branches[0]?.id || "";
        setQuickStockBranchId(bid);
        setQuickStockUnitCost(v(primaryCost));
        const oh = detail ? effectiveOnHand(detail) : null;
        setQuickStock(oh != null ? String(oh) : "");
      }
    },
    [
      detail,
      canCatalogWrite,
      canInventoryWrite,
      branches,
      defaultBranchId,
      primaryCost,
    ],
  );

  const cancelQuickEdit = useCallback(() => {
    setQuickEdit(null);
    setQuickStockBaseline(null);
    setQuickStockBaselineLoading(false);
  }, []);

  useEffect(() => {
    if (quickEdit !== "stock" || !detail) {
      setQuickStockBaseline(null);
      setQuickStockBaselineLoading(false);
      return;
    }
    const stockItemId = stockCatalogItemId(detail);
    const branchId = quickStockBranchId.trim();
    if (!stockItemId || !branchId) {
      setQuickStockBaseline(null);
      return;
    }
    let cancelled = false;
    setQuickStockBaselineLoading(true);
    void fetchItemById(stockItemId, { branchId })
      .then((row) => {
        if (cancelled) return;
        const oh = effectiveOnHand(row);
        setQuickStockBaseline(oh);
      })
      .catch(() => {
        if (!cancelled) setQuickStockBaseline(null);
      })
      .finally(() => {
        if (!cancelled) setQuickStockBaselineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quickEdit, detail, quickStockBranchId]);

  const saveQuickProductName = useCallback(() => {
    const n = normalizeProductDisplayName(quickProductName);
    if (!n) {
      setMessage("Display name is required.");
      return;
    }
    if (isGarbageProductName(n)) {
      setMessage("Use a real product name — not a UUID or import id.");
      return;
    }
    void runQuickPatch({ name: n }, "Display name updated.");
  }, [quickProductName, runQuickPatch, setMessage]);

  const saveQuickBarcode = useCallback(
    () =>
      void runQuickPatch(
        { barcode: quickBarcode.trim() || "" },
        "Barcode updated.",
      ),
    [quickBarcode, runQuickPatch],
  );

  const saveQuickSku = useCallback(() => {
    const r = quickSku.trim();
    if (!r) {
      setMessage("SKU cannot be empty.");
      return;
    }
    void runQuickPatch({ sku: r }, "SKU updated.");
  }, [quickSku, runQuickPatch, setMessage]);

  const saveQuickBundleQty = useCallback(() => {
    const r = quickBundleQty.trim();
    if (!r) {
      setMessage("Pack quantity is required.");
      return;
    }
    const n = Number(r);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      setMessage("Pack quantity must be a positive whole number.");
      return;
    }
    void runQuickPatch({ bundleQty: n }, "Pack quantity updated.");
  }, [quickBundleQty, runQuickPatch, setMessage]);

  const saveQuickBundlePrice = useCallback(() => {
    const r = quickBundlePrice.trim();
    if (!r) {
      setMessage("Enter a shelf price or cancel.");
      return;
    }
    const n = Number(r);
    if (!Number.isFinite(n) || n < 0) {
      setMessage("Shelf price must be a valid non-negative number.");
      return;
    }
    void runQuickPatch({ bundlePrice: n }, "Shelf price updated.");
  }, [quickBundlePrice, runQuickPatch, setMessage]);

  const saveQuickBuyingPrice = useCallback(() => {
    const r = quickBuyingPrice.trim();
    if (!r) {
      setMessage("Enter a buying price or cancel.");
      return;
    }
    const n = Number(r);
    if (!Number.isFinite(n) || n < 0) {
      setMessage("Buying price must be a valid non-negative number.");
      return;
    }
    void runQuickPatch({ buyingPrice: n }, "Buying price updated.");
  }, [quickBuyingPrice, runQuickPatch, setMessage]);

  const saveQuickMargin = useCallback(() => {
    const r = quickMargin.trim();
    if (!r) {
      setMessage("Enter a margin % or cancel.");
      return;
    }
    const pct = Number(r);
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100) {
      setMessage("Margin must be at least 0% and below 100%.");
      return;
    }
    const cost = primaryCost;
    if (cost == null || cost < 0) {
      setMessage("Set a cost price first, then set margin to update shelf price.");
      return;
    }
    const shelf = Math.round((cost / (1 - pct / 100)) * 100) / 100;
    void runQuickPatch(
      { bundlePrice: shelf },
      `Shelf price set to ${shelf} from ${pct}% margin.`,
    );
  }, [quickMargin, primaryCost, runQuickPatch, setMessage]);

  const saveQuickMinStock = useCallback(() => {
    const r = quickMinStock.trim();
    if (!r) {
      setMessage("Enter a min stock level or cancel.");
      return;
    }
    const n = Number(r);
    if (!Number.isFinite(n) || n < 0) {
      setMessage("Min stock must be a valid non-negative number.");
      return;
    }
    void runQuickPatch({ minStockLevel: n }, "Min stock level updated.");
  }, [quickMinStock, runQuickPatch, setMessage]);

  const saveQuickReorder = useCallback(() => {
    const body: PatchItemPayload = {};
    if (quickReorderLevel.trim()) {
      const rl = Number(quickReorderLevel.trim());
      if (!Number.isFinite(rl) || rl < 0) {
        setMessage("Reorder level must be a valid non-negative number.");
        return;
      }
      body.reorderLevel = rl;
    }
    if (quickReorderQty.trim()) {
      const rq = Number(quickReorderQty.trim());
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
  }, [quickReorderLevel, quickReorderQty, runQuickPatch, setMessage]);

  // ── Stock adjustment via inventory API ──────────────────────────────
  const saveQuickStock = useCallback(async () => {
    if (!selectedId || !detail) return;
    if (!canInventoryWrite) {
      setMessage("You do not have permission to adjust stock.");
      return;
    }
    const shared = usesSharedPackageStock(detail);
    if (detail.isStocked === false && !shared) {
      setMessage(
        "This SKU is not stocked. Enable stock tracking or add stock on a variant instead.",
      );
      return;
    }
    const targetRaw = quickStock.trim();
    if (!targetRaw) {
      setMessage("Enter the on-hand quantity you want.");
      return;
    }
    const target = Number(targetRaw);
    if (!Number.isFinite(target) || target < 0) {
      setMessage("On-hand quantity must be zero or a positive number.");
      return;
    }
    const branchId = quickStockBranchId.trim();
    if (!branchId) {
      setMessage("Select a branch.");
      return;
    }

    const stockItemId = stockCatalogItemId(detail);
    let current = quickStockBaseline;
    if (current == null) {
      try {
        const row = await fetchItemById(stockItemId, { branchId });
        current = effectiveOnHand(row) ?? 0;
      } catch (e) {
        setMessage(formatMutationError(e, "Could not load current stock."));
        return;
      }
    }
    const delta = Math.round((target - current) * 10000) / 10000;

    if (Math.abs(delta) < 0.0001) {
      setQuickEdit(null);
      setQuickStockBaseline(null);
      setMessage("Stock unchanged.");
      return;
    }

    let unitCost = 0;
    if (delta > 0) {
      const costRaw = quickStockUnitCost.trim();
      unitCost = costRaw === "" ? 0 : Number(costRaw);
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        setMessage("Unit cost must be a valid non-negative number.");
        return;
      }
    }

    setQuickSaving(true);
    setMessage("");
    try {
      if (delta > 0) {
        await postStockIncrease({
          branchId,
          itemId: stockItemId,
          quantity: delta,
          unitCost,
          notes: "Stock set from products",
        });
      } else {
        const decreaseQty = Math.abs(delta);
        const allocations = await fetchAllocationPreview({
          itemId: stockItemId,
          branchId,
          quantity: decreaseQty,
        });
        if (!allocations.length) {
          setMessage("Could not allocate stock to remove for this branch.");
          return;
        }
        let allocated = 0;
        for (const line of allocations) {
          const q = Number(line.quantity);
          if (!Number.isFinite(q) || q <= 0) continue;
          allocated += q;
          await postBatchDecrease({
            batchId: line.batchId,
            quantity: q,
            reason: "Stock set from products",
          });
        }
        if (allocated < decreaseQty - 0.0001) {
          setMessage(
            `Only ${allocated} could be removed; check batch availability.`,
          );
          return;
        }
      }

      if (shared && detail.variantOfItemId?.trim()) {
        await refreshSelectedDetail(detail.variantOfItemId.trim());
        const pkgUpdated = await refreshSelectedDetail(selectedId);
        if (pkgUpdated) syncListRowFromDetail(pkgUpdated);
      } else {
        const updated = await refreshSelectedDetail();
        if (updated) syncListRowFromDetail(updated);
      }
      setQuickEdit(null);
      setQuickStockBaseline(null);
      setMessage(
        shared
          ? `Stock on base product set to ${target}.`
          : `Stock set to ${target}.`,
      );
    } catch (e) {
      setMessage(formatMutationError(e, "Stock adjustment failed."));
    } finally {
      setQuickSaving(false);
    }
  }, [
    selectedId,
    detail,
    canInventoryWrite,
    quickStock,
    quickStockBranchId,
    quickStockUnitCost,
    syncListRowFromDetail,
    refreshSelectedDetail,
    setMessage,
  ]);

  const openQuickEditAll = useCallback(() => {
    if (!detail || !canCatalogWrite) return;
    setQeaName(detail.name?.trim() ?? "");
    setQeaSku(detail.sku?.trim() ?? "");
    setQeaBarcode(detail.barcode?.trim() ?? "");
    setQeaBundleQty(detail.bundleQty != null ? String(detail.bundleQty) : "");
    setQeaBundlePrice(
      ((n) => (n != null ? String(n) : ""))(toNumber(detail.bundlePrice)),
    );
    setQeaBuyingPrice(((n) => (n != null ? String(n) : ""))(primaryCost));
    setQeaMinStock(
      ((n) => (n != null ? String(n) : ""))(toNumber(detail.minStockLevel)),
    );
    setQeaReorderLevel(
      ((n) => (n != null ? String(n) : ""))(toNumber(detail.reorderLevel)),
    );
    setQeaReorderQty(
      ((n) => (n != null ? String(n) : ""))(toNumber(detail.reorderQty)),
    );
    setQeaDescription(detail.description?.trim() ?? "");
    setQeaError("");
    setQuickEditAllOpen(true);
  }, [detail, canCatalogWrite, primaryCost]);

  const saveQuickEditAll = useCallback(async () => {
    if (!selectedId || !canCatalogWrite) return;
    const shared = detail ? usesSharedPackageStock(detail) : false;
    const name = qeaName.trim();
    if (!name) {
      setQeaError("Display name is required.");
      return;
    }
    const skuRaw = qeaSku.trim();
    if (!skuRaw) {
      setQeaError("SKU cannot be empty.");
      return;
    }
    const body: PatchItemPayload = {
      name,
      sku: skuRaw,
      barcode: qeaBarcode.trim() || "",
    };
    const num = (
      raw: string,
      label: string,
      mustBeInt = false,
    ): number | null => {
      if (!raw.trim()) return null;
      const n = Number(raw.trim());
      if (!Number.isFinite(n) || n < 0 || (mustBeInt && !Number.isInteger(n))) {
        setQeaError(
          `${label} must be a valid${mustBeInt ? " whole" : ""} non-negative number.`,
        );
        return null;
      }
      return n;
    };
    const setIf = (
      key: keyof PatchItemPayload,
      raw: string,
      label: string,
      int = false,
    ) => {
      const n = num(raw, label, int);
      if (n === null) return raw ? false : true;
      (body as Record<string, unknown>)[key] = int ? Math.round(n) : n;
      return true;
    };
    if (!shared && setIf("bundleQty", qeaBundleQty, "Pack qty", true) === false)
      return;
    if (setIf("bundlePrice", qeaBundlePrice, "Shelf price") === false) return;
    if (setIf("buyingPrice", qeaBuyingPrice, "Buying price") === false) return;
    if (!shared) {
      if (setIf("minStockLevel", qeaMinStock, "Min stock") === false) return;
      if (setIf("reorderLevel", qeaReorderLevel, "Reorder level") === false)
        return;
      if (setIf("reorderQty", qeaReorderQty, "Reorder qty") === false) return;
    }
    if (qeaDescription.trim()) body.description = qeaDescription.trim();
    setQeaSaving(true);
    setQeaError("");
    try {
      await patchItem(selectedId, body);
      if (body.buyingPrice != null) {
        const bpNum = Number(body.buyingPrice);
        if (Number.isFinite(bpNum)) {
          await syncPrimarySupplierCost(selectedId, bpNum);
        }
      }
      const updated = await refreshSelectedDetail();
      if (updated) syncListRowFromDetail(updated);
      setQuickEditAllOpen(false);
      setMessage("Product updated.");
    } catch (e) {
      setQeaError(formatMutationError(e, "Update failed."));
    } finally {
      setQeaSaving(false);
    }
  }, [
    selectedId,
    canCatalogWrite,
    qeaName,
    qeaSku,
    qeaBarcode,
    qeaBundleQty,
    qeaBundlePrice,
    qeaBuyingPrice,
    qeaMinStock,
    qeaReorderLevel,
    qeaReorderQty,
    qeaDescription,
    detail,
    syncPrimarySupplierCost,
    syncListRowFromDetail,
    refreshSelectedDetail,
    setMessage,
  ]);

  return {
    quickEdit,
    quickProductName,
    setQuickProductName,
    quickSku,
    setQuickSku,
    quickBarcode,
    setQuickBarcode,
    quickBundleQty,
    setQuickBundleQty,
    quickBundlePrice,
    setQuickBundlePrice,
    quickBuyingPrice,
    setQuickBuyingPrice,
    quickMargin,
    setQuickMargin,
    quickMinStock,
    setQuickMinStock,
    quickReorderLevel,
    setQuickReorderLevel,
    quickReorderQty,
    setQuickReorderQty,
    quickStock,
    setQuickStock,
    quickStockBranchId,
    setQuickStockBranchId,
    quickStockUnitCost,
    setQuickStockUnitCost,
    quickStockBaseline,
    quickStockBaselineLoading,
    quickSaving,
    openQuickEdit,
    cancelQuickEdit,
    saveQuickProductName,
    saveQuickBarcode,
    saveQuickSku,
    saveQuickBundleQty,
    saveQuickBundlePrice,
    saveQuickBuyingPrice,
    saveQuickMargin,
    saveQuickMinStock,
    saveQuickReorder,
    saveQuickStock,
    quickEditAllOpen,
    setQuickEditAllOpen,
    qeaName,
    setQeaName,
    qeaSku,
    setQeaSku,
    qeaBarcode,
    setQeaBarcode,
    qeaBundleQty,
    setQeaBundleQty,
    qeaBundlePrice,
    setQeaBundlePrice,
    qeaBuyingPrice,
    setQeaBuyingPrice,
    qeaMinStock,
    setQeaMinStock,
    qeaReorderLevel,
    setQeaReorderLevel,
    qeaReorderQty,
    setQeaReorderQty,
    qeaDescription,
    setQeaDescription,
    qeaSaving,
    qeaError,
    openQuickEditAll,
    saveQuickEditAll,
  };
}

export type QuickEditApi = ReturnType<typeof useQuickEdit>;
