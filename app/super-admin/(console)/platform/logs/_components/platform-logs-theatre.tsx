"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ChevronRight,
  HardDriveDownload,
  MonitorSmartphone,
  Search,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import type {
  PlatformRequestLogCategory,
  PlatformRequestLogRow,
  PlatformRequestLogSummary,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatDuration,
  isExpectedHostLookup,
  timeAgo,
} from "@/components/super-admin/platform-logs/platform-logs-shared";

export type LogsSectionId = "stream" | "installs" | "browser";

export type StreamOutcome = "all" | "success" | "failed";
export type StreamSource = "all" | "loadtest";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

const SECTION_NAV: {
  id: LogsSectionId;
  label: string;
  hint: string;
  icon: typeof Activity;
}[] = [
  {
    id: "stream",
    label: "Request stream",
    hint: "Live API and webhook traffic across tenants.",
    icon: Activity,
  },
  {
    id: "installs",
    label: "Desktop installs",
    hint: "Install bundles and desktop update logs.",
    icon: HardDriveDownload,
  },
  {
    id: "browser",
    label: "This browser",
    hint: "Local ops diagnostics for this console.",
    icon: MonitorSmartphone,
  },
];

function LiveDot({ paused }: { paused?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 shrink-0",
        paused ? "bg-amber-600" : "bg-[var(--pos-primary,#0f766e)]",
      )}
      aria-hidden
    />
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-none border px-2 text-[11px] font-semibold tracking-[-0.02em] transition-colors",
        active
          ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
          : cn(HAIRLINE, "bg-white text-muted-foreground hover:text-foreground"),
      )}
    >
      {children}
    </button>
  );
}

function ContextBanner({
  summary,
  windowLabel,
  paused,
  loading,
  visibleCount,
}: {
  summary: PlatformRequestLogSummary | null;
  windowLabel: string;
  paused: boolean;
  loading: boolean;
  visibleCount: number;
}) {
  const unexpectedFailures = Math.max(
    0,
    (summary?.failed ?? 0) - (summary?.expectedMisses ?? 0),
  );
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        HAIRLINE,
      )}
    >
      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <LiveDot paused={paused} />
          {paused ? "Paused" : "Live"}
        </span>
        <span className={dashboardHintClass()}>
          {loading ? "—" : (summary?.total ?? 0).toLocaleString()} in {windowLabel}
          {" · "}
          {loading ? "—" : `${summary?.successRate ?? 0}%`} ok
          {" · "}
          {loading ? "—" : unexpectedFailures} failed
          {" · "}
          showing {visibleCount}
        </span>
      </p>
      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />
      <p className={cn(dashboardHintClass(), "hidden sm:block")}>
        Pick a request on the left. Failures open with full capture in the panel.
      </p>
    </div>
  );
}

