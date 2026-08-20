"use client";

import { ChevronRight, ShieldAlert } from "lucide-react";

import type {
  PlatformRequestLogCategory,
  PlatformRequestLogRow,
  PlatformRequestLogSummary,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  CATEGORY_BAR,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATEGORY_TILE,
  isExpectedHostLookup,
  shortId,
  timeAgo,
} from "./platform-logs-shared";

/**
 * Right rail of the request stream: per-category health with success bars
 * (click a category to filter the stream) and the recent failure feed
 * (click a failure for its full details).
 */
export function InsightRail({
  summary,
  rows,
  activeCategory,
  onCategorySelect,
  onRowClick,
}: {
  summary: PlatformRequestLogSummary | null;
  rows: PlatformRequestLogRow[];
  activeCategory: "all" | PlatformRequestLogCategory;
  onCategorySelect: (category: "all" | PlatformRequestLogCategory) => void;
  onRowClick: (row: PlatformRequestLogRow) => void;
}) {
  const failures = rows
    .filter((row) => !row.success && !isExpectedHostLookup(row))
    .slice(0, 6);
  const expectedMisses = summary?.expectedMisses ?? 0;

  return (
    <aside className="flex min-w-0 flex-col gap-4">
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Category health</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Success rate in the current window — click to filter.
          </p>
        </div>
        <ul className="divide-y divide-border/60">
          {CATEGORY_ORDER.map((category) => {
            const row = summary?.categories.find((c) => c.category === category);
            const total = row?.total ?? 0;
            const okRate = row?.successRate ?? 0;
            const Icon = CATEGORY_ICONS[category];
            const active = activeCategory === category;
            return (
              <li key={category}>
                <button
                  type="button"
                  onClick={() => onCategorySelect(active ? "all" : category)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    "hover:bg-muted/40 focus-visible:bg-muted/40",
                    "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    active && "bg-primary/5",
                  )}
                  aria-pressed={active}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                      CATEGORY_TILE[category],
                      "[&>svg]:size-4",
                    )}
                    aria-hidden
                  >
                    <Icon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {CATEGORY_LABELS[category]}
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {total.toLocaleString()}
                      </span>
                    </span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn("block h-full rounded-full", CATEGORY_BAR[category])}
                          style={{ width: `${Math.min(100, Math.max(0, okRate))}%` }}
                        />
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-[11px] tabular-nums",
                          okRate >= 95
                            ? "text-emerald-600 dark:text-emerald-400"
                            : okRate >= 85
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {okRate}%
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      last {timeAgo(row?.lastAt ?? null)}
                      {category === "OTHER" && expectedMisses > 0
                        ? ` · incl. ${expectedMisses.toLocaleString()} expected host lookups`
                        : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
              <ShieldAlert className="size-4 text-red-600 dark:text-red-400" aria-hidden />
              Failures
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Recent failed requests
              {expectedMisses > 0
                ? ` · ${expectedMisses.toLocaleString()} host lookups excluded as expected`
                : " in this stream."}
            </p>
          </div>
          {failures.length > 0 ? (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-mono text-xs tabular-nums text-red-600 dark:text-red-400">
              {failures.length}
            </span>
          ) : null}
        </div>

        {failures.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground">No failures in this stream</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Every recent request succeeded — or the stream is filtered.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {failures.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onRowClick(row)}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors",
                    "hover:bg-red-500/5 focus-visible:bg-red-500/5",
                    "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums",
                      row.status >= 500
                        ? "bg-red-500/10 text-red-600 dark:text-red-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {row.status}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs text-foreground">
                      {row.method} {row.path}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                      {row.businessName ?? shortId(row.businessId)} · {row.ip ?? "—"} ·{" "}
                      {timeAgo(row.loggedAt)}
                    </span>
                  </span>
                  <ChevronRight
                    className="mt-1 size-3.5 shrink-0 text-muted-foreground/50"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
