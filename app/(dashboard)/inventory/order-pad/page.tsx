"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { OrderPadDrawer } from "@/components/order-pad/order-pad-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import {
  deleteOrderPadItem,
  fetchBranches,
  fetchOrderPadItems,
  postOrderPadItemOrdered,
  type BranchRecord,
  type OrderPadItemRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import {
  supFieldLabel,
  supFilterRail,
  supSelect,
} from "../../suppliers/_components/supplier-ui-tokens";

type FilterKey = "pending" | "ordered" | "all";

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "ordered", label: "Ordered" },
  { id: "all", label: "All" },
];

function formatQty(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderPadPage() {
  const { me } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.OrderPadRead);
  const canWrite = hasPermission(me?.permissions, Permission.OrderPadWrite);
  const canManage = hasPermission(me?.permissions, Permission.OrderPadManage);

  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [rows, setRows] = useState<OrderPadItemRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
  });

  useEffect(() => {
    let cancelled = false;
    void fetchBranches()
      .then((list) => {
        if (!cancelled) setBranches(list);
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!branchId.trim() || !canRead) return;
    setLoading(true);
    setError(null);
    try {
      const ordered =
        filter === "pending" ? false : filter === "ordered" ? true : undefined;
      const data = await fetchOrderPadItems({
        branchId: branchId.trim(),
        ordered,
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the order pad.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, canRead, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleOrdered = async (row: OrderPadItemRecord, next: boolean) => {
    if (!canManage) return;
    setBusyId(row.id);
    setError(null);
    try {
      const updated = await postOrderPadItemOrdered(row.id, next);
      setRows((prev) => {
        if (filter === "pending" && updated.ordered) {
          return prev.filter((r) => r.id !== row.id);
        }
        if (filter === "ordered" && !updated.ordered) {
          return prev.filter((r) => r.id !== row.id);
        }
        return prev.map((r) => (r.id === row.id ? updated : r));
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update ordered status.");
    } finally {
      setBusyId(null);
    }
  };

  const removeRow = async (row: OrderPadItemRecord) => {
    if (!canWrite && !canManage) return;
    setBusyId(row.id);
    setError(null);
    try {
      await deleteOrderPadItem(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove that line.");
    } finally {
      setBusyId(null);
    }
  };

  const activeBranchName =
    branches.find((b) => b.id === branchId)?.name?.trim() || "";

  const pendingCount = rows.filter((r) => !r.ordered).length;
  const orderedCount = rows.filter((r) => r.ordered).length;

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Order pad"
        description="You need order pad access to view this list."
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="overflow-hidden border border-border bg-card">
        {/* Compact header */}
        <header className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
          <ClipboardList
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <h1 className="min-w-0 flex-1 truncate text-sm font-bold leading-none tracking-tight">
            Order pad
          </h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 gap-1 rounded-none px-2 text-[11px] font-medium"
            disabled={loading || !branchId}
            onClick={() => void load()}
            aria-label="Refresh order pad"
          >
            <RefreshCw
              className={cn("size-3", loading && "animate-spin")}
              aria-hidden
            />
          </Button>
          {canWrite ? (
            <Button
              type="button"
              size="sm"
              className="h-7 shrink-0 gap-1 rounded-none px-2.5 text-[11px] font-medium"
              onClick={() => setDrawerOpen(true)}
            >
              <Plus className="size-3" aria-hidden />
              Add
            </Button>
          ) : null}
        </header>

        {/* Filters */}
        <div className={cn(supFilterRail, "flex-col items-stretch gap-1.5 !py-1.5")}>
          <div className="flex items-center gap-1.5">
            {!branchLocked ? (
              <label className="min-w-0 flex-1">
                <span className={cn(supFieldLabel, "sr-only")}>Branch</span>
                <select
                  className={cn(
                    supSelect,
                    "h-8 w-full bg-background py-0 text-xs",
                  )}
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  aria-label="Branch"
                >
                  <option value="">Branch…</option>
                  {branches
                    .filter((b) => b.active || b.id === branchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </label>
            ) : activeBranchName ? (
              <span className="min-w-0 flex-1 truncate px-0.5 text-[11px] text-muted-foreground">
                {activeBranchName}
              </span>
            ) : null}

            {branchId && !loading ? (
              <span className="shrink-0 border border-border bg-background px-1.5 py-1 text-[10px] font-medium tabular-nums text-muted-foreground">
                {rows.length}
              </span>
            ) : null}
          </div>

          <div
            className="grid grid-cols-3 border border-border bg-background"
            role="tablist"
            aria-label="Order status"
          >
            {FILTERS.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    "h-8 touch-manipulation text-[11px] font-semibold transition-colors",
                    "border-r border-border last:border-r-0",
                    active
                      ? "bg-foreground text-background"
                      : "bg-transparent text-muted-foreground active:bg-muted/60",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="border-b border-border px-2.5 py-1.5">
            <DashboardFeedback kind="error" text={error} />
          </div>
        ) : null}

        {filter === "all" && rows.length > 0 ? (
          <p className="border-b border-border bg-muted/15 px-2.5 py-1 text-[10px] tabular-nums text-muted-foreground">
            {pendingCount} pending · {orderedCount} ordered
          </p>
        ) : null}

        {/* List */}
        {!branchId ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-muted-foreground">
              Choose a branch to see the order pad.
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-1.5 py-8 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <ClipboardList
              className="mx-auto size-6 text-muted-foreground/40"
              aria-hidden
            />
            <p className="mt-2 text-xs font-medium">Nothing here</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {canWrite
                ? "Tap Add to put products on the pad."
                : "Staff add items from the till or stock screens."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const busy = busyId === row.id;
              const when = formatWhen(row.createdAt);
              const canRemove = canManage || (canWrite && !row.ordered);

              return (
                <li
                  key={row.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5",
                    row.ordered && "bg-muted/20",
                  )}
                >
                  {canManage ? (
                    <label className="flex size-9 shrink-0 cursor-pointer touch-manipulation items-center justify-center">
                      <input
                        type="checkbox"
                        className="size-[18px] accent-foreground"
                        checked={row.ordered}
                        disabled={busy}
                        onChange={(e) =>
                          void toggleOrdered(row, e.target.checked)
                        }
                        aria-label={
                          row.ordered
                            ? `Mark ${row.itemName} as not ordered`
                            : `Mark ${row.itemName} as ordered`
                        }
                      />
                    </label>
                  ) : (
                    <span
                      className={cn(
                        "ml-2 mr-1 size-2 shrink-0 rounded-full",
                        row.ordered ? "bg-emerald-600" : "bg-amber-500",
                      )}
                      aria-hidden
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <p
                        className={cn(
                          "min-w-0 truncate text-[13px] font-medium leading-tight",
                          row.ordered && "text-muted-foreground line-through",
                        )}
                      >
                        {row.itemName}
                      </p>
                      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-foreground">
                        ×{formatQty(row.quantity)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] leading-none text-muted-foreground">
                      {row.createdByName}
                      {when ? ` · ${when}` : ""}
                      {row.note ? ` · ${row.note}` : ""}
                      {row.ordered && row.orderedByName
                        ? ` · ✓ ${row.orderedByName}`
                        : ""}
                    </p>
                  </div>

                  {canRemove ? (
                    <button
                      type="button"
                      className="flex size-9 shrink-0 touch-manipulation items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
                      disabled={busy}
                      aria-label={`Remove ${row.itemName}`}
                      onClick={() => void removeRow(row)}
                    >
                      {busy ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="size-3.5" aria-hidden />
                      )}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canWrite ? (
        <OrderPadDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          branchId={branchId}
          canWrite={canWrite}
          onSaved={() => void load()}
        />
      ) : null}
    </div>
  );
}
