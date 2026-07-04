"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchDailyAuditSession,
  fetchDailyAuditToday,
  patchDailyAuditLine,
  patchDailyAuditProgress,
  postDailyAuditSession,
  type BranchRecord,
  type DailyAuditLineRecord,
  type DailyAuditSessionRecord,
  type DailyAuditTodayRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type SessionType = "morning" | "evening";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseQty(v: number | string | null | undefined): string {
  if (v == null) return "";
  return String(v);
}

function sortedLines(session: DailyAuditSessionRecord): DailyAuditLineRecord[] {
  return [...session.lines].sort((a, b) => a.sortOrder - b.sortOrder);
}

export default function DailyAuditPage() {
  const { me } = useDashboard();
  const canRun = hasPermission(me?.permissions, Permission.StocktakeRun);
  const canRead = hasPermission(me?.permissions, Permission.StocktakeRead);

  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [sessionType, setSessionType] = useState<SessionType>("morning");
  const [today, setToday] = useState<DailyAuditTodayRecord | null>(null);
  const [session, setSession] = useState<DailyAuditSessionRecord | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countInput, setCountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useSyncBranchFilter(branchId, setBranchId);

  const lines = useMemo(
    () => (session ? sortedLines(session) : []),
    [session],
  );
  const currentLine = lines[currentIndex] ?? null;
  const progressLabel =
    lines.length > 0 ? `${currentIndex + 1} of ${lines.length}` : "0 of 0";

  const loadToday = useCallback(async () => {
    if (!branchId) return;
    setError(null);
    setLoading(true);
    try {
      const manifest = await fetchDailyAuditToday(branchId, todayStr());
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
        }
      } else {
        setSession(null);
        setCurrentIndex(0);
        setCountInput("");
        setNoteInput("");
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
    if (branchId && (canRun || canRead)) void loadToday();
  }, [branchId, sessionType, canRun, canRead, loadToday]);

  useEffect(() => {
    if (!currentLine) return;
    setCountInput(parseQty(currentLine.countedQty));
    setNoteInput(currentLine.note ?? "");
  }, [currentLine?.lineId]);

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
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const updated = await patchDailyAuditLine(
          session.sessionId,
          currentLine.lineId,
          {
            countedQty: qty,
            note: noteInput.trim() || null,
          },
        );
        setSession(updated);
        const nextIndex = advance
          ? Math.min(currentIndex + 1, lines.length - 1)
          : currentIndex;
        if (advance) {
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
    ],
  );

  useEffect(() => {
    if (!session || !currentLine || !canRun) return;
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
  }, [countInput, noteInput, session, currentLine, canRun]);

  const startSession = async () => {
    if (!branchId) return;
    setSaving(true);
    setError(null);
    try {
      const created = await postDailyAuditSession({
        branchId,
        sessionType,
        auditDate: todayStr(),
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
    setCurrentIndex(next);
    await persistProgress(next);
  };

  const goNext = async () => {
    await saveLine(true);
  };

  if (!canRun && !canRead) {
    return (
      <DashboardAccessDenied message="You need stock take access to view daily audits." />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX, "mx-auto space-y-4 px-4 pb-24 pt-4")}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={APP_ROUTES.inventoryStockTake}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Stock take
        </Link>
      </div>

      <DashboardPageHero
        title="Daily audit"
        description="Count 25 random products sold yesterday. System stock is hidden during counting."
        icon={ClipboardCheck}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Branch</span>
          <select
            className={dashboardSelectClass}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Session</span>
          <select
            className={dashboardSelectClass}
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as SessionType)}
          >
            <option value="morning">Morning count</option>
            <option value="evening">Evening count</option>
          </select>
        </label>
      </div>

      {error ? <DashboardFeedback variant="error" message={error} /> : null}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading today&apos;s audit…
        </div>
      ) : !today ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No daily audit list for today yet. The system generates one each
          morning from products sold yesterday.
        </div>
      ) : !session && canRun ? (
        <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            {today.itemCount} products ready for {sessionType} count.
          </p>
          <Button className="mt-4" onClick={() => void startSession()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              "Start counting"
            )}
          </Button>
        </div>
      ) : session && currentLine ? (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{progressLabel}</span>
            <span className="text-muted-foreground">
              {session.submittedCount}/{session.totalCount} saved
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${lines.length ? ((currentIndex + 1) / lines.length) * 100 : 0}%`,
              }}
            />
          </div>

          <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="relative aspect-square max-h-64 w-full bg-muted">
              {currentLine.imageUrl ? (
                <Image
                  src={currentLine.imageUrl}
                  alt={currentLine.itemName}
                  fill
                  className="object-contain p-4"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            <div className="space-y-2 p-4">
              <h2 className="text-lg font-semibold leading-tight">
                {currentLine.itemName}
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                {currentLine.itemSku ? (
                  <span className="rounded-full bg-muted px-2 py-1">
                    SKU {currentLine.itemSku}
                  </span>
                ) : null}
                {currentLine.barcode ? (
                  <span className="rounded-full bg-muted px-2 py-1">
                    {currentLine.barcode}
                  </span>
                ) : null}
                {currentLine.categoryName ? (
                  <span className="rounded-full bg-muted px-2 py-1">
                    {currentLine.categoryName}
                  </span>
                ) : null}
                {currentLine.unitType ? (
                  <span className="rounded-full bg-muted px-2 py-1">
                    {currentLine.unitType}
                  </span>
                ) : null}
              </div>
            </div>
          </article>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Physical count</span>
            <input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              className={cn(dashboardInputClass, "text-lg")}
              value={countInput}
              onChange={(e) => setCountInput(e.target.value)}
              disabled={!canRun}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Notes (optional)</span>
            <textarea
              className={cn(dashboardInputClass, "min-h-[72px] resize-y")}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              disabled={!canRun}
              placeholder="Shelf condition, location, etc."
            />
          </label>

          {canRun ? (
            <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 p-4 backdrop-blur">
              <div className={cn(DASHBOARD_MAX, "mx-auto flex gap-2")}>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={currentIndex === 0 || saving}
                  onClick={() => void goPrevious()}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  className="flex-[2]"
                  disabled={saving}
                  onClick={() => void goNext()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Save &amp; next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : session ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
          <p className="mt-2 font-medium">All items visited</p>
          <p className="text-sm text-muted-foreground">
            {session.submittedCount} of {session.totalCount} counts saved.
          </p>
        </div>
      ) : null}
    </div>
  );
}
