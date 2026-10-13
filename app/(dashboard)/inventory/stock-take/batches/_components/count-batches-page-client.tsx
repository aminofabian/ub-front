"use client";

import { ClipboardList } from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";

import { useCountBatchesPage } from "../_hooks/use-count-batches-page";
import { BatchCountScreen } from "./batch-count-screen";
import { BatchReviewScreen } from "./batch-review-screen";
import { CountBatchesHome } from "./count-batches-home";

/** Routes between the full-count home, an open batch, and a manager's batch review. */
export function CountBatchesPageClient() {
  const page = useCountBatchesPage();
  const { route, onHome, cycleHome } = page;

  if (!page.canRead) {
    return <DashboardAccessDenied title="Count in batches" description="You need stock-take access to count stock." />;
  }
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-2 px-3 pt-2 pb-[calc(var(--shell-bottom-inset,0px)+1.5rem)]">
      {onHome ? (
        <DashboardPageHero icon={ClipboardList} title="Count in batches" description="A full count, a batch a day" showActiveScope />
      ) : null}
      {onHome && page.notice ? <DashboardFeedback kind="success" text={page.notice} /> : null}
      {onHome && cycleHome.home && cycleHome.error ? <DashboardFeedback kind="error" text={cycleHome.error} /> : null}
      {route.countingId ? (
        <BatchCountScreen sessionId={route.countingId} onBack={route.backHome} onFinished={page.onFinished} />
      ) : null}
      {route.reviewingId && page.canApprove ? (
        <BatchReviewScreen sessionId={route.reviewingId} onBack={route.backHome} />
      ) : null}
      {onHome ? (
        <CountBatchesHome
          cycleHome={cycleHome}
          branchName={page.branchName}
          canRun={page.canRun}
          canApprove={page.canApprove}
          onCount={page.onCount}
          onReview={route.openReview}
        />
      ) : null}
    </div>
  );
}