function LogsPulse({
  summary,
  windowLabel,
  avgLatencyMs,
  sampleCount,
  lastRequestAt,
  loading,
  onPickFailed,
  className,
}: {
  summary: PlatformRequestLogSummary | null;
  windowLabel: string;
  avgLatencyMs: number | null;
  sampleCount: number;
  lastRequestAt: string | null;
  loading: boolean;
  onPickFailed: () => void;
  className?: string;
}) {
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";
  const unexpectedFailures = Math.max(
    0,
    (summary?.failed ?? 0) - (summary?.expectedMisses ?? 0),
  );

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M18 38 C 34 24, 58 20, 76 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M26 52 C 46 62, 64 56, 78 66"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className={cn(card, "left-3 top-[12%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Window · {windowLabel}
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : (summary?.total ?? 0).toLocaleString()}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {loading ? "—" : `${summary?.successRate ?? 0}%`} success
        </p>
      </div>

      <div className={cn(card, "right-3 top-[14%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Latency
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {avgLatencyMs === null ? "—" : formatDuration(avgLatencyMs)}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Avg over last {sampleCount.toLocaleString()} · {timeAgo(lastRequestAt)}
        </p>
      </div>

      <button
        type="button"
        className={cn(
          card,
          "bottom-[10%] left-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={onPickFailed}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Activity
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Filter failures
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          {loading ? "—" : unexpectedFailures} unexpected · exclude host lookups
        </p>
      </button>
    </div>
  );
}

function RequestFocus({
  row,
  className,
}: {
  row: PlatformRequestLogRow;
  className?: string;
}) {
  const failed = !row.success && !isExpectedHostLookup(row);
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
        className,
      )}
    >
      <div className="max-w-md space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <Activity className="size-3" aria-hidden />
          {CATEGORY_LABELS[row.category]}
        </span>
        <h2
          className="break-all text-[1.35rem] font-semibold leading-tight tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {row.method} {row.path}
        </h2>
        <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
          {row.businessName || row.businessId || "Platform"}
          {" · "}
          {timeAgo(row.loggedAt)}
        </p>
        <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
          <span
            className={cn(
              "font-semibold tabular-nums",
              failed
                ? "text-[#9a2e16]"
                : row.success
                  ? "text-[var(--pos-primary,#0f766e)]"
                  : undefined,
            )}
          >
            {row.status}
          </span>
          {" · "}
          <span className="font-semibold tabular-nums">
            {formatDuration(row.durationMs)}
          </span>
          {row.errorTitle ? (
            <>
              {" · "}
              <span className="font-semibold">{row.errorTitle}</span>
            </>
          ) : null}
        </p>
      </div>
      <p
        className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
      >
        <LiveDot />
        Full capture in the panel
      </p>
    </div>
  );
}

function SectionFocus({
  sectionId,
  className,
}: {
  sectionId: Exclude<LogsSectionId, "stream">;
  className?: string;
}) {
  const meta = SECTION_NAV.find((s) => s.id === sectionId)!;
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
        className,
      )}
    >
      <div className="max-w-md space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <Icon className="size-3" aria-hidden />
          {meta.label}
        </span>
        <h2
          className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {meta.label}
        </h2>
        <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
          {meta.hint}
        </p>
      </div>
      <p
        className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
      >
        <LiveDot />
        Content in the panel
      </p>
    </div>
  );
}

export type PlatformLogsTheatreProps = {
  sectionId: LogsSectionId;
  onSectionChange: (id: LogsSectionId) => void;
  rows: PlatformRequestLogRow[];
  summary: PlatformRequestLogSummary | null;
  loading: boolean;
  error: string;
  paused: boolean;
  windowLabel: string;
  avgLatencyMs: number | null;
  category: "all" | PlatformRequestLogCategory;
  onCategoryChange: (value: "all" | PlatformRequestLogCategory) => void;
  outcome: StreamOutcome;
  onOutcomeChange: (value: StreamOutcome) => void;
  source: StreamSource;
  onSourceChange: (value: StreamSource) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  ipDraft: string;
  onIpDraftChange: (value: string) => void;
  ip: string;
  onApplyIp: () => void;
  onClearIp: () => void;
  selectedRow: PlatformRequestLogRow | null;
  onSelectRow: (row: PlatformRequestLogRow | null) => void;
  drawerBody: ReactNode;
};

