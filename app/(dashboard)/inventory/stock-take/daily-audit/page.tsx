"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  PackagePlus,
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
  postDailyAuditSession,
  type BranchRecord,
  type DailyAuditLineRecord,
  type DailyAuditSessionRecord,
  type DailyAuditTodayRecord,
  type StockTakeRestockItemRecord,
  type StockTakeRestockSupplierOptionRecord,
} from "@/lib/api";
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

export default function DailyAuditPage() {
  const { me, business } = useDashboard();
  const canRun = hasPermission(me?.permissions, Permission.StocktakeRun);
  const canRead = hasPermission(me?.permissions, Permission.StocktakeRead);
  const canUploadImage =
    canRun || hasPermission(me?.permissions, Permission.CatalogItemsWrite);
  const canSeeSystemStock = canStockManagerSeeSystemStockDuringCount(me, business);

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
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockLoading, setRestockLoading] = useState(false);
  const [restockOptions, setRestockOptions] = useState<
    StockTakeRestockSupplierOptionRecord[]
  >([]);
  const [pendingRestock, setPendingRestock] =
    useState<StockTakeRestockItemRecord | null>(null);

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
    if (branchLocked || branchId || branches.length === 0) return;
    setBranchId(branches[0]!.id);
  }, [branchLocked, branchId, branches]);

  useEffect(() => {
    if (branchId && (canRun || canRead)) void loadToday();
  }, [branchId, sessionType, canRun, canRead, loadToday]);

  useEffect(() => {
    if (!currentLine) return;
    setCountInput(parseQty(currentLine.countedQty));
    setNoteInput(currentLine.note ?? "");
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
    <div className="mx-auto w-full max-w-lg space-y-2.5 pb-16">
      <div className="flex flex-wrap items-end gap-2">
        {!branchLocked ? (
          <label className="flex min-w-[8rem] flex-1 flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">Branch</span>
            <select
              className={cn(dashboardSelectClass(), "h-9 py-1.5 text-sm")}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">Branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label
          className={cn(
            "flex flex-col gap-0.5",
            branchLocked ? "min-w-0 flex-1" : "min-w-[7rem] flex-1",
          )}
        >
          <span className="text-[11px] text-muted-foreground">Session</span>
          <select
            className={cn(dashboardSelectClass(), "h-9 py-1.5 text-sm")}
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as SessionType)}
          >
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
        </label>
      </div>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !today ? (
        <div className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No audit today
        </div>
      ) : !session && canRun ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-sm">
          <p className="text-sm tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{today.itemCount}</span>{" "}
            items
          </p>
          <Button
            size="sm"
            className="h-9 shrink-0"
            onClick={() => void startSession()}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Start"
            )}
          </Button>
        </div>
      ) : session && currentLine ? (
        <>
          <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
            <span className="font-medium">
              {currentIndex + 1}/{lines.length}
            </span>
            <span className="text-muted-foreground">
              {session.submittedCount}/{session.totalCount} saved
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${lines.length ? ((currentIndex + 1) / lines.length) * 100 : 0}%`,
              }}
            />
          </div>

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

          <label className="grid gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Count
            </span>
            <input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              className={cn(
                dashboardInputClass(),
                "h-12 text-center text-2xl font-semibold tabular-nums",
              )}
              value={countInput}
              onChange={(e) => setCountInput(e.target.value)}
              disabled={!canRun}
              placeholder="0"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Note
            </span>
            <input
              type="text"
              className={cn(dashboardInputClass(), "h-9 text-sm")}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              disabled={!canRun}
              placeholder="Optional"
            />
          </label>

          {canRun ? (
            <div>
              {restockLoading ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed px-2.5 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking suppliers…
                </div>
              ) : restockOptions.length === 0 ? null : pendingRestock ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2 text-left text-xs hover:bg-primary/10"
                  onClick={() => setRestockOpen(true)}
                >
                  <span className="flex items-center gap-1.5 font-medium text-primary">
                    <PackagePlus className="h-3.5 w-3.5 shrink-0" />
                    On restock list
                  </span>
                  <span className="truncate text-muted-foreground">
                    {pendingRestock.supplierName} · {String(pendingRestock.suggestedQty)}
                  </span>
                </button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-full text-xs"
                  onClick={() => setRestockOpen(true)}
                >
                  <PackagePlus className="mr-1.5 h-3.5 w-3.5" />
                  Add to restock
                </Button>
              )}
            </div>
          ) : null}

          {canRun ? (
            <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-10 border-t bg-background/95 px-3 py-2 backdrop-blur">
              <div className="mx-auto flex w-full max-w-lg gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 flex-1"
                  disabled={currentIndex === 0 || saving}
                  onClick={() => void goPrevious()}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-10 flex-[3]"
                  disabled={saving}
                  onClick={() => void goNext()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : session ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
          <div className="min-w-0 text-sm">
            <p className="font-medium">Done</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {session.submittedCount}/{session.totalCount} saved
            </p>
          </div>
        </div>
      ) : null}

      {session && currentLine ? (
        <RestockDrawer
          open={restockOpen}
          onOpenChange={setRestockOpen}
          sessionId={session.sessionId}
          lineId={currentLine.lineId}
          itemName={currentLine.itemName}
          options={restockOptions}
          pendingSuggestion={pendingRestock}
          onSaved={setPendingRestock}
        />
      ) : null}
    </div>
  );
}
