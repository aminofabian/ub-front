"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { DashboardFeedback } from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";

import type { CountCycleHome } from "../_hooks/use-count-cycle-home";
import { COUNT_TONE } from "./count-tone";
import { CountPlanStartContainer } from "./count-plan-start-container";
import { CycleOverview } from "./cycle-overview";

type Props = {
  cycleHome: CountCycleHome;
  branchName: string | null;
  canRun: boolean;
  canApprove: boolean;
  onCount: (sessionId: string) => void;
  onReview: (sessionId: string) => void;
};

/** Either the plan for a new full count, or the one already running. */
export function CountBatchesHome({ cycleHome, branchName, canRun, canApprove, onCount, onReview }: Props) {
  const [planningNext, setPlanningNext] = useState(false);
  const { home, busy, startCycle, openBatch, cancelCycle } = cycleHome;
  if (cycleHome.loading && !home) {
    return <Loader2 className={cn("mx-auto mt-16 size-6 animate-spin", COUNT_TONE.teal)} aria-label="Loading" />;
  }
  if (!home) return <DashboardFeedback kind="error" text={cycleHome.error ?? "Could not load the full count"} />;

  const cycle = home.cycle;
  if (!cycle || planningNext) {
    return (
      <CountPlanStartContainer
        home={home}
        branchName={branchName}
        canStart={canApprove}
        starting={busy}
        onStart={(size) => void startCycle(size).then((started) => started && setPlanningNext(false))}
      />
    );
  }
  return (
    <CycleOverview
      cycle={cycle}
      canRun={canRun}
      canApprove={canApprove}
      busy={busy}
      onOpenBatch={() => void openBatch().then((sessionId) => sessionId && onCount(sessionId))}
      onReview={onReview}
      onCancel={() => void cancelCycle()}
      onStartNew={() => setPlanningNext(true)}
    />
  );
}
