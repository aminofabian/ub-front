"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ApiRequestError, fetchItemById } from "@/lib/api";
import { tagProductFromDetail } from "@/lib/price-tags/product";
import { refreshTagProducts, type RefreshOutcome, type TagProductLoader } from "@/lib/price-tags/refresh";
import {
  copiesOf,
  MAX_COPIES,
  createSlotKey,
  duplicateSlot,
  mergeRestored,
  moveSlot,
  removeSlot,
  setCopies,
} from "@/lib/price-tags/slots";
import { MAX_QUEUED_TAGS, readTagQueue, writeTagQueue } from "@/lib/price-tags/storage";
import type { TagInstance, TagProduct } from "@/lib/price-tags/types";

function loaderFor(branchId: string | null | undefined): TagProductLoader {
  return async (itemId) => {
    try {
      return tagProductFromDetail(await fetchItemById(itemId, { branchId, toast: false }));
    } catch (error) {
      if (error instanceof ApiRequestError && (error.status === 404 || error.status === 410)) {
        return null;
      }
      throw error;
    }
  };
}

function withoutKeys<T>(record: Record<string, T>, ids: ReadonlySet<string>): Record<string, T> {
  const next: Record<string, T> = {};
  for (const [id, value] of Object.entries(record)) if (!ids.has(id)) next[id] = value;
  return next;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? `1 ${one}` : `${count.toLocaleString("en-KE")} ${many}`;
}

/**
 * The tags on the sheet: which products, how many of each, in what order.
 * The order and copies survive a reload; prices are always read again.
 */
