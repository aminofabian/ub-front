"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRightLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Search,
  AlertTriangle,
  Lock,
  Loader2,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchStockTakeSession,
  postStockTakeConfirmLine,
  postStockTakeClose,
  type StockTakeSessionRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────

function parseNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : parseFloat(v) || 0;
}

function varianceColor(variance: number): string {
  if (variance === 0) return "text-emerald-600";
  if (Math.abs(variance) <= 2) return "text-amber-600";
  return "text-red-600";
}

function formatQty(v: number | string | null | undefined): string {
  if (v == null) return "—";
  return String(v);
}

type FilterMode = "all" | "pending" | "confirmed" | "not-counted";

// ── Page ──────────────────────────────────────────────────────────────

export default function StockTakeReviewPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { me } = useDashboard();
  const canApprove = hasPermission(
    me?.permissions,
    Permission.StocktakeApprove,
  );
  const canRead = hasPermission(me?.permissions, Permission.StocktakeRead);
  const allowed = canRead || canApprove;

  const [session, setSession] = useState<StockTakeSessionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  // Per-line admin edit state
  const [adminQtys, setAdminQtys] = useState<Record<string, string>>({});

  // Close dialog
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeForce, setCloseForce] = useState(false);

  // ── Load session
  useEffect(() => {
    if (!sessionId || !allowed) return;
    let cancelled = false;
    setLoading(true);
    setMessage("");
    fetchStockTakeSession(sessionId)
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        // Init admin quantities from countedQty or adminQuantity
        const map: Record<string, string> = {};
        for (const line of s.lines) {
          if (line.countedQty != null) {
            map[line.id] = String(line.adminQuantity ?? line.countedQty);
          }
        }
        setAdminQtys(map);
        setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setMessage(
            e instanceof Error ? e.message : "Failed to load session.",
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, allowed]);

  // ── Confirm a line
  const onConfirmLine = useCallback(
    async (lineId: string) => {
      if (!session || !canApprove) return;
      const qty = adminQtys[lineId]?.trim();
      if (!qty) return;
      setLoading(true);
      setMessage("");
      try {
        const s = await postStockTakeConfirmLine(session.id, lineId, qty);
        setSession(s);
        // Update adminQtys for the confirmed line
        const confirmedLine = s.lines.find((l) => l.id === lineId);
        if (confirmedLine) {
          setAdminQtys((prev) => ({
            ...prev,
            [lineId]: String(
              confirmedLine.adminQuantity ?? confirmedLine.countedQty ?? "",
            ),
          }));
        }
        setMessage("Line confirmed. Inventory updated.");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Confirmation failed.");
      } finally {
        setLoading(false);
      }
    },
    [session, adminQtys, canApprove],
  );

  // ── Close session
  const onCloseSession = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setMessage("");
    try {
      const s = await postStockTakeClose(session.id, closeForce);
      setSession(s);
      setShowCloseDialog(false);
      setMessage("Session closed.");
    } catch (e) {
      const err = e instanceof Error ? e.message : "Close failed.";
      if (err.includes("unconfirmed") || err.includes("409")) {
        setCloseForce(true);
        setMessage(`${err} Click "End Stocktake" again to force close.`);
      } else {
        setMessage(err);
      }
    } finally {
      setLoading(false);
    }
  }, [session, closeForce]);

  // ── Filtered & sorted lines
  const filteredLines = useMemo(() => {
    if (!session) return [];
    let lines = [...session.lines];

    // Apply status filter
    if (filter === "pending") {
      lines = lines.filter((l) => l.status === "submitted");
    } else if (filter === "confirmed") {
      lines = lines.filter((l) => l.status === "confirmed");
    } else if (filter === "not-counted") {
      lines = lines.filter((l) => l.status === "pending");
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      lines = lines.filter(
        (l) =>
          l.itemName.toLowerCase().includes(q) ||
          (l.itemSku ?? "").toLowerCase().includes(q) ||
          l.itemId.toLowerCase().includes(q),
      );
    }

    return lines;
  }, [session, filter, search]);

  // ── Summary counts
  const summary = useMemo(() => {
    if (!session) return null;
    const lines = session.lines;
    const total = lines.length;
    const confirmed = lines.filter((l) => l.status === "confirmed").length;
    const notCounted = lines.filter((l) => l.status === "pending").length;
    const pending = lines.filter((l) => l.status === "submitted").length;
    return { total, confirmed, notCounted, pending };
  }, [session]);

  const unconfirmedCount = useMemo(() => {
    if (!session) return 0;
    return session.lines.filter((l) => l.status === "submitted").length;
  }, [session]);

  // ── Guard
  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Stock Take Review"
        description={
          <>
            You need{" "}
            <code className="text-xs">{Permission.StocktakeApprove}</code> or{" "}
            <code className="text-xs">{Permission.StocktakeRead}</code>.
          </>
        }
        backHref={APP_ROUTES.inventoryStockTake}
        backLabel="Stock take"
      />
    );
  }

  if (loading) {
    return (
      <div className={DASHBOARD_MAX}>
        <div className="flex items-center gap-3 py-10 justify-center text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading session…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardFeedback
          kind="error"
          text={message || "Session not found."}
        />
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.history.back()}
        >
          ← Back
        </Button>
      </div>
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-6">
        {/* Header */}
        <header className="space-y-4">
          <DashboardPageHero
            icon={ClipboardList}
            eyebrow="Stock Take Review"
            title={session.name || "Stock Take"}
            description={
              session.sessionNumber > 0
                ? `Session #${session.sessionNumber}`
                : `Session ID: ${session.id}`
            }
          />
          <DashboardQuickLinks
            links={[
              {
                href: APP_ROUTES.inventoryStockTake,
                label: "Stock take",
                desc: "Back to list",
                icon: ClipboardList,
              },
              {
                href: APP_ROUTES.inventoryValuation,
                label: "Valuation",
                desc: "Value on hand",
                icon: BarChart3,
              },
              {
                href: APP_ROUTES.inventoryTransfers,
                label: "Transfers",
                desc: "Move stock",
                icon: ArrowRightLeft,
              },
            ]}
          />
        </header>

        {/* Summary cards */}
        {summary ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-xs text-muted-foreground">Total items</div>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-amber-600">
                {summary.pending}
              </div>
              <div className="text-xs text-muted-foreground">
                Pending review
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-emerald-600">
                {summary.confirmed}
              </div>
              <div className="text-xs text-muted-foreground">Confirmed</div>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-muted-foreground">
                {summary.notCounted}
              </div>
              <div className="text-xs text-muted-foreground">Not counted</div>
            </div>
          </div>
        ) : null}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filters */}
          <div className="flex gap-1 rounded-md border bg-muted/30 p-0.5">
            {(
              ["all", "pending", "confirmed", "not-counted"] as FilterMode[]
            ).map((f) => (
              <button
                key={f}
                type="button"
                className={cn(
                  "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                  filter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setFilter(f)}
              >
                {f === "not-counted" ? "Not counted" : f}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-xs"
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* End Stocktake */}
          {canApprove && session.status === "in_progress" ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={() => setShowCloseDialog(true)}
              className="ml-auto"
            >
              <Lock className="mr-1.5 size-3.5" />
              End Stocktake
            </Button>
          ) : null}
        </div>

        {/* Review table */}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="sticky top-0 border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 text-right font-medium">System</th>
                <th className="px-3 py-2.5 text-right font-medium">Counted</th>
                <th className="px-3 py-2.5 text-right font-medium">
                  Admin Qty
                </th>
                <th className="px-3 py-2.5 text-right font-medium">Variance</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLines.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    {filter === "pending"
                      ? "No pending items to review."
                      : filter === "confirmed"
                        ? "No confirmed items yet."
                        : filter === "not-counted"
                          ? "All items have been counted."
                          : "No items match the current filter."}
                  </td>
                </tr>
              ) : (
                filteredLines.map((line) => {
                  const label = line.itemName;
                  const sku = line.itemSku ?? "";
                  const system = parseNum(line.systemQtySnapshot);
                  const adminQty = parseNum(adminQtys[line.id]);
                  const variance = adminQty - system;
                  const isConfirmed = line.status === "confirmed";
                  const isCounted = line.countedQty != null;

                  return (
                    <tr
                      key={line.id}
                      className={cn(
                        "border-b last:border-0",
                        isConfirmed &&
                          "bg-emerald-50/30 dark:bg-emerald-950/10",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <div className="max-w-[14rem] truncate font-medium">
                          {label}
                        </div>
                        {sku ? (
                          <div className="text-xs text-muted-foreground">
                            {sku}
                          </div>
                        ) : null}
                        {line.aisle ? (
                          <div className="text-[10px] text-muted-foreground">
                            Aisle: {line.aisle}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatQty(line.systemQtySnapshot)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {isCounted ? formatQty(line.countedQty) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {isConfirmed ? (
                          <span className="tabular-nums text-muted-foreground">
                            {formatQty(line.adminQuantity ?? line.countedQty)}
                          </span>
                        ) : isCounted && canApprove ? (
                          <input
                            type="number"
                            inputMode="decimal"
                            className="w-20 rounded border bg-background px-2 py-1 text-right text-sm tabular-nums"
                            value={adminQtys[line.id] ?? ""}
                            onChange={(e) =>
                              setAdminQtys((prev) => ({
                                ...prev,
                                [line.id]: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right tabular-nums font-medium",
                          isCounted
                            ? varianceColor(variance)
                            : "text-muted-foreground",
                        )}
                      >
                        {isCounted
                          ? variance > 0
                            ? `+${variance}`
                            : String(variance)
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                            <CheckCircle2 className="size-3" />
                            Confirmed
                          </span>
                        ) : isCounted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                            <Clock className="size-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Not counted
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {canApprove && isCounted && !isConfirmed ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={loading}
                            onClick={() => onConfirmLine(line.id)}
                          >
                            Confirm
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Message */}
        {message ? (
          <DashboardFeedback
            kind={/confirmed|closed/i.test(message) ? "success" : "error"}
            text={message}
          />
        ) : null}

        {/* Close confirmation dialog */}
        {showCloseDialog ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-6 shrink-0 text-amber-500" />
                <div>
                  <h3 className="font-semibold">End Stocktake?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {unconfirmedCount > 0
                      ? `${unconfirmedCount} items are still unconfirmed. Their variance will NOT be applied to inventory.`
                      : "All items are confirmed. The session will be closed."}
                  </p>
                  {session.status === "closed" ? (
                    <p className="mt-2 text-sm font-medium text-emerald-600">
                      This session is already closed.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCloseDialog(false);
                    setCloseForce(false);
                  }}
                >
                  Cancel
                </Button>
                {session.status !== "closed" ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={loading}
                    onClick={onCloseSession}
                  >
                    {unconfirmedCount > 0 ? "Force Close" : "End Stocktake"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
