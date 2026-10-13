"use client";

import { useCallback } from "react";

import {
  fetchCountCycleBatchReview,
  postCountCycleApplyBatch,
  type CountCycleBatchRecord,
} from "@/lib/api";

import { useBatchRecord } from "./use-batch-record";
import { useGuardedWrite } from "./use-guarded-write";

export type BatchReview = {
  batch: CountCycleBatchRecord | null;
  loading: boolean;
  applying: boolean;
  error: string | null;
  applyAll: () => Promise<boolean>;
};

/** A finished batch with system stock beside each count, ready to post to stock. */
export function useBatchReview(sessionId: string): BatchReview {
  const { busy, error, write } = useGuardedWrite();
  const { batch, setBatch, loading } = useBatchRecord(
    sessionId,
    fetchCountCycleBatchReview,
    write,
  );

  const applyAll = useCallback(async () => {
    const applied = await write(
      () => postCountCycleApplyBatch(sessionId),
      "Could not apply these counts",
    );
    if (applied) setBatch(applied);
    return applied != null;
  }, [sessionId, setBatch, write]);

  return { batch, loading, applying: busy && !loading, error, applyAll };
}
