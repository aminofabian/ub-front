"use client";

import { useMemo } from "react";

import type { CountCycleRecord } from "@/lib/api";
import { buildDayTiles } from "@/lib/count-cycle/build-day-tiles";
import { cycleDayTileInput } from "@/lib/count-cycle/cycle-day-tile-input";

import { BatchHistory } from "./batch-history";
import { CycleFooterActions } from "./cycle-footer-actions";
import { CycleHeadline } from "./cycle-headline";
import { DayCalendar } from "./day-calendar";
import { TodayBatchPanel } from "./today-batch-panel";

type Props = {
  cycle: CountCycleRecord;
  canRun: boolean;
  canApprove: boolean;
  busy: boolean;
  onOpenBatch: () => void;
  onReview: (sessionId: string) => void;
  onCancel: () => void;
  onStartNew: () => void;
};

/** A full count in progress (or just finished): where it stands and what's next today. */
export function CycleOverview(props: Props) {
  const { cycle } = props;
  const tiles = useMemo(() => buildDayTiles(cycleDayTileInput(cycle, new Date())), [cycle]);
  const completed = cycle.status === "completed";
  const caption = completed
    ? "Each square is a day the shop was counted."
    : "Each square is one day's batch. Today's square fills as you count.";
  return (
    <section className="flex flex-col gap-6 px-1 pt-3">
      <CycleHeadline cycle={cycle} />
      <DayCalendar tiles={tiles} caption={caption} />
      {completed ? null : (
        <TodayBatchPanel
          cycle={cycle}
          canRun={props.canRun}
          opening={props.busy}
          onOpenBatch={props.onOpenBatch}
        />
      )}
      <BatchHistory batches={cycle.batches} canApprove={props.canApprove} onReview={props.onReview} />
      {props.canApprove ? (
        <CycleFooterActions
          completed={completed}
          busy={props.busy}
          onCancel={props.onCancel}
          onStartNew={props.onStartNew}
        />
      ) : null}
    </section>
  );
}
