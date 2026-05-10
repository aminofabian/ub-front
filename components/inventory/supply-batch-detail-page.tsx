"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Warehouse,
  XOctagon,
  CheckCircle2,
  Trash2,
} from "lucide-react";

import { DASHBOARD_MAX, DashboardNotice } from "@/components/dashboard-page-ui";
import { ClearingDrawer } from "@/components/inventory/clearing-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplyBatchDetail,
  patchSupplyBatch,
  recalculateSupplyBatch,
  clearSupplyBatch,
  postStandaloneWastage,
  type SupplyBatchDetailRecord,
  type SupplyBatchItemRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

const DISPOSITION_CATEGORIES = [
  { key: "expired", label: "Expired" },
  { key: "spoiled", label: "Spoilage" },
  { key: "broken", label: "Breakage" },
  { key: "stolen", label: "Theft" },
  { key: "donated", label: "Sample/Donation" },
  { key: "staffConsumption", label: "Staff consumption" },
  { key: "countingError", label: "Counting error" },
  { key: "other", label: "Other" },
];

function formatQty(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatMoney(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusBadge(status: string) {
  const s = status?.toLowerCase() ?? "";
  if (s === "active")
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600">
        ● Active
      </span>
    );
  if (s === "soldout" || s === "sold_out" || s === "sold out")
    return (
      <span className="inline-flex items-center gap-1 text-blue-600">
        ✅ Sold out
      </span>
    );
  if (s === "partial")
    return (
      <span className="inline-flex items-center gap-1 text-amber-600">
        ⚠️ Partial
      </span>
    );
  if (s === "closed")
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        🔴 Closed
      </span>
    );
  return <span className="text-muted-foreground">{status}</span>;
}

const WASTAGE_REASONS = [
  { value: "EXPIRED", label: "Expired" },
  { value: "SPOILAGE", label: "Spoilage" },
  { value: "BREAKAGE", label: "Breakage" },
  { value: "THEFT", label: "Theft" },
  { value: "SAMPLE", label: "Sample" },
  { value: "PERSONAL_USE", label: "Personal use" },
  { value: "COUNTING_ERROR", label: "Counting error" },
  { value: "OTHER", label: "Other" },
];

