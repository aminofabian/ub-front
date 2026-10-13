import type { CountCycleBatchSummary } from "@/lib/api";
import { BATCH_SESSION_CLOSED } from "@/lib/count-cycle/batch-session-closed";
import { cn } from "@/lib/utils";

import { BatchHistoryRow } from "./batch-history-row";
import { COUNT_TONE } from "./count-tone";

type Props = {
  batches: CountCycleBatchSummary[];
  canApprove: boolean;
  onReview: (sessionId: string) => void;
};

/** Every batch so far, newest first; finished ones open for review by approvers. */
export function BatchHistory({ batches, canApprove, onReview }: Props) {
  if (batches.length === 0) return null;
  const newestFirst = [...batches].reverse();
  return (
    <section className="flex flex-col gap-2">
      <h3 className={cn("font-heading text-[18px] font-semibold", COUNT_TONE.ink)}>Batches</h3>
      <ul className={cn("divide-y border-y", COUNT_TONE.divide, COUNT_TONE.hair)}>
        {newestFirst.map((batch) => (
          <li key={batch.sessionId}>
            <BatchHistoryRow
              batch={batch}
              onReview={canApprove && batch.status === BATCH_SESSION_CLOSED ? onReview : null}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
