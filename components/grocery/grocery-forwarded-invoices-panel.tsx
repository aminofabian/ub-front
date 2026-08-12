"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  Receipt,
  Send,
  X,
} from "lucide-react";
import type { GroceryInvoiceResponse } from "@/lib/grocery-api";
import { getRealtimeClient } from "@/lib/realtime";
import { cn } from "@/lib/utils";

type ForwardedLifecycle =
  | "pending_payment"
  | "locked"
  | "paid"
  | "cancelled"
  | "expired";

type GroceryForwardedInvoicesPanelProps = {
  invoices: GroceryInvoiceResponse[];
  onDismiss: (invoiceId: string) => void;
  onViewInvoice: (invoice: GroceryInvoiceResponse) => void;
  /** Void a still-pending forwarded invoice (cancel on the server). */
  onVoidInvoice?: (invoice: GroceryInvoiceResponse) => void;
  voidingId?: string | null;
  canVoid?: boolean;
  currency?: string;
};

function lifecycleFromStatus(status: string): ForwardedLifecycle {
  if (status === "locked") return "locked";
  if (status === "paid") return "paid";
  if (status === "cancelled") return "cancelled";
  if (status === "expired") return "expired";
  return "pending_payment";
}

function statusConfig(lifecycle: ForwardedLifecycle): {
  label: string;
  icon: ReactNode;
  tone: string;
} {
  switch (lifecycle) {
    case "locked":
      return {
        label: "Cashier processing…",
        icon: <Loader2 className="size-3 animate-spin" />,
        tone: "text-primary",
      };
    case "paid":
      return {
        label: "Paid",
        icon: <CheckCircle2 className="size-3" />,
        tone: "text-emerald-600 dark:text-emerald-400",
      };
    case "cancelled":
      return {
        label: "Voided",
        icon: <X className="size-3" />,
        tone: "text-red-600 dark:text-red-400",
      };
    case "expired":
      return {
        label: "Expired",
        icon: <Clock className="size-3" />,
        tone: "text-amber-700 dark:text-amber-400",
      };
    default:
      return {
        label: "Waiting at cashier",
        icon: <Send className="size-3" />,
        tone: "text-muted-foreground",
      };
  }
}

