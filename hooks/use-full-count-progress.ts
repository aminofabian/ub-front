"use client";

import { useEffect, useState } from "react";

import { fetchCountCycleHome } from "@/lib/api";
import {
  toFullCountProgress,
  type FullCountProgress,
} from "@/lib/count-cycle/to-full-count-progress";

/** Where the branch's batch-by-batch full count stands, for nudges outside the count page. */
export function useFullCountProgress(
  branchId: string,
  enabled: boolean,
): FullCountProgress | null {
  const [progress, setProgress] = useState<FullCountProgress | null>(null);

  useEffect(() => {
    const branch = branchId.trim();
    if (!branch || !enabled) {
      setProgress(null);
      return;
    }
    let cancelled = false;
    fetchCountCycleHome(branch)
      .then((home) => {
        if (!cancelled) setProgress(toFullCountProgress(home.cycle));
      })
      .catch(() => {
        if (!cancelled) setProgress(null);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, enabled]);

  return progress;
}
