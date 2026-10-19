"use client";

import { ChevronLeft, Loader2 } from "lucide-react";
import { useMemo } from "react";

import { DashboardFeedback } from "@/components/dashboard-page-ui";
import { rankReviewLines } from "@/lib/count-cycle/rank-review-lines";
import { cn } from "@/lib/utils";

import { useBatchReview } from "../_hooks/use-batch-review";
import { COUNT_TONE } from "./count-tone";
import { ReviewApplyPanel } from "./review-apply-panel";
import { ReviewLineRow } from "./review-line-row";

const LINE_AWAITING_APPLY = "submitted";

type Props = { sessionId: string; onBack: () => void };

/** Manager's pass over a finished batch: biggest gaps first, then post the counts to stock. */
export function BatchReviewScreen({ sessionId, onBack }: Props) {
  const review = useBatchReview(sessionId);
  const lines = useMemo(() => rankReviewLines(review.batch?.lines ?? []), [review.batch]);
  const awaiting = lines.filter((line) => line.status === LINE_AWAITING_APPLY).length;
  const differing = lines.filter((line) => line.variance != null && line.variance !== 0).length;

  if (review.loading && !review.batch) {
    return <Loader2 className={cn("mx-auto mt-16 size-6 animate-spin", COUNT_TONE.teal)} aria-label="Loading batch" />;
  }
  if (!review.batch) return <DashboardFeedback kind="error" text={review.error ?? "Batch not found"} />;

  return (
    <section className="flex flex-col gap-4 px-0.5 pt-1">
      <button
        type="button"
        onClick={onBack}
        className={cn(
          "-ml-1 inline-flex h-11 w-fit items-center gap-0.5 rounded-[2px] pl-1 pr-2 text-[14px] font-medium",
          COUNT_TONE.teal,
        )}
      >
        <ChevronLeft className="size-5" aria-hidden />
        Batches
      </button>
      <div className="flex flex-col gap-1">
        <h2
          className={cn(
            "text-[1.85rem] font-normal leading-tight tracking-[-0.02em]",
            COUNT_TONE.ink,
            COUNT_TONE.display,
          )}
        >
          Batch {review.batch.batchNumber} review
        </h2>
        <p className={cn("text-[13px] leading-relaxed", COUNT_TONE.mute)}>
          {lines.length} counted · {differing} differ from the system
        </p>
      </div>
      {review.error ? <DashboardFeedback kind="error" text={review.error} /> : null}
      <ReviewApplyPanel awaiting={awaiting} applying={review.applying} onApply={() => void review.applyAll()} />
      <ul className={cn("divide-y border-y", COUNT_TONE.divide, COUNT_TONE.hair)}>
        {lines.map((line) => (
          <li key={line.lineId}>
            <ReviewLineRow line={line} />
          </li>
        ))}
      </ul>
    </section>
  );
}
