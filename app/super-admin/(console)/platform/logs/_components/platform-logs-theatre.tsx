"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  Check,
  ChevronRight,
  Filter,
  HardDriveDownload,
  MonitorSmartphone,
  Search,
  X,
} from "lucide-react";

import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { OpsClientLogsPanel } from "@/components/ops-client-logs-panel";
import { DesktopInstallLogsPanel } from "@/components/super-admin/desktop-install-logs-panel";
import { useMediaLg } from "@/hooks/use-media-lg";
import type {
  PlatformRequestLogCategory,
  PlatformRequestLogRow,
  PlatformRequestLogSummary,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatClock,
  formatDuration,
  isExpectedHostLookup,
  timeAgo,
} from "@/components/super-admin/platform-logs/platform-logs-shared";
import {
  countHiddenExpected,
  failureGroupKey,
  failureTitle,
  groupFailures,
  isUnexpectedFailure,
  latencyTone,
  percentile,
  searchRows,
  tenantLabel,
  tenantSummary,
  type FailureGroup,
} from "@/components/super-admin/platform-logs/platform-log-triage";

export type LogsSectionId = "stream" | "installs" | "browser";

export type StreamOutcome = "all" | "success" | "failed";
export type StreamSource = "all" | "loadtest";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--op-ink,#121A16)_12%,transparent)]";
const HAIRLINE_SOFT =
  "border-[color-mix(in_srgb,var(--op-ink,#121A16)_8%,transparent)]";
const DIVIDE_SOFT =
  "divide-[color-mix(in_srgb,var(--op-ink,#121A16)_8%,transparent)]";
const MUTED = "text-[color-mix(in_srgb,var(--op-ink,#121A16)_66%,transparent)]";
const FAINT = "text-[color-mix(in_srgb,var(--op-ink,#121A16)_58%,transparent)]";
const INK = "text-[var(--op-ink,#121A16)]";
const ACCENT = "text-[var(--op-accent,#1D4B3B)]";
const SURFACE = "bg-[var(--op-surface,#FCFAF5)]";
const DANGER = "text-[var(--op-highlight,#A55237)]";
const SAMPLE = "bg-[color-mix(in_srgb,var(--op-ink,#121A16)_7%,transparent)]";

const SECTION_NAV: {
  id: LogsSectionId;
  label: string;
  /** Phone-width label — three full labels do not fit under 400px. */
  shortLabel: string;
  hint: string;
  icon: typeof Activity;
}[] = [
  {
    id: "stream",
    label: "Request stream",
    shortLabel: "Stream",
    hint: "API and webhook traffic across every tenant.",
    icon: Activity,
  },
  {
    id: "installs",
    label: "Desktop installs",
    shortLabel: "Installs",
    hint: "Log bundles uploaded by desktop installs.",
    icon: HardDriveDownload,
  },
  {
    id: "browser",
    label: "This browser",
    shortLabel: "Browser",
    hint: "Diagnostics stored on this browser only.",
    icon: MonitorSmartphone,
  },
];

const OUTCOMES: { id: StreamOutcome; label: string }[] = [
  { id: "all", label: "All" },
  { id: "failed", label: "Failed" },
  { id: "success", label: "OK" },
];

function statusTone(row: PlatformRequestLogRow): string {
  if (isExpectedHostLookup(row)) return FAINT;
  if (row.success) {
    return "text-[color-mix(in_srgb,var(--op-ink,#121A16)_82%,transparent)]";
  }
  return DANGER;
}

function durationTone(ms: number): string {
  const tone = latencyTone(ms);
  if (tone === "bad") return cn(DANGER, "font-semibold");
  if (tone === "warn") {
    return "text-[color-mix(in_srgb,var(--op-highlight,#A55237)_68%,var(--op-ink,#121A16))]";
  }
  return FAINT;
}

function hint(className?: string) {
  return cn("text-[10px] leading-snug", FAINT, className);
}

/* ── Section tabs ──────────────────────────────────────────────────── */

function SectionTabs({
  sectionId,
  onSectionChange,
}: {
  sectionId: LogsSectionId;
  onSectionChange: (id: LogsSectionId) => void;
}) {
  const active = SECTION_NAV.find((item) => item.id === sectionId);
  return (
    <nav
      aria-label="Log sections"
      className={cn("flex items-stretch border-b", HAIRLINE, SURFACE)}
    >
      {SECTION_NAV.map((item) => {
        const selected = item.id === sectionId;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={selected ? "page" : undefined}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "relative inline-flex items-center gap-1.5 px-3 py-2 text-[11.5px] font-semibold transition-colors",
              selected
                ? ACCENT
                : cn(MUTED, "hover:text-[var(--op-ink,#121A16)]"),
              selected &&
                "after:absolute after:inset-x-2 after:-bottom-px after:h-[2px] after:bg-[var(--op-accent,#1D4B3B)]",
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="whitespace-nowrap sm:hidden">
              {item.shortLabel}
            </span>
            <span className="hidden whitespace-nowrap sm:inline">
              {item.label}
            </span>
          </button>
        );
      })}
      <span
        className={cn("ml-auto hidden max-w-[24rem] truncate px-3 py-2", hint())}
      >
        {active?.hint}
      </span>
    </nav>
  );
}

