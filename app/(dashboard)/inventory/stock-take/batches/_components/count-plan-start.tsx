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
    plan.days === 1
      ? "Done today."
      : `${plan.days} days · done by ${formatCountDay(plan.finishDate)}.`;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2
          className={cn(
            "text-[1.65rem] font-normal leading-[1.05] tracking-[-0.02em] text-balance sm:text-[1.85rem]",
            COUNT_TONE.ink,
            COUNT_TONE.display,
          )}
        >
          Count the whole shop, a little each day
        </h2>
        <p className={cn("max-w-[58ch] text-[13px] leading-snug", COUNT_TONE.mute)}>
          {catalogSize.toLocaleString()} products
          {props.branchName ? ` at ${props.branchName}` : ""}. Each day walks
          the shelves in order; anything skipped comes back first next day.
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
        <div className="sticky bottom-[calc(var(--shell-bottom-inset,0px)+0.5rem)] z-10 -mx-1 bg-[linear-gradient(to_top,var(--op-surface)_72%,transparent)] px-1 pb-1 pt-2">
          <button
            type="button"
            className={COUNT_TONE.primaryButton}
            disabled={props.starting}
            onClick={props.onStart}
          >
            {props.starting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Start the full count
          </button>
        </div>
      ) : (
        <p
          className={cn(
            "rounded-[2px] px-3 py-2.5 text-[12.5px] leading-snug",
            COUNT_TONE.tealWash,
            COUNT_TONE.ink,
          )}
        >
          A manager with stock-take approval starts the full count. Once it is
          running, today&apos;s batch shows up here.
        </p>
      )}
    </section>
  );
}
