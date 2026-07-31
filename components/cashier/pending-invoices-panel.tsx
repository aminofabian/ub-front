"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  ChevronDown,
  Loader2,
  PlusCircle,
  Clock,
  User,
  ShoppingBag,
  Phone,
  Send,
  Banknote,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/components/dashboard-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { hasPermission, Permission } from "@/lib/permissions";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import {
  listGroceryInvoices,
  payGroceryInvoice,
  resendRemoteInvoiceStk,
  type GroceryInvoiceSummaryResponse,
} from "@/lib/grocery-api";
import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";

type PendingInvoicesPanelProps = {
  onLoadInvoice: (barcode: string) => void;
  refreshKey?: number;
};

const BACKGROUND_POLL_MS = 15_000;

function summaryFromFrameData(
  data: Record<string, unknown>,
): GroceryInvoiceSummaryResponse | null {
  const id = String(data.invoiceId ?? data.id ?? "");
  const barcodeCode = String(data.barcodeCode ?? "");
  if (!id || !barcodeCode) return null;

  const remoteRaw = data.remote ?? data.isRemote;
  const remote =
    remoteRaw === true ||
    remoteRaw === "true" ||
    remoteRaw === 1 ||
    remoteRaw === "1";

  return {
    id,
    barcodeCode,
    status: "pending_payment",
    grandTotal: Number(data.grandTotal ?? 0),
    lineCount: Number(data.lineCount ?? 0),
    createdBy: String(data.createdBy ?? ""),
    createdByName: String(data.createdByName ?? "Staff"),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    expiresAt: String(data.expiresAt ?? new Date().toISOString()),
    remote: remote || undefined,
    customerPhone:
      data.customerPhone != null ? String(data.customerPhone) : null,
    lastStkStatus:
      data.lastStkStatus != null
        ? String(data.lastStkStatus)
        : data.stkStatus != null
          ? String(data.stkStatus)
          : null,
  };
}

function upsertInvoice(
  list: GroceryInvoiceSummaryResponse[],
  invoice: GroceryInvoiceSummaryResponse,
): GroceryInvoiceSummaryResponse[] {
  const without = list.filter((inv) => inv.id !== invoice.id);
  return [invoice, ...without].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function stkBadgeLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s === "PENDING" || s === "SENT") return "STK pending";
  if (s === "SUCCESS" || s === "COMPLETED") return "STK paid";
  if (s === "FAILED" || s === "CANCELLED" || s === "TIMEOUT") return "STK failed";
  return `STK ${status}`;
}

function stkBadgeClass(status: string | null | undefined): string {
  const s = String(status ?? "").toUpperCase();
  if (s === "SUCCESS" || s === "COMPLETED") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
  if (s === "FAILED" || s === "CANCELLED" || s === "TIMEOUT") {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }
  return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
}

