"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
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
  fetchDailyAuditReview,
  postDailyAuditApprove,
  postDailyAuditBulkApprove,
  postDailyAuditEscalate,
  type BranchRecord,
  type DailyAuditReviewLineRecord,
  type DailyAuditReviewRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function num(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n.toLocaleString() : String(v);
}

function statusLabel(status: string): string {
  if (status === "approved") return "Approved";
  if (status === "escalated") return "Escalated";
  return "Pending";
}

function isPending(line: DailyAuditReviewLineRecord): boolean {
  return line.reviewStatus !== "approved" && line.reviewStatus !== "escalated";
}

export default function DailyAuditReviewPage() {
  const { me } = useDashboard();
  const canApprove = hasPermission(me?.permissions, Permission.StocktakeApprove);

  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(todayStr);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [review, setReview] = useState<DailyAuditReviewRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
  });

  const matched = useMemo(
    () => review?.lines.filter((l) => l.matches).length ?? 0,
    [review],
  );
  const mismatched = useMemo(
    () => review?.lines.filter((l) => !l.matches).length ?? 0,
    [review],
  );
  const approvedCount = useMemo(
    () => review?.lines.filter((l) => l.reviewStatus === "approved").length ?? 0,
    [review],
  );
  const pendingLines = useMemo(
    () => review?.lines.filter(isPending) ?? [],
    [review],
  );
  const allPendingSelected =
    pendingLines.length > 0 &&
    pendingLines.every((l) => selectedIds.has(l.itemId));

  const loadReview = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      setReview(await fetchDailyAuditReview(branchId, date));
      setSelectedIds(new Set());
    } catch (e) {
      setReview(null);
      setError(e instanceof Error ? e.message : "Review not available");
    } finally {
      setLoading(false);
    }
  }, [branchId, date]);

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
    if (branchId && canApprove) void loadReview();
  }, [branchId, date, canApprove, loadReview]);

  const toggleSelected = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(pendingLines.map((l) => l.itemId)));
  };

  const runAction = async (
    line: DailyAuditReviewLineRecord,
    action: "approve" | "escalate",
  ) => {
    if (!review || !isPending(line)) return;
    setActionItemId(line.itemId);
    setError(null);
    setSuccess(null);
    try {
      const notes = adminNotes[line.itemId]?.trim() || null;
      const updated =
        action === "approve"
          ? await postDailyAuditApprove(review.auditId, line.itemId, notes)
          : await postDailyAuditEscalate(review.auditId, line.itemId, notes);
      setReview(updated);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(line.itemId);
        return next;
      });
      setSuccess(
        action === "approve"
          ? `${line.itemName} approved — stock updated to evening count.`
          : `${line.itemName} escalated for investigation.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionItemId(null);
    }
  };

  const runBulkApprove = async () => {
    if (!review || selectedIds.size === 0) return;
    const itemIds = [...selectedIds].filter((id) =>
      review.lines.some((l) => l.itemId === id && isPending(l)),
    );
    if (itemIds.length === 0) return;
    setBulkBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await postDailyAuditBulkApprove(
        review.auditId,
        itemIds,
        null,
      );
      setReview(updated);
      setSelectedIds(new Set());
      setSuccess(
        `${itemIds.length} item${itemIds.length === 1 ? "" : "s"} approved — stock updated to evening counts.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk approve failed");
    } finally {
      setBulkBusy(false);
    }
  };

  if (!canApprove) {
    return (
      <DashboardAccessDenied
        title="Daily audit review"
        description="Only admins can review daily audit counts."
      />
    );
  }

  const busy = actionItemId != null || bulkBusy;

  return (
    <div className={cn(DASHBOARD_MAX, "mx-auto space-y-4 px-4 pb-24 pt-4")}>
      <Link
        href={APP_ROUTES.inventoryStockTake}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Stock take
      </Link>

      <DashboardPageHero
        icon={ShieldAlert}
        eyebrow="Stock Take"
        title="Daily audit review"
        description="Compare physical counts with system stock. Approving sets inventory to the evening count."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Branch</span>
          <select
            className={dashboardSelectClass(branchLocked)}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={branchLocked}
          >
            <option value="">Select branch</option>
            {branches
              .filter((b) => !branchLocked || b.id === branchId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Audit date</span>
          <input
            type="date"
            className={dashboardInputClass()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <div className="flex items-end">
          <Button variant="outline" onClick={() => void loadReview()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {success ? <DashboardFeedback kind="success" text={success} /> : null}

      {review ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-3 text-sm">
            <div className="text-muted-foreground">Items</div>
            <div className="text-2xl font-semibold">{review.itemCount}</div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="text-emerald-700 dark:text-emerald-400">Matches</div>
            <div className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
              {matched}
            </div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/20">
            <div className="text-red-700 dark:text-red-400">Mismatches</div>
            <div className="text-2xl font-semibold text-red-700 dark:text-red-300">
              {mismatched}
            </div>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-900 dark:bg-sky-950/20">
            <div className="text-sky-700 dark:text-sky-400">Approved</div>
            <div className="text-2xl font-semibold text-sky-700 dark:text-sky-300">
              {approvedCount}
            </div>
          </div>
        </div>
      ) : null}

      {review && pendingLines.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-foreground"
              checked={allPendingSelected}
              onChange={toggleSelectAllPending}
              disabled={busy}
            />
            <span>
              Select all pending ({pendingLines.length})
            </span>
          </label>
          {selectedIds.size > 0 ? (
            <span className="text-muted-foreground">
              {selectedIds.size} selected
            </span>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : review ? (
        <div className="space-y-4">
          {review.lines.map((line) => {
            const approved = line.reviewStatus === "approved";
            const escalated = line.reviewStatus === "escalated";
            const pending = isPending(line);
            const selected = selectedIds.has(line.itemId);

            return (
              <article
                key={line.itemId}
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  approved
                    ? "border-sky-300 bg-sky-50/70 ring-1 ring-sky-200 dark:border-sky-800 dark:bg-sky-950/30 dark:ring-sky-900"
                    : escalated
                      ? "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"
                      : line.matches
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/10"
                        : "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/10",
                  selected && pending ? "outline outline-2 outline-offset-2 outline-foreground/20" : null,
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  {pending ? (
                    <label className="flex shrink-0 items-start pt-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-foreground"
                        checked={selected}
                        onChange={() => toggleSelected(line.itemId)}
                        disabled={busy}
                        aria-label={`Select ${line.itemName}`}
                      />
                    </label>
                  ) : (
                    <div className="flex w-4 shrink-0 items-start pt-1">
                      {approved ? (
                        <ShieldCheck className="h-4 w-4 text-sky-600" aria-hidden />
                      ) : null}
                    </div>
                  )}
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-32 sm:w-32">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt={line.itemName}
                        fill
                        className="object-contain p-2"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                        No photo
                      </div>
                    )}
                    {approved ? (
                      <div className="absolute inset-x-0 bottom-0 bg-sky-600/90 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
                        Stock updated
                      </div>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{line.itemName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {[line.itemSku, line.categoryName, line.unitType]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                          approved
                            ? "bg-sky-600 text-white"
                            : escalated
                              ? "bg-amber-600 text-white"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {approved ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                        {statusLabel(line.reviewStatus)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div>
                        <div className="text-muted-foreground">Morning</div>
                        <div className="font-medium">{num(line.morningCount)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Evening</div>
                        <div className="font-medium">{num(line.eveningCount)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">System</div>
                        <div className="font-medium">{num(line.systemStock)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Variance</div>
                        <div
                          className={cn(
                            "font-medium",
                            line.matches ? "text-emerald-600" : "text-red-600",
                          )}
                        >
                          {num(line.variance)}
                        </div>
                      </div>
                    </div>
                    {approved ? (
                      <p className="text-xs text-sky-700 dark:text-sky-300">
                        Inventory set to evening count
                        {line.eveningCount != null
                          ? ` (${num(line.eveningCount)})`
                          : line.morningCount != null
                            ? ` (${num(line.morningCount)})`
                            : ""}
                        {line.reviewedAt
                          ? ` · ${new Date(line.reviewedAt).toLocaleString()}`
                          : ""}
                      </p>
                    ) : null}
                    {pending || escalated ? (
                      <textarea
                        className={cn(dashboardInputClass(), "min-h-[56px] text-sm")}
                        placeholder="Admin notes"
                        value={adminNotes[line.itemId] ?? line.reviewNotes ?? ""}
                        onChange={(e) =>
                          setAdminNotes((prev) => ({
                            ...prev,
                            [line.itemId]: e.target.value,
                          }))
                        }
                        disabled={approved || busy}
                      />
                    ) : line.reviewNotes ? (
                      <p className="text-xs text-muted-foreground">
                        Notes: {line.reviewNotes}
                      </p>
                    ) : null}
                    {pending ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void runAction(line, "approve")}
                        >
                          {actionItemId === line.itemId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Approve & update stock
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => void runAction(line, "escalate")}
                        >
                          Escalate
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {selectedIds.size > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className={cn(DASHBOARD_MAX, "mx-auto flex flex-wrap items-center justify-between gap-3")}>
            <div className="text-sm">
              <span className="font-medium">{selectedIds.size}</span>
              {" "}
              item{selectedIds.size === 1 ? "" : "s"} selected
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => void runBulkApprove()}
              >
                {bulkBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Approve selected
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
