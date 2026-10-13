"use client";

import type { CountCycleHomeRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { useCountPlanDraft } from "../_hooks/use-count-plan-draft";
import { CountPlanStart } from "./count-plan-start";
import { COUNT_TONE } from "./count-tone";

type Props = {
  home: CountCycleHomeRecord;
  branchName: string | null;
  canStart: boolean;
  starting: boolean;
  onStart: (batchSize: number) => void;
};

/** Holds the batch size being picked so the start screen itself stays presentational. */
export function CountPlanStartContainer({ home, branchName, canStart, starting, onStart }: Props) {
  const draft = useCountPlanDraft(home.catalogSize, home.defaultBatchSize);
  if (home.catalogSize === 0) {
    return (
      <p className={cn("px-1 pt-10 text-center text-[15px]", COUNT_TONE.mute)}>
        No stocked products at this branch yet. Receive stock first, then count it here.
      </p>
    );
  }
  return (
    <CountPlanStart
      catalogSize={home.catalogSize}
      branchName={branchName}
      batchSize={draft.batchSize}
      onBatchSizeChange={draft.setBatchSize}
      plan={draft.plan}
      previewTiles={draft.previewTiles}
      canStart={canStart}
      starting={starting}
      onStart={() => onStart(draft.batchSize)}
    />
  );
}
