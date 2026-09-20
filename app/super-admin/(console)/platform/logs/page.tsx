"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Loader2,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { DesktopInstallLogsPanel } from "@/components/super-admin/desktop-install-logs-panel";
import { RequestLogDrawerContent } from "@/components/super-admin/platform-logs/request-log-drawer";
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
        setRows(logRows);
        setSummary(logSummary);
        setLastUpdated(new Date());
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Failed to load platform request logs.",
        );
      } finally {
        busyRef.current = false;
        setLoading(false);
      }
    },
    [category, outcome, source, windowMinutes, ip],
  );

  useEffect(() => {
    if (sectionId !== "stream" || paused) return;
    void load(false);
    const timer = setInterval(() => void load(true), 5_000);
    return () => clearInterval(timer);
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

  const avgLatencyMs = rows.length
    ? Math.round(
        rows.reduce((sum, row) => sum + row.durationMs, 0) / rows.length,
      )
    : null;

  const drawerBody = selectedRow ? (
    <RequestLogDrawerContent row={selectedRow} />
  ) : sectionId === "installs" ? (
    <DesktopInstallLogsPanel />
  ) : sectionId === "browser" ? (
    <OpsClientLogsPanel
      emptyDescription="When this console cannot reach the API, the technical detail lands here instead of a toast."
      storageNote="Stored on this browser only. Shop tills never toast this detail."
    />
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
        description="API and webhook traffic across all businesses — cashier, M-Pesa, airtime, KPLC — with live success rates."
      >
        <div
          className={cn(
            "inline-flex h-8 items-center gap-1.5 border bg-white px-2.5 text-[11px] font-semibold",
            HAIRLINE,
            paused
              ? "text-amber-800"
              : "text-[var(--pos-primary,#0f766e)]",
          )}
          aria-live="polite"
        >
          <span
            className={cn(
              "size-1.5",
              paused ? "bg-amber-600" : "bg-[var(--pos-primary,#0f766e)]",
            )}
            aria-hidden
          />
          {paused ? "Paused" : "Live"}
          {lastUpdated ? (
            <span className="font-normal text-muted-foreground">
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
          onClick={() => void load(false)}
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
        avgLatencyMs={avgLatencyMs}
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
      />
    </div>
  );
}
