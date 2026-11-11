"use client";

import { useEffect, useState } from "react";

import { fetchSaleByReceiptNo, type SaleRecord } from "@/lib/api";
import { parseReceiptSearchQuery } from "@/components/sales/sale-receipt-actions";

export type ReceiptLookupState = {
  receiptNo: number | null;
  sale: SaleRecord | null;
  loading: boolean;
  notFound: boolean;
};

/**
 * When the search looks like a receipt number and that sale is not already in
 * the filtered feed, resolve it across the whole business (any date).
 */
export function useReceiptLookup(
  search: string,
  alreadyVisible: boolean,
): ReceiptLookupState {
  const receiptNo = parseReceiptSearchQuery(search);
  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (receiptNo == null || alreadyVisible) {
      setSale(null);
      setLoading(false);
      setNotFound(false);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setNotFound(false);
      void fetchSaleByReceiptNo(receiptNo)
        .then((found) => {
          if (cancelled) return;
          setSale(found);
          setNotFound(false);
        })
        .catch(() => {
          if (cancelled) return;
          setSale(null);
          setNotFound(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [receiptNo, alreadyVisible]);

  return { receiptNo, sale, loading, notFound };
}
