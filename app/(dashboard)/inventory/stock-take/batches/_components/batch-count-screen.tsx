"use client";

import { Loader2 } from "lucide-react";

import { DashboardFeedback } from "@/components/dashboard-page-ui";
import type { CountCycleRecord } from "@/lib/api";
import { BATCH_SESSION_CLOSED } from "@/lib/count-cycle/batch-session-closed";
import { cn } from "@/lib/utils";

import { useBatchCounting } from "../_hooks/use-batch-counting";
import { BatchCountHeader } from "./batch-count-header";
import { BatchFinishPanel } from "./batch-finish-panel";
import { BatchShelfList } from "./batch-shelf-list";
import { COUNT_TONE } from "./count-tone";

type Props = {
  sessionId: string;
  onBack: () => void;
  onFinished: (cycle: CountCycleRecord, batchNumber: number) => void;
};

/** The counting floor for one batch: shelf-ordered list, a box per product, finish pinned. */
export function BatchCountScreen({ sessionId, onBack, onFinished }: Props) {
  const { counting, view, register, commit, next, finishBatch } = useBatchCounting(
    sessionId,
    onFinished,
  );
  const { batch } = counting;

  if (counting.loading && !batch) {
    return (
      <Loader2
        className={cn("mx-auto mt-20 size-6 animate-spin", COUNT_TONE.teal)}
        aria-label="Loading batch"
      />
    );
  }
  if (!batch) {
    return (
      <div className="px-3 pt-4">
        <DashboardFeedback kind="error" text={counting.error ?? "Batch not found"} />
      </div>
    );
  }
  if (batch.status === BATCH_SESSION_CLOSED) {
    return (
      <div className="flex flex-col gap-3 px-3 pt-4">
        <DashboardFeedback
          kind="success"
          text={`Batch ${batch.batchNumber} is already finished.`}
        />
        <button type="button" className={COUNT_TONE.quietButton} onClick={onBack}>
          Back to batches
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        "h-[calc(100dvh-var(--shell-bottom-inset,0px)-3.25rem)]",
        "max-h-[calc(100dvh-var(--shell-bottom-inset,0px)-3.25rem)]",
      )}
    >
      <div className="shrink-0">
        <BatchCountHeader
          batchNumber={batch.batchNumber}
          counted={batch.countedCount}
          total={batch.totalCount}
          filter={view.filter}
          onFilterChange={view.setFilter}
          query={view.query}
          onQueryChange={view.setQuery}
          onBack={onBack}
        />
      </div>
      {counting.error ? (
        <DashboardFeedback kind="error" text={counting.error} className="mx-3 mt-2 shrink-0" />
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <BatchShelfList
          shelves={view.shelves}
          emptyCopy={view.query.trim() ? "No products match that search." : undefined}
          filter={view.filter}
          showSystemStock={batch.showsSystemStock}
          savingLineIds={counting.savingLineIds}
          register={register}
          onCommit={commit}
          onNext={next}
        />
      </div>
      <div className="shrink-0">
        <BatchFinishPanel
          counted={batch.countedCount}
          total={batch.totalCount}
          finishing={counting.finishing}
          onFinish={() => void finishBatch()}
        />
      </div>
    </div>
  );
}
