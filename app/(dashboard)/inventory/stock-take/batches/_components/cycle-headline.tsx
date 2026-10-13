import type { CountCycleRecord } from "@/lib/api";
import { formatCountDay } from "@/lib/count-cycle/format-count-day";
import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";

function paceLine(cycle: CountCycleRecord): string {
  if (cycle.status === "completed") {
    const finished = cycle.completedAt ? `, finished ${formatCountDay(cycle.completedAt)}` : "";
    return `${cycle.batchesDone} batches${finished}.`;
  }
  const days = cycle.daysRemaining === 1 ? "1 more day" : `${cycle.daysRemaining} more days`;
  return `${cycle.batchSize} a day · ${days} · done by ${formatCountDay(cycle.projectedFinishDate)}`;
}

/** How far through the shop the count is, in products and in days. */
export function CycleHeadline({ cycle }: { cycle: CountCycleRecord }) {
  const share = cycle.totalItems > 0 ? cycle.countedItems / cycle.totalItems : 0;
  const done = cycle.status === "completed";
  return (
    <div className="flex flex-col gap-2">
      <h2 className={cn("font-heading font-semibold leading-none tracking-[-0.02em] tabular-nums", COUNT_TONE.ink)}>
        {done ? (
          <span className="text-[34px]">Every product counted.</span>
        ) : (
          <>
            <span className="text-[44px]">{cycle.countedItems.toLocaleString()}</span>
            <span className={cn("ml-2 text-[22px]", COUNT_TONE.mute)}>
              of {cycle.totalItems.toLocaleString()} counted
            </span>
          </>
        )}
      </h2>
      <p className={cn("text-[14px]", COUNT_TONE.mute)}>{paceLine(cycle)}</p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={cycle.totalItems}
        aria-valuenow={cycle.countedItems}
        aria-label="Products counted"
        className={cn("mt-1 h-1.5 overflow-hidden rounded-full", COUNT_TONE.track)}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none", COUNT_TONE.tealFill)}
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </div>
    </div>
  );
}
