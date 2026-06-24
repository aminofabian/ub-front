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

type PendingInvoicesPanelProps = {
  onLoadInvoice: (barcode: string) => void;
  refreshKey?: number;
};

export function PendingInvoicesPanel({
  onLoadInvoice,
  refreshKey = 0,
}: PendingInvoicesPanelProps) {
  const { branchId } = useDashboard();
  const online = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [invoices, setInvoices] = useState<GroceryInvoiceSummaryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());
  const firstFetchDone = useRef(false);

  const fetchInvoices = useCallback(async () => {
    const bid = branchId?.trim();
    if (!bid || !online) return;
    setLoading(true);
    try {
      const result = await listGroceryInvoices(bid, "pending_payment");
      const list = result.invoices ?? [];
      setInvoices(list);

      // Seed known IDs on first fetch (no toast — WebSocket handles notifications)
      if (!firstFetchDone.current) {
        for (const inv of list) {
          knownIds.current.add(inv.id);
        }
        firstFetchDone.current = true;
      }
    } catch {
      // Silently fail — not critical UI
    } finally {
      setLoading(false);
    }
  }, [branchId, online]);

  useEffect(() => {
    if (open) fetchInvoices();
  }, [open, fetchInvoices, refreshKey]);

  // Auto-refresh every 30s while panel is open
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(fetchInvoices, 30_000);
    return () => clearInterval(interval);
  }, [open, fetchInvoices]);

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
        )}
      >
        <ClipboardList className="size-3.5" />
        <span>Invoices</span>
        {pendingCount > 0 && (
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
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
                    fetchInvoices();
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
