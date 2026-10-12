"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Phone, Printer, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import {
  fetchWebOrders,
  updateWebOrderFulfillment,
  type WebOrderSummary,
} from "@/lib/api";
import { getSessionTokens } from "@/lib/auth";
import {
  DESKTOP_THERMAL_WIDTH_MM,
  printWebOrderReceipt,
} from "@/lib/desktop-print";
import { hasPermission, Permission } from "@/lib/permissions";
import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";
import { cn } from "@/lib/utils";

const STOREFRONT_ORDER_TYPES = new Set([
  "storefront.order.placed",
  "storefront.order.paid",
]);

type NextStep = { status: "confirmed" | "dispatched" | "completed"; label: string };

function isOpen(order: WebOrderSummary): boolean {
  const f = (order.fulfillmentStatus ?? "awaiting_confirmation").trim().toLowerCase();
  if (f === "completed") return false;
  const s = (order.status ?? "").trim().toLowerCase();
  return s !== "cancelled" && s !== "payment_failed";
}

function isPaid(order: WebOrderSummary): boolean {
  return (order.status ?? "").trim().toLowerCase() === "paid";
}

/** The single fulfilment action a cashier needs next; null when unpaid/done. */
function nextStep(order: WebOrderSummary): NextStep | null {
  if (!isPaid(order)) return null;
  const f = (order.fulfillmentStatus ?? "awaiting_confirmation").trim().toLowerCase();
  if (f === "awaiting_confirmation") return { status: "confirmed", label: "Confirm" };
  if (f === "confirmed") return { status: "dispatched", label: "Ready" };
  if (f === "dispatched") return { status: "completed", label: "Complete" };
  return null;
}

function codeOf(order: WebOrderSummary): string {
  const code = order.orderCode?.trim();
  return code ? code.toUpperCase() : order.id.replace(/-/g, "").slice(-8).toUpperCase();
}

function fmtMoney(n: number | string | null | undefined, currency: string): string {
  const value = typeof n === "string" ? Number(n) : (n ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency || "KES",
      maximumFractionDigits: 0,
    }).format(safe);
  } catch {
    return `${currency || "KES"} ${safe.toFixed(0)}`;
  }
}

function statusLabel(order: WebOrderSummary): string {
  if (!isPaid(order)) return "Unpaid";
  const f = (order.fulfillmentStatus ?? "awaiting_confirmation").trim().toLowerCase();
  if (f === "awaiting_confirmation") return "To confirm";
  if (f === "confirmed") return "Packing";
  if (f === "dispatched") return "Ready";
  return "Done";
}

/**
 * In-POS web-order queue (scope P2 #17): the cashier advances online pickups
 * (Confirm → Ready → Complete, print, call) without leaving the till. Mounted
 * once per cashier surface from the cashier layout; the launcher only appears
 * when there is something to do.
 */
export function CashierWebOrdersPanel() {
  const dash = useOptionalDashboard();
  const me = dash?.me;
  const branchId = dash?.branchId;
  const currency = dash?.business?.currency?.trim() || "KES";

  const canView =
    hasPermission(me?.permissions, Permission.SalesSell) ||
    hasPermission(me?.permissions, Permission.StorefrontOrdersRead);

  const [orders, setOrders] = useState<WebOrderSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const branchRef = useRef<string | undefined>(branchId);
  branchRef.current = branchId;

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      const rows = await fetchWebOrders(0, 50);
      const scope = branchRef.current?.trim();
      setOrders(
        (Array.isArray(rows) ? rows : [])
          .filter((o) => (scope ? o.catalogBranchId === scope : true))
          .filter(isOpen)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
    } catch {
      // best-effort; the desk page remains the source of truth
    }
  }, [canView]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live refresh on new/paid order frames (skip historical polls).
  useEffect(() => {
    if (!canView || !getSessionTokens()) return;
    const client = getRealtimeClient();
    const unregister = client.registerListener("cashier-web-orders", {
      channels: ["notifications"],
      onNotification: (frame: RealtimeFrame) => {
        if (frame.type !== "notification.created" || frame.delivery === "poll") return;
        const data = frame.data as Record<string, unknown>;
        const type = typeof data.notificationType === "string" ? data.notificationType : "";
        if (STOREFRONT_ORDER_TYPES.has(type)) void load();
      },
    });
    client.connect().catch(() => {
      // polling fallback only
    });
    return unregister;
  }, [canView, load]);

  if (!canView || orders.length === 0) return null;

  const advance = async (order: WebOrderSummary, step: NextStep) => {
    setBusyId(order.id);
    try {
      await updateWebOrderFulfillment(order.id, step.status);
      setOrders((prev) =>
        prev
          .map((o) =>
            o.id === order.id ? { ...o, fulfillmentStatus: step.status } : o,
          )
          .filter(isOpen),
      );
      const done = step.status === "completed";
      toast.success(
        done ? `#${codeOf(order)} completed` : `#${codeOf(order)} — ${step.label.toLowerCase()}d`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the order.");
    } finally {
      setBusyId(null);
    }
  };

  const print = async (order: WebOrderSummary) => {
    setBusyId(order.id);
    try {
      await printWebOrderReceipt(order.id, DESKTOP_THERMAL_WIDTH_MM, {
        branchId: order.catalogBranchId ?? branchRef.current ?? null,
      });
    } catch {
      toast.error("Could not print the ticket.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed bottom-3 left-3 z-40 print:hidden">
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-80 max-w-[calc(100vw-1.5rem)] border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 px-3.5 py-2.5">
              <span className="text-sm font-semibold">Web orders</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
              {orders.map((order) => {
                const step = nextStep(order);
                const busy = busyId === order.id;
                const tel = (order.customerPhone ?? "").replace(/[^\d+]/g, "");
                return (
                  <div key={order.id} className="px-3.5 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {order.customerName?.trim() || "Customer"}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          #{codeOf(order)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold tabular-nums text-foreground">
                          {fmtMoney(order.grandTotal, order.currency || currency)}
                        </p>
                        <span
                          className={cn(
                            "mt-0.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium",
                            isPaid(order)
                              ? "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
                          )}
                        >
                          {statusLabel(order)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {step ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void advance(order, step)}
                          className="inline-flex items-center gap-1 rounded-none bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="size-3 animate-spin" /> : null}
                          {step.label}
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {isPaid(order) ? "Nothing to do" : "Awaiting payment at the desk"}
                        </span>
                      )}
                      <button
                        type="button"
                        title="Print ticket"
                        disabled={busy}
                        onClick={() => void print(order)}
                        className="inline-flex items-center rounded-none border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        <Printer className="size-3" />
                      </button>
                      {tel ? (
                        <a
                          href={`tel:${tel}`}
                          title="Call customer"
                          className="inline-flex items-center rounded-none border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          <Phone className="size-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border/40 px-3.5 py-2">
              <button
                type="button"
                onClick={() => void load()}
                className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground"
              >
                Refresh
              </button>
            </div>
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-none border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted/60"
      >
        <ShoppingBag className="size-3.5" />
        <span>Web orders</span>
        <span className="inline-flex size-4 items-center justify-center rounded-none bg-primary text-[10px] font-bold text-primary-foreground">
          {orders.length > 9 ? "9+" : orders.length}
        </span>
      </button>
    </div>
  );
}
