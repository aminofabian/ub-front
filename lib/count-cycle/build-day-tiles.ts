const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type DayTileState = "done" | "current" | "upcoming";

export type DayTile = {
  key: string;
  date: Date;
  state: DayTileState;
  /** 0–1 share of the batch counted; only meaningful for the current tile. */
  fill: number;
};

export type DayTileInput = {
  doneDates: Date[];
  remainingDays: number;
  /** First day still to count — today, or tomorrow when today's batch is done. */
  firstOpenDay: Date;
  /** Progress of the batch on the counting floor today; null when none is open today. */
  currentFill: number | null;
};

/** One tile per counting day: finished batches, today's batch, then the days ahead. */
export function buildDayTiles(input: DayTileInput): DayTile[] {
  const done: DayTile[] = input.doneDates.map((date, i) => ({
    key: `done-${i}`,
    date,
    state: "done",
    fill: 1,
  }));
  const ahead: DayTile[] = Array.from(
    { length: Math.max(0, input.remainingDays) },
    (_, i) => {
      const isCurrent = i === 0 && input.currentFill != null;
      return {
        key: `day-${i}`,
        date: new Date(input.firstOpenDay.getTime() + i * MS_PER_DAY),
        state: isCurrent ? "current" : "upcoming",
        fill: isCurrent ? clampShare(input.currentFill ?? 0) : 0,
      };
    },
  );
  return [...done, ...ahead];
}

function clampShare(value: number): number {
  return Math.min(1, Math.max(0, value));
}