export function usePriceTagJob(businessId: string, branchId: string | null | undefined) {
  const [products, setProducts] = useState<Map<string, TagProduct>>(() => new Map());
  const [instances, setInstances] = useState<TagInstance[]>([]);
  const [wasOverrides, setWasOverrides] = useState<Record<string, number | null>>({});
  const [hydratedFor, setHydratedFor] = useState("");
  const [restoring, setRestoring] = useState(false);
  const load = useMemo(() => loaderFor(branchId), [branchId]);
  // The restore reads through a ref so a branch that resolves mid-restore
  // does not restart it and throw away what was picked in the meantime.
  const loadRef = useRef(load);
  loadRef.current = load;
  // Counts for the return values below; the updates themselves stay functional.
  const instancesRef = useRef(instances);
  instancesRef.current = instances;

  useEffect(() => {
    if (!businessId || hydratedFor === businessId) return;
    let cancelled = false;
    const stored = readTagQueue(businessId);
    setInstances([]);
    setProducts(new Map());
    setWasOverrides({});
    if (stored.itemIds.length === 0) {
      setHydratedFor(businessId);
      return;
    }
    setRestoring(true);
    void refreshTagProducts(stored.itemIds, new Map(), loadRef.current).then((outcome) => {
      if (cancelled) return;
      const gone = new Set(outcome.unavailable);
      const slots = stored.itemIds
        .filter((id) => !gone.has(id))
        .map((itemId) => ({ key: createSlotKey(itemId), itemId }));
      setInstances((current) => mergeRestored(slots, current));
      setProducts((current) => new Map([...outcome.products, ...current]));
      setWasOverrides((current) => ({ ...withoutKeys(stored.wasOverrides, gone), ...current }));
      setRestoring(false);
      setHydratedFor(businessId);
      if (gone.size > 0) {
        toast.warning(`${plural(gone.size, "product is", "products are")} no longer for sale and left the sheet.`);
      }
      if (outcome.failed.length > 0) {
        toast.error(`Could not load ${plural(outcome.failed.length, "product", "products")}. They load again when you print.`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [businessId, hydratedFor]);

  useEffect(() => {
    if (!businessId || hydratedFor !== businessId) return;
    const ok = writeTagQueue(businessId, {
      itemIds: instances.map((slot) => slot.itemId),
      wasOverrides,
    });
    if (!ok && instances.length > 0) {
      // Private browsing or a full quota: the job still prints, it just won't survive a reload.
      console.warn("Price tag sheet could not be saved on this device.");
    }
  }, [businessId, hydratedFor, instances, wasOverrides]);

  const selectedIds = useMemo(() => {
    const seen = new Set<string>();
    for (const slot of instances) seen.add(slot.itemId);
    return Array.from(seen);
  }, [instances]);

  const remember = useCallback((incoming: readonly TagProduct[]) => {
    setProducts((current) => {
      const next = new Map(current);
      for (const product of incoming) next.set(product.id, product);
      return next;
    });
  }, []);

  /** Adds one tag for each product not on the sheet yet. Returns how many were added. */
  const addProducts = useCallback(
    (incoming: readonly TagProduct[]): number => {
      const sheet = instancesRef.current;
      const fresh = incoming.filter((product) => copiesOf(sheet, product.id) === 0);
      const accepted = fresh.slice(0, Math.max(0, MAX_QUEUED_TAGS - sheet.length));
      if (accepted.length === 0) return 0;
      remember(accepted);
      setInstances((current) => {
        const room = Math.max(0, MAX_QUEUED_TAGS - current.length);
        const missing = accepted.filter((product) => copiesOf(current, product.id) === 0).slice(0, room);
        return current.concat(missing.map((product) => ({ key: createSlotKey(product.id), itemId: product.id })));
      });
      return accepted.length;
    },
    [remember],
  );

  /** Scanner path: the same product scanned again gets one more tag. Returns its copies. */
  const addOneCopy = useCallback(
    (product: TagProduct): number => {
      const sheet = instancesRef.current;
      const before = copiesOf(sheet, product.id);
      if (sheet.length >= MAX_QUEUED_TAGS || before >= MAX_COPIES) return before;
      remember([product]);
      setInstances((current) =>
        current.length >= MAX_QUEUED_TAGS
          ? current
          : setCopies(current, product.id, copiesOf(current, product.id) + 1),
      );
      // Mirror the update so a scan queued right behind this one counts it.
      instancesRef.current = setCopies(sheet, product.id, before + 1);
      return before + 1;
    },
    [remember],
  );

  const dropProducts = useCallback((ids: readonly string[]) => {
    if (ids.length === 0) return;
    const gone = new Set(ids);
    setInstances((current) => current.filter((slot) => !gone.has(slot.itemId)));
    setWasOverrides((current) => withoutKeys(current, gone));
  }, []);

  const setCopiesFor = useCallback(
    (itemId: string, count: number) => {
      if (count <= 0) {
        dropProducts([itemId]);
        return;
      }
      setInstances((current) => setCopies(current, itemId, count));
    },
    [dropProducts],
  );

  const clearAll = useCallback(() => {
    setInstances([]);
    setWasOverrides({});
  }, []);

  const setWasOverride = useCallback((itemId: string, value: number | null) => {
    setWasOverrides((current) => ({ ...current, [itemId]: value }));
  }, []);

  /**
   * Re-read every product before output. Products that can no longer be sold
   * leave the sheet; the caller decides whether to go on printing.
   */
  const refreshForOutput = useCallback(async (): Promise<RefreshOutcome> => {
    const outcome = await refreshTagProducts(selectedIds, products, load);
    // Merge rather than replace: a product added while prices were checked keeps its row.
    setProducts((current) => {
      const next = new Map(current);
      outcome.products.forEach((product, id) => next.set(id, product));
      return next;
    });
    dropProducts(outcome.unavailable);
    return outcome;
  }, [selectedIds, products, load, dropProducts]);

  return {
    products,
    instances,
    wasOverrides,
    selectedIds,
    restoring,
    addProducts,
    addOneCopy,
    dropProducts,
    setCopiesFor,
    clearAll,
    setWasOverride,
    refreshForOutput,
    reorder: (from: number, to: number) => setInstances((current) => moveSlot(current, from, to)),
    removeTag: (key: string) => setInstances((current) => removeSlot(current, key)),
    duplicateTag: (key: string) => setInstances((current) => duplicateSlot(current, key)),
  };
}

export type PriceTagJob = ReturnType<typeof usePriceTagJob>;
