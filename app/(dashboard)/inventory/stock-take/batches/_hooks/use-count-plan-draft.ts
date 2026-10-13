"use client";

import { useMemo, useState } from "react";

import { BATCH_SIZE_LIMITS } from "@/lib/count-cycle/batch-size-limits";
import { buildDayTiles, type DayTile } from "@/lib/count-cycle/build-day-tiles";
import { projectCountPlan, type CountPlan } from "@/lib/count-cycle/project-count-plan";

export type CountPlanDraft = {
  batchSize: number;
  setBatchSize: (size: number) => void;
  plan: CountPlan;
  previewTiles: DayTile[];
};

/** The batch size being picked before a full count starts, and what it means in days. */
export function useCountPlanDraft(catalogSize: number, defaultBatchSize: number): CountPlanDraft {
  const [batchSize, setRawBatchSize] = useState(defaultBatchSize);
  const today = useMemo(() => new Date(), []);

  const plan = useMemo(
    () => projectCountPlan(catalogSize, batchSize, today),
    [catalogSize, batchSize, today],
  );
  const previewTiles = useMemo(
    () =>
      buildDayTiles({
        doneDates: [],
        remainingDays: plan.days,
        firstOpenDay: today,
        currentFill: 0,
      }),
    [plan.days, today],
  );

  const setBatchSize = (size: number) =>
    setRawBatchSize(
      Math.min(BATCH_SIZE_LIMITS.max, Math.max(BATCH_SIZE_LIMITS.min, Math.round(size))),
    );

  return { batchSize, setBatchSize, plan, previewTiles };
}
