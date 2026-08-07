"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  dashboardSelectClass,
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

function formatQty(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
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
  const [filter, setFilter] = useState<"pending" | "ordered" | "all">("pending");
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

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Order pad"
        description="You need order pad access to view this list."
      />
    );
  }

  const pendingCount = rows.filter((r) => !r.ordered).length;
  const orderedCount = rows.filter((r) => r.ordered).length;

  return (
    <div className={cn(DASHBOARD_MAX, "mx-auto space-y-4 px-4 pb-12 pt-4")}>
      <DashboardPageHero
        icon={ClipboardList}
        eyebrow="Inventory"
        title="Order pad"
        description="Items cashiers and stock managers flagged to order. Admins check off what has already been ordered."
      >
        {canWrite ? (
          <Button
            type="button"
            className="rounded-none"
            onClick={() => setDrawerOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            Add items
          </Button>
        ) : null}
      </DashboardPageHero>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Branch</span>
          <select
            className={cn(dashboardSelectClass, "rounded-none")}
            value={branchId}
            disabled={branchLocked}
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
        <label className="flex min-w-[10rem] flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Show</span>
          <select
            className={cn(dashboardSelectClass, "rounded-none")}
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as "pending" | "ordered" | "all")
            }
          >
            <option value="pending">Not ordered yet</option>
            <option value="ordered">Already ordered</option>
            <option value="all">Everything</option>
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          className="rounded-none"
          onClick={() => void load()}
          disabled={loading || !branchId}
        >
          Refresh
        </Button>
      </div>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {!branchId ? (
        <p className="border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
          Choose a branch to see the order pad.
        </p>
      ) : loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="border border-dashed border-border/70 px-4 py-10 text-center">
          <ClipboardList className="mx-auto size-8 text-muted-foreground/50" aria-hidden />
          <p className="mt-3 text-sm font-medium">No items on this view</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canWrite
              ? "Use Add items to put products on the pad."
              : "Staff will add items from the till or stock screens."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filter === "all" ? (
            <p className="text-xs text-muted-foreground">
              {pendingCount} waiting · {orderedCount} ordered
            </p>
          ) : null}
          <ul className="divide-y divide-border/70 border border-border/70">
            {rows.map((row) => {
              const busy = busyId === row.id;
              return (
                <li
                  key={row.id}
                  className={cn(
                    "flex items-start gap-3 px-3 py-3 sm:px-4",
                    row.ordered && "bg-muted/25",
                  )}
                >
                  {canManage ? (
                    <label className="mt-0.5 flex shrink-0 cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 accent-foreground"
                        checked={row.ordered}
                        disabled={busy}
                        onChange={(e) => void toggleOrdered(row, e.target.checked)}
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
                        "mt-1 size-2.5 shrink-0 rounded-full",
                        row.ordered ? "bg-emerald-600" : "bg-amber-500",
                      )}
                      aria-hidden
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "font-medium leading-snug",
                        row.ordered && "text-muted-foreground line-through",
                      )}
                    >
                      {row.itemName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Qty {formatQty(row.quantity)}
                      {row.itemId ? " · Catalog" : " · Free text"}
                      {" · "}
                      {row.createdByName}
                      {" · "}
                      {formatWhen(row.createdAt)}
                    </p>
                    {row.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">{row.note}</p>
                    ) : null}
                    {row.ordered && row.orderedByName ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Ordered by {row.orderedByName}
                        {row.orderedAt ? ` · ${formatWhen(row.orderedAt)}` : ""}
                      </p>
                    ) : null}
                  </div>

                  {(canManage || (canWrite && !row.ordered)) && (
                    <button
                      type="button"
                      className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
                      disabled={busy}
                      aria-label={`Remove ${row.itemName}`}
                      onClick={() => void removeRow(row)}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="size-4" aria-hidden />
                      )}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

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
