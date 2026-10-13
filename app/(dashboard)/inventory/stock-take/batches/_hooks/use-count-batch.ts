"use client";

import { useCallback, useState } from "react";

import {
  fetchCountCycleBatch,
  patchCountCycleLine,
  postCountCycleFinishBatch,
  type CountCycleBatchRecord,
  type CountCycleRecord,
} from "@/lib/api";
import { mergeSavedLine } from "@/lib/count-cycle/merge-saved-line";

import { useBatchRecord } from "./use-batch-record";
import { useGuardedWrite } from "./use-guarded-write";

export type CountBatch = {
  batch: CountCycleBatchRecord | null;
  loading: boolean;
  finishing: boolean;
  error: string | null;
  savingLineIds: ReadonlySet<string>;
  saveCount: (lineId: string, countedQty: number) => Promise<boolean>;
  finish: () => Promise<CountCycleRecord | null>;
};

/** One open batch on the counting floor: load it, save each count, finish it. */
export function useCountBatch(sessionId: string): CountBatch {
  const [savingLineIds, setSavingLineIds] = useState<ReadonlySet<string>>(new Set());
  const [finishing, setFinishing] = useState(false);
  const { error, write } = useGuardedWrite();
  const { batch, setBatch, loading } = useBatchRecord(sessionId, fetchCountCycleBatch, write);

  const saveCount = useCallback(
    async (lineId: string, countedQty: number) => {
      setSavingLineIds((prev) => new Set(prev).add(lineId));
      const saved = await write(
        () => patchCountCycleLine(sessionId, lineId, countedQty),
        "Could not save that count",
      );
      setSavingLineIds((prev) => withoutId(prev, lineId));
      if (saved) setBatch((prev) => (prev ? mergeSavedLine(prev, saved, lineId) : saved));
      return saved != null;
    },
    [sessionId, setBatch, write],
  );

  const finish = useCallback(async () => {
    setFinishing(true);
    const cycle = await write(
      () => postCountCycleFinishBatch(sessionId),
      "Could not finish this batch",
    );
    setFinishing(false);
    return cycle;
  }, [sessionId, write]);

  return { batch, loading, finishing, error, savingLineIds, saveCount, finish };
}

function withoutId(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(ids);
  next.delete(id);
  return next;
}