export function SupplyBatchDetailPage({ batchId }: { batchId: string }) {
  const { me } = useDashboard();
  const router = useRouter();
  const canRead = hasPermission(me?.permissions, Permission.InventoryRead);
  const canWrite = hasPermission(me?.permissions, Permission.InventoryWrite);

  const [data, setData] = useState<SupplyBatchDetailRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Clear dialog state
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearReason, setClearReason] = useState("EXPIRED");
  const [clearNotes, setClearNotes] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{
    totalWriteOffValue: number | string;
    journalEntryId: string | null;
  } | null>(null);

  // Clearing wizard state
  const [clearingStep, setDialogStep] = useState<
    "review" | "allocate" | "confirm"
  >("review");
  const [dialogMode, setDialogMode] = useState<"wastage" | "clear">("clear");
  const [allocations, __unused2] = useState<
    Record<string, Record<string, number>>
  >({});

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    try {
      const row = await fetchSupplyBatchDetail(batchId);
      setData(row);
      setNameDraft(row.batchName ?? "");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to load batch detail.",
      );
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    if (!canRead) return;
    load();
  }, [canRead, load]);

  const saveName = async () => {
    if (!canWrite || !data) return;
    setSavingName(true);
    try {
      await patchSupplyBatch(data.id, {
        batchName: nameDraft.trim() || undefined,
      });
      setEditingName(false);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to save name.",
      );
    } finally {
      setSavingName(false);
    }
  };

  const handleRecalculate = async () => {
    if (!canWrite || !data) return;
    setLoading(true);
    try {
      await recalculateSupplyBatch(data.id);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to recalculate.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!canWrite || !data) return;
    setClearing(true);
    try {
      const result = await clearSupplyBatch(data.id, {
        reason: clearReason,
        notes: clearNotes || null,
      });
      setClearResult(result);
      setShowClearDialog(false);
      setDialogMode("clear");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to clear batch.",
      );
    } finally {
      setClearing(false);
    }
  };

  const handleRecordWastage = async () => {
    if (!canWrite || !data) return;
    setClearing(true);
    try {
      const branchId = data.branchId;
      for (const it of itemsWithRemaining) {
        const alloc = allocations[it.inventoryBatchId] ?? {};
        const entries = Object.entries(alloc).filter(
          ([key]) => key !== "stillInStorage",
        );
        for (const [key, qty] of entries) {
          const n = Number(qty || 0);
          if (n <= 0) continue;
          const label =
            DISPOSITION_CATEGORIES.find((c) => c.key === key)?.label ?? key;
          await postStandaloneWastage({
            branchId,
            itemId: it.itemId,
            batchId: it.inventoryBatchId,
            quantity: n,
            unitCost: it.unitCost,
            reason: label + (clearNotes ? " — " + clearNotes : ""),
            wastageReason:
              key === "spoiled"
                ? "SPOILAGE"
                : key === "broken"
                  ? "BREAKAGE"
                  : key === "stolen"
                    ? "THEFT"
                    : key === "donated"
                      ? "SAMPLE"
                      : key === "staffConsumption"
                        ? "PERSONAL_USE"
                        : key === "countingError"
                          ? "COUNTING_ERROR"
                          : "OTHER",
          });
        }
      }
      setShowClearDialog(false);
      setDialogMode("clear");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to record wastage.",
      );
    } finally {
      setClearing(false);
    }
  };

  const itemsWithRemaining =
    data?.items.filter((it) => Number(it.quantityRemaining) > 0) ?? [];

  const allItemsBalanced = itemsWithRemaining.every((it) => {
    const alloc = allocations[it.inventoryBatchId] ?? {};
    const total = Object.values(alloc).reduce(
      (s: number, v) => s + (Number(v) || 0),
      0,
    );
    return Math.abs(total - Number(it.quantityRemaining)) < 0.001;
  });

  const isClosed = data?.status?.toLowerCase() === "closed";
  const isSoldout = data?.status?.toLowerCase() === "soldout";
  const canClear = canWrite && !isClosed && !clearing;

  if (!canRead) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardNotice text="You do not have permission to view supply batch details." />
      </div>
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={APP_ROUTES.inventorySupplyBatches}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Supply Batches
          </Link>
        </div>

        {message ? <DashboardNotice text={message} /> : null}

        {clearResult && (
          <div className="rounded-md border bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Batch cleared successfully
            </div>
            {Number(clearResult.totalWriteOffValue) > 0 && (
              <div className="mt-1">
                Total write-off value:{" "}
                <strong>{formatMoney(clearResult.totalWriteOffValue)}</strong>
                {clearResult.journalEntryId && (
                  <span className="ml-2 text-muted-foreground">
                    (Journal: {clearResult.journalEntryId})
                  </span>
                )}
              </div>
            )}
            <button
              className="mt-2 text-xs underline"
              onClick={() => setClearResult(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {data ? (
          <>
            <div className="space-y-4 rounded-md border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-muted-foreground" />
                    <h1 className="text-lg font-semibold">
                      Supply Batch {data.batchNumber}
                    </h1>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Supplier: {data.supplierName ?? "—"} · Received:{" "}
                    {new Date(data.receivedAt).toLocaleString()}
                  </div>
                  {data.closedAt && (
                    <div className="text-sm text-muted-foreground">
                      Closed: {new Date(data.closedAt).toLocaleString()}
                      {data.closedBy ? ` · by ${data.closedBy}` : ""}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {canWrite && !isClosed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDialogMode("wastage");
                        setClearReason(WASTAGE_REASONS[0].value);
                        setClearNotes("");
                        setShowClearDialog(true);
                      }}
                      disabled={loading}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Record wastage
                    </Button>
                  )}
                  {canClear && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDialogMode("clear");
                        setClearReason("EXPIRED");
                        setClearNotes("");
                        setShowClearDialog(true);
                      }}
                      disabled={loading}
                    >
                      <XOctagon className="mr-1 h-4 w-4" />
                      {isSoldout || Number(data.totalRemainingQuantity) === 0
                        ? "Close batch"
                        : "Clear batch"}
                    </Button>
                  )}
                  {canWrite && !isClosed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRecalculate}
                      disabled={loading}
                    >
                      Recalculate
                    </Button>
                  )}
                  <div className="text-sm">{statusBadge(data.status)}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">Name:</span>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="rounded border bg-background px-2 py-1 text-sm"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      autoFocus
                    />
                    <Button size="sm" onClick={saveName} disabled={savingName}>
                      {savingName ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingName(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {data.batchName ?? "—"}
                    </span>
                    {canWrite && !isClosed && (
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => setEditingName(true)}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                <div className="rounded border bg-background p-3 text-center">
                  <div className="text-xs text-muted-foreground">Items</div>
                  <div className="text-lg font-semibold">{data.itemCount}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatQty(data.totalInitialQuantity)} units
                  </div>
                </div>
                <div className="rounded border bg-background p-3 text-center">
                  <div className="text-xs text-muted-foreground">Cost</div>
                  <div className="text-lg font-semibold">
                    {formatMoney(data.totalCost)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    landed
                  </div>
                </div>
                <div className="rounded border bg-background p-3 text-center">
                  <div className="text-xs text-muted-foreground">Revenue</div>
                  <div className="text-lg font-semibold text-emerald-600">
                    {formatMoney(data.totalRevenue)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {data.soldPercentage}% of batch
                  </div>
                </div>
                <div className="rounded border bg-background p-3 text-center">
                  <div className="text-xs text-muted-foreground">Extras</div>
                  <div className="text-lg font-semibold">
                    {formatMoney(data.totalAssociatedCosts)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {data.expenses?.length ?? 0} cost(s)
                  </div>
                </div>
                <div className="rounded border bg-background p-3 text-center">
                  <div className="text-xs text-muted-foreground">
                    Net Profit
                  </div>
                  <div
                    className={`text-lg font-semibold ${Number(data.totalRevenue) - Number(data.totalCost) - Number(data.totalAssociatedCosts) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {formatMoney(
                      Number(data.totalRevenue) -
                        Number(data.totalCost) -
                        Number(data.totalAssociatedCosts),
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {Number(data.totalRevenue) > 0
                      ? Math.round(
                          ((Number(data.totalRevenue) -
                            Number(data.totalCost) -
                            Number(data.totalAssociatedCosts)) /
                            Number(data.totalRevenue)) *
                            100,
                        )
                      : 0}
                    % margin
                  </div>
                </div>
                <div className="rounded border bg-background p-3 text-center">
                  <div className="text-xs text-muted-foreground">Expiry</div>
                  {(() => {
                    const expDates = data.items
                      .filter((it) => it.expiryDate)
                      .map((it) => new Date(it.expiryDate).getTime());
                    if (expDates.length === 0)
                      return <div className="text-lg font-semibold">--</div>;
                    const earliest = Math.min(...expDates);
                    const days = Math.ceil(
                      (earliest - Date.now()) / (1000 * 60 * 60 * 24),
                    );
                    return (
                      <>
                        <div
                          className={`text-lg font-semibold ${days < 0 ? "text-red-600" : days < 7 ? "text-amber-600" : "text-emerald-600"}`}
                        >
                          {days < 0 ? "Expired" : days + "d"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(earliest).toLocaleDateString()}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Items in this batch
              </h2>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Received
                      </th>
                      <th className="px-3 py-2 text-right font-medium">Sold</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Waste
                      </th>
                      <th className="px-3 py-2 text-right font-medium">Left</th>
                      <th className="px-3 py-2 text-right font-medium">Cost</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-6 text-center text-muted-foreground"
                        >
                          No items in this batch.
                        </td>
                      </tr>
                    ) : (
                      data.items.map((it) => (
                        <tr
                          key={it.inventoryBatchId}
                          className="border-b last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-3 py-2">
                            <div className="font-medium">
                              {it.itemName ?? it.itemId}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {it.itemSku}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatQty(it.initialQuantity)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatQty(it.quantitySold)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatQty(it.quantityWasted)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatQty(it.quantityRemaining)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatQty(it.unitCost)}
                          </td>
                          <td className="px-3 py-2">
                            {statusBadge(it.status)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : "No batch data."}
          </p>
        )}
      </div>

      {/* Clearing / wastage drawer */}
      {showClearDialog && data && (
        <ClearingDrawer
          open={showClearDialog}
          onOpenChange={setShowClearDialog}
          data={data}
          mode={dialogMode}
          onDone={load}
        />
      )}
    </div>
  );
}
