"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { FormDrawer } from "@/components/form-drawer";
import { OpsClientLogsPanel } from "@/components/ops-client-logs-panel";
import { useMediaLg } from "@/hooks/use-media-lg";
import {
  clockFor,
  compareLine,
  diaryCsv,
  findStreaks,
  groupKeyFor,
  isNeedsLookEvent,
  NEEDS_LOOK_TYPES,
  parseDiaryQuery,
  parseJsonObject,
  PULSE_CHIPS,
  pulseSentence,
  rowMatchesText,
  storyFor,
  streakSentence,
  type DiaryStreak,
  type Story,
  type StoryTone,
} from "@/lib/activity-stories";
import {
  fetchAuditEvents,
  fetchAuditEventSummary,
  type AuditEventFilters,
  type AuditEventRecord,
  type AuditEventSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/*
 * The shop diary. Three layers, top to bottom:
 *   1. Today's pulse — one sentence, attention chips only when non-zero.
 *   2. The feed — plain-English rows grouped by day and time of day.
 *   3. The forensic drawer — everything about one row, JSON included.
 * Operator-shell materials (DESIGN.md): ivory ground, paper surface, hairline
 * rules, Cormorant for the diary voice, forest for the one action, terracotta
 * only where attention is due.
 */

const PAGE_SIZE = 100;
const POLL_MS = 20_000;

const INK = "text-[var(--order-ink,#121a16)]";
const MUTE =
  "text-[color-mix(in_srgb,var(--order-ink,#121a16)_58%,transparent)]";
const FAINT =
  "text-[color-mix(in_srgb,var(--order-ink,#121a16)_42%,transparent)]";
const HAIR =
  "border-[color-mix(in_srgb,var(--order-ink,#121a16)_11%,transparent)]";
const SURFACE = cn(
  "relative overflow-hidden rounded-[2px] border bg-[var(--op-surface,#fcfaf5)]",
  HAIR,
  "before:pointer-events-none before:absolute before:inset-0 before:bg-[url('/textures/paper-grain.png')] before:bg-repeat before:bg-[length:220px_220px] before:opacity-[0.045] before:content-['']",
);
const SERIF =
  "font-[family-name:var(--font-cormorant),Georgia,'Times_New_Roman',serif]";
const EASE =
  "transition-[color,background-color,border-color,opacity,transform] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1d4b3b)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--op-bg,#f4f1ea)]";
const SCROLLBAR =
  "[scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--order-ink,#121a16)_26%,transparent)_transparent]";

type Period = "today" | "yesterday" | "7d" | "30d" | "custom";
type Preset = "attention" | "everything";

const PERIODS: { id: Period; label: string; word: string }[] = [
  { id: "today", label: "Today", word: "today" },
  { id: "yesterday", label: "Yesterday", word: "yesterday" },
  { id: "7d", label: "7 days", word: "this week" },
  { id: "30d", label: "30 days", word: "this month" },
  { id: "custom", label: "Custom", word: "in this period" },
];

/** The "Needs a look" preset: the trust set plus hard failures the owner should know about. */
const ATTENTION_TYPES: string[] = [
  ...NEEDS_LOOK_TYPES,
  "stk_push.failed",
  "order.payment_failed",
  "webhook.failed",
  "system.exception",
  "backup.failed",
  "import_job.failed",
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function periodRange(
  period: Period,
  custom: { from: string; to: string },
  now = new Date(),
): { from: Date; to: Date | null } | null {
  if (period === "today") return { from: startOfDay(now), to: null };
  if (period === "yesterday") {
    const to = startOfDay(now);
    const from = new Date(to);
    from.setDate(to.getDate() - 1);
    return { from, to: new Date(to.getTime() - 1) };
  }
  if (period === "7d") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to: null };
  }
  if (period === "30d") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 29);
    return { from, to: null };
  }
  if (!custom.from || !custom.to) return null;
  const from = new Date(`${custom.from}T00:00:00`);
  const to = new Date(`${custom.to}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return { from, to };
}

function shiftWeek(range: { from: Date; to: Date | null }, now = new Date()) {
  const from = new Date(range.from);
  from.setDate(from.getDate() - 7);
  const to = new Date(range.to ?? now);
  to.setDate(to.getDate() - 7);
  return { from, to };
}

function toneDotClass(tone: StoryTone): string {
  if (tone === "alarm") return "bg-[#9a2e16]";
  if (tone === "firm") return "bg-[#a55237]";
  return "bg-[color-mix(in_srgb,var(--order-ink,#121a16)_22%,transparent)]";
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

// ── Small pieces ─────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  children,
  tone,
  title,
  quiet,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: StoryTone;
  title?: string;
  /** Period / view chips — underline instead of filled block. */
  quiet?: boolean;
}) {
  const alarm = tone === "alarm";
  if (quiet) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-pressed={active}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 border-b-2 px-1.5 text-[12.5px] font-semibold tracking-[-0.01em] sm:h-8",
          EASE,
          FOCUS,
          "focus-visible:ring-offset-0",
          active
            ? alarm
              ? "border-[#9a2e16] text-[#9a2e16]"
              : "border-[var(--pos-primary,#1d4b3b)] text-[var(--pos-primary,#1d4b3b)]"
            : cn(
                "border-transparent",
                alarm ? "text-[#9a2e16]/80" : MUTE,
                "hover:text-[var(--order-ink,#121a16)]",
              ),
        )}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-semibold tabular-nums tracking-[0.01em] sm:h-7",
        EASE,
        FOCUS,
        active
          ? alarm
            ? "bg-[#9a2e16] text-white"
            : "bg-[var(--pos-primary,#1d4b3b)] text-white"
          : cn(
              "ring-1 ring-inset",
              alarm
                ? "text-[#9a2e16] ring-[#9a2e16]/30 hover:bg-[#9a2e16]/[0.06]"
                : cn(MUTE, "ring-[color-mix(in_srgb,var(--order-ink,#121a16)_14%,transparent)] hover:text-[var(--order-ink,#121a16)] hover:ring-[color-mix(in_srgb,var(--order-ink,#121a16)_28%,transparent)]"),
            ),
      )}
    >
      {children}
    </button>
  );
}

function ToolButton({
  onClick,
  children,
  disabled,
  title,
  active,
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-[2px] px-2.5 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-8",
        EASE,
        FOCUS,
        active
          ? "bg-[color-mix(in_srgb,var(--pos-primary,#1d4b3b)_10%,transparent)] text-[var(--pos-primary,#1d4b3b)]"
          : cn(MUTE, "hover:bg-[color-mix(in_srgb,var(--order-ink,#121a16)_4%,transparent)] hover:text-[var(--order-ink,#121a16)]"),
      )}
    >
      {children}
    </button>
  );
}

function StoryLine({ story, className }: { story: Story; className?: string }) {
  return (
    <span className={className}>
      {story.parts.map((p, i) => (
        <span
          key={i}
          className={cn(
            p.kind === "actor" && cn("font-semibold", INK),
            p.kind === "target" && cn("font-medium", INK),
            p.kind === "money" && cn("font-semibold tabular-nums", INK),
            p.kind === "muted" && FAINT,
          )}
        >
          {p.text}
        </span>
      ))}
    </span>
  );
}

function FeedSkeleton() {
  return (
    <div aria-hidden className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#121a16)_7%,transparent)]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3.5 px-4 py-3.5 sm:px-5">
          <div className="mt-0.5 h-3 w-11 animate-pulse rounded-sm bg-[color-mix(in_srgb,var(--order-ink,#121a16)_8%,transparent)]" />
          <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--order-ink,#121a16)_12%,transparent)]" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <div
              className="h-3.5 animate-pulse rounded-sm bg-[color-mix(in_srgb,var(--order-ink,#121a16)_8%,transparent)]"
              style={{ width: `${48 + ((i * 13) % 36)}%` }}
            />
            {i % 3 === 0 ? (
              <div className="h-2.5 w-24 animate-pulse rounded-sm bg-[color-mix(in_srgb,var(--order-ink,#121a16)_5%,transparent)]" />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Detail drawer ────────────────────────────────────────────────────

function Fact({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  if (value == null || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className={cn("text-[11px] font-semibold", MUTE)}>{label}</dt>
      <dd className={cn("mt-0.5 break-words text-[13px]", INK, mono && "font-mono text-[12px]")}>
        {value}
      </dd>
    </div>
  );
}

function StateTable({ label, before, after }: { label: string; before: Record<string, unknown>; after: Record<string, unknown> }) {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  if (keys.length === 0) return null;
  return (
    <div>
      <p className={cn("text-[11px] font-semibold", MUTE)}>{label}</p>
      <table className="mt-1.5 w-full border-collapse text-[12px]">
        <tbody className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#121a16)_8%,transparent)]">
          {keys.map((k) => {
            const b = before[k];
            const a = after[k];
            const changed = JSON.stringify(b) !== JSON.stringify(a);
            return (
              <tr key={k}>
                <td className={cn("py-1 pr-3 align-top font-mono text-[11px]", MUTE)}>{k}</td>
                <td className={cn("py-1 pr-3 align-top tabular-nums", changed ? "line-through opacity-60" : "")}>
                  {b == null ? "—" : String(b)}
                </td>
                <td className={cn("py-1 align-top font-medium tabular-nums", changed && INK)}>
                  {a == null ? "—" : String(a)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RawJson({ label, raw }: { label: string; raw: string | null }) {
  if (!raw?.trim()) return null;
  let pretty = raw;
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    /* keep raw */
  }
  return (
    <details className="group">
      <summary className={cn("cursor-pointer select-none text-[11px] font-semibold", MUTE, "hover:text-[var(--pos-primary,#1d4b3b)]")}>
        {label}
      </summary>
      <pre
        className={cn(
          "mt-1.5 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-[2px] border bg-[color-mix(in_srgb,var(--order-ink,#121a16)_3%,transparent)] p-2.5 font-mono text-[11px] leading-relaxed",
          HAIR,
          INK,
          SCROLLBAR,
        )}
      >
        {pretty}
      </pre>
    </details>
  );
}

function EventDetailBody({
  event,
  branchName,
}: {
  event: AuditEventRecord;
  branchName: string | null;
}) {
  const story = storyFor(event);
  const before = parseJsonObject(event.oldState);
  const after = parseJsonObject(event.newState);
  const when = new Date(event.createdAt);
  return (
    <div className="space-y-5 px-4 py-5 sm:px-5">
      <div>
        <p className={cn(SERIF, "text-[1.35rem] font-normal leading-snug tracking-[-0.01em]", INK)}>
          <StoryLine story={story} />
        </p>
        <p className={cn("mt-2 font-mono text-[11px] tabular-nums tracking-[0.02em]", MUTE)}>
          {Number.isNaN(when.getTime())
            ? event.createdAt
            : when.toLocaleString("en-KE", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
        </p>
        {story.link ? (
          <Link
            href={story.link.href}
            className={cn(
              "mt-4 inline-flex h-9 items-center gap-1.5 rounded-[2px] bg-[var(--pos-primary,#1d4b3b)] px-3 text-[12px] font-semibold text-white hover:bg-[var(--kiosk-gold-hover,#163b2e)] sm:h-8",
              EASE,
              FOCUS,
            )}
          >
            {story.link.label}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      {event.reason ? (
        <div>
          <p className={cn("text-[11px] font-semibold", MUTE)}>Reason</p>
          <p className={cn("mt-0.5 text-[13px] leading-relaxed", INK)}>{event.reason}</p>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Fact label="Who" value={event.actorName ?? event.actorId ?? "—"} />
        <Fact label="Acting as" value={event.actorType.toLowerCase().replace("_", " ")} />
        <Fact label="About" value={event.targetName ?? event.targetLabel ?? event.targetId} />
        <Fact label="Branch" value={branchName ?? event.branchId} />
        <Fact label="Where" value={event.source?.replace("_", " ")} />
        <Fact label="Till" value={event.terminalId} mono />
        <Fact label="Shift" value={event.shiftId ? event.shiftId.slice(-8).toUpperCase() : null} mono />
        <Fact label="IP address" value={event.ipAddress} mono />
        <Fact label="Event" value={event.eventType} mono />
        <Fact label="Severity" value={event.severity.toLowerCase()} />
        <Fact label="Correlation" value={event.correlationId} mono />
        <Fact label="Session" value={event.sessionId ? event.sessionId.slice(-8).toUpperCase() : null} mono />
      </dl>

      {event.userAgent ? (
        <p className={cn("break-all font-mono text-[11px]", FAINT)}>{event.userAgent}</p>
      ) : null}

      <StateTable label="Before → after" before={before} after={after} />

      <div className="space-y-2">
        <RawJson label="Metadata (JSON)" raw={event.metadata} />
        <RawJson label="Diff (JSON)" raw={event.diff} />
      </div>
    </div>
  );
}

// ── The diary ────────────────────────────────────────────────────────

export function ShopDiary() {
  const { branches, branchId: headerBranchId, me } = useDashboard();
  const isLg = useMediaLg();

  const [period, setPeriod] = useState<Period>("today");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [branchId, setBranchId] = useState<string>(headerBranchId ?? "");
  const [preset, setPreset] = useState<Preset>("attention");
  const [chipId, setChipId] = useState<string | null>(null);
  const [actorId, setActorId] = useState<string | null>(null);
  const [showRoutine, setShowRoutine] = useState(false);
  const [query, setQuery] = useState("");

  const [rows, setRows] = useState<AuditEventRecord[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AuditEventSummary | null>(null);
  const [lastWeek, setLastWeek] = useState<AuditEventSummary | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const branchLocked = Boolean(me?.branchId?.trim());
  useEffect(() => {
    if (branchLocked && me?.branchId) setBranchId(me.branchId);
  }, [branchLocked, me?.branchId]);

  const branchNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const b of branches) m[b.id] = b.name;
    return m;
  }, [branches]);

  const parsedQuery = useMemo(() => parseDiaryQuery(query), [query]);
  const effectivePeriod: Period = parsedQuery.period ?? period;
  const range = useMemo(
    () => periodRange(effectivePeriod, custom),
    [effectivePeriod, custom],
  );
  const periodWord = PERIODS.find((p) => p.id === effectivePeriod)?.word ?? "in this period";

  const chip = chipId ? PULSE_CHIPS.find((c) => c.id === chipId) ?? null : null;

  /** Server-side filters for the list. The pulse summary uses the same window with no type filter. */
  const listFilters = useMemo<Omit<AuditEventFilters, "page" | "size"> | null>(() => {
    if (!range) return null;
    const f: Omit<AuditEventFilters, "page" | "size"> = {
      branchId: branchId || null,
      from: range.from.toISOString(),
      to: range.to ? range.to.toISOString() : null,
      actorId,
    };
    if (parsedQuery.eventTypes.length > 0) {
      f.eventTypes = parsedQuery.eventTypes;
    } else if (chip) {
      f.eventTypes = [...chip.types];
    } else if (preset === "attention") {
      f.eventTypes = ATTENTION_TYPES;
    }
    return f;
  }, [range, branchId, actorId, parsedQuery.eventTypes, chip, preset]);

  const load = useCallback(
    async (opts: { silent?: boolean; append?: boolean; nextPage?: number } = {}) => {
      if (!listFilters) {
        setRows([]);
        setLoading(false);
        return;
      }
      const nextPage = opts.nextPage ?? 0;
      if (opts.append) setLoadingMore(true);
      else if (opts.silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await fetchAuditEvents({ ...listFilters, page: nextPage, size: PAGE_SIZE });
        if (opts.append) {
          setRows((prev) => {
            const seen = new Set(prev.map((r) => r.id));
            const merged = [...prev, ...result.content.filter((r) => !seen.has(r.id))];
            knownIds.current = new Set(merged.map((r) => r.id));
            return merged;
          });
        } else {
          if (opts.silent) {
            const fresh = new Set<string>();
            for (const r of result.content) if (!knownIds.current.has(r.id)) fresh.add(r.id);
            if (fresh.size > 0 && knownIds.current.size > 0) {
              setNewIds(fresh);
              window.setTimeout(() => setNewIds(new Set()), 6_000);
            }
          }
          knownIds.current = new Set(result.content.map((r) => r.id));
          setRows(result.content);
        }
        setPage(nextPage);
        setHasMore(!result.last);
        setTotal(result.totalElements);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load the diary.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [listFilters],
  );

  useEffect(() => {
    knownIds.current = new Set();
    setSelectedId(null);
    void load();
  }, [load]);

  // Pulse counts: whole window, no type filter, plus the same window a week earlier.
  useEffect(() => {
    if (!range) {
      setSummary(null);
      setLastWeek(null);
      return;
    }
    let cancelled = false;
    const base = {
      branchId: branchId || null,
      from: range.from.toISOString(),
      to: range.to ? range.to.toISOString() : null,
    };
    const prev = shiftWeek(range);
    void Promise.all([
      fetchAuditEventSummary(base),
      fetchAuditEventSummary({ ...base, from: prev.from.toISOString(), to: prev.to.toISOString() }),
    ])
      .then(([now, before]) => {
        if (cancelled) return;
        setSummary(now);
        setLastWeek(before);
      })
      .catch(() => {
        /* the pulse is a convenience; the feed still works */
      });
    return () => {
      cancelled = true;
    };
  }, [range, branchId]);

  const isLive = effectivePeriod === "today";
  useEffect(() => {
    if (!isLive || loading || page !== 0) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [isLive, loading, page, load]);

  // ── Derived ──
  const stories = useMemo(() => {
    const m = new Map<string, Story>();
    for (const r of rows) m.set(r.id, storyFor(r));
    return m;
  }, [rows]);

  const visible = useMemo(() => {
    return rows.filter((r) => {
      const story = stories.get(r.id)!;
      if (!showRoutine && story.routine && preset === "everything" && !chip && parsedQuery.eventTypes.length === 0) {
        return false;
      }
      if (parsedQuery.terminal && !(r.terminalId ?? "").toLowerCase().includes(parsedQuery.terminal)) {
        return false;
      }
      return rowMatchesText(r, story, parsedQuery.text);
    });
  }, [rows, stories, showRoutine, preset, chip, parsedQuery]);

  const groups = useMemo(() => {
    const now = new Date();
    const out: { key: string; day: string; daypart: string; items: AuditEventRecord[] }[] = [];
    for (const r of visible) {
      const g = groupKeyFor(r.createdAt, now);
      const last = out[out.length - 1];
      if (last && last.key === g.key) last.items.push(r);
      else out.push({ key: g.key, day: g.day, daypart: g.daypart, items: [r] });
    }
    return out;
  }, [visible]);

  const people = useMemo(() => {
    const m = new Map<string, { name: string; count: number }>();
    for (const r of rows) {
      if (!r.actorId || r.actorType !== "USER") continue;
      if (!isNeedsLookEvent(r)) continue;
      const name = r.actorName?.trim() || r.actorId.slice(-6).toUpperCase();
      const cur = m.get(r.actorId);
      m.set(r.actorId, { name, count: (cur?.count ?? 0) + 1 });
    }
    return [...m.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [rows]);

  const streaks = useMemo<DiaryStreak[]>(() => findStreaks(rows), [rows]);

  const chipCounts = useMemo(() => {
    const by = summary?.byEventType ?? {};
    return PULSE_CHIPS.map((c) => ({
      ...c,
      count: c.types.reduce((n, t) => n + (by[t] ?? 0), 0),
      before: c.types.reduce((n, t) => n + (lastWeek?.byEventType?.[t] ?? 0), 0),
    })).filter((c) => c.count > 0 || c.id === chipId);
  }, [summary, lastWeek, chipId]);

  const attentionCount = useMemo(() => {
    const by = summary?.byEventType ?? {};
    return ATTENTION_TYPES.reduce((n, t) => n + (by[t] ?? 0), 0);
  }, [summary]);

  const attentionBefore = useMemo(() => {
    const by = lastWeek?.byEventType ?? {};
    return ATTENTION_TYPES.reduce((n, t) => n + (by[t] ?? 0), 0);
  }, [lastWeek]);

  const compare = useMemo(() => {
    if (!summary || !lastWeek) return null;
    const voids = chipCounts.find((c) => c.id === "voids");
    if (voids && (voids.count > 0 || voids.before > 0)) {
      return compareLine("Voids", voids.count, voids.before);
    }
    return compareLine("Things needing a look", attentionCount, attentionBefore);
  }, [summary, lastWeek, chipCounts, attentionCount, attentionBefore]);

  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null;

  const exportCsv = useCallback(async () => {
    if (!listFilters || exporting) return;
    setExporting(true);
    try {
      const all: AuditEventRecord[] = [];
      for (let p = 0; p < 20; p++) {
        const r = await fetchAuditEvents({ ...listFilters, page: p, size: 200 });
        all.push(...r.content);
        if (r.last) break;
      }
      const from = listFilters.from?.slice(0, 10) ?? "start";
      const to = (listFilters.to ?? new Date().toISOString()).slice(0, 10);
      downloadText(`shop-diary_${from}_${to}.csv`, diaryCsv(all, branchNames), "text/csv;charset=utf-8");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export the diary.");
    } finally {
      setExporting(false);
    }
  }, [listFilters, exporting, branchNames]);

  const clearNarrowing = () => {
    setChipId(null);
    setActorId(null);
    setQuery("");
  };
  const narrowed = Boolean(chipId || actorId || query.trim());

  // ── Render ──
  const pulse = (
    <section className={SURFACE}>
      <div
        className={cn(
          "flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-5",
          HAIR,
        )}
      >
        <div role="group" aria-label="Period" className="flex flex-wrap gap-x-3 gap-y-0">
          {PERIODS.map((p) => (
            <Chip
              key={p.id}
              quiet
              active={effectivePeriod === p.id}
              onClick={() => {
                setPeriod(p.id);
                if (parsedQuery.period) setQuery("");
              }}
            >
              {p.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {period === "custom" ? (
            <>
              <input
                type="date"
                aria-label="From"
                value={custom.from}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                className={cn(dashboardInputClass(), "w-auto")}
              />
              <input
                type="date"
                aria-label="To"
                value={custom.to}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                className={cn(dashboardInputClass(), "w-auto")}
              />
            </>
          ) : null}
          {branches.length > 1 ? (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={branchLocked}
              aria-label="Branch"
              className={cn(dashboardSelectClass(), "w-auto min-w-[9rem]")}
            >
              <option value="">All branches</option>
              {branches
                .filter((b) => !branchLocked || b.id === me?.branchId)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          ) : null}
        </div>
      </div>

      <div className="relative px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        {!range ? (
          <p className={cn(SERIF, "text-[1.5rem] leading-snug", MUTE)}>
            Choose a start and end date.
          </p>
        ) : summary == null ? (
          <div className="space-y-2">
            <div className="h-8 w-[min(100%,22rem)] animate-pulse rounded-sm bg-[color-mix(in_srgb,var(--order-ink,#121a16)_7%,transparent)]" />
            <div className="h-3 w-40 animate-pulse rounded-sm bg-[color-mix(in_srgb,var(--order-ink,#121a16)_5%,transparent)]" />
          </div>
        ) : (
          <>
            <p
              className={cn(
                SERIF,
                "max-w-[28rem] text-[1.75rem] font-normal leading-[1.15] tracking-[-0.02em] sm:text-[2rem]",
                INK,
              )}
            >
              {pulseSentence(attentionCount, periodWord)}
            </p>
            <p className={cn("mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]", MUTE)}>
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--pos-primary,#1d4b3b)]">
                  <span
                    className="size-1.5 rounded-full bg-[var(--pos-primary,#1d4b3b)] motion-safe:animate-pulse"
                    aria-hidden
                  />
                  Live
                </span>
              ) : null}
              {isLive && summary.total > 0 ? <span aria-hidden>·</span> : null}
              {summary.total > 0 ? (
                <span>
                  {summary.total.toLocaleString("en-KE")} entr
                  {summary.total === 1 ? "y" : "ies"} in all
                </span>
              ) : null}
              {compare ? (
                <>
                  {(isLive || summary.total > 0) ? <span aria-hidden>·</span> : null}
                  <span>{compare}</span>
                </>
              ) : null}
            </p>
          </>
        )}

        {chipCounts.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Attention">
            {chipCounts.map((c) => (
              <Chip
                key={c.id}
                tone={c.tone}
                active={chipId === c.id}
                onClick={() => setChipId((cur) => (cur === c.id ? null : c.id))}
                title={
                  c.before > 0 || c.count > 0
                    ? `${c.before} the same period last week`
                    : undefined
                }
              >
                <span className="tabular-nums">{c.count}</span>
                <span className="font-medium">{c.label}</span>
              </Chip>
            ))}
          </div>
        ) : null}

        {streaks.length > 0 ? (
          <ul
            className={cn(
              "mt-4 divide-y border-t",
              HAIR,
              "divide-[color-mix(in_srgb,var(--order-ink,#121a16)_8%,transparent)]",
            )}
          >
            {streaks.slice(0, 3).map((s) => (
              <li
                key={`${s.actorId}-${s.eventType}`}
                className="flex items-center gap-2.5 py-2.5 text-[13px] leading-snug"
              >
                <Eye className="size-3.5 shrink-0 text-[#a55237]" aria-hidden />
                <span className={cn("min-w-0 flex-1", INK)}>{streakSentence(s)}</span>
                <span className={cn("shrink-0 font-mono text-[11px] tabular-nums", FAINT)}>
                  {clockFor(s.firstAt)}–{clockFor(s.lastAt)}
                </span>
                {s.actorId ? (
                  <button
                    type="button"
                    onClick={() => setActorId(s.actorId)}
                    className={cn(
                      "shrink-0 text-[12px] font-semibold text-[var(--pos-primary,#1d4b3b)] underline-offset-2 hover:underline",
                      FOCUS,
                    )}
                  >
                    See theirs
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );

  const feed = (
    <section className={cn(SURFACE, "flex min-h-0 flex-1 flex-col")}>
      <div className={cn("space-y-3 border-b px-4 py-3.5 sm:px-5", HAIR)}>
        <div className="relative">
          <Search
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2",
              FAINT,
            )}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask the diary — voids yesterday, Faith password, M-Pesa fails…"
            aria-label="Ask the diary"
            className={cn(
              dashboardInputClass(),
              "h-11 border-transparent bg-[color-mix(in_srgb,var(--order-ink,#121a16)_3.5%,transparent)] pl-9 pr-9 sm:h-9",
              "placeholder:text-[color-mix(in_srgb,var(--order-ink,#121a16)_38%,transparent)]",
              "focus-visible:border-[var(--pos-primary,#1d4b3b)] focus-visible:bg-[var(--op-surface,#fcfaf5)]",
            )}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 rounded-[2px] p-1",
                FAINT,
                "hover:text-[var(--order-ink,#121a16)]",
                FOCUS,
              )}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div role="group" aria-label="View" className="flex gap-x-3">
            <Chip
              quiet
              active={
                preset === "attention" &&
                !chip &&
                parsedQuery.eventTypes.length === 0
              }
              onClick={() => {
                setPreset("attention");
                setChipId(null);
              }}
            >
              Needs a look
            </Chip>
            <Chip
              quiet
              active={
                preset === "everything" &&
                !chip &&
                parsedQuery.eventTypes.length === 0
              }
              onClick={() => {
                setPreset("everything");
                setChipId(null);
              }}
            >
              Everything
            </Chip>
          </div>
          {people.length > 0 ? (
            <>
              <span
                aria-hidden
                className="mx-1.5 hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#121a16)_12%,transparent)] sm:block"
              />
              {people.map((p) => (
                <Chip
                  key={p.id}
                  active={actorId === p.id}
                  onClick={() =>
                    setActorId((cur) => (cur === p.id ? null : p.id))
                  }
                  title={`${p.count} on this page`}
                >
                  {p.name}
                  <span
                    className={cn(
                      "tabular-nums",
                      actorId === p.id ? "opacity-80" : FAINT,
                    )}
                  >
                    {p.count}
                  </span>
                </Chip>
              ))}
            </>
          ) : null}
          <label
            className={cn(
              "ml-auto inline-flex h-8 cursor-pointer select-none items-center gap-1.5 text-[12px]",
              MUTE,
            )}
          >
            <input
              type="checkbox"
              checked={showRoutine}
              onChange={(e) => setShowRoutine(e.target.checked)}
              className="size-3.5 accent-[var(--pos-primary,#1d4b3b)]"
            />
            Show routine
          </label>
        </div>
        {narrowed ? (
          <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]", MUTE)}>
            Showing
            {chip ? (
              <span className={cn("font-medium", INK)}>{chip.label.toLowerCase()}</span>
            ) : null}
            {actorId ? (
              <span className={cn("font-medium", INK)}>
                by {people.find((p) => p.id === actorId)?.name ?? "one person"}
              </span>
            ) : null}
            {query.trim() ? (
              <span className={cn("font-medium", INK)}>
                matching “{query.trim()}”
              </span>
            ) : null}
            <button
              type="button"
              onClick={clearNarrowing}
              className={cn(
                "font-semibold text-[var(--pos-primary,#1d4b3b)] underline-offset-2 hover:underline",
                FOCUS,
              )}
            >
              Clear
            </button>
          </p>
        ) : null}
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto", SCROLLBAR)}>
        {loading ? (
          <FeedSkeleton />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-full border",
                HAIR,
              )}
            >
              <BookOpen className={cn("size-5", FAINT)} aria-hidden />
            </div>
            <p className={cn(SERIF, "mt-4 text-[1.45rem] leading-snug", INK)}>
              {!range
                ? "Pick a period"
                : narrowed
                  ? "Nothing matches that"
                  : rows.length > 0 && !showRoutine
                    ? "Only routine sales so far"
                    : "Quiet shop so far"}
            </p>
            <p className={cn("mx-auto mt-1.5 max-w-[22rem] text-[13px] leading-relaxed", MUTE)}>
              {!range
                ? "Choose a start and end date above."
                : narrowed
                  ? "Try fewer words, or clear the filters."
                  : rows.length > 0 && !showRoutine
                    ? "Tick “Show routine” to see completions and sign-ins."
                    : "Voids, password changes, cleared sales and drawer corrections will show up here."}
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.key}>
              <div
                className={cn(
                  "sticky top-0 z-10 flex items-baseline gap-2.5 border-b px-4 py-2 backdrop-blur-[6px] sm:px-5",
                  "bg-[color-mix(in_srgb,var(--op-surface,#fcfaf5)_92%,transparent)]",
                  HAIR,
                )}
              >
                <span className={cn(SERIF, "text-[1.05rem] leading-none", INK)}>
                  {g.day}
                </span>
                <span className={cn("text-[11.5px] font-medium uppercase tracking-[0.06em]", FAINT)}>
                  {g.daypart}
                </span>
                <span
                  className={cn(
                    "ml-auto font-mono text-[11px] tabular-nums",
                    FAINT,
                  )}
                >
                  {g.items.length}
                </span>
              </div>
              <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#121a16)_7%,transparent)]">
                {g.items.map((r) => {
                  const story = stories.get(r.id)!;
                  const active = selectedId === r.id;
                  const isNew = newIds.has(r.id);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedId((cur) => (cur === r.id ? null : r.id))
                        }
                        aria-expanded={active}
                        className={cn(
                          "group flex w-full items-start gap-3.5 px-4 py-3 text-left sm:px-5 sm:py-3.5",
                          EASE,
                          FOCUS,
                          "focus-visible:ring-inset focus-visible:ring-offset-0",
                          active
                            ? "bg-[color-mix(in_srgb,var(--pos-primary,#1d4b3b)_7%,transparent)]"
                            : "hover:bg-[color-mix(in_srgb,var(--order-ink,#121a16)_2.5%,transparent)]",
                          isNew &&
                            "bg-[color-mix(in_srgb,var(--pos-primary,#1d4b3b)_9%,transparent)]",
                        )}
                      >
                        <time
                          dateTime={r.createdAt}
                          className={cn(
                            "w-12 shrink-0 pt-0.5 font-mono text-[11.5px] tabular-nums tracking-[0.02em]",
                            MUTE,
                          )}
                        >
                          {clockFor(r.createdAt)}
                        </time>
                        <span
                          className={cn(
                            "mt-2 size-1.5 shrink-0 rounded-full",
                            toneDotClass(story.tone),
                          )}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-[13.5px] leading-[1.45]",
                            MUTE,
                          )}
                        >
                          <StoryLine story={story} />
                          {branchId === "" &&
                          branches.length > 1 &&
                          r.branchId ? (
                            <span className={cn("ml-1.5 text-[11px]", FAINT)}>
                              {branchNames[r.branchId] ?? ""}
                            </span>
                          ) : null}
                        </span>
                        <ChevronRight
                          className={cn(
                            "mt-1 size-3.5 shrink-0 opacity-0",
                            FAINT,
                            EASE,
                            "group-hover:opacity-100 group-focus-visible:opacity-100",
                            active && "rotate-90 opacity-100",
                          )}
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
        {!loading && hasMore ? (
          <div className={cn("border-t px-4 py-3.5 text-center", HAIR)}>
            <ToolButton
              onClick={() => void load({ append: true, nextPage: page + 1 })}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              Older entries
              <span className={cn("font-mono tabular-nums", FAINT)}>
                {rows.length.toLocaleString("en-KE")} of{" "}
                {total.toLocaleString("en-KE")}
              </span>
            </ToolButton>
          </div>
        ) : null}
      </div>
    </section>
  );

  const detailAside =
    isLg && selected ? (
      <aside className={cn(SURFACE, "flex min-h-0 flex-col")}>
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-5",
            HAIR,
          )}
        >
          <h2 className={cn(SERIF, "text-[1.15rem] leading-none", INK)}>
            Entry
          </h2>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            aria-label="Close entry"
            className={cn(
              "rounded-[2px] p-1",
              FAINT,
              "hover:text-[var(--order-ink,#121a16)]",
              FOCUS,
            )}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto", SCROLLBAR)}>
          <EventDetailBody
            event={selected}
            branchName={
              selected.branchId
                ? (branchNames[selected.branchId] ?? null)
                : null
            }
          />
        </div>
      </aside>
    ) : null;

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "gap-3 pb-[calc(var(--shell-bottom-inset)+1.5rem)] sm:pb-8",
      )}
    >
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-0.5 pt-1">
        <div className="min-w-0">
          <h1
            className={cn(
              SERIF,
              "text-[2rem] font-normal leading-none tracking-[-0.02em] sm:text-[2.25rem]",
              INK,
            )}
          >
            Shop diary
          </h1>
          <div className={cn("mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px] leading-snug", MUTE)}>
            <span>What happened in the shop, in plain words.</span>
            <ActiveScopeSubtitle className="text-[13px] text-inherit" />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-0.5">
          <ToolButton
            onClick={() => void load({ silent: true })}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw
              className={cn("size-3.5", refreshing && "animate-spin")}
              aria-hidden
            />
            Refresh
          </ToolButton>
          <ToolButton
            onClick={() => void exportCsv()}
            disabled={!range || exporting}
            title="Download the entries in view as CSV"
          >
            {exporting ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="size-3.5" aria-hidden />
            )}
            CSV
          </ToolButton>
          <ToolButton
            onClick={() => setDiagnosticsOpen(true)}
            title="This browser's own device logs"
            active={diagnosticsOpen}
          >
            <MonitorSmartphone className="size-3.5" aria-hidden />
            This device
          </ToolButton>
        </div>
      </header>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {pulse}

      <div
        className={cn(
          "grid min-h-0 gap-3",
          detailAside
            ? "lg:grid-cols-[minmax(0,1fr)_minmax(21rem,25rem)]"
            : "lg:grid-cols-1",
          "lg:h-[min(78dvh,56rem)]",
        )}
      >
        <div className="flex min-h-0 flex-col">{feed}</div>
        {detailAside}
      </div>

      {!isLg ? (
        <FormDrawer
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
          }}
          title="Entry"
          appearance="sharp"
          headerDensity="compact"
        >
          {selected ? (
            <EventDetailBody
              event={selected}
              branchName={
                selected.branchId
                  ? (branchNames[selected.branchId] ?? null)
                  : null
              }
            />
          ) : null}
        </FormDrawer>
      ) : null}

      <FormDrawer
        open={diagnosticsOpen}
        onOpenChange={setDiagnosticsOpen}
        title="This device"
        description="Logs kept by this browser only. They never leave the device."
        appearance="sharp"
        headerDensity="compact"
      >
        <div className="px-4 py-3">
          <OpsClientLogsPanel />
        </div>
      </FormDrawer>

    </div>
  );
}
