"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchCountCycleHome, type CountCycleHomeRecord } from "@/lib/api";

import { useCountCycleActions, type CountCycleActions } from "./use-count-cycle-actions";
import { useGuardedWrite } from "./use-guarded-write";

export type CountCycleHome = CountCycleActions & {
  home: CountCycleHomeRecord | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
};

/** Loads the branch's full-count cycle and exposes the cycle-level writes. */
export function useCountCycleHome(branchId: string, enabled: boolean): CountCycleHome {
  const [home, setHome] = useState<CountCycleHomeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const guarded = useGuardedWrite();
  const { write } = guarded;

  const reload = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    const next = await write(() => fetchCountCycleHome(branchId), "Could not load the full count");
    if (next) setHome(next);
    setLoading(false);
  }, [branchId, write]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  const actions = useCountCycleActions({
    branchId,
    cycleId: home?.cycle?.cycleId ?? null,
    write,
    reload,
  });

  return { home, loading, busy: guarded.busy, error: guarded.error, ...actions };
}
