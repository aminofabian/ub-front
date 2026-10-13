"use client";

import { useCallback, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import type { CountCycleRecord } from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

import { useBatchRoute, type BatchRoute } from "./use-batch-route";
import { useCountBranch } from "./use-count-branch";
import { useCountCycleHome, type CountCycleHome } from "./use-count-cycle-home";

export type CountBatchesPage = {
  canRead: boolean;
  canRun: boolean;
  canApprove: boolean;
  branchName: string | null;
  route: BatchRoute;
  onHome: boolean;
  cycleHome: CountCycleHome;
  notice: string | null;
  onFinished: (cycle: CountCycleRecord, batchNumber: number) => void;
  onCount: (sessionId: string) => void;
};

function finishedNotice(cycle: CountCycleRecord, batchNumber: number): string {
  if (cycle.status === "completed") return "That was the last batch — every product is counted.";
  return `Batch ${batchNumber} is in. ${cycle.remainingItems.toLocaleString()} products left to count.`;
}

/** Permissions, branch, current screen and the after-batch notice for the batch-count page. */
export function useCountBatchesPage(): CountBatchesPage {
  const { me } = useDashboard();
  const canRun = hasPermission(me?.permissions, Permission.StocktakeRun);
  const canApprove = hasPermission(me?.permissions, Permission.StocktakeApprove);
  const canRead = canRun || canApprove || hasPermission(me?.permissions, Permission.StocktakeRead);
  const { branchId, branchName } = useCountBranch();
  const route = useBatchRoute();
  const onHome = !route.countingId && !route.reviewingId;
  const cycleHome = useCountCycleHome(branchId, canRead && onHome);
  const [notice, setNotice] = useState<string | null>(null);
  const { backHome, openCounting } = route;

  const onFinished = useCallback(
    (cycle: CountCycleRecord, batchNumber: number) => {
      setNotice(finishedNotice(cycle, batchNumber));
      backHome();
    },
    [backHome],
  );
  const onCount = useCallback(
    (sessionId: string) => {
      setNotice(null);
      openCounting(sessionId);
    },
    [openCounting],
  );

  return { canRead, canRun, canApprove, branchName, route, onHome, cycleHome, notice, onFinished, onCount };
}
