"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, PackagePlus, Trash2 } from "lucide-react";

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
  deleteStockTakeRestockItem,
  fetchBranches,
  fetchStockTakeRestockReview,
  patchStockTakeRestockItem,
  postStockTakeRestockApprove,
  postStockTakeRestockGenerateOrder,
  postStockTakeRestockReject,
  type BranchRecord,
  type StockTakeRestockItemRecord,
  type StockTakeRestockReviewRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function num(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n.toLocaleString() : String(v);
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "order_drafted", label: "Order drafted" },
  { value: "ordered", label: "Ordered" },
  { value: "received", label: "Received" },
  { value: "rejected", label: "Rejected" },
];

export default function StockTakeRestockReviewPage() {
  const { me } = useDashboard();
  const canApprove = hasPermission(me?.permissions, Permission.StocktakeApprove);

  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(todayStr);
  const [status, setStatus] = useState("pending");
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [review, setReview] = useState<StockTakeRestockReviewRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [draftQty, setDraftQty] = useState<Record<string, string>>({});
  const [createPurchaseOrders, setCreatePurchaseOrders] = useState(false);
  const [sendPurchaseOrders, setSendPurchaseOrders] = useState(false);

  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
  });

  const totalItems = useMemo(
    () => review?.groups.reduce((sum, g) => sum + g.items.length, 0) ?? 0,
    [review],
  );

  const loadReview = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStockTakeRestockReview(branchId, date, status);
      setReview(data);
      const prices: Record<string, string> = {};
      const qtys: Record<string, string> = {};
      for (const group of data.groups) {
        for (const item of group.items) {
          prices[item.id] =
            item.buyingPrice != null ? String(item.buyingPrice) : "";
          qtys[item.id] = String(item.suggestedQty);
        }
      }
      setDraftPrices(prices);
      setDraftQty(qtys);
    } catch (e) {
      setReview(null);
      setError(e instanceof Error ? e.message : "Restock review not available");
    } finally {
      setLoading(false);
    }
  }, [branchId, date, status]);

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
  }, [branchId, date, status, canApprove, loadReview]);

  const runItemAction = async (
    item: StockTakeRestockItemRecord,
    action: "approve" | "reject" | "delete" | "save",
    rejectReason?: string,
  ) => {
    setActionId(item.id);
    setError(null);
    try {
      if (action === "save") {
        await patchStockTakeRestockItem(item.id, {
          suggestedQty: draftQty[item.id] || item.suggestedQty,
          buyingPrice:
            draftPrices[item.id] === ""
              ? null
              : draftPrices[item.id] ?? item.buyingPrice,
        });
      } else if (action === "approve") {
        if (draftPrices[item.id] !== undefined || draftQty[item.id] !== undefined) {
          await patchStockTakeRestockItem(item.id, {
            suggestedQty: draftQty[item.id] || item.suggestedQty,
            buyingPrice:
              draftPrices[item.id] === ""
                ? null
                : draftPrices[item.id] ?? item.buyingPrice,
          });
        }
        await postStockTakeRestockApprove(item.id);
      } else if (action === "reject") {
        await postStockTakeRestockReject(item.id, rejectReason ?? "Declined");
      } else {
        await deleteStockTakeRestockItem(item.id);
      }
      await loadReview();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const generateOrders = async () => {
    if (!branchId) return;
    setActionId("generate");
    setError(null);
    try {
      await postStockTakeRestockGenerateOrder(branchId, date, {
        createPathAPurchaseOrders: createPurchaseOrders,
        sendPurchaseOrders: createPurchaseOrders && sendPurchaseOrders,
      });
      await loadReview();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate orders");
    } finally {
      setActionId(null);
    }
  };

  if (!canApprove) {
    return (
      <DashboardAccessDenied
        title="Restock review"
        description="You need stock take approval access to review restock suggestions."
      />
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX, "mx-auto space-y-4 px-4 pb-12 pt-4")}>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={APP_ROUTES.inventoryStockTake}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Stock take
        </Link>
        <span>·</span>
        <Link
          href={APP_ROUTES.inventoryStockTakeDailyAuditReview}
          className="hover:text-foreground"
        >
          Daily audit review
        </Link>
        <span>·</span>
        <Link
          href={APP_ROUTES.inventoryStockTakeRestockOrders}
          className="hover:text-foreground"
        >
          Order history
        </Link>
      </div>

      <DashboardPageHero
        icon={PackagePlus}
        eyebrow="Stock Take"
        title="Restock review"
        description="Review daily audit restock suggestions, adjust prices, and generate supplier orders."
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
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Status</span>
          <select
            className={dashboardSelectClass()}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="outline"
          disabled={actionId === "generate" || status !== "approved"}
          onClick={() => void generateOrders()}
        >
          {actionId === "generate" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Generate supplier orders
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={createPurchaseOrders}
            onChange={(e) => {
              setCreatePurchaseOrders(e.target.checked);
              if (!e.target.checked) setSendPurchaseOrders(false);
            }}
            disabled={status !== "approved"}
          />
          Also create Path A purchase orders
        </label>
        {createPurchaseOrders ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendPurchaseOrders}
              onChange={(e) => setSendPurchaseOrders(e.target.checked)}
              disabled={status !== "approved"}
            />
            Send POs immediately
          </label>
        ) : null}
      </div>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading restock suggestions…
        </div>
      ) : totalItems === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No restock suggestions yet.
        </div>
      ) : (
        review?.groups.map((group) => (
          <section key={group.supplierId} className="rounded-xl border bg-card shadow-sm">
            <header className="border-b px-4 py-3">
              <h2 className="font-semibold">{group.supplierName}</h2>
              <p className="text-xs text-muted-foreground">
                {group.supplierPhone ? `Phone ${group.supplierPhone}` : "No phone"}
                {group.supplierEmail ? ` · ${group.supplierEmail}` : ""}
              </p>
              <p className="mt-1 text-sm">
                Supplier total: KES {num(group.supplierSubtotal)}
              </p>
            </header>
            <div className="divide-y">
              {group.items.map((item) => (
                <div key={item.id} className="space-y-3 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU {item.itemSku ?? "—"} · Added by {item.addedByName} ·{" "}
                        {new Date(item.addedAt).toLocaleString()}
                      </p>
                      {item.notes ? (
                        <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">
                      {item.status.replace("_", " ")}
                    </span>
                  </div>

                  {item.status === "pending" || item.status === "approved" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm">
                        <span>Quantity</span>
                        <input
                          className={dashboardInputClass()}
                          value={draftQty[item.id] ?? String(item.suggestedQty)}
                          onChange={(e) =>
                            setDraftQty((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          disabled={item.status !== "pending" && item.status !== "approved"}
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span>Buying price</span>
                        <input
                          className={dashboardInputClass()}
                          value={draftPrices[item.id] ?? ""}
                          placeholder="Required before approve"
                          onChange={(e) =>
                            setDraftPrices((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          disabled={item.status !== "pending"}
                        />
                      </label>
                    </div>
                  ) : (
                    <p className="text-sm">
                      Qty {num(item.suggestedQty)} · Price KES {num(item.buyingPrice)} · Total KES{" "}
                      {num(item.lineTotal)}
                    </p>
                  )}

                  {item.status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionId === item.id}
                        onClick={() => void runItemAction(item, "save")}
                      >
                        Save edits
                      </Button>
                      <Button
                        size="sm"
                        disabled={actionId === item.id}
                        onClick={() => void runItemAction(item, "approve")}
                      >
                        {actionId === item.id ? (
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
                        variant="outline"
                        disabled={actionId === item.id}
                        onClick={() =>
                          void runItemAction(item, "reject", "Not needed this cycle")
                        }
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={actionId === item.id}
                        onClick={() => void runItemAction(item, "delete")}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ) : null}

                  {item.orderNumber ? (
                    <p className="text-xs text-muted-foreground">Order {item.orderNumber}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
