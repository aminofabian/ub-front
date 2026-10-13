import type { CountCycleRecord } from "@/lib/api";

export type FullCountProgress = {
  counted: number;
  total: number;
  remaining: number;
  /** What the counter should know right now, e.g. "Batch 4 open · 25 of 100". */
  detail: string;
};

function detailFor(cycle: CountCycleRecord): string {
  const active = cycle.activeBatch;
  if (active) {
    return `Batch ${active.batchNumber} open · ${active.countedCount} of ${active.totalCount} counted`;
  }
  if (cycle.countedToday) return "Today's batch is done · next one tomorrow";
  return `Today's batch is ready · ${Math.min(cycle.batchSize, cycle.remainingItems)} products`;
}

/** Banner data for a running full count; null when there's nothing left to nudge about. */
export function toFullCountProgress(cycle: CountCycleRecord | null): FullCountProgress | null {
  if (!cycle || cycle.status !== "active" || cycle.totalItems <= 0) return null;
  if (cycle.remainingItems <= 0) return null;
  return {
    counted: cycle.countedItems,
    total: cycle.totalItems,
    remaining: cycle.remainingItems,
    detail: detailFor(cycle),
  };
}
