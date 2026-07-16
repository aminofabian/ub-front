"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

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

export default function DailyAuditReviewPage() {
  const { me } = useDashboard();
  const canApprove = hasPermission(me?.permissions, Permission.StocktakeApprove);

  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(todayStr);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [review, setReview] = useState<DailyAuditReviewRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

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

  const loadReview = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      setReview(await fetchDailyAuditReview(branchId, date));
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

  const runAction = async (
    line: DailyAuditReviewLineRecord,
    action: "approve" | "escalate",
  ) => {
    if (!review) return;
    setActionItemId(line.itemId);
    setError(null);
    try {
      const notes = adminNotes[line.itemId]?.trim() || null;
      const updated =
        action === "approve"
          ? await postDailyAuditApprove(review.auditId, line.itemId, notes)
          : await postDailyAuditEscalate(review.auditId, line.itemId, notes);
      setReview(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionItemId(null);
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

  return (
    <div className={cn(DASHBOARD_MAX, "mx-auto space-y-4 px-4 pb-8 pt-4")}>
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
        description="Compare physical counts with system stock. Approve matches or escalate mismatches."
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

      {review ? (
        <div className="grid gap-3 sm:grid-cols-3">
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
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : review ? (
        <div className="space-y-4">
          {review.lines.map((line) => (
            <article
              key={line.itemId}
              className={cn(
                "rounded-xl border p-4",
                line.matches
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/10"
                  : "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/10",
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row">
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
                        "rounded-full px-2 py-1 text-xs font-medium",
                        line.reviewStatus === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : line.reviewStatus === "escalated"
                            ? "bg-red-100 text-red-800"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {line.reviewStatus}
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
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionItemId === line.itemId}
                      onClick={() => void runAction(line, "approve")}
                    >
                      {actionItemId === line.itemId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actionItemId === line.itemId}
                      onClick={() => void runAction(line, "escalate")}
                    >
                      Escalate
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
