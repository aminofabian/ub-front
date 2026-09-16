"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, LayoutGrid, ShieldAlert } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
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

import {
  DailyAuditReviewTheatre,
  reviewLinePending,
} from "./_components/daily-audit-review-theatre";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyAuditReviewPage() {
  const { me } = useDashboard();
  const canApprove = hasPermission(
    me?.permissions,
    Permission.StocktakeApprove,
  );

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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

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
    () =>
      review?.lines.filter((l) => l.reviewStatus === "approved").length ?? 0,
    [review],
  );
  const pendingLines = useMemo(
    () => review?.lines.filter(reviewLinePending) ?? [],
    [review],
  );
  const allPendingSelected =
    pendingLines.length > 0 &&
    pendingLines.every((l) => selectedIds.has(l.itemId));

  const selectedLine = useMemo(
    () => review?.lines.find((l) => l.itemId === selectedItemId) ?? null,
    [review, selectedItemId],
  );

  const loadReview = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      setReview(await fetchDailyAuditReview(branchId, date));
      setSelectedIds(new Set());
      setSelectedItemId(null);
      setMobileShowDetail(false);
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

  const clearSelection = useCallback(() => {
    setSelectedItemId(null);
    setMobileShowDetail(false);
  }, []);

  const selectLine = useCallback(
    (line: DailyAuditReviewLineRecord) => {
      if (selectedItemId === line.itemId) {
        clearSelection();
        return;
      }
      setSelectedItemId(line.itemId);
      setMobileShowDetail(true);
    },
    [selectedItemId, clearSelection],
  );

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
    if (!review || !reviewLinePending(line)) return;
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
      review.lines.some((l) => l.itemId === id && reviewLinePending(l)),
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
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5 pb-8")}>
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
      >
        <DashboardQuickLinks
          compact
          links={[
            {
              href: APP_ROUTES.inventoryStockTakeDailyAudit,
              label: "Daily audit",
              desc: "Staff counting session",
              icon: ClipboardList,
            },
            {
              href: APP_ROUTES.inventoryStockTake,
              label: "Stock take hub",
              desc: "All stock take tools",
              icon: LayoutGrid,
            },
          ]}
        />
      </DashboardPageHero>

      <DailyAuditReviewTheatre
        branches={branches}
        branchId={branchId}
        onBranchIdChange={setBranchId}
        branchLocked={branchLocked}
        date={date}
        onDateChange={setDate}
        onRefresh={() => void loadReview()}
        loading={loading}
        review={review}
        matched={matched}
        mismatched={mismatched}
        approvedCount={approvedCount}
        pendingLines={pendingLines}
        selectedItemId={selectedItemId}
        selectedLine={selectedLine}
        onSelectLine={selectLine}
        onClearSelection={clearSelection}
        mobileShowDetail={mobileShowDetail}
        selectedIds={selectedIds}
        onToggleSelected={toggleSelected}
        allPendingSelected={allPendingSelected}
        onToggleSelectAllPending={toggleSelectAllPending}
        adminNotes={adminNotes}
        onAdminNotesChange={(itemId, value) =>
          setAdminNotes((prev) => ({ ...prev, [itemId]: value }))
        }
        busy={busy}
        actionItemId={actionItemId}
        onApproveLine={(line) => void runAction(line, "approve")}
        onEscalateLine={(line) => void runAction(line, "escalate")}
        bulkBusy={bulkBusy}
        onBulkApprove={() => void runBulkApprove()}
        onClearBulkSelection={() => setSelectedIds(new Set())}
        alerts={
          <>
            {error ? <DashboardFeedback kind="error" text={error} /> : null}
            {success ? (
              <DashboardFeedback kind="success" text={success} />
            ) : null}
          </>
        }
      />
    </div>
  );
}
