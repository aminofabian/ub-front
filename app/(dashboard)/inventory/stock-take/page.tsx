"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, BarChart3, ClipboardList, MapPin } from "lucide-react";

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
  fetchBranches,
  fetchItems,
  fetchStockTakeSession,
  patchStockTakeCounts,
  postApproveStockAdjustment,
  postRejectStockAdjustment,
  postStockTakeClose,
  postStockTakeStart,
  type BranchRecord,
  type ItemSummaryRecord,
  type StockTakeSessionRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function qtyStr(v: number | string | null | undefined, fallback: string): string {
  if (v == null) {
    return fallback;
  }
  return typeof v === "number" ? String(v) : String(v);
}

export default function StockTakePage() {
  const { me } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.StocktakeRead);
  const canRun = hasPermission(me?.permissions, Permission.StocktakeRun);
  const canApprove = hasPermission(me?.permissions, Permission.StocktakeApprove);
  const allowed = canRead || canRun || canApprove;

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [itemsById, setItemsById] = useState<Record<string, ItemSummaryRecord>>({});
  const [branchId, setBranchId] = useState("");
  const [startNotes, setStartNotes] = useState("");
  const [loadSessionId, setLoadSessionId] = useState("");
  const [session, setSession] = useState<StockTakeSessionRecord | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [approveCosts, setApproveCosts] = useState<Record<string, string>>({});
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const applySession = useCallback((s: StockTakeSessionRecord) => {
    setSession(s);
    const next: Record<string, string> = {};
    for (const line of s.lines) {
      next[line.id] = qtyStr(line.countedQty, qtyStr(line.systemQtySnapshot, "0"));
    }
    setCounts(next);
  }, []);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) {
          setBranches(list.filter((b) => b.active));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("Failed to load branches.");
        }
      });
    fetchItems()
      .then((items) => {
        if (!cancelled) {
          const map: Record<string, ItemSummaryRecord> = {};
          for (const it of items) {
            map[it.id] = it;
          }
          setItemsById(map);
        }
      })
      .catch(() => {
        /* optional */
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  const loadSession = useCallback(async () => {
    const id = loadSessionId.trim();
    if (!id) {
      setMessage("Enter a session ID.");
      return;
    }
    setMessage("");
    setLoading(true);
    try {
      const s = await fetchStockTakeSession(id);
      applySession(s);
      setMessage("Session loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [applySession, loadSessionId]);

  const startSession = useCallback(async () => {
    if (!branchId.trim()) {
      setMessage("Choose a branch.");
      return;
    }
    setMessage("");
    setLoading(true);
    try {
      const s = await postStockTakeStart({
        branchId: branchId.trim(),
        notes: startNotes.trim() || null,
      });
      applySession(s);
      setLoadSessionId(s.id);
      setMessage("Session started.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Start failed.");
    } finally {
      setLoading(false);
    }
  }, [applySession, branchId, startNotes]);

  const saveCounts = useCallback(async () => {
    if (!session) {
      return;
    }
    setMessage("");
    setLoading(true);
    try {
      const lines = session.lines.map((l) => ({
        lineId: l.id,
        countedQty: counts[l.id] ?? "0",
      }));
      const s = await patchStockTakeCounts(session.id, lines);
      applySession(s);
      setMessage("Counts saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  }, [applySession, counts, session]);

  const closeSession = useCallback(async () => {
    if (!session) {
      return;
    }
    setMessage("");
    setLoading(true);
    try {
      const s = await postStockTakeClose(session.id);
      applySession(s);
      setMessage("Session closed; pending adjustments below need approval.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Close failed.");
    } finally {
      setLoading(false);
    }
  }, [applySession, session]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Stock take"
        description={
          <>
            You need at least one of{" "}
            <code className="text-xs">{Permission.StocktakeRead}</code>,{" "}
            <code className="text-xs">{Permission.StocktakeRun}</code>, or{" "}
            <code className="text-xs">{Permission.StocktakeApprove}</code>.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-8">
      <header className="space-y-4">
        <DashboardPageHero
          icon={ClipboardList}
          eyebrow="Inventory"
          title="Stock take"
          description="Start a count session for a branch, enter counted quantities, close to open adjustment requests, then approve or reject each variance."
        />
        <DashboardQuickLinks
          links={[
            { href: APP_ROUTES.inventoryValuation, label: "Valuation", desc: "Value on hand", icon: BarChart3 },
            { href: APP_ROUTES.inventoryTransfers, label: "Transfers", desc: "Move stock", icon: ArrowRightLeft },
            { href: APP_ROUTES.branches, label: "Branches", desc: "Locations", icon: MapPin },
          ]}
        />
      </header>

      {canRun ? (
        <div className="space-y-3 rounded-md border bg-muted/20 p-4">
          <h3 className="text-sm font-medium">Start session</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Branch</span>
              <select
                className="rounded border bg-background px-2 py-1.5"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">—</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Notes</span>
              <input
                className="rounded border bg-background px-2 py-1.5"
                value={startNotes}
                onChange={(e) => setStartNotes(e.target.value)}
              />
            </label>
            <Button
              type="button"
              disabled={loading}
              onClick={() => startSession().catch(() => undefined)}
            >
              Start
            </Button>
          </div>
        </div>
      ) : null}

      {canRead ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/20 p-4">
          <label className="flex min-w-[14rem] flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Session ID</span>
            <input
              className="rounded border bg-background px-2 py-1.5 font-mono text-xs"
              value={loadSessionId}
              onChange={(e) => setLoadSessionId(e.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => loadSession().catch(() => undefined)}
          >
            Load session
          </Button>
        </div>
      ) : null}

      {session ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className="font-medium">{session.status}</span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">{session.id}</span>
          </div>

          <div className="max-h-[28rem] overflow-auto rounded-md border">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="sticky top-0 border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 text-right font-medium">System</th>
                  <th className="px-3 py-2 text-right font-medium">Counted</th>
                </tr>
              </thead>
              <tbody>
                {session.lines.map((line) => {
                  const item = itemsById[line.itemId];
                  const label = item ? `${item.name} (${item.sku})` : line.itemId;
                  return (
                    <tr key={line.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate font-medium">{label}</div>
                        <div className="font-mono text-xs text-muted-foreground">{line.itemId}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {String(line.systemQtySnapshot)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          className="w-24 rounded border bg-background px-2 py-1 tabular-nums"
                          disabled={!canRun || session.status !== "in_progress"}
                          value={counts[line.id] ?? ""}
                          onChange={(e) =>
                            setCounts((prev) => ({ ...prev, [line.id]: e.target.value }))
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {canRun && session.status === "in_progress" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => saveCounts().catch(() => undefined)}
              >
                Save counts
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => closeSession().catch(() => undefined)}
              >
                Close session
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {session && session.adjustmentRequests.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Adjustment requests</h3>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 text-right font-medium">Variance</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {session.adjustmentRequests.map((req) => {
                  const item = itemsById[req.itemId];
                  const label = item ? item.name : req.itemId;
                  const pending = req.status === "pending";
                  return (
                    <tr key={req.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{String(req.varianceQty)}</td>
                      <td className="px-3 py-2">{req.status}</td>
                      <td className="px-3 py-2">
                        {canApprove && pending ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              placeholder="Unit cost (surplus)"
                              className="w-36 rounded border bg-background px-2 py-1 text-xs"
                              value={approveCosts[req.id] ?? ""}
                              onChange={(e) =>
                                setApproveCosts((p) => ({ ...p, [req.id]: e.target.value }))
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={loading}
                              onClick={() => {
                                const raw = approveCosts[req.id]?.trim();
                                void (async () => {
                                  setLoading(true);
                                  setMessage("");
                                  try {
                                    await postApproveStockAdjustment(
                                      session.id,
                                      req.id,
                                      raw ? { unitCost: raw } : null,
                                    );
                                    const next = await fetchStockTakeSession(session.id);
                                    applySession(next);
                                    setMessage("Adjustment approved.");
                                  } catch (error) {
                                    setMessage(
                                      error instanceof Error ? error.message : "Approve failed.",
                                    );
                                  } finally {
                                    setLoading(false);
                                  }
                                })();
                              }}
                            >
                              Approve
                            </Button>
                            <input
                              placeholder="Reject notes"
                              className="min-w-[8rem] rounded border bg-background px-2 py-1 text-xs"
                              value={rejectNotes[req.id] ?? ""}
                              onChange={(e) =>
                                setRejectNotes((p) => ({ ...p, [req.id]: e.target.value }))
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={loading}
                              onClick={() => {
                                void (async () => {
                                  setLoading(true);
                                  setMessage("");
                                  try {
                                    await postRejectStockAdjustment(
                                      session.id,
                                      req.id,
                                      rejectNotes[req.id],
                                    );
                                    const next = await fetchStockTakeSession(session.id);
                                    applySession(next);
                                    setMessage("Adjustment rejected.");
                                  } catch (error) {
                                    setMessage(
                                      error instanceof Error ? error.message : "Reject failed.",
                                    );
                                  } finally {
                                    setLoading(false);
                                  }
                                })();
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            For positive variances with no on-hand cost basis, enter a unit cost before approving.
          </p>
        </div>
      ) : null}

      {message ? (
        <p
          className={
            /started|loaded|saved|closed|approved|rejected/i.test(message)
              ? "text-sm text-muted-foreground"
              : "text-sm text-destructive"
          }
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
