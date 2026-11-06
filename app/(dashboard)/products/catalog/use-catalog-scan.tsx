"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { BarcodeScanner } from "@/components/barcode-scanner";
import {
  lookupGlobalCatalogProducts,
  type GlobalProductRecord,
} from "@/lib/api";

import {
  barcodeVariants,
  decideScan,
  normalizeScannedCode,
  type CatalogScanDecision,
} from "./catalog-scan";

/** The camera re-reads a barcode every couple of seconds while it stays in view. */
const SAME_CODE_QUIET_MS = 8000;

type Options = {
  /** Is this product already in the import? */
  isSelected: (productId: string) => boolean;
  /** Add it to the import. */
  onSelect: (product: GlobalProductRecord) => void;
  /** Several products share the barcode: show them in the list (the camera closes). */
  onShowMatches: (code: string) => void;
  /** Open one of the shop's own products. */
  onOpenShopItem: (itemId: string) => void;
  /** The catalogue does not know the barcode: start a new product with it. */
  onCreateNew?: (code: string) => void;
};

export type CatalogScan = {
  /** Render once in the page: the camera while it is open, nothing otherwise. */
  scanner: ReactNode;
  openScanner: () => void;
};

/** A short buzz tells the clerk a scan landed while the camera hides the list. */
function buzz() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(30);
    }
  } catch {
    // Some browsers refuse until the page has been tapped; the toast still shows.
  }
}

/**
 * Scan-to-add for the shared catalogue: the camera stays open, every barcode that
 * matches one importable catalogue product is added to the import, and the clerk
 * reviews prices and stock afterwards with "Review & import" as usual.
 */
export function useCatalogScan(options: Options): CatalogScan {
  const [scannerOpen, setScannerOpen] = useState(false);
  const optionsRef = useRef(options);
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const busyRef = useRef<Set<string>>(new Set());
  /** Products added by this camera session, so repeats read "already added". */
  const scannedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    optionsRef.current = options;
  });

  const settle = useCallback((code: string, decision: CatalogScanDecision) => {
    const o = optionsRef.current;
    switch (decision.kind) {
      case "select": {
        const { product } = decision;
        o.onSelect(product);
        scannedRef.current.add(product.id);
        toast.success(`Added: ${product.name}`, {
          id: `scan-${product.id}`,
          description: `${scannedRef.current.size} scanned. Review & import when you're done.`,
        });
        buzz();
        break;
      }
      case "already-selected":
        toast.message(`Already added: ${decision.product.name}`, {
          id: `scan-${decision.product.id}`,
        });
        break;
      case "in-shop": {
        const { product, itemId } = decision;
        toast.message(`Already in your shop: ${product.name}`, {
          id: `scan-${product.id}`,
          action: itemId
            ? {
                label: "Open",
                onClick: () => optionsRef.current.onOpenShopItem(itemId),
              }
            : undefined,
        });
        break;
      }
      case "pick":
        toast.message(`${decision.products.length} products share this barcode`, {
          id: `scan-${code}`,
          description: "Showing them so you can choose.",
        });
        o.onShowMatches(code);
        setScannerOpen(false);
        break;
      case "not-found":
        toast.message("Not in the shared catalogue", {
          id: `scan-${code}`,
          description: code,
          action: o.onCreateNew
            ? {
                label: "Add as new",
                onClick: () => optionsRef.current.onCreateNew?.(code),
              }
            : undefined,
        });
        break;
    }
  }, []);

  const handleScan = useCallback(
    async (raw: string) => {
      const code = normalizeScannedCode(raw);
      if (!code) return;
      const now = Date.now();
      const last = lastRef.current;
      if (last && last.code === code && now - last.at < SAME_CODE_QUIET_MS) return;
      if (busyRef.current.has(code)) return;
      lastRef.current = { code, at: now };
      busyRef.current.add(code);

      try {
        let decision: CatalogScanDecision = { kind: "not-found", code };
        for (const variant of barcodeVariants(code)) {
          const rows = await lookupGlobalCatalogProducts({
            barcode: variant,
            q: variant,
          });
          decision = decideScan({
            code,
            rows,
            isSelected: (id) =>
              scannedRef.current.has(id) || optionsRef.current.isSelected(id),
          });
          if (decision.kind !== "not-found") break;
        }
        settle(code, decision);
      } catch {
        // Let the same barcode be tried again straight away.
        lastRef.current = null;
        toast.error("Couldn't look that barcode up", {
          id: "scan-error",
          description: "Check your connection, then scan it again.",
        });
      } finally {
        busyRef.current.delete(code);
      }
    },
    [settle],
  );

  // One identity for as long as the page lives: the camera restarts whenever its
  // onScan changes, and a restart after every scan would drop the next barcode.
  const onScan = useCallback(
    (code: string) => {
      void handleScan(code);
    },
    [handleScan],
  );

  const openScanner = useCallback(() => {
    scannedRef.current = new Set();
    lastRef.current = null;
    setScannerOpen(true);
  }, []);

  const closeScanner = useCallback(() => setScannerOpen(false), []);

  return {
    scanner: scannerOpen ? (
      <BarcodeScanner onScan={onScan} onClose={closeScanner} />
    ) : null,
    openScanner,
  };
}
