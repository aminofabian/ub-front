"use client";

import { useEffect, useRef, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";

import {
  fetchItemsPage,
  lookupGlobalCatalogProducts,
  type GlobalProductRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";

import styles from "./product-create-modal.module.css";

const LOOKUP_DEBOUNCE_MS = 350;
const BARCODE_MIN_DIGITS = 6;

type LookupResult = {
  /** The barcode this answer is for — stale answers are ignored. */
  code: string;
  shop: ItemSummaryRecord | null;
  shared: GlobalProductRecord | null;
  /** How many shared-catalog products carry exactly this barcode. */
  sharedExact: number;
};

type Props = {
  barcode: string;
  canGlobalCatalog: boolean;
  /** Shared product this row was already filled from, if any. */
  appliedSharedId: string | null;
  /** The clerk has typed a name or price on this row — never fill it unasked. */
  rowTouched: boolean;
  /** 1-based number of another option using the same barcode. */
  sameBarcodeAs: number | null;
  /** Bump after the existing product is edited or deleted so this line looks again. */
  lookupRevision?: number;
  disabled?: boolean;
  /**
   * The row was filled in bulk from a shared-catalog family, which already says so:
   * only look for a shop duplicate and a repeated barcode, skip the shared lookup
   * and the "filled" note.
   */
  quiet?: boolean;
  onUseShared: (product: GlobalProductRecord) => void;
  onOpenExisting?: (itemId: string) => void;
};

function looksLikeBarcode(code: string): boolean {
  return new RegExp(`^\\d{${BARCODE_MIN_DIGITS},}$`).test(code);
}

function formatPrice(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * One line under an option once its barcode is typed or scanned. A shared-catalog
 * match offers Use; a product already in the shop shows a check. A unique
 * shared-catalog hit on an untouched row fills the row by itself.
 */
export function OptionBarcodeLookup({
  barcode,
  canGlobalCatalog,
  appliedSharedId,
  rowTouched,
  sameBarcodeAs,
  lookupRevision = 0,
  disabled,
  quiet = false,
  onUseShared,
  onOpenExisting,
}: Props) {
  const code = barcode.trim();
  const valid = looksLikeBarcode(code);
  const [result, setResult] = useState<LookupResult | null>(null);
  const requestIdRef = useRef(0);
  const autoAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (disabled || !valid) {
      requestIdRef.current += 1;
      const idle = window.setTimeout(() => setResult(null), 0);
      return () => window.clearTimeout(idle);
    }
    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(() => {
      const shopPromise = fetchItemsPage(undefined, {
        barcode: code,
        page: 0,
        size: 3,
        includeInactive: true,
      });
      const sharedPromise = canGlobalCatalog && !quiet
        ? lookupGlobalCatalogProducts({ barcode: code, q: code })
        : Promise.resolve([] as GlobalProductRecord[]);
      void Promise.all([shopPromise, sharedPromise])
        .then(([shopPage, sharedRows]) => {
          if (requestId !== requestIdRef.current) return;
          const exact = sharedRows.filter(
            (g) => (g.barcode ?? "").trim() === code,
          );
          setResult({
            code,
            shop: shopPage.content[0] ?? null,
            shared: exact.find((g) => !g.alreadyImported) ?? exact[0] ?? null,
            sharedExact: exact.length,
          });
        })
        .catch(() => {
          if (requestId === requestIdRef.current) setResult(null);
        });
    }, LOOKUP_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [code, valid, canGlobalCatalog, quiet, disabled, lookupRevision]);

  const current = result && result.code === code ? result : null;

  // Scan-to-fill: exactly one shared product has this barcode, nothing in the shop
  // does, and the row is still blank.
  useEffect(() => {
    if (disabled || !current) return;
    const g = current.shared;
    if (!g || current.shop || current.sharedExact !== 1) return;
    if (g.alreadyImported || rowTouched || appliedSharedId === g.id) return;
    if (autoAppliedRef.current === code) return;
    autoAppliedRef.current = code;
    onUseShared(g);
  }, [current, code, rowTouched, appliedSharedId, disabled, onUseShared]);

  if (disabled) return null;

  const notes: React.ReactNode[] = [];

  if (sameBarcodeAs != null) {
    notes.push(
      <span key="dupe" className={styles.hintWarn}>
        <TriangleAlert className="size-3 shrink-0" aria-hidden />
        Same barcode as option {sameBarcodeAs}
      </span>,
    );
  }

  if (current) {
    const match = optionMatchNote({
      current,
      appliedSharedId,
      onUseShared,
      onOpenExisting,
    });
    if (match) notes.push(match);
  }

  if (notes.length === 0) return null;
  return (
    <div className={styles.hint} role="status">
      {notes}
    </div>
  );
}

function optionMatchNote({
  current,
  appliedSharedId,
  onUseShared,
  onOpenExisting,
}: {
  current: LookupResult;
  appliedSharedId: string | null;
  onUseShared: (product: GlobalProductRecord) => void;
  onOpenExisting?: (itemId: string) => void;
}): React.ReactNode | null {
  const shared = current.shared;
  const adoptedId = shared?.adoptedItemId?.trim() || null;
  const shopId = current.shop?.id ?? (shared?.alreadyImported ? adoptedId : null);
  const inShop = Boolean(current.shop) || Boolean(shared?.alreadyImported);
  const title = current.shop
    ? itemCatalogDisplayTitle(current.shop)
    : (shared?.name ?? "");

  if (inShop && title) {
    return (
      <span key="shop" className={styles.hintOk}>
        <Check className="size-3 shrink-0" aria-hidden />
        <span className={styles.hintText}>In your shop · {title}</span>
        {shopId && onOpenExisting ? (
          <button
            type="button"
            className={styles.hintAction}
            onClick={() => onOpenExisting(shopId)}
          >
            Open
          </button>
        ) : null}
      </span>
    );
  }

  if (!shared) return null;
  if (appliedSharedId === shared.id) {
    return (
      <span key="filled" className={styles.hintOk}>
        <span className={styles.hintText}>{shared.name}</span>
      </span>
    );
  }

  const sell = formatPrice(shared.recommendedSellingPrice);
  return (
    <span key="shared" className={styles.hintInfo}>
      <span className={styles.hintText}>
        {shared.name}
        {sell ? ` · sell ${sell}` : ""}
      </span>
      <button
        type="button"
        className={styles.hintAction}
        onClick={() => onUseShared(shared)}
      >
        Fill
      </button>
    </span>
  );
}