function ForwardedInvoiceCard({
  invoice,
  currency,
  lifecycle,
  onDismiss,
  onViewInvoice,
  onVoidInvoice,
  voiding,
  canVoid,
}: {
  invoice: GroceryInvoiceResponse;
  currency: string;
  lifecycle: ForwardedLifecycle;
  onDismiss: (invoiceId: string) => void;
  onViewInvoice: (invoice: GroceryInvoiceResponse) => void;
  onVoidInvoice?: (invoice: GroceryInvoiceResponse) => void;
  voiding: boolean;
  canVoid: boolean;
}) {
  const itemCount = invoice.lines.reduce((sum, l) => sum + l.quantity, 0);
  const status = statusConfig(lifecycle);
  const isTerminal = ["paid", "cancelled", "expired"].includes(lifecycle);
  const showVoid = canVoid && !isTerminal && onVoidInvoice != null;

  useEffect(() => {
    if (!isTerminal) return;
    const timer = window.setTimeout(() => onDismiss(invoice.id), 4_000);
    return () => window.clearTimeout(timer);
  }, [isTerminal, invoice.id, onDismiss]);

  return (
    <div
      className={cn(
        "border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-4 py-4 sm:px-5",
        voiding && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onViewInvoice(invoice)}
            className="text-left"
          >
            <p className="font-mono text-sm font-semibold tracking-wide text-foreground">
              {invoice.barcodeCode}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
              {currency} {invoice.grandTotal.toFixed(2)}
            </p>
          </button>
          <p
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 text-xs font-medium",
              status.tone,
            )}
          >
            {status.icon}
            {status.label}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-1">
          {showVoid ? (
            <button
              type="button"
              title="Void invoice"
              disabled={voiding}
              onClick={() => onVoidInvoice(invoice)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              aria-label={`Void ${invoice.barcodeCode}`}
            >
              {voiding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Ban className="size-4" />
              )}
            </button>
          ) : null}
          {isTerminal ? (
            <button
              type="button"
              onClick={() => onDismiss(invoice.id)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onViewInvoice(invoice)}
              className="rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_90%,#f7f3eb)] px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_30%,transparent)]"
            >
              View
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GroceryForwardedInvoicesPanel({
  invoices,
  onDismiss,
  onViewInvoice,
  onVoidInvoice,
  voidingId = null,
  canVoid = false,
  currency = "KES",
}: GroceryForwardedInvoicesPanelProps) {
  const [lifecycles, setLifecycles] = useState<
    Record<string, ForwardedLifecycle>
  >(() =>
    Object.fromEntries(
      invoices.map((inv) => [inv.id, lifecycleFromStatus(inv.status)]),
    ),
  );

  useEffect(() => {
    setLifecycles((prev) => {
      const next = { ...prev };
      for (const inv of invoices) {
        if (!next[inv.id]) {
          next[inv.id] = lifecycleFromStatus(inv.status);
        }
      }
      return next;
    });
  }, [invoices]);

  useEffect(() => {
    const client = getRealtimeClient();
    const unregister = client.registerListener("grocery-forwarded-panel", {
      channels: ["grocery"],
      onGroceryInvoiceLocked: (frame) => {
        const id = String(frame.data.invoiceId ?? "");
        if (!id) return;
        setLifecycles((prev) => ({ ...prev, [id]: "locked" }));
      },
      onGroceryInvoicePaid: (frame) => {
        const id = String(frame.data.invoiceId ?? "");
        if (!id) return;
        setLifecycles((prev) => ({ ...prev, [id]: "paid" }));
      },
      onGroceryInvoiceCancelled: (frame) => {
        const id = String(frame.data.invoiceId ?? "");
        if (!id) return;
        setLifecycles((prev) => ({ ...prev, [id]: "cancelled" }));
      },
      onGroceryInvoiceExpired: (frame) => {
        const id = String(frame.data.invoiceId ?? "");
        if (!id) return;
        setLifecycles((prev) => ({ ...prev, [id]: "expired" }));
      },
    });
    return unregister;
  }, []);

  if (invoices.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
        <Send className="mb-3 size-10 text-muted-foreground/40" strokeWidth={1.5} />
        <p className="text-sm font-medium text-foreground">No forwarded invoices</p>
        <p className="mt-1 max-w-[18rem] text-xs text-muted-foreground">
          Invoices you send to the cashier appear here until they are paid,
          voided, or expire.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="grocery-scroll-thick flex-1 overflow-y-auto overscroll-contain">
        {invoices.map((invoice) => (
          <ForwardedInvoiceCard
            key={invoice.id}
            invoice={invoice}
            currency={currency}
            lifecycle={
              lifecycles[invoice.id] ?? lifecycleFromStatus(invoice.status)
            }
            onDismiss={onDismiss}
            onViewInvoice={onViewInvoice}
            onVoidInvoice={onVoidInvoice}
            voiding={voidingId === invoice.id}
            canVoid={canVoid}
          />
        ))}
      </div>
    </div>
  );
}

export type GroceryCartPanelTab = "sale" | "forwarded";

type GroceryCartTabsProps = {
  activeTab: GroceryCartPanelTab;
  onTabChange: (tab: GroceryCartPanelTab) => void;
  forwardedCount: number;
};

export function GroceryCartTabs({
  activeTab,
  onTabChange,
  forwardedCount,
}: GroceryCartTabsProps) {
  return (
    <div className="flex shrink-0 gap-1 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3 py-2 sm:px-4">
      <button
        type="button"
        onClick={() => onTabChange("sale")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-none px-3 py-2 text-xs font-semibold transition-colors",
          activeTab === "sale"
            ? "border border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]"
            : "border border-transparent text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] hover:text-[var(--pos-ink,#1c1915)]",
        )}
      >
        <Receipt className="size-3.5" />
        New Sale
      </button>
      <button
        type="button"
        onClick={() => onTabChange("forwarded")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-none px-3 py-2 text-xs font-semibold transition-colors",
          activeTab === "forwarded"
            ? "border border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]"
            : "border border-transparent text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] hover:text-[var(--pos-ink,#1c1915)]",
        )}
      >
        <Send className="size-3.5" />
        Forwarded
        {forwardedCount > 0 ? (
          <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-none bg-[var(--pos-primary,#0f766e)] px-1 text-[10px] font-bold text-[var(--pos-primary-ink,#fff)]">
            {forwardedCount > 9 ? "9+" : forwardedCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
