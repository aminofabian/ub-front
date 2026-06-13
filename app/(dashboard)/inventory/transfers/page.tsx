"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  ClipboardList,
  Layers,
  Package,
  PackageX,
  Plus,
  Truck,
  Warehouse,
  X,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  postCompleteStockTransfer,
  postStockTransfer,
  type BranchRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type LineDraft = { itemId: string; qty: string };

export default function InventoryTransfersPage() {
  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.InventoryTransfer);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ itemId: "", qty: "1" }]);
  const [lastTransferId, setLastTransferId] = useState("");
  const [completeId, setCompleteId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) setBranches(list.filter((b) => b.active));
      })
      .catch(() => {
        if (!cancelled) setMessage("Failed to load branches.");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  const onCreate = useCallback(async () => {
    setMessage("");
    const normalized = lines
      .map((l) => ({
        itemId: l.itemId.trim(),
        quantity: Number(l.qty),
      }))
      .filter(
        (l) =>
          l.itemId.length > 0 &&
          Number.isFinite(l.quantity) &&
          l.quantity > 0,
      );
    if (!fromBranchId.trim() || !toBranchId.trim()) {
      setMessage("Choose both branches.");
      return;
    }
    if (fromBranchId === toBranchId) {
      setMessage("From and to branch must differ.");
      return;
    }
    if (normalized.length === 0) {
      setMessage("Add at least one line with item ID and quantity.");
      return;
    }
    setLoading(true);
    try {
      const created = await postStockTransfer({
        fromBranchId: fromBranchId.trim(),
        toBranchId: toBranchId.trim(),
        notes: notes.trim() || null,
        lines: normalized,
      });
      setLastTransferId(created.id);
      setCompleteId(created.id);
      setMessage(`Draft transfer created (${created.status}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transfer failed.");
    } finally {
      setLoading(false);
    }
  }, [fromBranchId, lines, notes, toBranchId]);

  const onComplete = useCallback(async () => {
    const id = completeId.trim();
    if (!id) {
      setMessage("Enter a transfer ID to complete.");
      return;
    }
    setMessage("");
    setLoading(true);
    try {
      await postCompleteStockTransfer(id);
      setMessage("Transfer completed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Complete failed.");
    } finally {
      setLoading(false);
    }
  }, [completeId]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Stock transfers"
        description={
          <>
            You need{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {Permission.InventoryTransfer}
            </code>{" "}
            to create or complete transfers.
          </>
        }
        backHref={APP_ROUTES.inventoryStock}
        backLabel="Stock"
      />
    );
  }

  const messageIsSuccess = /created|completed|draft/i.test(message);

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-4">
        <header className="space-y-2 border-b border-border/50 pb-4">
          <DashboardPageHero
            compact
            icon={ArrowRightLeft}
            eyebrow="Inventory"
            title="Stock transfers"
            description="Move stock between branches — create a draft, then complete it."
          />
          <DashboardQuickLinks
            compact
            links={[
              {
                href: APP_ROUTES.inventoryStock,
                label: "Stock",
                desc: "On-hand",
                icon: Warehouse,
              },
              {
                href: APP_ROUTES.inventoryRestock,
                label: "Out of stock",
                desc: "Restock",
                icon: PackageX,
              },
              {
                href: APP_ROUTES.inventorySupplyBatches,
                label: "Supply batches",
                desc: "Cost layers",
                icon: Layers,
              },
              {
                href: APP_ROUTES.purchasingAddSupplies,
                label: "Receive supplies",
                desc: "New delivery",
                icon: Truck,
              },
              {
                href: APP_ROUTES.inventoryValuation,
                label: "Valuation",
                desc: "Extension value",
                icon: BarChart3,
              },
              {
                href: APP_ROUTES.inventoryStockTake,
                label: "Stock take",
                desc: "Counts",
                icon: ClipboardList,
              },
              {
                href: APP_ROUTES.products,
                label: "Products",
                desc: "Item IDs",
                icon: Package,
              },
            ]}
          />
        </header>

        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-3">
          <p className="text-xs font-semibold text-foreground">Create draft</p>

          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[9rem] flex-1 flex-col gap-0.5 text-xs sm:max-w-[11rem]">
              <span className="text-muted-foreground">From</span>
              <select
                className={cn(dashboardSelectClass(), "h-9 py-1.5 text-sm")}
                value={fromBranchId}
                onChange={(e) => setFromBranchId(e.target.value)}
                aria-label="From branch"
              >
                <option value="">Select…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[9rem] flex-1 flex-col gap-0.5 text-xs sm:max-w-[11rem]">
              <span className="text-muted-foreground">To</span>
              <select
                className={cn(dashboardSelectClass(), "h-9 py-1.5 text-sm")}
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                aria-label="To branch"
              >
                <option value="">Select…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[10rem] flex-[2] flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Notes</span>
              <input
                className={cn(dashboardInputClass(), "h-9 py-1.5 text-sm")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional…"
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              Lines · item ID + qty
            </p>
            {lines.map((line, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-1.5">
                <input
                  placeholder="Item ID"
                  aria-label={`Line ${idx + 1} item ID`}
                  className={cn(
                    dashboardInputClass(),
                    "h-8 min-w-[10rem] flex-1 py-1 font-mono text-xs",
                  )}
                  value={line.itemId}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...line, itemId: e.target.value };
                    setLines(next);
                  }}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={`Line ${idx + 1} quantity`}
                  className={cn(
                    dashboardInputClass(),
                    "h-8 w-20 py-1 text-right tabular-nums text-sm",
                  )}
                  value={line.qty}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...line, qty: e.target.value };
                    setLines(next);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={lines.length <= 1}
                  onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                  aria-label="Remove line"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => setLines([...lines, { itemId: "", qty: "1" }])}
            >
              <Plus className="size-3.5" />
              Add line
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-2.5">
            <Button
              type="button"
              size="sm"
              className="h-9"
              disabled={loading}
              onClick={() => void onCreate()}
            >
              {loading ? "Working…" : "Create draft"}
            </Button>
            {lastTransferId ? (
              <span className="text-[11px] text-muted-foreground">
                Last ID{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                  {lastTransferId}
                </code>
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
          <p className="mb-2 text-xs font-semibold text-foreground">
            Complete transfer
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Transfer ID</span>
              <input
                className={cn(
                  dashboardInputClass(),
                  "h-9 py-1.5 font-mono text-xs",
                )}
                value={completeId}
                onChange={(e) => setCompleteId(e.target.value)}
                placeholder="UUID"
                aria-label="Transfer ID to complete"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              disabled={loading}
              onClick={() => void onComplete()}
            >
              Complete
            </Button>
          </div>
        </div>

        {message ? (
          <p
            className={cn(
              "text-xs",
              messageIsSuccess
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-destructive",
            )}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