export function PendingInvoicesPanel({
  onLoadInvoice,
  refreshKey = 0,
}: PendingInvoicesPanelProps) {
  const { branchId, me } = useDashboard();
  const online = useOnlineStatus();
  const canListInvoices = hasPermission(
    me?.permissions,
    Permission.GroceryInvoicesRead,
  );
  const canPayInvoices = hasPermission(
    me?.permissions,
    Permission.GroceryInvoicesPay,
  );
  const [open, setOpen] = useState(false);
  const [invoices, setInvoices] = useState<GroceryInvoiceSummaryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markPaidId, setMarkPaidId] = useState<string | null>(null);
  const [mpesaRef, setMpesaRef] = useState("");
  const knownIds = useRef<Set<string>>(new Set());

  const removeInvoiceById = useCallback((invoiceId: string) => {
    if (!invoiceId) return;
    setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    knownIds.current.delete(invoiceId);
    setMarkPaidId((cur) => (cur === invoiceId ? null : cur));
  }, []);

  const addInvoiceFromEvent = useCallback(
    (data: Record<string, unknown>, opts?: { autoOpen?: boolean }) => {
      const summary = summaryFromFrameData(data);
      if (!summary) return;
      if (knownIds.current.has(summary.id)) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === summary.id
              ? {
                  ...inv,
                  ...summary,
                  createdAt: inv.createdAt,
                  expiresAt: inv.expiresAt,
                  createdBy: inv.createdBy || summary.createdBy,
                  createdByName: inv.createdByName || summary.createdByName,
                  lineCount: inv.lineCount || summary.lineCount,
                }
              : inv,
          ),
        );
        return;
      }
      knownIds.current.add(summary.id);

      setInvoices((prev) => upsertInvoice(prev, summary));
      setBadgePulse(true);
      window.setTimeout(() => setBadgePulse(false), 2_000);

      if (opts?.autoOpen) {
        setOpen(true);
      }
    },
    [],
  );

  const applyStkUpdate = useCallback((data: Record<string, unknown>) => {
    const invoiceId = String(data.invoiceId ?? "");
    if (!invoiceId) return;
    const stkStatus = String(data.stkStatus ?? data.lastStkStatus ?? "");
    const phone =
      data.customerPhone != null ? String(data.customerPhone) : undefined;
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              remote: true,
              lastStkStatus: stkStatus || inv.lastStkStatus,
              lastStkAt: new Date().toISOString(),
              customerPhone: phone ?? inv.customerPhone,
              grandTotal:
                data.grandTotal != null
                  ? Number(data.grandTotal)
                  : inv.grandTotal,
            }
          : inv,
      ),
    );
  }, []);

  const fetchInvoices = useCallback(async () => {
    const bid = branchId?.trim();
    if (!bid || !online || !canListInvoices) return;
    setLoading(true);
    try {
      const result = await listGroceryInvoices(bid, "pending_payment", {
        suppressToast: true,
      });
      const list = result.invoices ?? [];
      setInvoices(list);
      knownIds.current = new Set(list.map((inv) => inv.id));
    } catch {
      // Silently fail — not critical UI
    } finally {
      setLoading(false);
    }
  }, [branchId, online, canListInvoices]);

  // Fetch on mount, refreshKey changes, and when opened.
  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices, refreshKey]);

  useEffect(() => {
    if (open) void fetchInvoices();
  }, [open, fetchInvoices]);

  // Keep the badge and list fresh even while the dropdown is closed.
  useEffect(() => {
    if (!online) return;
    const interval = window.setInterval(() => {
      void fetchInvoices();
    }, BACKGROUND_POLL_MS);
    return () => window.clearInterval(interval);
  }, [online, fetchInvoices]);

  // Realtime updates via WebSocket frames.
  useEffect(() => {
    const client = getRealtimeClient();
    const unregister = client.registerListener("pending-invoices-panel", {
      channels: ["grocery", "notifications"],
      onGroceryInvoiceCreated: (frame: RealtimeFrame) => {
        addInvoiceFromEvent(frame.data, { autoOpen: true });
      },
      onNotification: (frame: RealtimeFrame) => {
        const data = frame.data;
        const type = String(
          (data as Record<string, unknown>).notificationType ??
            (data as Record<string, unknown>).type ??
            "",
        );
        if (type !== "grocery.invoice.created") return;
        const payload =
          ((data as Record<string, unknown>).payload as
            | Record<string, unknown>
            | undefined) ?? (data as Record<string, unknown>);
        addInvoiceFromEvent(payload, { autoOpen: true });
      },
      onGroceryInvoicePaid: (frame) => {
        removeInvoiceById(String(frame.data.invoiceId ?? ""));
      },
      onGroceryInvoiceCancelled: (frame) => {
        removeInvoiceById(String(frame.data.invoiceId ?? ""));
      },
      onGroceryInvoiceExpired: (frame) => {
        removeInvoiceById(String(frame.data.invoiceId ?? ""));
      },
      onGroceryInvoiceStk: (frame) => {
        applyStkUpdate(frame.data);
      },
    });
    return unregister;
  }, [addInvoiceFromEvent, removeInvoiceById, applyStkUpdate]);

  // Also listen to the shared grocery-invoice-event bus (toast hook path).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        type?: string;
        data?: Record<string, unknown>;
      };
      if (!detail?.type || !detail.data) return;

      if (detail.type === "created") {
        addInvoiceFromEvent(detail.data, { autoOpen: true });
        return;
      }
      if (detail.type === "stk") {
        applyStkUpdate(detail.data);
        return;
      }
      if (["paid", "cancelled", "expired"].includes(detail.type)) {
        removeInvoiceById(String(detail.data.invoiceId ?? ""));
      }
    };
    window.addEventListener("grocery-invoice-event", handler);
    return () => window.removeEventListener("grocery-invoice-event", handler);
  }, [addInvoiceFromEvent, removeInvoiceById, applyStkUpdate]);

  const handleResendStk = async (inv: GroceryInvoiceSummaryResponse) => {
    if (!online || busyId) return;
    setBusyId(inv.id);
    try {
      const result = await resendRemoteInvoiceStk(inv.id);
      setInvoices((prev) =>
        prev.map((row) =>
          row.id === inv.id
            ? {
                ...row,
                lastStkStatus: result.accepted ? "PENDING" : row.lastStkStatus,
                lastStkAt: new Date().toISOString(),
              }
            : row,
        ),
      );
      if (result.accepted) {
        toast.success(`STK resent to ${inv.customerPhone ?? "customer"}`);
      } else {
        toast.error(result.message || "Could not resend STK");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resend STK");
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkPaid = async (
    inv: GroceryInvoiceSummaryResponse,
    method: "cash" | "mpesa_manual",
  ) => {
    if (!online || !canPayInvoices || busyId) return;
    if (method === "mpesa_manual" && !mpesaRef.trim()) {
      toast.error("Enter an M-Pesa reference");
      return;
    }
    setBusyId(inv.id);
    try {
      await payGroceryInvoice(
        inv.id,
        {
          payments: [
            {
              method,
              amount: Number(inv.grandTotal),
              reference:
                method === "mpesa_manual" ? mpesaRef.trim() : undefined,
            },
          ],
        },
        nextIdempotencyKey(),
      );
      removeInvoiceById(inv.id);
      setMarkPaidId(null);
      setMpesaRef("");
      toast.success(`Invoice ${inv.barcodeCode} marked paid`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not mark invoice paid",
      );
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = invoices.length;

  if (!canListInvoices) {
    return null;
  }

  return (
    // When open, lift above sticky POS chrome (tabs/search use z-20) so row
    // clicks hit the menu instead of the layer underneath.
    <div className={cn("relative", open && "z-50")}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          open
            ? "bg-primary/10 text-primary"
            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
          badgePulse && "ring-2 ring-primary/40 ring-offset-1",
        )}
      >
        <ClipboardList className="size-3.5" />
        <span>Invoices</span>
        {pendingCount > 0 && (
          <span
            className={cn(
              "inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground",
              badgePulse && "animate-pulse",
            )}
          >
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-full z-50 mt-2 w-[22rem] rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <span className="text-sm font-semibold">Pending Invoices</span>
              {loading && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {!online ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Go online to load invoices.
                </p>
              ) : loading && invoices.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Loading…
                </p>
              ) : invoices.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No pending invoices.
                </p>
              ) : (
                <div className="divide-y divide-border/30">
                  {invoices.map((inv) => {
                    const stkLabel = stkBadgeLabel(inv.lastStkStatus);
                    const isBusy = busyId === inv.id;
                    const showMarkPaid = markPaidId === inv.id;

                    return (
                      <div key={inv.id} className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            const barcode = inv.barcodeCode?.trim() ?? "";
                            if (!barcode) {
                              toast.error(
                                "Invoice barcode missing — refresh the list.",
                              );
                              return;
                            }
                            onLoadInvoice(barcode);
                            setOpen(false);
                          }}
                          className="flex w-full items-start gap-3 text-left transition-colors"
                        >
                          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <ShoppingBag className="size-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className="truncate text-xs font-mono font-semibold text-foreground"
                                title={inv.barcodeCode}
                              >
                                {inv.barcodeCode}
                              </span>
                              {inv.remote ? (
                                <span className="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                                  Remote
                                </span>
                              ) : null}
                              <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                {inv.lineCount}{" "}
                                {inv.lineCount === 1 ? "item" : "items"}
                              </span>
                              {stkLabel ? (
                                <span
                                  className={cn(
                                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                                    stkBadgeClass(inv.lastStkStatus),
                                  )}
                                >
                                  {stkLabel}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-0.5 text-xs font-semibold text-foreground">
                              {Number(inv.grandTotal).toLocaleString("en-KE", {
                                style: "currency",
                                currency: "KES",
                              })}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                              {inv.customerPhone ? (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="size-2.5" />
                                  {inv.customerPhone}
                                </span>
                              ) : null}
                              <span className="inline-flex items-center gap-1">
                                <User className="size-2.5" />
                                {inv.createdByName || "Staff"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="size-2.5" />
                                {formatRelativeTime(inv.createdAt)}
                              </span>
                            </div>
                          </div>
                          <PlusCircle className="mt-1 size-4 shrink-0 text-muted-foreground" />
                        </button>

                        {inv.remote && (canPayInvoices || online) ? (
                          <div className="mt-2 space-y-2 pl-11">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={!online || isBusy}
                                onClick={() => void handleResendStk(inv)}
                                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                              >
                                {isBusy ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Send className="size-3" />
                                )}
                                Resend STK
                              </button>
                              {canPayInvoices ? (
                                <button
                                  type="button"
                                  disabled={!online || isBusy}
                                  onClick={() => {
                                    setMarkPaidId(
                                      showMarkPaid ? null : inv.id,
                                    );
                                    setMpesaRef("");
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                                >
                                  <Banknote className="size-3" />
                                  Mark paid
                                </button>
                              ) : null}
                            </div>

                            {showMarkPaid && canPayInvoices ? (
                              <div className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-2">
                                <div className="flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    disabled={!online || isBusy}
                                    onClick={() =>
                                      void handleMarkPaid(inv, "cash")
                                    }
                                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground disabled:opacity-50"
                                  >
                                    <Banknote className="size-3" />
                                    Cash
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      !online || isBusy || !mpesaRef.trim()
                                    }
                                    onClick={() =>
                                      void handleMarkPaid(inv, "mpesa_manual")
                                    }
                                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-semibold disabled:opacity-50"
                                  >
                                    <Smartphone className="size-3" />
                                    M-Pesa
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={mpesaRef}
                                  onChange={(e) => setMpesaRef(e.target.value)}
                                  placeholder="M-Pesa reference"
                                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {invoices.length > 0 && (
              <div className="border-t border-border/40 px-4 py-2">
                <button
                  type="button"
                  onClick={() => {
                    void fetchInvoices();
                    toast.success("Invoice list refreshed");
                  }}
                  className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Refresh list
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
