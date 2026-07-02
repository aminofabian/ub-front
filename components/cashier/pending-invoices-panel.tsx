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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/components/dashboard-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  listGroceryInvoices,
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

export function PendingInvoicesPanel({
  onLoadInvoice,
  refreshKey = 0,
}: PendingInvoicesPanelProps) {
  const { branchId } = useDashboard();
  const online = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [invoices, setInvoices] = useState<GroceryInvoiceSummaryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());

  const removeInvoiceById = useCallback((invoiceId: string) => {
    if (!invoiceId) return;
    setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    knownIds.current.delete(invoiceId);
  }, []);

  const addInvoiceFromEvent = useCallback(
    (data: Record<string, unknown>, opts?: { autoOpen?: boolean }) => {
      const summary = summaryFromFrameData(data);
      if (!summary) return;
      if (knownIds.current.has(summary.id)) return;
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

  const fetchInvoices = useCallback(async () => {
    const bid = branchId?.trim();
    if (!bid || !online) return;
    setLoading(true);
    try {
      const result = await listGroceryInvoices(bid, "pending_payment");
      const list = result.invoices ?? [];
      setInvoices(list);
      for (const inv of list) {
        knownIds.current.add(inv.id);
      }
    } catch {
      // Silently fail — not critical UI
    } finally {
      setLoading(false);
    }
  }, [branchId, online]);

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
    });
    return unregister;
  }, [addInvoiceFromEvent, removeInvoiceById]);

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
      if (["paid", "cancelled", "expired"].includes(detail.type)) {
        removeInvoiceById(String(detail.data.invoiceId ?? ""));
      }
    };
    window.addEventListener("grocery-invoice-event", handler);
    return () => window.removeEventListener("grocery-invoice-event", handler);
  }, [addInvoiceFromEvent, removeInvoiceById]);

  const pendingCount = invoices.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
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
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <span className="text-sm font-semibold">Pending Invoices</span>
              {loading && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="max-h-72 overflow-y-auto">
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
                  {invoices.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => {
                        onLoadInvoice(inv.barcodeCode);
                        setOpen(false);
                      }}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <ShoppingBag className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-foreground">
                            {inv.barcodeCode}
                          </span>
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            {inv.lineCount}{" "}
                            {inv.lineCount === 1 ? "item" : "items"}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs font-semibold text-foreground">
                          {Number(inv.grandTotal).toLocaleString("en-KE", {
                            style: "currency",
                            currency: "KES",
                          })}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
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
                  ))}
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
