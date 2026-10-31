import { ArrowRight, Loader2 } from "lucide-react";

import type { CountCycleRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";

type Props = {
  cycle: CountCycleRecord;
  canRun: boolean;
  opening: boolean;
  onOpenBatch: () => void;
};

type PanelCopy = { title: string; body: string; action: string; primary: boolean };

function panelCopy(cycle: CountCycleRecord): PanelCopy {
  const active = cycle.activeBatch;
  if (active) {
    return {
      title: `Batch ${active.batchNumber} is open`,
      body: `${active.countedCount} of ${active.totalCount} counted so far.`,
      action: "Continue counting",
      primary: true,
    };
  }
  const nextSize = Math.min(cycle.batchSize, cycle.remainingItems);
  if (!cycle.countedToday) {
    return {
      title: "Today's batch",
      body: `Next ${nextSize} products, shelf by shelf.`,
      action: "Start today's batch",
      primary: true,
    };
  }
  return {
    title: "Today's count is in",
    body: "Next batch is due tomorrow. Still on the floor? Keep going.",
    action: `Count ${nextSize} more now`,
    primary: false,
  };
}

/** What the counter should do next with today's batch. */
export function TodayBatchPanel({
  cycle,
  canRun,
  opening,
  onOpenBatch,
}: Props) {
  const copy = panelCopy(cycle);
  return (
    <section
      className={cn(
        "flex flex-col gap-3 border px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        COUNT_TONE.hair,
        COUNT_TONE.tealWash,
      )}
    >
      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            "text-[1.15rem] font-normal leading-tight tracking-[-0.02em]",
            COUNT_TONE.ink,
            COUNT_TONE.display,
          )}
        >
          {copy.title}
        </h3>
        <p className={cn("mt-0.5 text-[12.5px] leading-snug", COUNT_TONE.mute)}>
          {copy.body}
        </p>
      </div>
      {canRun ? (
        <button
          type="button"
          disabled={opening}
          onClick={onOpenBatch}
          className={cn(
            copy.primary ? COUNT_TONE.primaryButton : COUNT_TONE.quietButton,
            "sm:w-auto sm:min-w-[11.5rem] sm:shrink-0",
          )}
        >
          {opening ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {copy.action}
          {opening ? null : <ArrowRight className="size-4" aria-hidden />}
        </button>
      ) : (
        <p className={cn("text-[12.5px]", COUNT_TONE.mute)}>
          Counting needs stock-take permission.
        </p>
      )}
    </section>
  );
}
