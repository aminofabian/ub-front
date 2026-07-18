"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Flame,
  Loader2,
  MessageSquareText,
  Moon,
  PackagePlus,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchStockTakeMyStats,
  type StockTakeMyStatsRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "default" | "good" | "warn" | "hot";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-3.5 shadow-sm",
        accent === "good" && "border-emerald-500/30 bg-emerald-500/[0.06]",
        accent === "warn" && "border-amber-500/30 bg-amber-500/[0.06]",
        accent === "hot" && "border-orange-500/35 bg-orange-500/[0.07]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Icon className="size-4 shrink-0 text-muted-foreground/80" />
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default function StockTakeMyStatsPage() {
  const { me } = useDashboard();
  const canView =
    hasPermission(me?.permissions, Permission.StocktakeRead) ||
    hasPermission(me?.permissions, Permission.StocktakeRun);

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [stats, setStats] = useState<StockTakeMyStatsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStockTakeMyStats(month);
      setStats(data);
    } catch (e) {
      setStats(null);
      setError(e instanceof Error ? e.message : "Could not load stats");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    if (canView) void load();
  }, [canView, load]);

  const amPmSplit = useMemo(() => {
    if (!stats) return null;
    const total = stats.morningSessions + stats.eveningSessions;
    if (total === 0) return { am: 0, pm: 0 };
    return {
      am: Math.round((stats.morningSessions * 100) / total),
      pm: Math.round((stats.eveningSessions * 100) / total),
    };
  }, [stats]);

  if (!canView) {
    return (
      <DashboardAccessDenied
        title="My count stats"
        description="You need stock take access to view your counting stats."
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-4 pb-8">
        <header className="space-y-3 border-b border-border/50 pb-4">
          <DashboardPageHero
            compact
            icon={Award}
            eyebrow="Your floor"
            title="My month"
            description="How your counts are landing — streaks, clean approvals, and restock flags."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
            >
              Prev
            </Button>
            <span className="min-w-[9rem] text-center text-sm font-semibold tabular-nums">
              {monthLabel(month)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
            >
              Next
            </Button>
            <Button asChild variant="secondary" size="sm" className="ml-auto h-9">
              <Link href={APP_ROUTES.inventoryStockTakeDailyAudit}>
                Open daily audit
              </Link>
            </Button>
          </div>
        </header>

        {error ? <DashboardFeedback kind="error" text={error} /> : null}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : stats ? (
          <>
            <section
              className={cn(
                "relative overflow-hidden rounded-[1.35rem] border border-border/60",
                "bg-gradient-to-br from-primary/[0.12] via-card to-emerald-500/[0.08]",
                "p-5 shadow-sm",
              )}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-primary/10 blur-2xl"
              />
              <div className="relative flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-background/80 shadow-sm ring-1 ring-border/60">
                  <Sparkles className="size-5 text-primary" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    This month&apos;s title
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {stats.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{stats.highlight}</p>
                  <p className="pt-1 text-[11px] tabular-nums text-muted-foreground">
                    {stats.from} → {stats.to}
                    {stats.timezone ? ` · ${stats.timezone}` : ""}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <StatTile
                label="Items counted"
                value={stats.itemsCounted}
                hint="Submitted physical counts"
                icon={Target}
                accent={stats.itemsCounted > 0 ? "good" : "default"}
              />
              <StatTile
                label="Days on floor"
                value={`${stats.daysActive}/${stats.daysInPeriod}`}
                hint={`${stats.coveragePct}% coverage`}
                icon={TrendingUp}
              />
              <StatTile
                label="Current streak"
                value={`${stats.currentStreakDays}d`}
                hint={`Best ${stats.bestStreakDays}d this month`}
                icon={Flame}
                accent={stats.currentStreakDays >= 3 ? "hot" : "default"}
              />
              <StatTile
                label="Clean rate"
                value={
                  stats.cleanRatePct == null ? "—" : `${stats.cleanRatePct}%`
                }
                hint={
                  stats.cleanRatePct == null
                    ? "Awaiting admin review"
                    : `${stats.approvedCounts} approved · ${stats.escalatedCounts} escalated`
                }
                icon={CheckCircle2}
                accent={
                  stats.cleanRatePct != null && stats.cleanRatePct >= 90
                    ? "good"
                    : stats.escalatedCounts > 0
                      ? "warn"
                      : "default"
                }
              />
              <StatTile
                label="Sessions"
                value={stats.sessionsStarted}
                hint={`${stats.dailyAuditSessions} daily audits`}
                icon={ClipboardCheck}
              />
              <StatTile
                label="Restock flags"
                value={stats.restockFlags}
                hint="Suggestions you raised"
                icon={PackagePlus}
              />
            </div>

            <section className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                AM / PM balance
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Sun className="size-4 text-amber-600" />
                  {stats.morningSessions} AM
                </div>
                <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-500/80 transition-[width]"
                    style={{ width: `${amPmSplit?.am ?? 0}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Moon className="size-4 text-indigo-500" />
                  {stats.eveningSessions} PM
                </div>
              </div>
              {amPmSplit ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {amPmSplit.am}% morning · {amPmSplit.pm}% evening
                </p>
              ) : null}
            </section>

            <section className="grid grid-cols-2 gap-2.5">
              <StatTile
                label="Pending review"
                value={stats.pendingReview}
                hint="Still with admin"
                icon={ClipboardCheck}
              />
              <StatTile
                label="Notes left"
                value={stats.notesLeft}
                hint="Context for reviewers"
                icon={MessageSquareText}
              />
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
