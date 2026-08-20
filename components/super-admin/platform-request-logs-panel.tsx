"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Loader2, Radio, RefreshCw, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchPlatformRequestLogs,
  fetchPlatformRequestLogSummary,
  type PlatformRequestLogCategory,
  type PlatformRequestLogRow,
  type PlatformRequestLogSummary,
} from "@/lib/super-admin-api";

/**
 * Super Admin → Platform → Logs — live platform request feed.
 *
 * Every API/webhook request the backend handles lands here (captured by the
 * platform request-log interceptor), bucketed into Cashier / M-Pesa / Airtime /
 * KPLC / Other with per-category success counts. Polls every 5 s.
 */
export function PlatformRequestLogsPanel() {
  const [rows, setRows] = useState<PlatformRequestLogRow[]>([]);
  const [summary, setSummary] = useState<PlatformRequestLogSummary | null>(null);
  const [category, setCategory] = useState<"all" | PlatformRequestLogCategory>("all");
  const [outcome, setOutcome] = useState<"all" | "success" | "failed">("all");
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [ipDraft, setIpDraft] = useState("");
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const busyRef = useRef(false);

  const load = useCallback(
    async (silent: boolean) => {
      if (busyRef.current) {
        return;
      }
      busyRef.current = true;
      if (!silent) {
        setLoading(true);
      }
      setError("");
      try {
        const [logRows, logSummary] = await Promise.all([
          fetchPlatformRequestLogs({
            limit: 150,
            category: category === "all" ? undefined : category,
            success:
              outcome === "success" ? true : outcome === "failed" ? false : undefined,
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

  useEffect(() => {
    void load(false);
    const timer = setInterval(() => void load(true), 5_000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Platform request log
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-relaxed text-muted-foreground">
            <span>
              Every API &amp; webhook request across all businesses — cashier
              processing, M-Pesa, airtime purchases, KPLC tokens — with success
              counts per category.
            </span>
            {lastUpdated ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden />
                Live · updated {lastUpdated.toLocaleTimeString()}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-border/70">
            {WINDOWS.map((w) => (
              <button
                key={w.minutes}
                type="button"
                onClick={() => setWindowMinutes(w.minutes)}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  windowMinutes === w.minutes
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => void load(false)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-5 sm:px-5">
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <SummaryCards summary={summary} />

        <div className="flex flex-wrap items-center gap-2">
          <CategoryFilter value={category} onChange={setCategory} />
          <OutcomeFilter value={outcome} onChange={setOutcome} />
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setIp(ipDraft.trim());
            }}
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={ipDraft}
                onChange={(e) => setIpDraft(e.target.value)}
                placeholder="Filter by IP"
                className="h-8 w-44 pl-8"
                aria-label="Filter by IP"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-8">
              Filter
            </Button>
            {ip ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  setIp("");
                  setIpDraft("");
                }}
              >
                Clear
              </Button>
            ) : null}
          </form>
        </div>

        {loading && rows.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading request log…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No requests in this window yet. Requests start appearing here the
            moment they hit the API.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
                  <th scope="col" className="px-2 py-2 font-medium">Time</th>
                  <th scope="col" className="px-2 py-2 font-medium">Category</th>
                  <th scope="col" className="px-2 py-2 font-medium">Method</th>
                  <th scope="col" className="px-2 py-2 font-medium">Path</th>
                  <th scope="col" className="px-2 py-2 font-medium">Tenant</th>
                  <th scope="col" className="px-2 py-2 font-medium">IP</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Status</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.success
                        ? "hover:bg-muted/40"
                        : "bg-red-500/3 hover:bg-red-500/6"
                    }
                  >
                    <td className="whitespace-nowrap px-2 py-2.5 text-xs tabular-nums text-muted-foreground">
                      {formatTime(row.loggedAt)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <CategoryBadge category={row.category} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs">{row.method}</td>
                    <td
                      className="max-w-md truncate px-2 py-2.5 font-mono text-xs"
                      title={row.path}
                    >
                      {row.path}
                    </td>
                    <td
                      className="max-w-48 truncate whitespace-nowrap px-2 py-2.5 text-xs"
                      title={row.businessId ?? undefined}
                    >
                      {row.businessName ?? (row.businessId ? shortId(row.businessId) : "—")}
                    </td>
                    <td
                      className="whitespace-nowrap px-2 py-2.5 font-mono text-xs"
                      title={row.ip ?? undefined}
                    >
                      {row.ip ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right">
                      <StatusBadge status={row.status} success={row.success} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
                      {row.durationMs} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

const WINDOWS = [
  { label: "1h", minutes: 60 },
  { label: "24h", minutes: 1440 },
  { label: "7d", minutes: 10080 },
];

const CATEGORY_LABELS: Record<PlatformRequestLogCategory, string> = {
  CASHIER: "Cashier",
  MPESA: "M-Pesa",
  AIRTIME: "Airtime",
  KPLC: "KPLC tokens",
  OTHER: "Other",
};

const CATEGORY_ORDER: PlatformRequestLogCategory[] = [
  "CASHIER",
  "MPESA",
  "AIRTIME",
  "KPLC",
  "OTHER",
];

const CATEGORY_BADGE: Record<PlatformRequestLogCategory, string> = {
  CASHIER: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  MPESA: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  AIRTIME: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  KPLC: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  OTHER: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
};

function CategoryBadge({ category }: { category: PlatformRequestLogCategory }) {
  return (
    <Badge variant="outline" className={`border-transparent ${CATEGORY_BADGE[category]}`}>
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}

function StatusBadge({ status, success }: { status: number; success: boolean }) {
  const tone = success
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : status >= 500
      ? "bg-red-500/10 text-red-600 dark:text-red-400"
      : status >= 400
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-slate-500/10 text-slate-500 dark:text-slate-400";
  return (
    <Badge variant="outline" className={`border-transparent ${tone}`}>
      {status} {success ? "✓" : "✗"}
    </Badge>
  );
}

function CategoryFilter({
  value,
  onChange,
}: {
  value: "all" | PlatformRequestLogCategory;
  onChange: (value: "all" | PlatformRequestLogCategory) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(["all", ...CATEGORY_ORDER] as const).map((key) => (
        <FilterChip
          key={key}
          label={key === "all" ? "All" : CATEGORY_LABELS[key]}
          active={value === key}
          onClick={() => onChange(key)}
        />
      ))}
    </div>
  );
}

function OutcomeFilter({
  value,
  onChange,
}: {
  value: "all" | "success" | "failed";
  onChange: (value: "all" | "success" | "failed") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(
        [
          { key: "all", label: "All outcomes" },
          { key: "success", label: "Successful" },
          { key: "failed", label: "Failed" },
        ] as const
      ).map((opt) => (
        <FilterChip
          key={opt.key}
          label={opt.label}
          active={value === opt.key}
          onClick={() => onChange(opt.key)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function SummaryCards({ summary }: { summary: PlatformRequestLogSummary | null }) {
  if (!summary) {
    return null;
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <SummaryCard label="Requests" value={summary.total.toLocaleString()} tone="default" />
        <SummaryCard
          label="Successful"
          value={`${summary.success.toLocaleString()} (${summary.successRate}%)`}
          tone="success"
        />
        <SummaryCard
          label="Failed"
          value={`${summary.failed.toLocaleString()} (${rateOf(summary.failed, summary.total)}%)`}
          tone="failed"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_ORDER.map((category) => {
          const row = summary.categories.find((c) => c.category === category);
          if (!row) {
            return null;
          }
          return (
            <div
              key={category}
              className="flex items-center gap-2 rounded-lg border border-border/70 px-2.5 py-1.5 text-xs"
            >
              <CategoryBadge category={category} />
              <span className="tabular-nums text-muted-foreground">
                {row.total.toLocaleString()}
              </span>
              <span className={`tabular-nums font-medium ${row.failed > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {row.successRate}% ok
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "success" | "failed";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "failed"
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border/70 px-3 py-2.5">
      <p className="text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-heading text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function rateOf(part: number, total: number): string {
  if (total === 0) {
    return "0";
  }
  return String(Math.round((part * 1000) / total) / 10);
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
