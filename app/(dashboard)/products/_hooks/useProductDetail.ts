"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiRequestError,
  fetchItemById,
  fetchItemSupplierLinks,
  type ItemDetailRecord,
  type ItemSummaryRecord,
  type ItemSupplierLinkRecord,
} from "@/lib/api";
import { type ProductEditDraft, EMPTY_EDIT_DRAFT } from "../_types";
import { toNumber } from "../_utils";

export function useProductDetail() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDetailRecord | null>(null);
  const [supplierLinks, setSupplierLinks] = useState<ItemSupplierLinkRecord[]>([]);
  const [patchDraft, setPatchDraft] = useState<ProductEditDraft>(EMPTY_EDIT_DRAFT);
  const [parentVariants, setParentVariants] = useState<ItemSummaryRecord[] | null>(null);
  const [variantParentDisplayName, setVariantParentDisplayName] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- consumed by refreshSelectedDetail which is rebuilt when selectedId changes
  const refreshSelectedDetail = useCallback(async () => {
    if (!selectedId) return;
    const row = await fetchItemById(selectedId);
    setDetail(row);
    setPatchDraft({
      name: row.name, barcode: row.barcode, description: row.description,
      active: row.active ?? true, webPublished: row.webPublished ?? false,
      bundlePriceStr: row.bundlePrice != null && row.bundlePrice !== "" ? String(row.bundlePrice) : "",
      imageKey: row.imageKey ?? "", categoryId: row.categoryId ?? "",
    });
    const parentOfVariant = row.variantOfItemId?.trim();
    if (parentOfVariant) {
      try {
        const parentRow = await fetchItemById(parentOfVariant);
        setParentVariants(parentRow.variants ?? []);
        setVariantParentDisplayName(parentRow.name?.trim() || null);
      } catch {
        setParentVariants([]); setVariantParentDisplayName(null);
      }
    } else {
      setParentVariants(null); setVariantParentDisplayName(null);
    }
  }, [selectedId]);

  const selectProduct = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null); setSupplierLinks([]); setPatchDraft(EMPTY_EDIT_DRAFT);
      setParentVariants(null); setVariantParentDisplayName(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const row = await fetchItemById(selectedId);
        if (cancelled) return;
        setDetail(row);
        setPatchDraft({
          name: row.name, barcode: row.barcode, description: row.description,
          active: row.active ?? true, webPublished: row.webPublished ?? false,
          bundlePriceStr: row.bundlePrice != null && row.bundlePrice !== "" ? String(row.bundlePrice) : "",
          imageKey: row.imageKey ?? "", categoryId: row.categoryId ?? "",
        });
        const parentOfVariant = row.variantOfItemId?.trim();
        if (parentOfVariant) {
          try {
            const parentRow = await fetchItemById(parentOfVariant);
            if (!cancelled) { setParentVariants(parentRow.variants ?? []); setVariantParentDisplayName(parentRow.name?.trim() || null); }
          } catch { if (!cancelled) { setParentVariants([]); setVariantParentDisplayName(null); } }
        } else if (!cancelled) { setParentVariants(null); setVariantParentDisplayName(null); }
        try {
          const links = await fetchItemSupplierLinks(selectedId);
          if (!cancelled) setSupplierLinks(links);
        } catch { if (!cancelled) setSupplierLinks([]); }
      } catch (error) {
        if (!cancelled && !(error instanceof ApiRequestError)) {
          // silently ignore — downstream can show state
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  const variantRows: ItemSummaryRecord[] = detail
    ? detail.variantOfItemId ? (parentVariants ?? []) : (detail.variants ?? [])
    : [];
  const sortedImages = detail?.images ? [...detail.images].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const sellPrice = detail ? toNumber(detail.bundlePrice) : null;
  const primaryLink = supplierLinks.find((l) => l.primary);
  const primaryCost = primaryLink ? toNumber(primaryLink.defaultCostPrice) : null;
  const marginPct = sellPrice != null && sellPrice > 0 && primaryCost != null
    ? ((sellPrice - primaryCost) / sellPrice) * 100 : null;

  return {
    selectedId, setSelectedId,
    detail, setDetail,
    supplierLinks, setSupplierLinks,
    patchDraft, setPatchDraft,
    parentVariants, setParentVariants,
    variantParentDisplayName, setVariantParentDisplayName,
    variantRows, sortedImages,
    sellPrice, primaryLink, primaryCost, marginPct,
    selectProduct, refreshSelectedDetail,
  };
}

export type ProductDetailApi = ReturnType<typeof useProductDetail>;
