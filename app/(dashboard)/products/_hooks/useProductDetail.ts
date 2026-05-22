"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiRequestError,
  fetchCurrentSellingPrice,
  fetchItemById,
  fetchItemSupplierLinks,
  type ItemDetailRecord,
  type ItemSummaryRecord,
  type ItemSupplierLinkRecord,
} from "@/lib/api";
import { type ProductEditDraft, EMPTY_EDIT_DRAFT } from "../_types";
import { effectiveSupplierUnitCost, normalizeItemDetail, toNumber } from "../_utils";

/** Safe number-to-string helper for draft fields. */
function numStr(v: number | string | null | undefined): string {
  return v != null && v !== "" ? String(v) : "";
}

export function useProductDetail(branchIdForPricing?: string | null) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDetailRecord | null>(null);
  const [supplierLinks, setSupplierLinks] = useState<ItemSupplierLinkRecord[]>(
    [],
  );
  const [patchDraft, setPatchDraft] =
    useState<ProductEditDraft>(EMPTY_EDIT_DRAFT);
  const [parentVariants, setParentVariants] = useState<
    ItemSummaryRecord[] | null
  >(null);
  const [variantParentDisplayName, setVariantParentDisplayName] = useState<
    string | null
  >(null);
  /** Current selling price resolved by the pricing module (source of truth). */
  const [currentSellPrice, setCurrentSellPrice] = useState<number | null>(null);

  const pricingBranchId = branchIdForPricing?.trim() || undefined;

  const buildDraft = useCallback(
    (row: ItemDetailRecord): ProductEditDraft => ({
      name: row.name,
      sku: row.sku,
      barcode: row.barcode,
      description: row.description,
      active: row.active ?? true,
      webPublished: row.webPublished ?? true,
      bundlePriceStr: numStr(row.bundlePrice),
      bundleQtyStr: numStr(row.bundleQty),
      packageVariant: row.packageVariant ?? false,
      packagingUnitName: row.packagingUnitName ?? "",
      packagingUnitQtyStr:
        row.packageVariant || row.packagingUnitQty != null
          ? numStr(row.packagingUnitQty)
          : "",
      buyingPriceStr: numStr(row.buyingPrice),
      minStockLevelStr: numStr(row.minStockLevel),
      reorderLevelStr: numStr(row.reorderLevel),
      reorderQtyStr: numStr(row.reorderQty),
      imageKey: row.imageKey ?? "",
      categoryId: row.categoryId ?? "",
      variantName: row.variantName ?? "",
    }),
    [],
  );

  /** Pass `itemIdOverride` after `selectProduct(id)` so detail loads before the next paint (same-tick stale `selectedId`). */
  const refreshSelectedDetail = useCallback(
    async (itemIdOverride?: string | null): Promise<ItemDetailRecord | null> => {
      const id = (itemIdOverride?.trim() || selectedId?.trim()) ?? "";
      if (!id) return null;
      try {
        const row = normalizeItemDetail(
          await fetchItemById(id, { branchId: pricingBranchId }),
        );
        setDetail(row);
        setPatchDraft(buildDraft(row));
        const parentOfVariant = row.variantOfItemId?.trim();
        if (parentOfVariant) {
          try {
            const parentRow = await fetchItemById(parentOfVariant, {
              branchId: pricingBranchId,
            });
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
        try {
          const links = await fetchItemSupplierLinks(id);
          setSupplierLinks(links);
        } catch {
          setSupplierLinks([]);
        }
        try {
          const sp = await fetchCurrentSellingPrice(id, pricingBranchId);
          const n = toNumber(sp.price);
          setCurrentSellPrice(n);
        } catch {
          setCurrentSellPrice(toNumber(row.bundlePrice));
        }
        return row;
      } catch (error) {
        if (!(error instanceof ApiRequestError)) {
          // silently ignore — downstream can show state
        }
        return null;
      }
    },
    [selectedId, buildDraft, pricingBranchId],
  );

  const selectProduct = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setSupplierLinks([]);
      setPatchDraft(EMPTY_EDIT_DRAFT);
      setParentVariants(null);
      setVariantParentDisplayName(null);
      setCurrentSellPrice(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const row = await fetchItemById(selectedId, { branchId: pricingBranchId });
        if (cancelled) return;
        setDetail(row);
        setPatchDraft(buildDraft(row));
        const parentOfVariant = row.variantOfItemId?.trim();
        if (parentOfVariant) {
          try {
            const parentRow = await fetchItemById(parentOfVariant, {
              branchId: pricingBranchId,
            });
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
          if (!cancelled) setSupplierLinks(links);
        } catch {
          if (!cancelled) setSupplierLinks([]);
        }
        // fetch current sell price from pricing module (source of truth)
        try {
          const sp = await fetchCurrentSellingPrice(
            selectedId,
            pricingBranchId,
          );
          if (!cancelled) {
            const n = toNumber(sp.price);
            setCurrentSellPrice(n);
          }
        } catch {
          if (!cancelled) {
            // fall back to bundlePrice on item
            setCurrentSellPrice(toNumber(row.bundlePrice));
          }
        }
      } catch (error) {
        if (!cancelled && !(error instanceof ApiRequestError)) {
          // silently ignore — downstream can show state
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, buildDraft, pricingBranchId]);

  const variantRows: ItemSummaryRecord[] = detail
    ? detail.variantOfItemId
      ? (parentVariants ?? [])
      : (detail.variants ?? [])
    : [];
  const sortedImages = detail?.images
    ? [...detail.images].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  // Shelf price on the item record; storefront/POS use the pricing module's current selling price.
  const sellPrice = detail ? toNumber(detail.bundlePrice) : null;
  const primaryLink = supplierLinks.find((l) => l.primary);
  const primaryCost = effectiveSupplierUnitCost(
    primaryLink,
    detail?.buyingPrice,
  );
  const marginPct =
    sellPrice != null && sellPrice > 0 && primaryCost != null
      ? ((sellPrice - primaryCost) / sellPrice) * 100
      : null;

  return {
    selectedId,
    setSelectedId,
    detail,
    setDetail,
    supplierLinks,
    setSupplierLinks,
    patchDraft,
    setPatchDraft,
    parentVariants,
    setParentVariants,
    variantParentDisplayName,
    setVariantParentDisplayName,
    variantRows,
    sortedImages,
    sellPrice,
    primaryLink,
    primaryCost,
    marginPct,
    currentSellPrice,
    selectProduct,
    refreshSelectedDetail,
  };
}

export type ProductDetailApi = ReturnType<typeof useProductDetail>;
