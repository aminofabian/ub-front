"use client";

import { useCallback } from "react";

import type { CountCycleRecord } from "@/lib/api";

import { useBatchLineView, type BatchLineView } from "./use-batch-line-view";
import { useCountBatch, type CountBatch } from "./use-count-batch";
import { useCountRowFocus, type CountRowFocus } from "./use-count-row-focus";

export type BatchCounting = {
  counting: CountBatch;
  view: BatchLineView;
  register: CountRowFocus["register"];
  commit: (lineId: string, qty: number) => Promise<boolean>;
  next: (lineId: string) => void;
  finishBatch: () => Promise<void>;
};

/** Wires the open batch, its filtered view and keyboard flow into one counting session. */
export function useBatchCounting(
  sessionId: string,
  onFinished: (cycle: CountCycleRecord, batchNumber: number) => void,
): BatchCounting {
  const counting = useCountBatch(sessionId);
  const view = useBatchLineView(counting.batch?.lines ?? []);
  const { register, focusAfter } = useCountRowFocus();
  const { saveCount, finish, batch } = counting;
  const { keepVisible, orderedLineIds } = view;

  const commit = useCallback(
    (lineId: string, qty: number) => {
      keepVisible(lineId);
      return saveCount(lineId, qty);
    },
    [keepVisible, saveCount],
  );
  const next = useCallback(
    (lineId: string) => focusAfter(lineId, orderedLineIds),
    [focusAfter, orderedLineIds],
  );
  const finishBatch = useCallback(async () => {
    const cycle = await finish();
    if (cycle && batch) onFinished(cycle, batch.batchNumber);
  }, [batch, finish, onFinished]);

  return { counting, view, register, commit, next, finishBatch };
}
