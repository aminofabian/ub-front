import type { CountCycleRecord } from "@/lib/api";

import { BATCH_SESSION_CLOSED } from "./batch-session-closed";
import type { DayTileInput } from "./build-day-tiles";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Calendar input for a running cycle, as seen at `now`. */
export function cycleDayTileInput(
  cycle: CountCycleRecord,
  now: Date,
): DayTileInput {
  const active = cycle.activeBatch;
  const todayIsSpent = cycle.countedToday && !active;
  const doneDates = cycle.batches
    .filter((batch) => batch.status === BATCH_SESSION_CLOSED)
    .map((batch) => new Date(batch.closedAt ?? `${batch.sessionDate}T12:00:00`));
  return {
    doneDates,
    remainingDays: cycle.daysRemaining,
    firstOpenDay: todayIsSpent ? new Date(now.getTime() + MS_PER_DAY) : now,
    currentFill: active
      ? active.countedCount / Math.max(1, active.totalCount)
      : todayIsSpent
        ? null
        : 0,
  };
}
