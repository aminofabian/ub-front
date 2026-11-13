"use client";

import { useEffect, useState } from "react";

import { fetchSaleByMpesaCode, type SaleRecord } from "@/lib/api";
import { parseMpesaCodeSearchQuery } from "@/lib/mpesa-transaction-code";

export type MpesaCodeLookupState = {
  code: string | null;
  sale: SaleRecord | null;
  loading: boolean;
  notFound: boolean;
};

/**
 * When the search looks like an M-Pesa code and that sale is not already in
 * the filtered feed, resolve it across the whole business (any date).
 */
export function useMpesaCodeLookup(
  search: string,
  alreadyVisible: boolean,
): MpesaCodeLookupState {
  const code = parseMpesaCodeSearchQuery(search);
  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (code == null || alreadyVisible) {
      setSale(null);
      setLoading(false);
      setNotFound(false);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setNotFound(false);
      void fetchSaleByMpesaCode(code)
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
  }, [code, alreadyVisible]);

  return { code, sale, loading, notFound };
}
