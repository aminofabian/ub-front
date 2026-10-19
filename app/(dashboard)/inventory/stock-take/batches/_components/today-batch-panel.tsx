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
      body: `The next ${nextSize} products, shelf by shelf.`,
      action: "Start today's batch",
      primary: true,
    };
  }
  return {
    title: "Today's count is in",
    body: "The next batch is due tomorrow. Still on the floor? Keep going.",
    action: `Count ${nextSize} more now`,
    primary: false,
  };
}

/** What the counter should do next with today's batch. */
export function TodayBatchPanel({ cycle, canRun, opening, onOpenBatch }: Props) {
  const copy = panelCopy(cycle);
  return (
    <section
      className={cn(
        "flex flex-col gap-3 border border-l-[3px] border-l-[var(--op-accent,#1d4b3b)] px-4 py-4",
        COUNT_TONE.hair,
        COUNT_TONE.surface,
      )}
    >
      <div className="flex flex-col gap-1">
        <h3
          className={cn(
            "text-[1.45rem] font-normal leading-tight tracking-[-0.02em]",
            COUNT_TONE.ink,
            COUNT_TONE.display,
          )}
        >
          {copy.title}
        </h3>
        <p className={cn("text-[13px] leading-relaxed", COUNT_TONE.mute)}>{copy.body}</p>
      </div>
      {canRun ? (
        <button
          type="button"
          disabled={opening}
          onClick={onOpenBatch}
          className={copy.primary ? COUNT_TONE.primaryButton : cn(COUNT_TONE.quietButton, "w-full")}
        >
          {opening ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {copy.action}
          {opening ? null : <ArrowRight className="size-4" aria-hidden />}
        </button>
      ) : (
        <p className={cn("text-[13px]", COUNT_TONE.mute)}>
          Counting needs the stock-take permission.
        </p>
      )}
    </section>
  );
}
