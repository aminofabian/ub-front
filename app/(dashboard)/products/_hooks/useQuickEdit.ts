"use client";

import { useCallback, useState } from "react";
import { ApiRequestError, patchItem, type ItemDetailRecord, type PatchItemPayload } from "@/lib/api";
import { type QuickEditKey } from "../_types";
import { toNumber } from "../_utils";

type Params = {
  selectedId: string | null;
  detail: ItemDetailRecord | null;
  canCatalogWrite: boolean;
  refreshFullCatalog: () => Promise<void>;
  refreshSelectedDetail: () => Promise<void>;
  setMessage: (msg: string) => void;
};

export function useQuickEdit({ selectedId, detail, canCatalogWrite, refreshFullCatalog, refreshSelectedDetail, setMessage }: Params) {
  const [quickEdit, setQuickEdit] = useState<QuickEditKey>(null);
  const [quickProductName, setQuickProductName] = useState("");
  const [quickSku, setQuickSku] = useState("");
  const [quickBarcode, setQuickBarcode] = useState("");
  const [quickBundleQty, setQuickBundleQty] = useState("");
  const [quickBundlePrice, setQuickBundlePrice] = useState("");
  const [quickBuyingPrice, setQuickBuyingPrice] = useState("");
  const [quickMinStock, setQuickMinStock] = useState("");
  const [quickReorderLevel, setQuickReorderLevel] = useState("");
  const [quickReorderQty, setQuickReorderQty] = useState("");
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

  const runQuickPatch = useCallback(async (body: PatchItemPayload, successMsg: string) => {
    if (!selectedId || !canCatalogWrite) return;
    setQuickSaving(true);
    setMessage("");
    try {
      await patchItem(selectedId, body);
      await refreshFullCatalog();
      await refreshSelectedDetail();
      setQuickEdit(null);
      setMessage(successMsg);
    } catch (e) {
      if (!(e instanceof ApiRequestError)) setMessage(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setQuickSaving(false);
    }
  }, [selectedId, canCatalogWrite, refreshFullCatalog, refreshSelectedDetail, setMessage]);

  const openQuickEdit = useCallback((key: Exclude<QuickEditKey, null>) => {
    if (!detail || !canCatalogWrite) return;
    setQuickEdit(key);
    const v = (n: number | null | undefined) => n != null ? String(n) : "";
    const set = (fn: (v: string) => void, raw: string | null | undefined) => fn((raw ?? "").trim());
    if (key === "productName") setQuickProductName(detail.name?.trim() ?? "");
    if (key === "sku") setQuickSku(detail.sku?.trim() ?? "");
    if (key === "barcode") setQuickBarcode(detail.barcode?.trim() ?? "");
    if (key === "bundleQty") setQuickBundleQty(v(detail.bundleQty));
    if (key === "bundlePrice") setQuickBundlePrice(v(toNumber(detail.bundlePrice)));
    if (key === "buyingPrice") setQuickBuyingPrice(v(toNumber(detail.buyingPrice)));
    if (key === "minStock") setQuickMinStock(v(toNumber(detail.minStockLevel)));
    if (key === "reorder") { setQuickReorderLevel(v(toNumber(detail.reorderLevel))); setQuickReorderQty(v(toNumber(detail.reorderQty))); }
  }, [detail, canCatalogWrite]);

  const cancelQuickEdit = useCallback(() => setQuickEdit(null), []);

  const saveQuickProductName = useCallback(() => {
    const n = quickProductName.trim();
    if (!n) { setMessage("Display name is required."); return; }
    void runQuickPatch({ name: n }, "Display name updated.");
  }, [quickProductName, runQuickPatch, setMessage]);

  const saveQuickBarcode = useCallback(() =>
    void runQuickPatch({ barcode: quickBarcode.trim() || "" }, "Barcode updated."),
    [quickBarcode, runQuickPatch]);

  const saveQuickSku = useCallback(() => {
    const r = quickSku.trim();
    if (!r) { setMessage("SKU cannot be empty."); return; }
    void runQuickPatch({ sku: r }, "SKU updated.");
  }, [quickSku, runQuickPatch, setMessage]);

  const saveQuickBundleQty = useCallback(() => {
    const r = quickBundleQty.trim();
    if (!r) { setMessage("Pack quantity is required."); return; }
    const n = Number(r);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) { setMessage("Pack quantity must be a positive whole number."); return; }
    void runQuickPatch({ bundleQty: n }, "Pack quantity updated.");
  }, [quickBundleQty, runQuickPatch, setMessage]);

  const saveQuickBundlePrice = useCallback(() => {
    const r = quickBundlePrice.trim();
    if (!r) { setMessage("Enter a shelf price or cancel."); return; }
    const n = Number(r);
    if (!Number.isFinite(n) || n < 0) { setMessage("Shelf price must be a valid non-negative number."); return; }
    void runQuickPatch({ bundlePrice: n }, "Shelf price updated.");
  }, [quickBundlePrice, runQuickPatch, setMessage]);

  const saveQuickBuyingPrice = useCallback(() => {
    const r = quickBuyingPrice.trim();
    if (!r) { setMessage("Enter a buying price or cancel."); return; }
    const n = Number(r);
    if (!Number.isFinite(n) || n < 0) { setMessage("Buying price must be a valid non-negative number."); return; }
    void runQuickPatch({ buyingPrice: n }, "Buying price updated.");
  }, [quickBuyingPrice, runQuickPatch, setMessage]);

  const saveQuickMinStock = useCallback(() => {
    const r = quickMinStock.trim();
    if (!r) { setMessage("Enter a min stock level or cancel."); return; }
    const n = Number(r);
    if (!Number.isFinite(n) || n < 0) { setMessage("Min stock must be a valid non-negative number."); return; }
    void runQuickPatch({ minStockLevel: n }, "Min stock level updated.");
  }, [quickMinStock, runQuickPatch, setMessage]);

  const saveQuickReorder = useCallback(() => {
    const body: PatchItemPayload = {};
    if (quickReorderLevel.trim()) {
      const rl = Number(quickReorderLevel.trim());
      if (!Number.isFinite(rl) || rl < 0) { setMessage("Reorder level must be a valid non-negative number."); return; }
      body.reorderLevel = rl;
    }
    if (quickReorderQty.trim()) {
      const rq = Number(quickReorderQty.trim());
      if (!Number.isFinite(rq) || rq < 0) { setMessage("Reorder quantity must be a valid non-negative number."); return; }
      body.reorderQty = rq;
    }
    if (Object.keys(body).length === 0) { setMessage("Enter reorder level or reorder quantity."); return; }
    void runQuickPatch(body, "Reorder settings updated.");
  }, [quickReorderLevel, quickReorderQty, runQuickPatch, setMessage]);

  const openQuickEditAll = useCallback(() => {
    if (!detail || !canCatalogWrite) return;
    setQeaName(detail.name?.trim() ?? "");
    setQeaSku(detail.sku?.trim() ?? "");
    setQeaBarcode(detail.barcode?.trim() ?? "");
    setQeaBundleQty(detail.bundleQty != null ? String(detail.bundleQty) : "");
    setQeaBundlePrice((n => n != null ? String(n) : "")(toNumber(detail.bundlePrice)));
    setQeaBuyingPrice((n => n != null ? String(n) : "")(toNumber(detail.buyingPrice)));
    setQeaMinStock((n => n != null ? String(n) : "")(toNumber(detail.minStockLevel)));
    setQeaReorderLevel((n => n != null ? String(n) : "")(toNumber(detail.reorderLevel)));
    setQeaReorderQty((n => n != null ? String(n) : "")(toNumber(detail.reorderQty)));
    setQeaDescription(detail.description?.trim() ?? "");
    setQeaError("");
    setQuickEditAllOpen(true);
  }, [detail, canCatalogWrite]);

  const saveQuickEditAll = useCallback(async () => {
    if (!selectedId || !canCatalogWrite) return;
    const name = qeaName.trim(); if (!name) { setQeaError("Display name is required."); return; }
    const skuRaw = qeaSku.trim(); if (!skuRaw) { setQeaError("SKU cannot be empty."); return; }
    const body: PatchItemPayload = { name, sku: skuRaw, barcode: qeaBarcode.trim() || "" };
    const num = (raw: string, label: string, mustBeInt = false): number | null => {
      if (!raw.trim()) return null;
      const n = Number(raw.trim());
      if (!Number.isFinite(n) || n < 0 || (mustBeInt && !Number.isInteger(n))) { setQeaError(`${label} must be a valid${mustBeInt ? " whole" : ""} non-negative number.`); return null; }
      return n;
    };
    const setIf = (key: keyof PatchItemPayload, raw: string, label: string, int = false) => { const n = num(raw, label, int); if (n === null) return raw ? false : true; (body as Record<string, unknown>)[key] = int ? Math.round(n) : n; return true; };
    if (setIf("bundleQty", qeaBundleQty, "Pack qty", true) === false) return;
    if (setIf("bundlePrice", qeaBundlePrice, "Shelf price") === false) return;
    if (setIf("buyingPrice", qeaBuyingPrice, "Buying price") === false) return;
    if (setIf("minStockLevel", qeaMinStock, "Min stock") === false) return;
    if (setIf("reorderLevel", qeaReorderLevel, "Reorder level") === false) return;
    if (setIf("reorderQty", qeaReorderQty, "Reorder qty") === false) return;
    if (qeaDescription.trim()) body.description = qeaDescription.trim();
    setQeaSaving(true); setQeaError("");
    try {
      await patchItem(selectedId, body);
      await refreshFullCatalog();
      await refreshSelectedDetail();
      setQuickEditAllOpen(false);
      setMessage("Product updated.");
    } catch (e) {
      if (!(e instanceof ApiRequestError)) setQeaError(e instanceof Error ? e.message : "Update failed.");
    } finally { setQeaSaving(false); }
  }, [selectedId, canCatalogWrite, qeaName, qeaSku, qeaBarcode, qeaBundleQty, qeaBundlePrice, qeaBuyingPrice, qeaMinStock, qeaReorderLevel, qeaReorderQty, qeaDescription, refreshFullCatalog, refreshSelectedDetail, setMessage]);

  return {
    quickEdit, quickProductName, setQuickProductName, quickSku, setQuickSku,
    quickBarcode, setQuickBarcode, quickBundleQty, setQuickBundleQty,
    quickBundlePrice, setQuickBundlePrice, quickBuyingPrice, setQuickBuyingPrice,
    quickMinStock, setQuickMinStock, quickReorderLevel, setQuickReorderLevel,
    quickReorderQty, setQuickReorderQty, quickSaving,
    openQuickEdit, cancelQuickEdit, saveQuickProductName, saveQuickBarcode,
    saveQuickSku, saveQuickBundleQty, saveQuickBundlePrice, saveQuickBuyingPrice,
    saveQuickMinStock, saveQuickReorder,
    quickEditAllOpen, setQuickEditAllOpen, qeaName, setQeaName, qeaSku, setQeaSku,
    qeaBarcode, setQeaBarcode, qeaBundleQty, setQeaBundleQty,
    qeaBundlePrice, setQeaBundlePrice, qeaBuyingPrice, setQeaBuyingPrice,
    qeaMinStock, setQeaMinStock, qeaReorderLevel, setQeaReorderLevel,
    qeaReorderQty, setQeaReorderQty, qeaDescription, setQeaDescription,
    qeaSaving, qeaError, openQuickEditAll, saveQuickEditAll,
  };
}

export type QuickEditApi = ReturnType<typeof useQuickEdit>;
