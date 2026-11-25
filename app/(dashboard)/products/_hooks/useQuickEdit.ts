"use client";

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
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
  type ItemSupplierLinkRecord,
  type PatchItemPayload,
} from "@/lib/api";
import {
  formatProductNameForCatalog,
  isGarbageProductName,
} from "@/lib/catalog-display";
import { type QuickEditKey } from "../_types";
import {
  effectiveOnHand,
  formatMutationError,
  stockCatalogItemId,
  usesSharedPackageStock,
  toNumber,
} from "../_utils";

const QTY_EPSILON = 0.0001;

function roundQty(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Returns an error message, or null when the ledger move landed. */
async function postOnHandChange(input: {
  stockItemId: string;
  branchId: string;
  delta: number;
  unitCost: number;
}): Promise<string | null> {
  const { stockItemId, branchId, delta, unitCost } = input;
  if (delta > QTY_EPSILON) {
    await postStockIncrease({
      branchId,
      itemId: stockItemId,
      quantity: delta,
      unitCost,
      notes: "Stock set from products",
    });
    return null;
  }
  const decreaseQty = Math.abs(delta);
  const allocations = await fetchAllocationPreview({
    itemId: stockItemId,
    branchId,
    quantity: decreaseQty,
  });
  if (!allocations.length) {
    return "Could not allocate stock to remove for this branch.";
  }
  let allocated = 0;
  for (const line of allocations) {
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    allocated += quantity;
    await postBatchDecrease({
      batchId: line.batchId,
      quantity,
      reason: "Stock set from products",
    });
  }
  if (allocated < decreaseQty - QTY_EPSILON) {
    return `Only ${allocated} could be removed; check batch availability.`;
  }
  return null;
}

function validUnitCost(unitCost: number): boolean {
  return Number.isFinite(unitCost) && unitCost >= 0;
}

async function loadOnHand(
  stockItemId: string,
  branchId: string,
  current: number | null,
): Promise<{ current: number } | { error: string }> {
  if (current != null) return { current };
  try {
    const row = await fetchItemById(stockItemId, { branchId });
    return { current: effectiveOnHand(row) ?? 0 };
  } catch (error) {
    return { error: formatMutationError(error, "Could not load current stock.") };
  }
}

function stockSavedMessage(
  shared: boolean,
  needsTracking: boolean,
  target: number,
): string {
  if (shared) return `Stock on base product set to ${target}.`;
  if (needsTracking) return `Stock tracking is on. Stock set to ${target}.`;
  return `Stock set to ${target}.`;
}

type OnHandQtyInput = {
  target: number;
  branchId: string;
  unitCost: number;
  /** Branch on-hand already loaded. Null fetches it. */
  current: number | null;
};

type OnHandQtyResult = { ok: boolean; message: string };

type Params = {
  selectedId: string | null;
  detail: ItemDetailRecord | null;
  /** Effective unit cost: supplier default, last purchase, or item buying price. */
  primaryCost: number | null;
  /** Link that currently drives Commerce Cost (primary, else first active). */
  primaryLink: ItemSupplierLinkRecord | null;
  setSupplierLinks: Dispatch<SetStateAction<ItemSupplierLinkRecord[]>>;
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
  primaryLink,
  setSupplierLinks,
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

  /**
   * Commerce Cost prefers supplier defaultCostPrice, then lastCostPrice, then
   * catalog buyingPrice. Editing Cost must update the supplier default or the
   * number on screen will not change after a purchase cost is recorded.
   */
  const syncPrimarySupplierCost = useCallback(
    async (itemId: string, unitCost: number) => {
      let linkId = primaryLink?.id?.trim() || "";
      if (!linkId) {
        const links = await fetchItemSupplierLinks(itemId);
        const target =
          links.find((l) => l.primary) ??
          links.find((l) => l.active) ??
          links[0];
        linkId = target?.id?.trim() || "";
      }
      if (!linkId) return false;

      await patchItemSupplierLink(itemId, linkId, {
        defaultCostPrice: unitCost,
      });
      setSupplierLinks((prev) =>
        prev.map((l) =>
          l.id === linkId ? { ...l, defaultCostPrice: unitCost } : l,
        ),
      );
      return true;
    },
    [primaryLink?.id, setSupplierLinks],
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
    if (detail?.variantOfItemId?.trim()) {
      setMessage("Display name is built from the family and option label.");
      setQuickEdit(null);
      return;
    }
    const n = formatProductNameForCatalog(quickProductName);
    if (!n) {
      setMessage("Display name is required.");
      return;
    }
    if (isGarbageProductName(n)) {
      setMessage("Use a real product name — not a UUID or import id.");
      return;
    }
    void runQuickPatch({ name: n }, "Display name updated.");
  }, [detail?.variantOfItemId, quickProductName, runQuickPatch, setMessage, setQuickEdit]);

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
      setMessage("Enter a cost or cancel.");
      return;
    }
    const n = Number(r);
    if (!Number.isFinite(n) || n < 0) {
      setMessage("Cost must be a valid non-negative number.");
      return;
    }
    void runQuickPatch({ buyingPrice: n }, "Cost updated.");
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
      setMessage(
        "Set a cost price first, then set margin to update shelf price.",
      );
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

  const refreshStockViews = useCallback(async () => {
    if (!selectedId || !detail) return;
    const shared = usesSharedPackageStock(detail);
    if (shared && detail.variantOfItemId?.trim()) {
      await refreshSelectedDetail(detail.variantOfItemId.trim());
      const pkgUpdated = await refreshSelectedDetail(selectedId);
      if (pkgUpdated) syncListRowFromDetail(pkgUpdated);
      return;
    }
    const updated = await refreshSelectedDetail();
    if (updated) syncListRowFromDetail(updated);
  }, [selectedId, detail, refreshSelectedDetail, syncListRowFromDetail]);

  const saveOnHandQty = useCallback(
    async (input: OnHandQtyInput): Promise<OnHandQtyResult> => {
      const fail = (message: string): OnHandQtyResult => {
        setMessage(message);
        return { ok: false, message };
      };
      if (!selectedId || !detail) return fail("Select a product first.");
      if (!canInventoryWrite) {
        return fail("You do not have permission to adjust stock.");
      }
      const shared = usesSharedPackageStock(detail);
      const needsTracking = detail.isStocked === false && !shared;
      if (needsTracking && !canCatalogWrite) {
        return fail(
          "Stock is not tracked for this product yet. Ask someone who can edit products to turn it on.",
        );
      }
      if (!Number.isFinite(input.target) || input.target < 0) {
        return fail("On-hand quantity must be zero or a positive number.");
      }
      const branchId = input.branchId.trim();
      if (!branchId) return fail("Select a branch.");

      const stockItemId = stockCatalogItemId(detail);
      const loaded = await loadOnHand(stockItemId, branchId, input.current);
      if ("error" in loaded) return fail(loaded.error);
      const current = loaded.current;
      const delta = roundQty(input.target - current);
      const unchanged = Math.abs(delta) < QTY_EPSILON;
      if (unchanged && !needsTracking) {
        setQuickEdit(null);
        setQuickStockBaseline(null);
        const message = "Stock unchanged.";
        setMessage(message);
        return { ok: true, message };
      }
      if (delta > QTY_EPSILON && !validUnitCost(input.unitCost)) {
        return fail("Unit cost must be a valid non-negative number.");
      }

      setQuickSaving(true);
      setMessage("");
      try {
        if (needsTracking) await patchItem(selectedId, { isStocked: true });
        if (!unchanged) {
          const posted = await postOnHandChange({
            stockItemId,
            branchId,
            delta,
            unitCost: input.unitCost,
          });
          if (posted) return fail(posted);
        }
        await refreshStockViews();
        setQuickEdit(null);
        setQuickStockBaseline(null);
        const message = stockSavedMessage(shared, needsTracking, input.target);
        setMessage(message);
        return { ok: true, message };
      } catch (e) {
        return fail(formatMutationError(e, "Stock adjustment failed."));
      } finally {
        setQuickSaving(false);
      }
    },
    [
      canCatalogWrite,
      selectedId,
      detail,
      canInventoryWrite,
      refreshStockViews,
      setMessage,
    ],
  );

  // ── Stock adjustment via inventory API ──────────────────────────────
  const saveQuickStock = useCallback(async () => {
    if (!selectedId || !detail) return;
    const targetRaw = quickStock.trim();
    if (!targetRaw) {
      setMessage("Enter the on-hand quantity you want.");
      return;
    }
    const target = Number(targetRaw);
    const branchId = quickStockBranchId.trim();
    const costRaw = quickStockUnitCost.trim();
    const unitCost = costRaw === "" ? 0 : Number(costRaw);
    await saveOnHandQty({
      target,
      branchId,
      unitCost,
      current: quickStockBaseline,
    });
  }, [
    selectedId,
    detail,
    quickStock,
    quickStockBranchId,
    quickStockUnitCost,
    quickStockBaseline,
    saveOnHandQty,
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
    const isVariant = !!detail?.variantOfItemId?.trim();
    const skuRaw = qeaSku.trim();
    if (!skuRaw) {
      setQeaError("SKU cannot be empty.");
      return;
    }
    const body: PatchItemPayload = {
      sku: skuRaw,
      barcode: qeaBarcode.trim() || "",
    };
    if (!isVariant) {
      const name = qeaName.trim();
      if (!name) {
        setQeaError("Display name is required.");
        return;
      }
      body.name = name;
    }
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
    saveOnHandQty,
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
