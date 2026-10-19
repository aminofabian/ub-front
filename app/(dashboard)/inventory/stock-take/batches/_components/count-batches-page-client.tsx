"use client";

import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, ListChecks, ScanLine } from "lucide-react";

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

const COUNT_LOOP = [
  {
    title: "Choose a daily batch",
    body: "Fifty, a hundred, or two hundred lines. The plan spreads the shop over the days you have.",
    icon: ListChecks,
  },
  {
    title: "Walk the shelves in order",
    body: "Each line is one product. Type what is on the shelf; the batch saves as you go.",
    icon: ScanLine,
  },
  {
    title: "Review, then apply",
    body: "A manager checks the variance before stock moves. Nothing changes mid-count.",
    icon: ClipboardCheck,
  },
] as const;

const COUNT_SHORTCUTS = [
  { href: `${APP_ROUTES.inventoryStock}?view=levels`, label: "Stock levels" },
  { href: APP_ROUTES.inventoryStockTakeDailyAudit, label: "Daily audit" },
  { href: APP_ROUTES.inventoryStockTakeRestock, label: "What to buy" },
] as const;

function StockCountAside() {
  return (
    <aside className="hidden xl:flex xl:flex-col xl:gap-3">
      <section className="rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--op-muted)]">
          The counting loop
        </p>
        <ol className="mt-4 space-y-4">
          {COUNT_LOOP.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[2px] border border-[var(--op-rule)] text-[var(--op-accent)]">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold leading-snug text-[var(--op-ink)]">
                    <span className="mr-1.5 font-normal text-[var(--op-muted)]">
                      0{index + 1}
                    </span>
                    {step.title}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-[1.6] text-[var(--op-muted)]">
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      <section className="rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--op-muted)]">
          Go straight to
        </p>
        <div className="mt-2 divide-y divide-[var(--op-rule)]">
          {COUNT_SHORTCUTS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between gap-3 py-3 text-[12.5px] font-medium text-[var(--op-ink)] transition-colors hover:text-[var(--op-accent)]"
            >
              {link.label}
              <ArrowUpRight className="size-3.5 text-[var(--op-muted)]" aria-hidden />
            </Link>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-[1.6] text-[var(--op-muted)]">
          Counts post as you go. Nothing is applied to stock until review.
        </p>
      </section>
    </aside>
  );
}

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
          : "max-w-6xl gap-4 px-3 pb-[calc(var(--shell-bottom-inset,0px)+2rem)] pt-4 sm:px-5 sm:pt-6",
      )}
      style={{ ...OPERATOR_SURFACE_STYLE, ...PROCUREMENT_VARS }}
    >
      {onHome ? (
        <header className="hidden flex-col gap-1 px-0.5 sm:flex">
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-[0.14em]",
              COUNT_TONE.mute,
            )}
          >
            Stock take
          </p>
          <h1
            className={cn(
              "text-[2.2rem] font-normal leading-none tracking-[-0.02em] sm:text-[2.6rem]",
              COUNT_TONE.ink,
              COUNT_TONE.display,
            )}
          >
            Count in batches
          </h1>
          <p className={cn("text-[13px] leading-relaxed", COUNT_TONE.mute)}>
            A full count, a batch a day
            {page.branchName ? ` · ${page.branchName}` : ""}
          </p>
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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-6">
          <div className="min-w-0 overflow-hidden rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] p-4 sm:p-6">
            <CountBatchesHome
              cycleHome={cycleHome}
              branchName={page.branchName}
              canRun={page.canRun}
              canApprove={page.canApprove}
              onCount={page.onCount}
              onReview={route.openReview}
            />
          </div>
          <StockCountAside />
        </div>
      ) : null}
    </div>
  );
}
