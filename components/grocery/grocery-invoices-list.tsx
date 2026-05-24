"use client";

import { Eye, XCircle, Receipt, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GroceryInvoiceSummaryResponse, GroceryInvoiceStatus } from "@/lib/grocery-api";

type GroceryInvoicesListProps = {
  invoices: GroceryInvoiceSummaryResponse[];
  onViewInvoice: (id: string) => void;
  onCancelInvoice: (id: string) => void;
  loading: boolean;
  currency?: string;
};

const STATUS_CONFIG: Record<
  GroceryInvoiceStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending_payment: {
    label: "Pending",
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-800 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  paid: {
    label: "Paid",
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-800 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    dot: "bg-gray-400",
  },
  expired: {
    label: "Expired",
    bg: "bg-red-100 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
};

function timeAgo(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

export function GroceryInvoicesList({
  invoices,
  onViewInvoice,
  onCancelInvoice,
  loading,
  currency = "KES",
}: GroceryInvoicesListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading invoices…
        </span>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Receipt className="mb-3 size-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">
          No invoices found
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Invoices created in the grocery workspace will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {invoices.map((inv) => {
        const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.pending_payment;
        const isPending = inv.status === "pending_payment";

        return (
          <div
            key={inv.id}
            className={cn(
              "group relative flex flex-col rounded-xl border border-border/50 bg-card p-4 shadow-sm ring-1 ring-black/[0.02] transition-all",
              "hover:border-border hover:shadow-md dark:ring-white/[0.03]",
            )}
          >
            {/* Status badge */}
            <div className="mb-3 flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  cfg.bg,
                  cfg.text,
                )}
              >
                <span className={cn("size-1.5 rounded-full", cfg.dot)} />
                {cfg.label}
              </span>
              {isPending && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="size-3" />
                  {timeAgo(inv.createdAt)}
                </span>
              )}
            </div>

            {/* Barcode */}
            <p className="mb-1 font-mono text-xs tracking-wider text-muted-foreground">
              {inv.barcodeCode.length > 18
                ? `${inv.barcodeCode.slice(0, 18)}…`
                : inv.barcodeCode}
            </p>

            {/* Total */}
            <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {currency} {inv.grandTotal.toFixed(2)}
            </p>

            {/* Meta */}
            <p className="mt-1 text-xs text-muted-foreground">
              {inv.lineCount} item{inv.lineCount === 1 ? "" : "s"}
              {inv.createdByName ? ` · by ${inv.createdByName}` : ""}
            </p>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewInvoice(inv.id)}
                className="flex-1 text-xs gap-1.5"
              >
                <Eye className="size-3.5" />
                View
              </Button>
              {isPending && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancelInvoice(inv.id)}
                  className="text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <XCircle className="size-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
