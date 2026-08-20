"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Activity, HardDriveDownload, Loader2, MonitorSmartphone, Pause, Play, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DesktopInstallLogsPanel } from "@/components/super-admin/desktop-install-logs-panel";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { SuperAdminDrawer } from "@/components/super-admin/super-admin-drawer";
import { Button } from "@/components/ui/button";
import { OpsClientLogsPanel } from "@/components/ops-client-logs-panel";
import {
  fetchPlatformRequestLogs,
  fetchPlatformRequestLogSummary,
  type PlatformRequestLogCategory,
  type PlatformRequestLogRow,
  type PlatformRequestLogSummary,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import { InsightRail } from "./insight-rail";
import { RequestLogDrawerContent } from "./request-log-drawer";
import { RequestLogStream, type StreamOutcome } from "./request-log-stream";
import { formatDuration, timeAgo } from "./platform-logs-shared";

const WINDOWS = [
  { label: "1h", minutes: 60 },
  { label: "24h", minutes: 1440 },
  { label: "7d", minutes: 10080 },
];

type Tab = "stream" | "installs" | "browser";

const TABS: Array<{ key: Tab; label: string; icon: LucideIcon }> = [
  { key: "stream", label: "Request stream", icon: Activity },
  { key: "installs", label: "Desktop installs", icon: HardDriveDownload },
  { key: "browser", label: "This browser", icon: MonitorSmartphone },
];

/**
 * Super Admin → Platform → Logs.
 *
 * A live operations console over the platform request log: stream controls in
 * the header, a compact metrics readout, and tabs for the request stream,
 * desktop install bundles, and this browser's own diagnostics.
 */
export function PlatformLogsPage() {
  const [tab, setTab] = useState<Tab>("stream");
  const [rows, setRows] = useState<PlatformRequestLogRow[]>([]);
  const [summary, setSummary] = useState<PlatformRequestLogSummary | null>(null);
  const [category, setCategory] = useState<"all" | PlatformRequestLogCategory>("all");
  const [outcome, setOutcome] = useState<StreamOutcome>("all");
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [ipDraft, setIpDraft] = useState("");
  const [ip, setIp] = useState("");
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedRow, setSelectedRow] = useState<PlatformRequestLogRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const busyRef = useRef(false);

  const load = useCallback(
    async (silent: boolean) => {
      if (busyRef.current) return;
      busyRef.current = true;
      if (!silent) setLoading(true);
      setError("");
      try {
        const [logRows, logSummary] = await Promise.all([
          fetchPlatformRequestLogs({
            limit: 150,
            category: category === "all" ? undefined : category,
            success: outcome === "success" ? true : outcome === "failed" ? false : undefined,
            sinceMinutes: windowMinutes,
            ip: ip || undefined,
          }),
          fetchPlatformRequestLogSummary(windowMinutes),
        ]);
        setRows(logRows);
        setSummary(logSummary);
        setLastUpdated(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load platform request logs.");
      } finally {
        busyRef.current = false;
        setLoading(false);
      }
    },
    [category, outcome, windowMinutes, ip],
  );

  // Stream while the request-log tab is visible and the user hasn't paused.
  useEffect(() => {
    if (tab !== "stream" || paused) return;
    void load(false);
    const timer = setInterval(() => void load(true), 5_000);
    return () => clearInterval(timer);
  }, [load, tab, paused]);

  const windowLabel = WINDOWS.find((w) => w.minutes === windowMinutes)?.label ?? "";

  const avgLatencyMs = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.durationMs, 0) / rows.length)
    : null;

  const failedRate = summary && summary.total > 0
    ? Math.round((summary.failed * 1000) / summary.total) / 10
    : 0;

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Platform logs"
        description="Every API and webhook request across all businesses — cashier sales, M-Pesa, airtime purchases and KPLC tokens — with per-category success rates, updated live."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
                paused
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              )}
              aria-live="polite"
            >
              <span
                className={cn(
                  "relative flex size-2",
                  !paused && "before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-current before:opacity-60",
                )}
                aria-hidden
              >
                <span className="size-2 rounded-full bg-current" />
              </span>
              {paused ? "Paused" : "Live"}
              {lastUpdated ? (
                <span className="text-muted-foreground">
                  · updated {lastUpdated.toLocaleTimeString()}
                </span>
              ) : null}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
            >
              {paused ? (
                <Play className="size-3.5" aria-hidden />
              ) : (
                <Pause className="size-3.5" aria-hidden />
              )}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => void load(false)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden />
              )}
              Refresh
            </Button>
            <div className="flex overflow-hidden rounded-lg border border-border/70">
              {WINDOWS.map((w) => (
                <button
                  key={w.minutes}
                  type="button"
                  onClick={() => setWindowMinutes(w.minutes)}
                  className={cn(
                    "px-2.5 py-1.5 text-xs font-medium transition-colors",
                    "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    windowMinutes === w.minutes
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                  aria-pressed={windowMinutes === w.minutes}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <MetricsReadout
        summary={summary}
        windowLabel={windowLabel}
        avgLatencyMs={avgLatencyMs}
        sampleCount={rows.length}
        failedRate={failedRate}
        lastRequestAt={rows[0]?.loggedAt ?? null}
      />

      <div className="flex gap-1 rounded-xl border border-border/70 bg-muted/40 p-1" role="tablist" aria-label="Log sections">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", active ? "text-primary" : "opacity-70")} aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "stream" ? (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_350px]">
          <RequestLogStream
            rows={rows}
            loading={loading}
            error={error}
            category={category}
            onCategoryChange={setCategory}
            outcome={outcome}
            onOutcomeChange={setOutcome}
            ipDraft={ipDraft}
            onIpDraftChange={setIpDraft}
            ip={ip}
            onApplyIp={() => setIp(ipDraft.trim())}
            onClearIp={() => {
              setIp("");
              setIpDraft("");
            }}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onRowClick={setSelectedRow}
          />
          <InsightRail
            summary={summary}
            rows={rows}
            activeCategory={category}
            onCategorySelect={setCategory}
            onRowClick={setSelectedRow}
          />
        </div>
      ) : tab === "installs" ? (
        <DesktopInstallLogsPanel />
      ) : (
        <OpsClientLogsPanel
          emptyDescription="When this console cannot reach the API, the technical detail lands here instead of a toast."
          storageNote="Stored on this browser only. Shop tills never toast this detail."
        />
      )}

      <SuperAdminDrawer
        open={selectedRow !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRow(null);
        }}
        title="Request details"
        description={
          selectedRow ? `${selectedRow.method} · ${timeAgo(selectedRow.loggedAt)}` : undefined
        }
        width="default"
      >
        {selectedRow ? <RequestLogDrawerContent row={selectedRow} /> : null}
      </SuperAdminDrawer>
    </div>
  );
}

