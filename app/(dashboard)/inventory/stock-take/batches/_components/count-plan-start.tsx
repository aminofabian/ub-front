"use client";

import { Loader2 } from "lucide-react";

import { BATCH_SIZE_LIMITS } from "@/lib/count-cycle/batch-size-limits";
import type { DayTile } from "@/lib/count-cycle/build-day-tiles";
import { formatCountDay } from "@/lib/count-cycle/format-count-day";
import type { CountPlan } from "@/lib/count-cycle/project-count-plan";
import { cn } from "@/lib/utils";

import { BatchSizePicker } from "./batch-size-picker";
import { COUNT_TONE } from "./count-tone";
import { DayCalendar } from "./day-calendar";

type Props = {
  catalogSize: number;
  branchName: string | null;
  batchSize: number;
  onBatchSizeChange: (size: number) => void;
  plan: CountPlan;
  previewTiles: DayTile[];
  canStart: boolean;
  starting: boolean;
  onStart: () => void;
};

/** Before a full count: choose a daily batch and see the whole plan as days. */
export function CountPlanStart(props: Props) {
  const { catalogSize, plan } = props;
  const finishLine =
    plan.days === 1 ? "Done today." : `${plan.days} counting days, done by ${formatCountDay(plan.finishDate)}.`;
  return (
    <section className="flex flex-col gap-6 px-1 pt-3">
      <div className="flex flex-col gap-2">
        <h2 className={cn("font-heading text-[30px] font-semibold leading-[1.05] tracking-[-0.02em] text-balance", COUNT_TONE.ink)}>
          Count the whole shop, a little each day
        </h2>
        <p className={cn("max-w-[60ch] text-[15px] leading-relaxed", COUNT_TONE.mute)}>
          {catalogSize.toLocaleString()} products on the shelves
          {props.branchName ? ` at ${props.branchName}` : ""}. Each day&apos;s list walks the shelves in
          order, and anything skipped comes back first the next day.
        </p>
      </div>
      <BatchSizePicker
        value={props.batchSize}
        min={BATCH_SIZE_LIMITS.min}
        max={BATCH_SIZE_LIMITS.max}
        onChange={props.onBatchSizeChange}
      />
      <DayCalendar tiles={props.previewTiles} caption={finishLine} />
      {props.canStart ? (
        <button type="button" className={COUNT_TONE.primaryButton} disabled={props.starting} onClick={props.onStart}>
          {props.starting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Start the full count
        </button>
      ) : (
        <p className={cn("rounded-xl px-4 py-3 text-[14px]", COUNT_TONE.tealWash, COUNT_TONE.ink)}>
          A manager with stock-take approval starts the full count. Once it&apos;s running, today&apos;s batch shows up here.
        </p>
      )}
    </section>
  );
}
