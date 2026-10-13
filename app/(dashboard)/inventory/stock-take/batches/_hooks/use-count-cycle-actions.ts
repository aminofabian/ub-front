"use client";

import { useCallback } from "react";

import { postCountCycle, postCountCycleBatch, postCountCycleCancel } from "@/lib/api";

import type { GuardedWrite } from "./use-guarded-write";

export type CountCycleActions = {
  startCycle: (batchSize: number) => Promise<boolean>;
  openBatch: () => Promise<string | null>;
  cancelCycle: () => Promise<boolean>;
};

type Options = {
  branchId: string;
  cycleId: string | null;
  write: GuardedWrite["write"];
  reload: () => Promise<void>;
};

/** Start a full count, open today's batch, or call the whole count off. */
export function useCountCycleActions({
  branchId,
  cycleId,
  write,
  reload,
}: Options): CountCycleActions {
  const startCycle = useCallback(
    async (batchSize: number) => {
      const cycle = await write(
        () => postCountCycle({ branchId, batchSize }),
        "Could not start the full count",
      );
      if (cycle) await reload();
      return cycle != null;
    },
    [branchId, reload, write],
  );

  const openBatch = useCallback(async () => {
    if (!cycleId) return null;
    const batch = await write(() => postCountCycleBatch(cycleId), "Could not open a batch");
    return batch?.sessionId ?? null;
  }, [cycleId, write]);

  const cancelCycle = useCallback(async () => {
    if (!cycleId) return false;
    const cycle = await write(() => postCountCycleCancel(cycleId), "Could not cancel");
    if (cycle) await reload();
    return cycle != null;
  }, [cycleId, reload, write]);

  return { startCycle, openBatch, cancelCycle };
}
