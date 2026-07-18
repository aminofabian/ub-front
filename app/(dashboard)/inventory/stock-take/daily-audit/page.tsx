"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  StickyNote,
  Sun,
  Moon,
} from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import {
  fetchBranches,
  fetchDailyAuditRestockSupplierOptions,
  fetchDailyAuditSession,
  fetchDailyAuditToday,
  patchDailyAuditLine,
  patchDailyAuditProgress,
  postDailyAuditComplete,
  postDailyAuditSession,
  type BranchRecord,
  type DailyAuditLineRecord,
  type DailyAuditSessionRecord,
  type DailyAuditTodayRecord,
  type StockTakeRestockItemRecord,
  type StockTakeRestockSupplierOptionRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { canStockManagerSeeSystemStockDuringCount } from "@/lib/inventory-access";
import { cn } from "@/lib/utils";
import { DailyAuditProductCard } from "../_components/DailyAuditProductCard";
import { RestockDrawer } from "../_components/RestockDrawer";

type SessionType = "morning" | "evening";

function parseQty(v: number | string | null | undefined): string {
  if (v == null) return "";
  return String(v);
}

function sortedLines(session: DailyAuditSessionRecord): DailyAuditLineRecord[] {
  return [...session.lines].sort((a, b) => a.sortOrder - b.sortOrder);
}

function nudgeQty(raw: string, delta: number): string {
  const n = raw.trim() === "" ? 0 : Number(raw);
  if (!Number.isFinite(n)) return raw;
  return String(Math.max(0, Math.round((n + delta) * 1000) / 1000));
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function msUntil(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const target = Date.parse(iso);
  if (!Number.isFinite(target)) return null;
  return target - nowMs;
}

export default function DailyAuditPage() {
  const { me, business } = useDashboard();
  const canRun = hasPermission(me?.permissions, Permission.StocktakeRun);
  const canRead = hasPermission(me?.permissions, Permission.StocktakeRead);
  const canUploadImage =
    canRun || hasPermission(me?.permissions, Permission.CatalogItemsWrite);
  const canSeeSystemStock = canStockManagerSeeSystemStockDuringCount(me, business);
  const configuredSampleSize =
    typeof business?.inventory?.stocktake?.dailyAuditSampleSize === "number"
      ? business.inventory.stocktake.dailyAuditSampleSize
      : 25;

  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [sessionType, setSessionType] = useState<SessionType>("morning");
  const [today, setToday] = useState<DailyAuditTodayRecord | null>(null);
  const [session, setSession] = useState<DailyAuditSessionRecord | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countInput, setCountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [slideDir, setSlideDir] = useState<"next" | "prev">("next");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countInputRef = useRef<HTMLInputElement | null>(null);
  const lastScheduleRefreshAt = useRef(0);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockLoading, setRestockLoading] = useState(false);
  const [restockOptions, setRestockOptions] = useState<
    StockTakeRestockSupplierOptionRecord[]
  >([]);
  const [pendingRestock, setPendingRestock] =
    useState<StockTakeRestockItemRecord | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
  });

  const lines = useMemo(
    () => (session ? sortedLines(session) : []),
    [session],
  );
  const currentLine = lines[currentIndex] ?? null;
  const progressPct = lines.length
    ? ((currentIndex + 1) / lines.length) * 100
    : 0;
  const isLastItem = lines.length > 0 && currentIndex >= lines.length - 1;
  const sessionDone = session?.status === "closed";
  // Prefer the completed session's own type — AM/PM toggle can flip to the
  // schedule's open window and must not relabel a finished morning as evening.
  const completedType: SessionType | null =
    session?.sessionType === "morning" || session?.sessionType === "evening"
      ? session.sessionType
      : null;
  const todaySessionSummary =
    sessionType === "morning" ? today?.morningSession : today?.eveningSession;
  const todaySessionDone = todaySessionSummary?.status === "closed";
  const morningSessionDone = today?.morningSession?.status === "closed";
  const eveningSessionDone = today?.eveningSession?.status === "closed";
  const doneType: SessionType = completedType ?? sessionType;
  const doneLabel =
    doneType === "morning" ? "Morning count done" : "Evening count done";

  const activeSessionType =
    today?.activeSessionType === "morning" ||
    today?.activeSessionType === "evening"
      ? today.activeSessionType
      : null;
  const countingOpen = activeSessionType === sessionType;
  const canCount = Boolean(canRun && countingOpen && !sessionDone);
  const eveningWindowOpen = activeSessionType === "evening";
  const canStartEvening =
    Boolean(canRun) &&
    morningSessionDone &&
    !eveningSessionDone &&
    eveningWindowOpen;

  const phaseRemainingMs = msUntil(today?.phaseEndsAt, nowMs);
  const nextOpenMs = msUntil(today?.nextOpensAt, nowMs);
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const nextOpenIsEvening =
    morningSessionDone ||
    (today?.morningSession != null &&
      activeSessionType === null &&
      nextOpenMs != null &&
      nextOpenMs > 0);

  const scheduleBanner = useMemo(() => {
    if (!today) return null;
    const tz = today.timezone ? ` · ${today.timezone}` : "";
    const urgentTone = (remainingMs: number) =>
      remainingMs > 0 && remainingMs < ONE_HOUR_MS
        ? ("urgent" as const)
        : null;

    if (activeSessionType === "morning" && phaseRemainingMs != null) {
      return {
        label: `Morning ends in ${formatCountdown(phaseRemainingMs)}${tz}`,
        tone: urgentTone(phaseRemainingMs) ?? ("open" as const),
      };
    }
    if (activeSessionType === "evening" && phaseRemainingMs != null) {
      return {
        label: `Evening ends in ${formatCountdown(phaseRemainingMs)}${tz}`,
        tone: urgentTone(phaseRemainingMs) ?? ("open" as const),
      };
    }
    if (nextOpenMs != null && nextOpenMs > 0) {
      const phase = nextOpenIsEvening ? "Evening" : "Morning";
      return {
        label: `${phase} opens in ${formatCountdown(nextOpenMs)}${tz}`,
        tone: urgentTone(nextOpenMs) ?? ("soon" as const),
      };
    }
    return {
      label: `Counting ended for today${
        today.eveningEndsAt ? ` · closed ${today.eveningEndsAt}` : ""
      }${tz}`,
      tone: "closed" as const,
    };
  }, [
    today,
    activeSessionType,
    phaseRemainingMs,
    nextOpenMs,
    nextOpenIsEvening,
  ]);

  const loadToday = useCallback(async () => {
    if (!branchId) return;
    setError(null);
    setLoading(true);
    try {
      const manifest = await fetchDailyAuditToday(branchId);
      setToday(manifest);
      const summary =
        sessionType === "morning"
          ? manifest.morningSession
          : manifest.eveningSession;
      if (summary?.sessionId) {
        const active = await fetchDailyAuditSession(summary.sessionId);
        setSession(active);
        setCurrentIndex(active.currentLineIndex ?? 0);
        const line = sortedLines(active)[active.currentLineIndex ?? 0];
        if (line) {
          setCountInput(parseQty(line.countedQty));
          setNoteInput(line.note ?? "");
          setNoteOpen(Boolean(line.note));
        }
      } else {
        setSession(null);
        setCurrentIndex(0);
        setCountInput("");
        setNoteInput("");
        setNoteOpen(false);
      }
    } catch (e) {
      setToday(null);
      setSession(null);
      setError(e instanceof Error ? e.message : "Daily audit not available");
    } finally {
      setLoading(false);
    }
  }, [branchId, sessionType]);

  useEffect(() => {
    fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    if (branchLocked || branchId || branches.length === 0) return;
    setBranchId(branches[0]!.id);
  }, [branchLocked, branchId, branches]);

  useEffect(() => {
    if (branchId && (canRun || canRead)) void loadToday();
  }, [branchId, sessionType, canRun, canRead, loadToday]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Auto-select the open session when the schedule reports one.
  // After morning finishes, jump to evening once that window opens.
  useEffect(() => {
    if (!activeSessionType) return;
    if (
      session?.status === "closed" &&
      session.sessionType === "morning" &&
      activeSessionType === "evening"
    ) {
      setSessionType("evening");
      return;
    }
    if (session?.status === "closed") return;
    if (sessionType !== activeSessionType) {
      setSessionType(activeSessionType);
    }
  }, [activeSessionType, session?.status, session?.sessionType, sessionType]);

  // Refresh schedule once when a phase boundary is crossed.
  useEffect(() => {
    if (!today || !branchId) return;
    const targets = [today.phaseEndsAt, today.nextOpensAt].filter(
      (v): v is string => Boolean(v),
    );
    if (targets.length === 0) return;
    const crossed = targets.find((iso) => {
      const t = Date.parse(iso);
      return Number.isFinite(t) && t <= nowMs && t > lastScheduleRefreshAt.current;
    });
    if (!crossed) return;
    lastScheduleRefreshAt.current = Date.parse(crossed);
    void loadToday();
  }, [nowMs, today?.phaseEndsAt, today?.nextOpensAt, branchId, loadToday]);

  useEffect(() => {
    if (!currentLine) return;
    setCountInput(parseQty(currentLine.countedQty));
    setNoteInput(currentLine.note ?? "");
    setNoteOpen(Boolean(currentLine.note));
  }, [currentLine?.lineId]);

  useEffect(() => {
    if (!session || !currentLine || !canRun) {
      setRestockOptions([]);
      setPendingRestock(null);
      return;
    }
    let cancelled = false;
    setRestockLoading(true);
    fetchDailyAuditRestockSupplierOptions(session.sessionId, currentLine.lineId)
      .then((data) => {
        if (cancelled) return;
        setRestockOptions(data.options);
        setPendingRestock(data.pendingSuggestion);
      })
      .catch(() => {
        if (cancelled) return;
        setRestockOptions([]);
        setPendingRestock(null);
      })
      .finally(() => {
        if (!cancelled) setRestockLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.sessionId, currentLine?.lineId, canRun]);

  const persistProgress = useCallback(
    async (index: number) => {
      if (!session) return;
      try {
        const updated = await patchDailyAuditProgress(session.sessionId, index);
        setSession(updated);
      } catch {
        /* non-blocking */
      }
    },
    [session],
  );

  const saveLine = useCallback(
    async (advance: boolean) => {
      if (!session || !currentLine) return;
      const qty = countInput.trim();
      if (qty === "" || Number.isNaN(Number(qty)) || Number(qty) < 0) {
        setError("Enter a valid physical count.");
        countInputRef.current?.focus();
        return;
      }
      setSaving(true);
      setError(null);
      try {
        let updated = await patchDailyAuditLine(
          session.sessionId,
          currentLine.lineId,
          {
            countedQty: qty,
            note: noteInput.trim() || null,
          },
        );
        setSession(updated);

        const finishing =
          advance && currentIndex >= lines.length - 1;
        if (finishing) {
          updated = await postDailyAuditComplete(session.sessionId);
          const finishedType =
            updated.sessionType === "evening" ? "evening" : "morning";
          setSessionType(finishedType);
          setSession(updated);
          await loadToday();
          return;
        }

        const nextIndex = advance
          ? Math.min(currentIndex + 1, lines.length - 1)
          : currentIndex;
        if (advance && nextIndex !== currentIndex) {
          setSlideDir("next");
          setCurrentIndex(nextIndex);
          await persistProgress(nextIndex);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save count");
      } finally {
        setSaving(false);
      }
    },
    [
      session,
      currentLine,
      countInput,
      noteInput,
      currentIndex,
      lines.length,
      persistProgress,
      loadToday,
    ],
  );

  useEffect(() => {
    if (!session || !currentLine || !canCount) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const qty = countInput.trim();
      if (qty === "" || Number.isNaN(Number(qty))) return;
      void patchDailyAuditLine(session.sessionId, currentLine.lineId, {
        countedQty: qty,
        note: noteInput.trim() || null,
      })
        .then(setSession)
        .catch(() => undefined);
    }, 800);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [countInput, noteInput, session, currentLine, canCount]);

  const startSession = async (type: SessionType = sessionType) => {
    const windowOpen = activeSessionType === type;
    if (!branchId || !windowOpen) return;
    setSaving(true);
    setError(null);
    setSessionType(type);
    try {
      const created = await postDailyAuditSession({
        branchId,
        sessionType: type,
      });
      setSession(created);
      setCurrentIndex(0);
      await loadToday();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setSaving(false);
    }
  };

  const goPrevious = async () => {
    if (currentIndex <= 0) return;
    const next = currentIndex - 1;
    setSlideDir("prev");
    setCurrentIndex(next);
    await persistProgress(next);
  };

  const goNext = async () => {
    await saveLine(true);
  };

  const applyLineImage = useCallback((lineId: string, imageUrl: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lines: prev.lines.map((line) =>
          line.lineId === lineId ? { ...line, imageUrl } : line,
        ),
      };
    });
  }, []);

  if (!canRun && !canRead) {
    return (
      <DashboardAccessDenied
        title="Daily audit"
        description="You need stock take access to view daily audits."
      />
    );
  }

  return (
    <div
      className={cn(
        /* Fill the shell main (incl. padding box) so one item fits on screen */
        "absolute inset-0 z-0 mx-auto flex min-h-0 w-full max-w-lg flex-col overflow-hidden",
        "px-3 pt-3 pb-[calc(5.35rem+env(safe-area-inset-bottom,0px))]",
        "2xl:static 2xl:h-full 2xl:max-w-lg 2xl:overflow-visible 2xl:p-0",
      )}
    >
      {/* Soft app atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[1.35rem]"
      >
        <div className="absolute -left-16 top-0 size-44 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute -right-10 bottom-24 size-52 rounded-full bg-emerald-400/[0.08] blur-3xl" />
        <div className="absolute inset-x-6 top-1/3 h-40 rounded-full bg-primary/[0.03] blur-2xl" />
      </div>

      {/* Top chrome */}
      <header className="shrink-0 space-y-2.5 px-0.5 pb-1">
        <div className="flex items-center gap-2">
          {!branchLocked ? (
            <select
              className={cn(
                dashboardSelectClass(),
                "h-9 min-w-0 flex-1 rounded-full py-1.5 text-xs font-medium",
              )}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              aria-label="Branch"
            >
              <option value="">Branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : null}

          <div
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full bg-muted/70 p-0.5 ring-1 ring-border/60",
              branchLocked ? "flex-1" : "",
            )}
            role="tablist"
            aria-label="Session"
          >
            {(
              [
                { id: "morning", label: "AM", icon: Sun },
                { id: "evening", label: "PM", icon: Moon },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const active = sessionType === id;
              const open = activeSessionType === id;
              // After morning is finished, always allow switching to PM
              // (start when the evening window is open; otherwise show wait UI).
              const allowAfterMorningDone =
                id === "evening" && morningSessionDone;
              const locked =
                Boolean(today) &&
                !open &&
                activeSessionType != null &&
                !allowAfterMorningDone;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={locked}
                  onClick={() => {
                    if (locked) return;
                    setSessionType(id);
                  }}
                  className={cn(
                    "inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold transition-all",
                    active
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                      : "text-muted-foreground active:scale-[0.98]",
                    locked ? "opacity-40" : "",
                  )}
                >
                  <Icon className="size-3.5 opacity-80" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {scheduleBanner ? (
            <div
              className={cn(
                "min-w-0 flex-1 rounded-full px-3 py-1.5 text-center text-[11px] font-semibold tabular-nums tracking-tight",
                scheduleBanner.tone === "open" &&
                  "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
                scheduleBanner.tone === "soon" &&
                  "bg-amber-500/15 text-amber-900 dark:text-amber-100",
                scheduleBanner.tone === "urgent" &&
                  "animate-pulse bg-red-500/20 text-red-700 ring-1 ring-red-500/40 dark:text-red-300",
                scheduleBanner.tone === "closed" &&
                  "bg-muted text-muted-foreground",
              )}
            >
              {scheduleBanner.label}
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <Link
            href={APP_ROUTES.inventoryStockTakeMyStats}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5",
              "text-[11px] font-semibold text-muted-foreground",
              "border border-border/70 bg-background/80 transition active:scale-[0.98]",
            )}
          >
            <Award className="size-3.5" aria-hidden />
            Stats
          </Link>
        </div>

        {session && currentLine ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
              <span className="font-semibold tracking-tight">
                Item {currentIndex + 1}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  of {lines.length}
                </span>
              </span>
              <span className="rounded-full bg-muted/80 px-2 py-0.5 font-medium text-muted-foreground">
                {session.submittedCount}/{session.totalCount} saved
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="shrink-0 px-0.5 pt-1">
          <DashboardFeedback kind="error" text={error} />
        </div>
      ) : null}

      {/* Main stage */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pt-2">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !today ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed px-4 text-center text-sm text-muted-foreground">
            No audit today
          </div>
        ) : sessionDone || todaySessionDone ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-5 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <div>
              <p className="text-lg font-semibold">{doneLabel}</p>
              <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                {(session ?? todaySessionSummary)?.submittedCount ??
                  today.itemCount}
                /
                {(session ?? todaySessionSummary)?.totalCount ?? today.itemCount}{" "}
                counts saved
              </p>
              {doneType === "morning" && !eveningSessionDone ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {canStartEvening
                    ? "Evening counting is open — start when ready."
                    : nextOpenMs != null && nextOpenMs > 0 && nextOpenIsEvening
                      ? `Evening opens in ${formatCountdown(nextOpenMs)}${
                          today.eveningStartsAt
                            ? ` (${today.eveningStartsAt}${
                                today.eveningEndsAt
                                  ? `–${today.eveningEndsAt}`
                                  : ""
                              })`
                            : ""
                        }.`
                      : scheduleBanner?.tone === "closed"
                        ? "Counting has ended for today."
                        : "Come back for the evening count when PM opens."}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Admin can review this day’s counts when ready.
                </p>
              )}
            </div>
            {doneType === "morning" && !eveningSessionDone && canRun ? (
              <Button
                size="lg"
                className="mt-1 h-12 w-full max-w-xs rounded-full text-base font-semibold shadow-md active:scale-[0.98]"
                disabled={saving || !canStartEvening}
                onClick={() => void startSession("evening")}
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : canStartEvening ? (
                  "Start evening count"
                ) : nextOpenMs != null && nextOpenMs > 0 && nextOpenIsEvening ? (
                  `Evening opens in ${formatCountdown(nextOpenMs)}`
                ) : (
                  "Evening count locked"
                )}
              </Button>
            ) : null}
          </div>
        ) : !session && canRun && !countingOpen ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-5 py-8 text-center">
            <p className="text-base font-semibold text-foreground">
              {scheduleBanner?.tone === "closed"
                ? "Counting ended for today"
                : activeSessionType === "evening"
                  ? "Evening count is open — switch to PM"
                  : nextOpenMs != null && nextOpenMs > 0
                    ? `${nextOpenIsEvening ? "Evening" : "Morning"} opens in ${formatCountdown(nextOpenMs)}`
                    : "Counting is closed"}
            </p>
            <p className="text-sm text-muted-foreground">
              {today.morningStartsAt &&
              today.morningEndsAt &&
              today.eveningStartsAt &&
              today.eveningEndsAt
                ? `Windows ${today.morningStartsAt}–${today.morningEndsAt} · ${today.eveningStartsAt}–${today.eveningEndsAt}`
                : "Ask an admin to set daily audit count windows."}
              {today.timezone ? ` (${today.timezone})` : ""}
            </p>
            {canStartEvening ? (
              <Button
                size="lg"
                className="mt-1 h-12 w-full max-w-xs rounded-full text-base font-semibold shadow-md active:scale-[0.98]"
                disabled={saving}
                onClick={() => void startSession("evening")}
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Start evening count"
                )}
              </Button>
            ) : null}
          </div>
        ) : !session && canRun ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 rounded-2xl border border-border/70 bg-card/70 px-5 py-8 text-center shadow-sm backdrop-blur-sm">
            <div className="space-y-1.5">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {today.itemCount}
              </p>
              <p className="text-sm text-muted-foreground">
                items ready for {sessionType} count
                {configuredSampleSize !== today.itemCount
                  ? ` (target sample ${configuredSampleSize})`
                  : ` · sample size ${configuredSampleSize}`}
              </p>
            </div>
            <Button
              size="lg"
              className="h-12 w-full max-w-xs rounded-full text-base font-semibold shadow-md active:scale-[0.98]"
              onClick={() => void startSession()}
              disabled={saving || !countingOpen}
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Start counting"
              )}
            </Button>
          </div>
        ) : session && currentLine && !sessionDone ? (
          <div
            key={currentLine.lineId}
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-3",
              "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
              slideDir === "next"
                ? "motion-safe:slide-in-from-right-3"
                : "motion-safe:slide-in-from-left-3",
            )}
          >
            <div className="shrink-0 rounded-2xl border border-border/60 bg-card/80 px-3 py-3 shadow-sm backdrop-blur-sm">
              <DailyAuditProductCard
                itemId={currentLine.itemId}
                itemName={currentLine.itemName}
                imageUrl={currentLine.imageUrl}
                metaLine={[
                  currentLine.itemSku,
                  currentLine.barcode,
                  currentLine.categoryName,
                  currentLine.unitType,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                systemStockLabel={
                  canSeeSystemStock && currentLine.systemStock != null
                    ? `System ${String(currentLine.systemStock)}`
                    : null
                }
                canUpload={canUploadImage}
                onImageUploaded={(url) =>
                  applyLineImage(currentLine.lineId, url)
                }
                onError={(message) => setError(message)}
              />
            </div>

            {/* Count hero — fills remaining space */}
            <div
              className={cn(
                "relative flex min-h-0 flex-1 flex-col items-center justify-center",
                "rounded-[1.35rem] border border-border/50 bg-gradient-to-b from-card/90 via-card/60 to-muted/30",
                "px-3 py-4 shadow-sm",
              )}
            >
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Physical count
              </p>

              {!countingOpen ? (
                <p className="mb-3 max-w-sm text-center text-xs font-medium text-amber-800 dark:text-amber-200">
                  Counting is closed for this window. Changes are locked.
                </p>
              ) : null}

              <div className="flex w-full max-w-sm items-center gap-2.5">
                <button
                  type="button"
                  disabled={!canCount || saving}
                  aria-label="Decrease count"
                  onClick={() => setCountInput((v) => nudgeQty(v, -1))}
                  className={cn(
                    "flex size-14 shrink-0 items-center justify-center rounded-2xl",
                    "border border-border/70 bg-background/90 text-foreground shadow-sm",
                    "transition active:scale-95 disabled:opacity-40",
                  )}
                >
                  <Minus className="size-6" strokeWidth={2.25} />
                </button>

                <input
                  ref={countInputRef}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  className={cn(
                    dashboardInputClass(),
                    "h-16 flex-1 rounded-2xl border-primary/25 bg-background/95 text-center",
                    "text-4xl font-semibold tabular-nums tracking-tight shadow-inner",
                    "focus-visible:ring-primary/30",
                  )}
                  value={countInput}
                  onChange={(e) => setCountInput(e.target.value)}
                  disabled={!canCount}
                  placeholder="0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canCount) {
                      e.preventDefault();
                      void goNext();
                    }
                  }}
                />

                <button
                  type="button"
                  disabled={!canCount || saving}
                  aria-label="Increase count"
                  onClick={() => setCountInput((v) => nudgeQty(v, 1))}
                  className={cn(
                    "flex size-14 shrink-0 items-center justify-center rounded-2xl",
                    "bg-primary text-primary-foreground shadow-md shadow-primary/25",
                    "transition active:scale-95 disabled:opacity-40",
                  )}
                >
                  <Plus className="size-6" strokeWidth={2.25} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  disabled={!canCount}
                  onClick={() => {
                    setNoteOpen((o) => !o);
                  }}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium",
                    "border border-border/70 bg-background/70 transition active:scale-[0.98]",
                    noteOpen || noteInput
                      ? "border-primary/35 text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  <StickyNote className="size-3.5" aria-hidden />
                  {noteInput ? "Note" : "Add note"}
                </button>

                {canCount && !restockLoading && restockOptions.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setRestockOpen(true)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium",
                      "border transition active:scale-[0.98]",
                      pendingRestock
                        ? "border-primary/35 bg-primary/10 text-primary"
                        : "border-border/70 bg-background/70 text-muted-foreground",
                    )}
                  >
                    <PackagePlus className="size-3.5" aria-hidden />
                    {pendingRestock ? "On restock" : "Restock"}
                  </button>
                ) : null}

                {restockLoading ? (
                  <span className="inline-flex h-8 items-center gap-1 px-2 text-[11px] text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Suppliers…
                  </span>
                ) : null}
              </div>

              {noteOpen ? (
                <label className="mt-2 w-full max-w-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-150">
                  <span className="sr-only">Note</span>
                  <input
                    type="text"
                    className={cn(
                      dashboardInputClass(),
                      "h-10 rounded-xl text-sm",
                    )}
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    disabled={!canCount}
                    placeholder="Optional note…"
                    autoFocus
                  />
                </label>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Thumb dock */}
      {session && currentLine && canCount && !sessionDone ? (
        <div className="shrink-0 pt-3">
          <div className="flex gap-2 rounded-2xl border border-border/60 bg-background/95 p-1.5 shadow-lg shadow-black/5 backdrop-blur-md">
            <Button
              type="button"
              variant="outline"
              className="h-12 w-14 shrink-0 rounded-xl px-0 active:scale-[0.98]"
              disabled={currentIndex === 0 || saving}
              onClick={() => void goPrevious()}
              aria-label="Previous item"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              className="h-12 flex-[2.4] rounded-xl text-base font-semibold shadow-md shadow-primary/20 active:scale-[0.98]"
              disabled={saving}
              onClick={() => void goNext()}
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isLastItem
                    ? sessionType === "morning"
                      ? "Finish morning"
                      : "Finish evening"
                    : "Next"}
                  {!isLastItem ? (
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="ml-1.5 h-4 w-4" />
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {session && currentLine ? (
        <RestockDrawer
          open={restockOpen}
          onOpenChange={setRestockOpen}
          sessionId={session.sessionId}
          lineId={currentLine.lineId}
          itemId={currentLine.itemId}
          itemName={currentLine.itemName}
          branchId={branchId}
          options={restockOptions}
          pendingSuggestion={pendingRestock}
          onSaved={setPendingRestock}
        />
      ) : null}
    </div>
  );
}
