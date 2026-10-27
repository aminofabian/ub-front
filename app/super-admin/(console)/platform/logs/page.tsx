"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Loader2, Pause, Play, RefreshCw } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { RequestLogDrawerContent } from "@/components/super-admin/platform-logs/request-log-drawer";
import { Button } from "@/components/ui/button";
import {
  fetchPlatformRequestLogs,
  fetchPlatformRequestLogSummary,
  type PlatformRequestLogCategory,
  type PlatformRequestLogRow,
  type PlatformRequestLogSummary,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  PlatformLogsTheatre,
  type LogsSectionId,
  type StreamOutcome,
  type StreamSource,
} from "./_components/platform-logs-theatre";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

const WINDOWS = [
  { label: "1h", minutes: 60 },
  { label: "24h", minutes: 1440 },
  { label: "7d", minutes: 10080 },
];

function sectionFromHash(hash: string): {
  section?: LogsSectionId;
  requestId?: string;
} {
  const id = hash.replace(/^#/, "");
  if (!id) return {};
  if (id === "stream" || id === "installs" || id === "browser") {
    return { section: id };
  }
  if (id.startsWith("request-")) {
    return { section: "stream", requestId: id.slice("request-".length) };
  }
  return {};
}

export default function SuperAdminPlatformLogsPage() {
  const [sectionId, setSectionId] = useState<LogsSectionId>("stream");
  const [rows, setRows] = useState<PlatformRequestLogRow[]>([]);
  const [summary, setSummary] = useState<PlatformRequestLogSummary | null>(
    null,
  );
  const [category, setCategory] = useState<"all" | PlatformRequestLogCategory>(
    "all",
  );
  const [outcome, setOutcome] = useState<StreamOutcome>("all");
  const [source, setSource] = useState<StreamSource>("all");
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [ipDraft, setIpDraft] = useState("");
  const [ip, setIp] = useState("");
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedRow, setSelectedRow] =
    useState<PlatformRequestLogRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  /** Discards responses that arrive after a newer request (fast filter clicks). */
  const requestSeqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError("");
    try {
      const [logRows, logSummary] = await Promise.all([
        fetchPlatformRequestLogs({
          limit: 150,
          category: category === "all" ? undefined : category,
          success:
            outcome === "success"
              ? true
              : outcome === "failed"
                ? false
                : undefined,
          sinceMinutes: windowMinutes,
          ip: ip || undefined,
          loadTestRunId: source === "loadtest" ? "*" : undefined,
        }),
        fetchPlatformRequestLogSummary(windowMinutes),
      ]);
      if (seq !== requestSeqRef.current) return;
      setRows(logRows);
      setSummary(logSummary);
      setLastUpdated(new Date());
      // Keep the inspected request fresh across refreshes without letting a
      // vanished row close the panel under the operator.
      setSelectedRow((previous) => {
        if (!previous) return previous;
        return logRows.find((row) => row.id === previous.id) ?? previous;
      });
    } catch (e) {
      if (seq !== requestSeqRef.current) return;
      setError(
        e instanceof Error ? e.message : "Failed to load platform request logs.",
      );
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [category, outcome, source, windowMinutes, ip]);

  // Load on mount, and whenever a server-side filter changes — including while
  // paused, so the pause button freezes the feed rather than the controls.
  useEffect(() => {
    if (sectionId !== "stream") return;
    void load();
  }, [load, sectionId]);

  // Poll only while visible; a backgrounded admin tab has no business spending
  // requests on a feed nobody is reading.
  useEffect(() => {
    if (sectionId !== "stream" || paused) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load, sectionId, paused]);

  useEffect(() => {
    const apply = () => {
      const parsed = sectionFromHash(window.location.hash);
      if (parsed.section) setSectionId(parsed.section);
      if (parsed.requestId && rows.length) {
        const row = rows.find((r) => r.id === parsed.requestId);
        if (row) setSelectedRow(row);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [rows]);

  const windowLabel =
    WINDOWS.find((w) => w.minutes === windowMinutes)?.label ?? "";

  const drawerBody = selectedRow ? (
    <RequestLogDrawerContent row={selectedRow} />
  ) : null;

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={Activity}
        eyebrow="Platform"
        title="Logs"
        description="Every API and webhook call across tenants — pass rates, slow routes, and full failure capture."
      >
        <div
          className={cn(
            "inline-flex h-8 items-center gap-1.5 border bg-white px-2.5 text-[11px] font-semibold",
            HAIRLINE,
            paused
              ? "text-amber-800"
              : "text-[var(--pos-primary,#0f766e)]",
          )}
        >
          <span
            className={cn(
              "size-1.5",
              paused ? "bg-amber-600" : "bg-[var(--pos-primary,#0f766e)]",
            )}
            aria-hidden
          />
          <span role="status">{paused ? "Paused" : "Live"}</span>
          {lastUpdated ? (
            <span
              aria-hidden
              className="font-normal tabular-nums text-muted-foreground"
            >
              · {lastUpdated.toLocaleTimeString()}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-none"
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
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border bg-white text-[#666666]",
            HAIRLINE,
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh logs"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
        </button>
        <div className={cn("flex overflow-hidden border", HAIRLINE)}>
          {WINDOWS.map((w) => (
            <button
              key={w.minutes}
              type="button"
              onClick={() => setWindowMinutes(w.minutes)}
              className={cn(
                "px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                windowMinutes === w.minutes
                  ? "bg-[var(--pos-primary,#0f766e)] text-white"
                  : "bg-white text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={windowMinutes === w.minutes}
            >
              {w.label}
            </button>
          ))}
        </div>
      </DashboardPageHero>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <PlatformLogsTheatre
        sectionId={sectionId}
        onSectionChange={setSectionId}
        rows={rows}
        summary={summary}
        loading={loading}
        error={error}
        paused={paused}
        windowLabel={windowLabel}
        category={category}
        onCategoryChange={setCategory}
        outcome={outcome}
        onOutcomeChange={setOutcome}
        source={source}
        onSourceChange={setSource}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        ipDraft={ipDraft}
        onIpDraftChange={setIpDraft}
        ip={ip}
        onApplyIp={() => setIp(ipDraft.trim())}
        onClearIp={() => {
          setIp("");
          setIpDraft("");
        }}
        selectedRow={selectedRow}
        onSelectRow={setSelectedRow}
        drawerBody={drawerBody}
        onWidenWindow={() => setWindowMinutes(1440)}
      />
    </div>
  );
}
