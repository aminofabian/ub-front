"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Ban,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Layers,
  Loader2,
  Package,
  PackageX,
  Plus,
  Search,
  Send,
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
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { useScopeChangeGuard } from "@/hooks/use-scope-change-guard";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchItemsPage,
  fetchStockTransfers,
  postCancelStockTransfer,
  postCompleteStockTransfer,
  postReceiveStockTransfer,
  postSendStockTransfer,
  postStockTransfer,
  type BranchRecord,
  type ItemSummaryRecord,
  type StockTransferSummaryRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { filterInventoryQuickLinksForUser } from "@/lib/inventory-access";
import { cn } from "@/lib/utils";

type LineDraft = { itemId: string; qty: string; label?: string };

type TransferItemPickerProps = {
  value: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  onChange: (itemId: string, label?: string) => void;
};

/**
 * Product lookup for transfer lines — search by name, SKU or barcode via the
 * catalog search endpoint. Selecting a result resolves the item UUID + display
 * name; typing a raw UUID by hand still works (label stays empty).
 */
function TransferItemPicker({
  value,
  label,
  disabled = false,
  className,
  onChange,
}: TransferItemPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSummaryRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = Boolean(value.trim()) && Boolean(label);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (selected || !open) return;
    const controller = new AbortController();
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      setSearched(false);
      setBusy(false);
      return;
    }
    setBusy(true);
    const t = window.setTimeout(() => {
      fetchItemsPage(q, {
        size: 8,
        sort: [{ property: "name", direction: "asc" }],
        signal: controller.signal,
      })
        .then((page) => {
          if (controller.signal.aborted) return;
          setResults(page.content);
          setSearched(true);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setResults([]);
          setSearched(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [query, open, selected]);

  if (selected) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <span className="min-w-0 flex-1 truncate rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs font-medium text-foreground">
          {label}
        </span>
        <button
          type="button"
          disabled={disabled}
          aria-label="Change item"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground disabled:opacity-50"
          onClick={() => {
            setQuery("");
            setResults([]);
            setSearched(false);
            onChange("", undefined);
          }}
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          value={query}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange(next.trim(), undefined);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name, SKU or barcode"
          aria-label="Item — search by name, SKU or barcode"
          className={cn(
            dashboardInputClass(),
            "h-8 min-w-[10rem] w-full py-1 pl-7 pr-2 font-mono text-xs",
          )}
        />
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
      </div>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border/70 bg-background shadow-lg">
          {busy ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">
              {searched ? "No matching products." : "Type to search products."}
            </p>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none"
                onClick={() => {
                  onChange(item.id, item.name);
                  setOpen(false);
                  setResults([]);
                  setSearched(false);
                }}
              >
                <span className="text-xs font-medium text-foreground">
                  {item.name}
                  {item.variantName ? ` · ${item.variantName}` : ""}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {item.sku ? `SKU ${item.sku}` : "No SKU"}
                  {item.barcode ? ` · ${item.barcode}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function InventoryTransfersPage() {
  const { me, setBranchId: setHeaderBranchId } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.InventoryTransfer);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [fromBranchId, setFromBranchId] = useState("");
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked: isBranchLockedRole } = useSyncBranchFilter({
    value: fromBranchId,
    setValue: setFromBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
  });
  const onChangeFromBranch = useCallback(
    (id: string) => {
      setFromBranchId(id);
      if (!isBranchLockedRole && id.trim()) setHeaderBranchId(id.trim());
    },
    [isBranchLockedRole, setHeaderBranchId],
  );
  const [toBranchId, setToBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ itemId: "", qty: "1" }]);
  const [lastTransferId, setLastTransferId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<StockTransferSummaryRecord[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [actingId, setActingId] = useState("");

  const branchName = useCallback(
    (id: string) =>
      branches.find((b) => b.id === id)?.name?.trim() ||
      (id ? id.slice(0, 8) : "—"),
    [branches],
  );

  const loadTransfers = useCallback(async () => {
    setTransfersLoading(true);
    try {
      const rows = await fetchStockTransfers();
      setTransfers(rows);
    } catch {
      // Non-fatal — the create form still works; the list shows empty.
      setTransfers([]);
    } finally {
      setTransfersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    void loadTransfers();
  }, [allowed, loadTransfers]);

  const transferDraftActive = useMemo(
    () =>
      Boolean(toBranchId.trim()) ||
      Boolean(notes.trim()) ||
      lines.some((l) => l.itemId.trim()),
    [lines, notes, toBranchId],
  );
  useScopeChangeGuard(
    "stock-transfer-draft",
    transferDraftActive,
    "This transfer draft has unsaved branch or line details.",
  );

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
      setMessage(`Draft transfer created (${created.status}).`);
      void loadTransfers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transfer failed.");
    } finally {
      setLoading(false);
    }
  }, [fromBranchId, lines, notes, toBranchId, loadTransfers]);

  const runTransferAction = useCallback(
    async (
      id: string,
      action: "send" | "receive" | "complete" | "cancel",
      done: string,
    ) => {
      setMessage("");
      setActingId(id);
      try {
        if (action === "send") await postSendStockTransfer(id);
        else if (action === "receive") await postReceiveStockTransfer(id);
        else if (action === "cancel") await postCancelStockTransfer(id);
        else await postCompleteStockTransfer(id);
        setMessage(done);
        await loadTransfers();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Transfer action failed.",
        );
      } finally {
        setActingId("");
      }
    },
    [loadTransfers],
  );

  const quickLinks = useMemo(
    () =>
      filterInventoryQuickLinksForUser(me, [
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
      ]),
    [me],
  );

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

  const messageIsSuccess = /created|completed|confirmed|cancelled|draft|sent|Receipt/i.test(message);

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-4">
        <header className="space-y-2 border-b border-border/50 pb-4">
          <DashboardPageHero
            compact
            showActiveScope
            icon={ArrowRightLeft}
            eyebrow="Inventory"
            title="Stock transfers"
            description="Move stock between branches — send from one branch, the receiving shop confirms receipt before the stock becomes sellable."
          />
          {quickLinks.length > 0 ? (
            <DashboardQuickLinks compact links={quickLinks} />
          ) : null}
        </header>

        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-3">
          <p className="text-xs font-semibold text-foreground">Create draft</p>

          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[9rem] flex-1 flex-col gap-0.5 text-xs sm:max-w-[11rem]">
              <span className="text-muted-foreground">From</span>
              <select
                className={cn(dashboardSelectClass(), "h-9 py-1.5 text-sm")}
                value={fromBranchId}
                onChange={(e) => onChangeFromBranch(e.target.value)}
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
              Lines · product + qty
            </p>
            {lines.map((line, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-1.5">
                <TransferItemPicker
                  className="min-w-[10rem] flex-1"
                  value={line.itemId}
                  label={line.label}
                  onChange={(itemId, label) => {
                    const next = [...lines];
                    next[idx] = { ...line, itemId, label };
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">Transfers</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px]"
              disabled={transfersLoading}
              onClick={() => void loadTransfers()}
            >
              {transfersLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
              Refresh
            </Button>
          </div>
          {transfersLoading && transfers.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Loading transfers…
            </p>
          ) : transfers.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No transfers yet. Create a draft above — then send it when the
              goods leave, and the receiving shop confirms receipt.
            </p>
          ) : (
            <ul className="space-y-2">
              {transfers.map((t) => {
                const busy = actingId === t.id;
                const status = t.status?.toLowerCase() ?? "";
                const isDraft = status === "draft";
                const isInTransit = status === "in_transit";
                return (
                  <li
                    key={t.id}
                    className="rounded-lg border border-border/50 bg-card/60 p-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <TransferStatusBadge status={status} />
                      <span className="text-xs font-medium text-foreground">
                        {branchName(t.fromBranchId)} → {branchName(t.toBranchId)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span
                        className="ml-auto font-mono text-[10px] text-muted-foreground"
                        title={t.id}
                      >
                        {t.id.slice(0, 8)}
                      </span>
                    </div>
                    {t.lines.length > 0 ? (
                      <p
                        className="mt-1 truncate text-[11px] text-muted-foreground"
                        title={t.lines
                          .map((l) => `${l.itemName ?? l.itemId} × ${l.quantity}`)
                          .join(", ")}
                      >
                        {t.lines
                          .map((l) => `${l.itemName ?? l.itemId} × ${l.quantity}`)
                          .join(", ")}
                      </p>
                    ) : null}
                    {t.notes?.trim() ? (
                      <p className="mt-0.5 truncate text-[11px] italic text-muted-foreground">
                        {t.notes}
                      </p>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {isInTransit ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[11px]"
                          disabled={busy}
                          onClick={() =>
                            void runTransferAction(
                              t.id,
                              "receive",
                              "Receipt confirmed — stock added at the receiving branch.",
                            )
                          }
                        >
                          {busy ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-3" />
                          )}
                          Confirm receipt
                        </Button>
                      ) : null}
                      {isInTransit ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[11px]"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Cancel this transfer? Stock returns to the sending branch.",
                              )
                            ) {
                              void runTransferAction(
                                t.id,
                                "cancel",
                                "Transfer cancelled — stock returned to the sending branch.",
                              );
                            }
                          }}
                        >
                          <Ban className="size-3" />
                          Cancel
                        </Button>
                      ) : null}
                      {isDraft ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[11px]"
                          disabled={busy}
                          onClick={() =>
                            void runTransferAction(
                              t.id,
                              "send",
                              "Transfer sent — goods are in transit until the receiving shop confirms.",
                            )
                          }
                        >
                          {busy ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Send className="size-3" />
                          )}
                          Send
                        </Button>
                      ) : null}
                      {isDraft ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
                          disabled={busy}
                          onClick={() =>
                            void runTransferAction(
                              t.id,
                              "complete",
                              "Transfer completed — stock moved immediately.",
                            )
                          }
                        >
                          <CheckCircle2 className="size-3" />
                          Complete now
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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

function TransferStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    in_transit:
      "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
    completed:
      "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    cancelled:
      "border-border bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    draft: "Draft",
    in_transit: "In transit",
    completed: "Received",
    cancelled: "Cancelled",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[status] ?? styles.cancelled,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
