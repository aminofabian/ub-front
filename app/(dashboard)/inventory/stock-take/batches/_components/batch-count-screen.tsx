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

/** The counting floor for one batch: shelf-ordered list, a box per product, finish at the end. */
export function BatchCountScreen({ sessionId, onBack, onFinished }: Props) {
  const { counting, view, register, commit, next, finishBatch } = useBatchCounting(sessionId, onFinished);
  const { batch } = counting;

  if (counting.loading && !batch) {
    return <Loader2 className={cn("mx-auto mt-16 size-6 animate-spin", COUNT_TONE.teal)} aria-label="Loading batch" />;
  }
  if (!batch) return <DashboardFeedback kind="error" text={counting.error ?? "Batch not found"} />;
  if (batch.status === BATCH_SESSION_CLOSED) {
    return (
      <div className="flex flex-col gap-3 pt-3">
        <DashboardFeedback kind="info" text={`Batch ${batch.batchNumber} is already finished.`} />
        <button type="button" className={COUNT_TONE.quietButton} onClick={onBack}>
          Back to batches
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
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
      {counting.error ? <DashboardFeedback kind="error" text={counting.error} className="mt-2" /> : null}
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
      <BatchFinishPanel
        counted={batch.countedCount}
        total={batch.totalCount}
        finishing={counting.finishing}
        onFinish={() => void finishBatch()}
      />
    </div>
  );
}
