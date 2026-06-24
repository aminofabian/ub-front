"use client";

import { useEffect, useState } from "react";
import { fetchItemById } from "@/lib/api";
import { effectiveOnHand } from "../_utils";

/** Loads on-hand quantity for an item at a specific branch (batch totals). */
export function useBranchOnHand(
  itemId: string | null | undefined,
  branchId: string | null | undefined,
  enabled = true,
) {
  const [onHand, setOnHand] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = itemId?.trim() ?? "";
    const branch = branchId?.trim() ?? "";
    if (!enabled || !id || !branch) {
      setOnHand(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchItemById(id, { branchId: branch })
      .then((row) => {
        if (!cancelled) setOnHand(effectiveOnHand(row));
      })
      .catch(() => {
        if (!cancelled) setOnHand(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId, branchId, enabled]);

  return { onHand, loading };
}