export function PlatformLogsTheatre({
  sectionId,
  onSectionChange,
  rows,
  summary,
  loading,
  error,
  paused,
  windowLabel,
  avgLatencyMs,
  category,
  onCategoryChange,
  outcome,
  onOutcomeChange,
  source,
  onSourceChange,
  searchQuery,
  onSearchQueryChange,
  ipDraft,
  onIpDraftChange,
  ip,
  onApplyIp,
  onClearIp,
  selectedRow,
  onSelectRow,
  drawerBody,
}: PlatformLogsTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const tenant = row.businessName ?? row.businessId ?? "";
      return (
        tenant.toLowerCase().includes(q) || row.path.toLowerCase().includes(q)
      );
    });
  }, [rows, searchQuery]);

  const selectSection = (id: LogsSectionId) => {
    onSelectRow(null);
    onSectionChange(id);
    history.replaceState(null, "", `#${id}`);
    if (!isLg && id !== "stream") setMobileDrawerOpen(true);
  };

  const selectRow = (row: PlatformRequestLogRow) => {
    onSectionChange("stream");
    onSelectRow(row);
    history.replaceState(null, "", `#request-${row.id}`);
    if (!isLg) setMobileDrawerOpen(true);
  };

  const clearDrawer = () => {
    onSelectRow(null);
    if (sectionId !== "stream") {
      onSectionChange("stream");
    }
    setMobileDrawerOpen(false);
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  const drawerOpen =
    (!!selectedRow || sectionId === "installs" || sectionId === "browser") &&
    (isLg || mobileDrawerOpen);

  useEffect(() => {
    if ((selectedRow || sectionId !== "stream") && !isLg) {
      setMobileDrawerOpen(true);
    }
  }, [selectedRow, sectionId, isLg]);

  const drawerTitle = selectedRow
    ? selectedRow.success
      ? "Request details"
      : "Failed request"
    : sectionId === "installs"
      ? "Desktop installs"
      : sectionId === "browser"
        ? "This browser"
        : "Logs";

  const drawerDescription = selectedRow
    ? selectedRow.success
      ? `${selectedRow.method} · ${timeAgo(selectedRow.loggedAt)}`
      : `${selectedRow.status} · ${selectedRow.errorTitle || selectedRow.method} · ${timeAgo(selectedRow.loggedAt)}`
    : SECTION_NAV.find((s) => s.id === sectionId)?.hint;

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;
    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white">
            {SECTION_NAV.map((item) => {
              const active =
                sectionId === item.id &&
                (item.id !== "stream" || !selectedRow);
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectSection(item.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors",
                      active
                        ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                        : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0",
                        active
                          ? "text-[var(--pos-primary,#0f766e)]"
                          : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                    <span className="truncate text-[12px] font-semibold tracking-[-0.015em]">
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {sectionId === "stream" ? (
            <>
              <label className="relative block min-w-0">
                <Search
                  className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  className={cn(
                    dashboardInputClass(),
                    "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
                  )}
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Search tenant or path…"
                  aria-label="Search requests"
                />
              </label>
              <div className="flex flex-wrap gap-1">
                <Chip
                  active={outcome === "all"}
                  onClick={() => onOutcomeChange("all")}
                >
                  All
                </Chip>
                <Chip
                  active={outcome === "success"}
                  onClick={() => onOutcomeChange("success")}
                >
                  OK
                </Chip>
                <Chip
                  active={outcome === "failed"}
                  onClick={() => onOutcomeChange("failed")}
                >
                  Failed
                </Chip>
                <Chip
                  active={source === "loadtest"}
                  onClick={() =>
                    onSourceChange(source === "loadtest" ? "all" : "loadtest")
                  }
                >
                  Load test
                </Chip>
              </div>
              <div className="flex flex-wrap gap-1">
                <Chip
                  active={category === "all"}
                  onClick={() => onCategoryChange("all")}
                >
                  Any
                </Chip>
                {CATEGORY_ORDER.map((key) => (
                  <Chip
                    key={key}
                    active={category === key}
                    onClick={() =>
                      onCategoryChange(category === key ? "all" : key)
                    }
                  >
                    {CATEGORY_LABELS[key]}
                  </Chip>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  className={cn(dashboardInputClass(), "h-8 flex-1 text-[12px]")}
                  value={ipDraft}
                  onChange={(e) => onIpDraftChange(e.target.value)}
                  placeholder="Filter IP…"
                  aria-label="Filter by IP"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onApplyIp();
                  }}
                />
                <button
                  type="button"
                  onClick={onApplyIp}
                  className={cn(
                    "h-8 border px-2 text-[11px] font-semibold",
                    HAIRLINE,
                  )}
                >
                  Apply
                </button>
                {ip ? (
                  <button
                    type="button"
                    onClick={onClearIp}
                    className={cn(
                      "h-8 border px-2 text-[11px] font-semibold",
                      HAIRLINE,
                    )}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <p className={cn(dashboardHintClass(), "tabular-nums")}>
                {filteredRows.length} request
                {filteredRows.length === 1 ? "" : "s"}
                {loading ? " · refreshing…" : ""}
                {error ? ` · ${error}` : ""}
              </p>
            </>
          ) : (
            <p className={dashboardHintClass()}>
              {SECTION_NAV.find((s) => s.id === sectionId)?.hint}
            </p>
          )}
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {sectionId !== "stream" ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              Open the panel for {SECTION_NAV.find((s) => s.id === sectionId)?.label}.
            </p>
          ) : filteredRows.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              {loading
                ? "Loading stream…"
                : searchQuery.trim()
                  ? `No requests match “${searchQuery.trim()}”.`
                  : "No requests in this window."}
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filteredRows.map((row) => {
                const active = selectedRow?.id === row.id;
                const failed = !row.success && !isExpectedHostLookup(row);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => selectRow(row)}
                      className={cn(
                        "relative flex w-full items-start gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-none",
                          failed
                            ? "bg-[#9a2e16]"
                            : row.success
                              ? "bg-[var(--pos-primary,#0f766e)]"
                              : "bg-amber-600",
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12px]" : "text-[13px]",
                          )}
                        >
                          <span className="tabular-nums">{row.status}</span>{" "}
                          {row.method}{" "}
                          <span className="font-normal text-muted-foreground">
                            {row.path}
                          </span>
                        </p>
                        <p className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">
                          <span>{CATEGORY_LABELS[row.category]}</span>
                          <span className="truncate">
                            {row.businessName || row.businessId || "platform"}
                          </span>
                          <span className="tabular-nums">
                            {formatDuration(row.durationMs)}
                          </span>
                          <span>{timeAgo(row.loggedAt)}</span>
                        </p>
                      </div>
                      {!denser ? (
                        <ChevronRight
                          className="mt-1 size-4 shrink-0 text-muted-foreground/70"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const room =
    selectedRow && sectionId === "stream" ? (
      <RequestFocus row={selectedRow} className="h-full min-h-0" />
    ) : sectionId === "installs" || sectionId === "browser" ? (
      <SectionFocus sectionId={sectionId} className="h-full min-h-0" />
    ) : (
      <LogsPulse
        summary={summary}
        windowLabel={windowLabel}
        avgLatencyMs={avgLatencyMs}
        sampleCount={rows.length}
        lastRequestAt={rows[0]?.loggedAt ?? null}
        loading={loading}
        onPickFailed={() => onOutcomeChange("failed")}
        className="h-full min-h-0"
      />
    );

  const inspect =
    selectedRow || sectionId !== "stream" ? null : (
      <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Dossier
          </p>
          <h3
            className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Pick a request
          </h3>
          <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
            Stream filters live on the left. Failures open with Problem+JSON and
            stack capture.
          </p>
        </div>
        <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
          <Activity className="size-3.5 shrink-0" aria-hidden />
          Deep links #stream, #installs, #browser, #request-id
        </p>
      </div>
    );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <ContextBanner
        summary={summary}
        windowLabel={windowLabel}
        paused={paused}
        loading={loading}
        visibleCount={filteredRows.length}
      />

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border lg:grid",
          HAIRLINE,
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(16rem,18.5rem)_minmax(0,1fr)_minmax(20rem,24rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
          {roster({ fill: true, denser: true })}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <p
            className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
            aria-hidden
          >
            Logs floor
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && (selectedRow || sectionId !== "stream") ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className={cn("overflow-hidden border bg-white", HAIRLINE)}>
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) clearDrawer();
        }}
        contextLabel="Platform logs"
        title={drawerTitle}
        description={drawerDescription}
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
      >
        {drawerOpen ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-white px-3 py-3 sm:px-4",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            {drawerBody}
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
