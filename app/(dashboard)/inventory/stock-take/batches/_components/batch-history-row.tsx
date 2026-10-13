import { ChevronRight } from "lucide-react";

import type { CountCycleBatchSummary } from "@/lib/api";
import { BATCH_SESSION_CLOSED } from "@/lib/count-cycle/batch-session-closed";
import { formatCountDay } from "@/lib/count-cycle/format-count-day";
import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";

const ROW_LAYOUT = "flex min-h-14 w-full items-center gap-3 py-2.5 text-left";

function batchStatus(batch: CountCycleBatchSummary): string {
  if (batch.status !== BATCH_SESSION_CLOSED) return "Open";
  if (batch.awaitingApplyCount > 0) return `${batch.awaitingApplyCount} counts to post`;
  return "Posted to stock";
}

type Props = {
  batch: CountCycleBatchSummary;
  /** Present only when this person may review this batch. */
  onReview: ((sessionId: string) => void) | null;
};

/** One batch: when it ran, how much got counted, and whether it reached stock. */
export function BatchHistoryRow({ batch, onReview }: Props) {
  const waiting = batch.awaitingApplyCount > 0;
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("text-[15px] font-medium", COUNT_TONE.ink)}>
          Batch {batch.batchNumber} · {formatCountDay(batch.sessionDate)}
        </span>
        <span className={cn("text-[13px] tabular-nums", COUNT_TONE.mute)}>
          {batch.countedCount} of {batch.totalCount} counted
        </span>
      </span>
      <span className={cn("shrink-0 text-[13px] font-medium", waiting ? "text-amber-700" : COUNT_TONE.mute)}>
        {batchStatus(batch)}
      </span>
      {onReview ? <ChevronRight className={cn("size-4 shrink-0", COUNT_TONE.faint)} aria-hidden /> : null}
    </>
  );
  if (!onReview) return <div className={ROW_LAYOUT}>{body}</div>;
  return (
    <button
      type="button"
      onClick={() => onReview(batch.sessionId)}
      className={cn(ROW_LAYOUT, "transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]")}
    >
      {body}
    </button>
  );
}