/* ── Health band ───────────────────────────────────────────────────── */

function Metric({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string;
  sub: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("min-w-0 px-2.5 py-2 sm:px-3", SURFACE)}>
      <p
        className={cn(
          "truncate text-[9.5px] font-semibold uppercase tracking-[0.13em]",
          MUTED,
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-[1.3rem] font-semibold leading-none tabular-nums tracking-[-0.03em]",
          INK,
          valueClassName,
        )}
      >
        {value}
      </p>
      <p className={cn("mt-1 truncate text-[9.5px] tabular-nums", FAINT)}>
        {sub}
      </p>
    </div>
  );
}

function CategoryCell({
  category,
  summary,
  active,
  windowLabel,
  onSelect,
}: {
  category: PlatformRequestLogCategory;
  summary: PlatformRequestLogSummary | null;
  active: boolean;
  windowLabel: string;
  onSelect: () => void;
}) {
  const Icon = CATEGORY_ICONS[category];
  const stat = summary?.categories.find((row) => row.category === category);
  const total = stat?.total ?? 0;
  const failed = stat?.failed ?? 0;
  const rate = stat?.successRate ?? 0;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      title={
        total > 0
          ? `${CATEGORY_LABELS[category]} · last ${windowLabel}: ${total.toLocaleString()} requests, ${rate}% ok, ${failed} failed`
          : `${CATEGORY_LABELS[category]} · no traffic in the last ${windowLabel}`
      }
      className={cn(
        "group flex min-w-0 flex-col gap-1 px-2.5 py-1.5 text-left transition-colors",
        SURFACE,
        active
          ? "bg-[var(--op-accent-soft,#EEF2EC)]"
          : "hover:bg-[color-mix(in_srgb,var(--op-accent,#1D4B3B)_4%,var(--op-surface,#FCFAF5))]",
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <Icon
          className={cn("size-3 shrink-0", active ? ACCENT : FAINT)}
          aria-hidden
        />
        <span
          className={cn(
            "truncate text-[10.5px] font-semibold",
            active ? ACCENT : INK,
          )}
        >
          {CATEGORY_LABELS[category]}
        </span>
        <span className={cn("ml-auto font-mono text-[9.5px] tabular-nums", FAINT)}>
          {total > 0 ? total.toLocaleString() : "—"}
        </span>
      </span>
      <span
        className="flex h-1 w-full overflow-hidden bg-[color-mix(in_srgb,var(--op-ink,#121A16)_8%,transparent)]"
        aria-hidden
      >
        <span
          className="bg-[var(--op-accent,#1D4B3B)]"
          style={{ width: `${Math.max(0, Math.min(100, rate))}%` }}
        />
        <span
          className="bg-[var(--op-highlight,#A55237)]"
          style={{ width: `${Math.max(0, Math.min(100, 100 - rate))}%` }}
        />
      </span>
      <span className="flex min-w-0 items-center justify-between gap-1 text-[9.5px] tabular-nums">
        <span className={cn(total > 0 ? MUTED : FAINT)}>
          {total > 0 ? `${rate}% ok` : "no traffic"}
        </span>
        <span className={cn(failed > 0 ? DANGER : FAINT)}>
          {failed > 0 ? `${failed} failed` : ""}
        </span>
      </span>
    </button>
  );
}

function HealthBand({
  summary,
  windowLabel,
  loading,
  p95,
  average,
  sampleSize,
  category,
  filtered,
  onCategoryChange,
}: {
  summary: PlatformRequestLogSummary | null;
  windowLabel: string;
  loading: boolean;
  filtered: boolean;
  p95: number | null;
  average: number | null;
  sampleSize: number;
  category: "all" | PlatformRequestLogCategory;
  onCategoryChange: (value: "all" | PlatformRequestLogCategory) => void;
}) {
  const ready = Boolean(summary);
  const total = summary?.total ?? 0;
  const success = summary?.success ?? 0;
  const expected = summary?.expectedMisses ?? 0;
  const unexpectedFailures = Math.max(0, (summary?.failed ?? 0) - expected);
  const value = (text: string) => (ready ? text : "—");

  return (
    <section
      aria-label={`Traffic health for the last ${windowLabel}`}
      className={cn("overflow-hidden border", HAIRLINE, SURFACE)}
    >
      <div
        className={cn(
          "grid grid-cols-2 gap-px bg-[var(--op-rule,rgba(18,26,22,0.1))] sm:grid-cols-4",
        )}
      >
        <Metric
          label="Requests"
          value={value(total.toLocaleString())}
          sub={
            ready
              ? filtered
                ? "window total · unfiltered"
                : `in the last ${windowLabel}`
              : loading
                ? "loading…"
                : "no data"
          }
        />
        <Metric
          label="Success"
          value={value(`${summary?.successRate ?? 0}%`)}
          sub={value(`${success.toLocaleString()} ok`)}
          valueClassName={ready ? ACCENT : undefined}
        />
        <Metric
          label="Failures"
          value={value(unexpectedFailures.toLocaleString())}
          sub={
            ready
              ? expected > 0
                ? `${expected.toLocaleString()} expected 404s excluded`
                : "expected 404s excluded"
              : "loading…"
          }
          valueClassName={ready && unexpectedFailures > 0 ? DANGER : undefined}
        />
        <Metric
          label="P95 latency"
          value={p95 === null ? "—" : formatDuration(p95)}
          sub={
            sampleSize > 0
              ? `avg ${average === null ? "—" : formatDuration(average)} · ${sampleSize} sampled`
              : "no sample yet"
          }
        />
      </div>

      <div
        role="group"
        aria-label={`Requests by category for the last ${windowLabel}`}
        className={cn(
          "grid grid-cols-2 gap-px border-t bg-[var(--op-rule,rgba(18,26,22,0.1))] sm:grid-cols-3 lg:grid-cols-6",
          HAIRLINE,
        )}
      >
        {CATEGORY_ORDER.map((key) => (
          <CategoryCell
            key={key}
            category={key}
            summary={summary}
            active={category === key}
            windowLabel={windowLabel}
            onSelect={() =>
              onCategoryChange(category === key ? "all" : key)
            }
          />
        ))}
      </div>
    </section>
  );
}

/* ── Stream pieces ─────────────────────────────────────────────────── */

function StreamSkeleton() {
  return (
    <div aria-hidden className={cn("divide-y", DIVIDE_SOFT)}>
      {Array.from({ length: 9 }).map((_, index) => (
        <div key={index} className="flex items-center gap-2.5 px-3 py-2.5">
          <span
            className={cn(
              "h-2.5 w-7 shrink-0 animate-pulse motion-reduce:animate-none",
              SAMPLE,
            )}
          />
          <span
            className={cn(
              "h-2.5 w-8 shrink-0 animate-pulse motion-reduce:animate-none",
              SAMPLE,
            )}
          />
          <span
            className={cn(
              "h-2.5 flex-1 animate-pulse motion-reduce:animate-none",
              SAMPLE,
            )}
          />
          <span
            className={cn(
              "h-2.5 w-10 shrink-0 animate-pulse motion-reduce:animate-none",
              SAMPLE,
            )}
          />
        </div>
      ))}
    </div>
  );
}

function StreamRow({
  row,
  active,
  onSelect,
}: {
  row: PlatformRequestLogRow;
  active: boolean;
  onSelect: () => void;
}) {
  const expected = isExpectedHostLookup(row);
  const failed = isUnexpectedFailure(row);

  return (
    <button
      type="button"
      data-log-row
      aria-current={active ? "true" : undefined}
      onClick={onSelect}
      title={`${row.method} ${row.path}`}
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 px-3 py-2 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--op-accent,#1D4B3B)]",
        active
          ? "bg-[var(--op-accent-soft,#EEF2EC)] shadow-[inset_2px_0_0_var(--op-accent,#1D4B3B)]"
          : "hover:bg-[color-mix(in_srgb,var(--op-ink,#121A16)_3%,transparent)]",
      )}
    >
      <span className="min-w-0">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span
            className={cn(
              "shrink-0 font-mono text-[11px] font-semibold tabular-nums",
              statusTone(row),
            )}
          >
            {row.status}
          </span>
          <span
            className={cn(
              "shrink-0 font-mono text-[9.5px] uppercase tracking-[0.02em]",
              FAINT,
            )}
          >
            {row.method}
          </span>
          <span className={cn("truncate text-[12px] leading-snug", INK)}>
            {row.path}
          </span>
        </span>
        <span
          className={cn(
            "mt-0.5 flex min-w-0 items-center gap-1.5 text-[9.5px]",
            FAINT,
          )}
        >
          <span className="shrink-0 font-mono tabular-nums">
            {formatClock(row.loggedAt)}
          </span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{CATEGORY_LABELS[row.category]}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{tenantLabel(row)}</span>
          {failed ? (
            <>
              <span aria-hidden>·</span>
              <span className={cn("truncate font-medium", DANGER)}>
                {failureTitle(row)}
              </span>
            </>
          ) : expected ? (
            <>
              <span aria-hidden>·</span>
              <span className="shrink-0">expected miss</span>
            </>
          ) : null}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 pt-0.5 font-mono text-[10px] tabular-nums",
          durationTone(row.durationMs),
        )}
      >
        {formatDuration(row.durationMs)}
      </span>
    </button>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Remove filter ${label}`}
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1 border px-1.5 text-[10px] font-semibold transition-colors",
        HAIRLINE,
        MUTED,
        "hover:border-[var(--op-accent,#1D4B3B)] hover:text-[var(--op-accent,#1D4B3B)]",
      )}
    >
      <span className="truncate">{label}</span>
      <X className="size-3 shrink-0" aria-hidden />
    </button>
  );
}

function EmptyStream({
  title,
  body,
  actionLabel,
  onAction,
  good,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  good?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-2 px-5 py-12 text-center">
      <span
        className={cn(
          "flex size-8 items-center justify-center border",
          HAIRLINE,
          good ? ACCENT : FAINT,
        )}
      >
        {good ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Search className="size-4" aria-hidden />
        )}
      </span>
      <p className={cn("text-[12.5px] font-semibold", INK)}>{title}</p>
      <p className={cn("max-w-[22rem] text-[10.5px] leading-relaxed", MUTED)}>
        {body}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "mt-1 h-7 border px-2.5 text-[10.5px] font-semibold transition-colors",
            HAIRLINE,
            ACCENT,
            "hover:border-[var(--op-accent,#1D4B3B)] hover:bg-[var(--op-accent-soft,#EEF2EC)]",
          )}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

/* ── Theatre ───────────────────────────────────────────────────────── */

export type PlatformLogsTheatreProps = {
  sectionId: LogsSectionId;
  onSectionChange: (id: LogsSectionId) => void;
  rows: PlatformRequestLogRow[];
  summary: PlatformRequestLogSummary | null;
  loading: boolean;
  error: string;
  paused: boolean;
  windowLabel: string;
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
  onWidenWindow?: () => void;
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
  onWidenWindow,
}: PlatformLogsTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [includeExpected, setIncludeExpected] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const previousIdsRef = useRef<Set<string>>(new Set());
  const filterKeyRef = useRef("");

  const filterKey = `${category}|${outcome}|${source}|${ip}|${windowLabel}`;

  const withoutExpected = useMemo(
    () => (includeExpected ? rows : rows.filter((row) => !isExpectedHostLookup(row))),
    [rows, includeExpected],
  );

  const searchedRows = useMemo(
    () => searchRows(withoutExpected, searchQuery),
    [withoutExpected, searchQuery],
  );

  const filteredRows = useMemo(
    () =>
      activeGroupKey
        ? searchedRows.filter((row) => failureGroupKey(row) === activeGroupKey)
        : searchedRows,
    [searchedRows, activeGroupKey],
  );

  const groups = useMemo(() => groupFailures(searchedRows), [searchedRows]);

  const activeGroup = useMemo(
    () => groups.find((group) => group.key === activeGroupKey) ?? null,
    [groups, activeGroupKey],
  );

  const hiddenExpected = useMemo(() => countHiddenExpected(rows), [rows]);

  // Latency is a property of the fetched sample, not of the text search — a
  // narrow query must not make the platform look faster or slower.
  const p95 = useMemo(
    () => percentile(withoutExpected.map((row) => row.durationMs), 95),
    [withoutExpected],
  );

  const average = useMemo(() => {
    if (withoutExpected.length === 0) return null;
    const total = withoutExpected.reduce((sum, row) => sum + row.durationMs, 0);
    return Math.round(total / withoutExpected.length);
  }, [withoutExpected]);

  const unexpectedInSample = useMemo(
    () => searchedRows.filter(isUnexpectedFailure).length,
    [searchedRows],
  );

  const serverFiltered =
    category !== "all" || outcome !== "all" || source !== "all" || Boolean(ip);

  const activeFilterCount = [
    category !== "all",
    outcome !== "all",
    source !== "all",
    Boolean(ip),
    Boolean(searchQuery.trim()),
    Boolean(activeGroupKey),
  ].filter(Boolean).length;

  /* New-row awareness: keep the count, drop it when the set changes. */
  useEffect(() => {
    const changed = filterKeyRef.current !== filterKey;
    filterKeyRef.current = filterKey;
    if (changed) setNewCount(0);
    const nextIds = new Set(rows.map((row) => row.id));
    if (!changed && previousIdsRef.current.size > 0) {
      let added = 0;
      for (const id of nextIds) {
        if (!previousIdsRef.current.has(id)) added += 1;
      }
      if (added > 0) setNewCount(added);
    }
    previousIdsRef.current = nextIds;
  }, [rows, filterKey]);

  // A filter change can remove the selected cause from the result set. Drop the
  // stale cause filter then, but keep it when the whole list is empty so the
  // empty state can explain what happened.
  useEffect(() => {
    if (!activeGroupKey || groups.length === 0) return;
    if (!groups.some((group) => group.key === activeGroupKey)) {
      setActiveGroupKey(null);
    }
  }, [groups, activeGroupKey]);

  useEffect(() => {
    if (newCount === 0) return;
    const timer = window.setTimeout(() => setNewCount(0), 12_000);
    return () => window.clearTimeout(timer);
  }, [newCount]);

  /* `/` focuses search, the way every other log console works. */
  useEffect(() => {
    if (sectionId !== "stream") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sectionId]);

  const clearSelection = () => {
    onSelectRow(null);
    if (window.location.hash) {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  };

  const selectSection = (id: LogsSectionId) => {
    if (id === sectionId) return;
    clearSelection();
    setActiveGroupKey(null);
    setNewCount(0);
    onSectionChange(id);
    history.replaceState(null, "", `#${id}`);
  };

  const selectRow = (row: PlatformRequestLogRow) => {
    onSelectRow(row);
    history.replaceState(null, "", `#request-${row.id}`);
  };

  const clearFilters = () => {
    onOutcomeChange("all");
    onCategoryChange("all");
    onSourceChange("all");
    onClearIp();
    onSearchQueryChange("");
    setActiveGroupKey(null);
    setIncludeExpected(false);
  };

  const toggleGroup = (group: FailureGroup) => {
    const next = activeGroupKey === group.key ? null : group.key;
    setActiveGroupKey(next);
    if (next && outcome === "success") onOutcomeChange("failed");
    // On a phone the filter sheet would otherwise hide the rows just filtered.
    if (next && !isLg) setMobileFiltersOpen(false);
  };

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("[data-log-row]"),
    );
    const index = buttons.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    const next = buttons[index + (event.key === "ArrowDown" ? 1 : -1)];
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  const drawerTitle = selectedRow
    ? selectedRow.success
      ? "Request"
      : isExpectedHostLookup(selectedRow)
        ? "Expected 404"
        : "Failed request"
    : "";

  const drawerDescription = selectedRow
    ? `${selectedRow.method} · ${formatClock(selectedRow.loggedAt)} · ${formatDuration(selectedRow.durationMs)}`
    : undefined;

  const chips: { label: string; clear: () => void }[] = [];
  if (outcome !== "all") {
    chips.push({
      label: outcome === "failed" ? "Failed only" : "Successful only",
      clear: () => onOutcomeChange("all"),
    });
  }
  if (category !== "all") {
    chips.push({
      label: CATEGORY_LABELS[category],
      clear: () => onCategoryChange("all"),
    });
  }
  if (source !== "all") {
    chips.push({
      label: "Load test",
      clear: () => onSourceChange("all"),
    });
  }
  if (ip) {
    chips.push({ label: `IP ${ip}`, clear: onClearIp });
  }
  if (activeGroup) {
    chips.push({
      label: `Cause · ${activeGroup.title}`,
      clear: () => setActiveGroupKey(null),
    });
  }
  if (searchQuery.trim()) {
    chips.push({
      label: `“${searchQuery.trim()}”`,
      clear: () => onSearchQueryChange(""),
    });
  }

  const renderRail = () => (
    <div className="flex min-h-0 flex-col">
      <div className={cn("space-y-2 border-b p-2.5", HAIRLINE)}>
        <label className="relative block">
          <Search
            className={cn(
              "pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2",
              FAINT,
            )}
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Path, tenant, status, error…"
            aria-label="Search requests"
            className={cn(
              dashboardInputClass(),
              "h-9 pl-7 pr-7 text-[12px] [&::-webkit-search-cancel-button]:hidden",
            )}
          />
          <kbd
            aria-hidden
            className={cn(
              "pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 border px-1 font-mono text-[9px] sm:block",
              HAIRLINE,
              FAINT,
            )}
          >
            /
          </kbd>
        </label>

        <div
          role="group"
          aria-label="Outcome"
          className={cn("grid grid-cols-3 border", HAIRLINE)}
        >
          {OUTCOMES.map((option, index) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={outcome === option.id}
              onClick={() => onOutcomeChange(option.id)}
              className={cn(
                "h-7 text-[11px] font-semibold transition-colors",
                index > 0 && cn("border-l", HAIRLINE),
                outcome === option.id
                  ? "bg-[var(--op-accent-soft,#EEF2EC)] text-[var(--op-accent,#1D4B3B)]"
                  : cn(SURFACE, MUTED, "hover:text-[var(--op-ink,#121A16)]"),
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("space-y-1.5 border-b p-2.5", HAIRLINE)}>
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={cn(
              "text-[9.5px] font-semibold uppercase tracking-[0.13em]",
              MUTED,
            )}
          >
            Failures
          </p>
          <p className={cn("font-mono text-[9.5px] tabular-nums", FAINT)}>
            {unexpectedInSample} in sample
          </p>
        </div>

        {groups.length === 0 ? (
          <p
            className={cn(
              "flex items-start gap-1.5 border px-2 py-1.5 text-[10.5px]",
              HAIRLINE,
              MUTED,
            )}
          >
            <Check
              className="mt-0.5 size-3 shrink-0 text-[var(--op-accent,#1D4B3B)]"
              aria-hidden
            />
            {loading
              ? "Checking the latest sample…"
              : searchQuery.trim()
                ? "No failures match this search."
                : "No unexpected failures in the latest sample."}
          </p>
        ) : (
          <>
            <ul className={cn("divide-y border", HAIRLINE, DIVIDE_SOFT)}>
              {groups.slice(0, 6).map((group) => {
                const selected = activeGroupKey === group.key;
                return (
                  <li key={group.key}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleGroup(group)}
                      className={cn(
                        "w-full border-l-2 px-2 py-1.5 text-left transition-colors",
                        selected
                          ? "border-[var(--op-accent,#1D4B3B)] bg-[var(--op-accent-soft,#EEF2EC)]"
                          : "border-transparent hover:bg-[color-mix(in_srgb,var(--op-ink,#121A16)_3%,transparent)]",
                      )}
                    >
                      <span className="flex min-w-0 items-baseline gap-1.5">
                        <span
                          className={cn(
                            "shrink-0 font-mono text-[11px] font-semibold tabular-nums",
                            DANGER,
                          )}
                        >
                          {group.status}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-[11.5px] font-semibold",
                            INK,
                          )}
                        >
                          {group.title}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-mono text-[10px] tabular-nums",
                            DANGER,
                          )}
                        >
                          {group.count}×
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block truncate font-mono text-[9.5px]",
                          FAINT,
                        )}
                      >
                        {group.method} {group.pathTemplate}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 flex min-w-0 items-center gap-1 text-[9.5px]",
                          FAINT,
                        )}
                      >
                        <span className="truncate">{tenantSummary(group)}</span>
                        <span aria-hidden>·</span>
                        <span className="shrink-0">
                          {timeAgo(group.lastSeen)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {groups.length > 6 ? (
              <p className={hint()}>
                +{groups.length - 6} more — narrow with the filters below.
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="space-y-2 p-2.5">
        <p
          className={cn(
            "text-[9.5px] font-semibold uppercase tracking-[0.13em]",
            MUTED,
          )}
        >
          Narrow
        </p>

        <div
          role="group"
          aria-label="Traffic source"
          className={cn("grid grid-cols-2 border", HAIRLINE)}
        >
          {(
            [
              { id: "all" as const, label: "All traffic" },
              { id: "loadtest" as const, label: "Load test" },
            ]
          ).map((option, index) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={source === option.id}
              onClick={() => onSourceChange(option.id)}
              className={cn(
                "h-7 text-[10.5px] font-semibold transition-colors",
                index > 0 && cn("border-l", HAIRLINE),
                source === option.id
                  ? "bg-[var(--op-accent-soft,#EEF2EC)] text-[var(--op-accent,#1D4B3B)]"
                  : cn(SURFACE, MUTED, "hover:text-[var(--op-ink,#121A16)]"),
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label
          className={cn(
            "flex cursor-pointer items-center gap-2 text-[10.5px]",
            MUTED,
          )}
        >
          <input
            type="checkbox"
            checked={includeExpected}
            onChange={(event) => setIncludeExpected(event.target.checked)}
            className="size-3.5 shrink-0 accent-[var(--op-accent,#1D4B3B)]"
          />
          <span className="min-w-0 truncate">Show expected 404s</span>
          {hiddenExpected > 0 && !includeExpected ? (
            <span
              className={cn("ml-auto shrink-0 font-mono text-[9.5px]", FAINT)}
            >
              {hiddenExpected} hidden
            </span>
          ) : null}
        </label>

        <div className="flex gap-1">
          <input
            className={cn(dashboardInputClass(), "h-8 flex-1 text-[11px]")}
            value={ipDraft}
            onChange={(event) => onIpDraftChange(event.target.value)}
            placeholder="Filter IP…"
            aria-label="Filter by IP"
            inputMode="text"
            onKeyDown={(event) => {
              if (event.key === "Enter") onApplyIp();
            }}
          />
          <button
            type="button"
            onClick={onApplyIp}
            className={cn(
              "h-8 shrink-0 border px-2 text-[10.5px] font-semibold transition-colors",
              HAIRLINE,
              MUTED,
              "hover:border-[var(--op-accent,#1D4B3B)] hover:text-[var(--op-accent,#1D4B3B)]",
            )}
          >
            Apply
          </button>
          {ip ? (
            <button
              type="button"
              onClick={onClearIp}
              className={cn(
                "h-8 shrink-0 border px-2 text-[10.5px] font-semibold transition-colors",
                HAIRLINE,
                MUTED,
                "hover:border-[var(--op-accent,#1D4B3B)] hover:text-[var(--op-accent,#1D4B3B)]",
              )}
            >
              Clear
            </button>
          ) : null}
        </div>

        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className={cn(
              "inline-flex items-center gap-1 text-[10.5px] font-semibold",
              ACCENT,
              "hover:underline",
            )}
          >
            <X className="size-3" aria-hidden />
            Clear {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
          </button>
        ) : (
          <p className={hint()}>
            Filters apply to the newest 150 requests.{" "}
            <span className="font-mono">/</span> focuses search.
          </p>
        )}
      </div>
    </div>
  );

  const renderStream = (extraClassName?: string) => (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--op-surface,#FCFAF5)]",
        extraClassName,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-1 border-b px-3 py-1.5",
          HAIRLINE,
        )}
      >
        <p className={cn("text-[10.5px]", MUTED)}>
          <span className={cn("font-semibold tabular-nums", INK)}>
            {filteredRows.length}
          </span>{" "}
          shown
          {summary && !serverFiltered ? (
            <>
              {" · "}
              <span className="tabular-nums">
                {summary.total.toLocaleString()}
              </span>{" "}
              in {windowLabel}
            </>
          ) : null}
        </p>
        <span
          aria-hidden
          className="hidden h-3 w-px bg-[color-mix(in_srgb,var(--op-ink,#121A16)_12%,transparent)] sm:block"
        />
        <p className={cn("hidden text-[9.5px] sm:block", FAINT)}>Newest first</p>
        <div className="ml-auto flex items-center gap-1.5">
          {error ? (
            <span className={cn("text-[9.5px] font-semibold", DANGER)}>
              stale
            </span>
          ) : paused ? (
            <span className={cn("font-mono text-[9.5px]", FAINT)}>paused</span>
          ) : loading ? (
            <span className={cn("font-mono text-[9.5px]", FAINT)}>
              refreshing
            </span>
          ) : null}
          {newCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                setNewCount(0);
                listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={cn(
                "inline-flex h-6 items-center gap-1 border px-1.5 text-[10px] font-semibold",
                "border-[var(--op-accent,#1D4B3B)] text-[var(--op-accent,#1D4B3B)]",
                "hover:bg-[var(--op-accent-soft,#EEF2EC)]",
              )}
            >
              {newCount} new
            </button>
          ) : null}
          <span className="sr-only" role="status">
            {newCount > 0 ? `${newCount} new requests` : ""}
          </span>
        </div>
      </div>

      {chips.length > 0 ? (
        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center gap-1 border-b px-3 py-1.5",
            HAIRLINE_SOFT,
          )}
        >
          {chips.map((chip) => (
            <FilterChip
              key={chip.label}
              label={chip.label}
              onClear={chip.clear}
            />
          ))}
        </div>
      ) : null}

      <div
        ref={listRef}
        onKeyDown={onListKeyDown}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {loading && rows.length === 0 ? (
          <StreamSkeleton />
        ) : filteredRows.length > 0 ? (
          <ul aria-label="Request log" className={cn("divide-y", DIVIDE_SOFT)}>
            {filteredRows.map((row) => (
              <li key={row.id}>
                <StreamRow
                  row={row}
                  active={selectedRow?.id === row.id}
                  onSelect={() => selectRow(row)}
                />
              </li>
            ))}
          </ul>
        ) : searchQuery.trim() ? (
          <EmptyStream
            title="No matches in the sample"
            body={`Nothing in the fetched requests matches “${searchQuery.trim()}”. Search and filters apply to that sample, not the whole window.`}
            actionLabel="Clear search"
            onAction={() => onSearchQueryChange("")}
          />
        ) : activeGroupKey ? (
          <EmptyStream
            title="That cause just left the sample"
            body="The last refresh no longer contains a matching row. Clear the cause filter to see the current stream."
            actionLabel="Clear cause"
            onAction={() => setActiveGroupKey(null)}
          />
        ) : outcome === "failed" && rows.length > 0 ? (
          <EmptyStream
            title="No unexpected failures"
            body={`All ${rows.length} fetched request${rows.length === 1 ? "" : "s"} returned 2xx, or only expected host lookups failed.`}
            actionLabel="Show all requests"
            onAction={() => onOutcomeChange("all")}
            good
          />
        ) : category !== "all" ? (
          <EmptyStream
            title={`No ${CATEGORY_LABELS[category]} requests`}
            body={`Nothing in this category reached the API in the last ${windowLabel}.`}
            actionLabel="Clear category"
            onAction={() => onCategoryChange("all")}
          />
        ) : ip ? (
          <EmptyStream
            title={`No requests from ${ip}`}
            body={`Nothing from that address reached the API in the last ${windowLabel}.`}
            actionLabel="Clear IP filter"
            onAction={onClearIp}
          />
        ) : (
          <EmptyStream
            title="No requests in this window"
            body="Nothing reached the API in the selected time range. Widen the window to see older traffic."
            actionLabel={onWidenWindow ? "Widen to 24 hours" : undefined}
            onAction={onWidenWindow}
          />
        )}
      </div>
    </div>
  );

  /* On desktop the panel docks into the third grid column. Wait for that
     column to exist so the first open never flashes as a full-page overlay. */
  const drawerReady = !isLg || Boolean(dockRoot);

  const drawer = (
    <FormDrawer
      open={Boolean(selectedRow) && drawerReady}
      onOpenChange={(open) => {
        if (!open) clearSelection();
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
      {selectedRow ? (
        <div
          className={cn(
            "flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-[var(--op-surface,#FCFAF5)] px-3 py-3 sm:px-4",
            isLg
              ? "h-full"
              : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
          )}
        >
          {drawerBody}
        </div>
      ) : null}
    </FormDrawer>
  );

  if (sectionId !== "stream") {
    return (
      <div className="flex min-h-0 flex-col gap-1.5">
        <SectionTabs sectionId={sectionId} onSectionChange={selectSection} />
        <div className="min-h-0">
          {sectionId === "installs" ? (
            <DesktopInstallLogsPanel />
          ) : (
            <OpsClientLogsPanel
              emptyDescription="When this console cannot reach the API, the technical detail lands here instead of a toast."
              storageNote="Stored on this browser only. Shop tills never toast this detail."
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <SectionTabs sectionId={sectionId} onSectionChange={selectSection} />
      <HealthBand
        summary={summary}
        windowLabel={windowLabel}
        loading={loading}
        p95={p95}
        average={average}
        sampleSize={withoutExpected.length}
        category={category}
        filtered={serverFiltered}
        onCategoryChange={onCategoryChange}
      />

      {/* Desktop: rail · stream · docked detail */}
      <div
        className={cn(
          "hidden min-h-0 overflow-hidden border lg:grid lg:h-[min(66dvh,46rem)]",
          HAIRLINE,
          selectedRow
            ? "lg:grid-cols-[16rem_minmax(0,1fr)_21rem] xl:grid-cols-[17.5rem_minmax(0,1fr)_minmax(22rem,25rem)]"
            : "lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[17.5rem_minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "flex min-h-0 flex-col overflow-y-auto overscroll-contain border-r",
            HAIRLINE,
            SURFACE,
          )}
        >
          {renderRail()}
        </aside>
        {renderStream("min-h-0")}
        {selectedRow ? (
          <div
            ref={setDockRoot}
            className={cn("relative min-h-0 border-l", HAIRLINE, SURFACE)}
          />
        ) : null}
      </div>

      {/* Mobile: collapsible rail above the stream */}
      <div className="flex flex-col gap-1.5 lg:hidden">
        <details
          open={mobileFiltersOpen}
          onToggle={(event) => setMobileFiltersOpen(event.currentTarget.open)}
          className={cn("border", HAIRLINE, SURFACE)}
        >
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden",
            )}
          >
            <Filter className={cn("size-3.5", FAINT)} aria-hidden />
            <span className="text-[11px] font-semibold">Filters and failures</span>
            {activeFilterCount > 0 ? (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center px-1 font-mono text-[9.5px]",
                  "bg-[var(--op-accent-soft,#EEF2EC)] text-[var(--op-accent,#1D4B3B)]",
                )}
              >
                {activeFilterCount}
              </span>
            ) : null}
            <span className={cn("ml-auto text-[10px] tabular-nums", FAINT)}>
              {groups.length === 0
                ? "no causes"
                : `${groups.length} cause${groups.length === 1 ? "" : "s"}`}
            </span>
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 transition-transform",
                FAINT,
                mobileFiltersOpen && "rotate-90",
              )}
              aria-hidden
            />
          </summary>
          <div
            className={cn(
              "max-h-[min(60dvh,36rem)] overflow-y-auto overscroll-contain border-t",
              HAIRLINE,
            )}
          >
            {renderRail()}
          </div>
        </details>

        <div className={cn("min-h-0 overflow-hidden border", HAIRLINE)}>
          {renderStream("max-h-[68dvh]")}
        </div>
      </div>

      {drawer}
    </div>
  );
}
