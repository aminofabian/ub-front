"use client";

import Link from "next/link";

import {
  DashboardAccessDenied,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { PROCUREMENT_VARS } from "@/components/procurement/procurement-hub-nav";
import { APP_ROUTES } from "@/lib/config";
import { OPERATOR_SURFACE_STYLE } from "@/lib/operator-surface";
import { cn } from "@/lib/utils";

import { useCountBatchesPage } from "../_hooks/use-count-batches-page";
import { BatchCountScreen } from "./batch-count-screen";
import { BatchReviewScreen } from "./batch-review-screen";
import { COUNT_TONE } from "./count-tone";
import { CountBatchesHome } from "./count-batches-home";

const COUNT_SHORTCUTS = [
  { href: `${APP_ROUTES.inventoryStock}?view=levels`, label: "Stock levels" },
  { href: APP_ROUTES.inventoryStockTakeDailyAudit, label: "Daily audit" },
  { href: APP_ROUTES.inventoryStockTakeRestock, label: "What to buy" },
] as const;

/** Routes between the full-count home, an open batch, and a manager's batch review. */
export function CountBatchesPageClient() {
  const page = useCountBatchesPage();
  const { route, onHome, cycleHome } = page;
  const onFloor = Boolean(route.countingId);

  if (!page.canRead) {
    return (
      <DashboardAccessDenied
        title="Count in batches"
        description="You need stock-take access to count stock."
      />
    );
  }

  return (
    <div
      className={cn(
        "premium-stock-portal premium-portal relative mx-auto flex w-full min-w-0 flex-col bg-[var(--op-bg)]",
        onFloor
          ? "max-w-4xl px-0 pb-[calc(var(--shell-bottom-inset,0px)+0.25rem)] pt-0"
          : "max-w-3xl gap-3 px-3 pb-[calc(var(--shell-bottom-inset,0px)+1.5rem)] pt-3 sm:px-4 sm:pt-4",
      )}
      style={{ ...OPERATOR_SURFACE_STYLE, ...PROCUREMENT_VARS }}
    >
      {onHome ? (
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <h1
                className={cn(
                  "text-[1.75rem] font-normal leading-none tracking-[-0.02em] sm:text-[2rem]",
                  COUNT_TONE.ink,
                  COUNT_TONE.display,
                )}
              >
                Count in batches
              </h1>
              <p className={cn("mt-1 text-[12.5px] leading-snug", COUNT_TONE.mute)}>
                Full count, a batch a day
                {page.branchName ? ` · ${page.branchName}` : ""}
              </p>
            </div>
            <nav
              aria-label="Related stock tools"
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium"
            >
              {COUNT_SHORTCUTS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "underline-offset-4 transition-colors hover:underline",
                    COUNT_TONE.mute,
                    "hover:text-[var(--op-accent,#1d4b3b)]",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
      ) : null}

      {onHome && page.notice ? (
        <DashboardFeedback kind="success" text={page.notice} />
      ) : null}
      {onHome && cycleHome.home && cycleHome.error ? (
        <DashboardFeedback kind="error" text={cycleHome.error} />
      ) : null}

      {route.countingId ? (
        <div className="min-w-0 overflow-hidden border-y border-[var(--op-rule)] bg-[var(--op-surface)] sm:rounded-[2px] sm:border">
          <BatchCountScreen
            sessionId={route.countingId}
            onBack={route.backHome}
            onFinished={page.onFinished}
          />
        </div>
      ) : null}
      {route.reviewingId && page.canApprove ? (
        <div className="min-w-0 overflow-hidden rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)]">
          <BatchReviewScreen sessionId={route.reviewingId} onBack={route.backHome} />
        </div>
      ) : null}
      {onHome ? (
        <div className="min-w-0 overflow-hidden rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] px-3 py-3.5 sm:px-4 sm:py-4">
          <CountBatchesHome
            cycleHome={cycleHome}
            branchName={page.branchName}
            canRun={page.canRun}
            canApprove={page.canApprove}
            onCount={page.onCount}
            onReview={route.openReview}
          />
        </div>
      ) : null}
    </div>
  );
}