function MetricsReadout({
  summary,
  windowLabel,
  avgLatencyMs,
  sampleCount,
  failedRate,
  lastRequestAt,
}: {
  summary: PlatformRequestLogSummary | null;
  windowLabel: string;
  avgLatencyMs: number | null;
  sampleCount: number;
  failedRate: number;
  lastRequestAt: string | null;
}) {
  const metrics: Array<{
    label: string;
    value: string;
    sub: string;
    tone?: "success" | "failed" | "default";
  }> = [
    {
      label: "Requests",
      value: (summary?.total ?? 0).toLocaleString(),
      sub: `in the ${windowLabel} window`,
    },
    {
      label: "Success rate",
      value: `${summary?.successRate ?? 0}%`,
      sub: `${(summary?.success ?? 0).toLocaleString()} of ${(summary?.total ?? 0).toLocaleString()} ok`,
      tone: (summary?.successRate ?? 0) >= 95 ? "success" : "default",
    },
    {
      label: "Failed",
      value: (summary?.failed ?? 0).toLocaleString(),
      sub: `${failedRate}% of traffic`,
      tone: (summary?.failed ?? 0) > 0 ? "failed" : "default",
    },
    {
      label: "Avg latency",
      value: avgLatencyMs === null ? "—" : formatDuration(avgLatencyMs),
      sub: `last ${sampleCount.toLocaleString()} requests`,
    },
    {
      label: "Last request",
      value: timeAgo(lastRequestAt),
      sub: "live stream",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <dl className="grid grid-cols-2 divide-y divide-border/60 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0 lg:divide-x lg:divide-border/60">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 px-4 py-3.5 sm:px-5">
            <dt className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {metric.label}
            </dt>
            <dd
              className={cn(
                "mt-1 truncate text-xl font-semibold tabular-nums tracking-tight sm:text-2xl",
                metric.tone === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : metric.tone === "failed"
                    ? "text-red-600 dark:text-red-400"
                    : "text-foreground",
              )}
            >
              {metric.value}
            </dd>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{metric.sub}</p>
          </div>
        ))}
      </dl>
    </div>
  );
}
