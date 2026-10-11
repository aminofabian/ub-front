"use client";

import { useState } from "react";
import { toast } from "sonner";

import { showConfirmModal } from "@/components/confirm-modal";
import { Button } from "@/components/ui/button";
import {
  markWebOrderPaid,
  requestWebOrderStk,
  sendWebOrderMessage,
  updateWebOrderFulfillment,
  voidWebOrder,
  type WebOrderDetail,
} from "@/lib/api";
import {
  FULFILLMENT_COMPLETED,
  WEB_ORDER_CANCELLED,
  WEB_ORDER_PAID,
  isDoorstepOrder,
  nextFulfillmentStep,
  orderCodeOf,
  orderStatusLine,
} from "@/lib/web-order-desk";

type Props = {
  order: WebOrderDetail;
  onUpdated: (next: WebOrderDetail) => void;
};

const CARD =
  "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-4 py-3";

export function WebOrderFulfillmentActions({ order, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fulfillment = (order.fulfillmentStatus ?? "").trim().toLowerCase();
  const cancelled =
    order.status === WEB_ORDER_CANCELLED || fulfillment === WEB_ORDER_CANCELLED;
  const completed = fulfillment === FULFILLMENT_COMPLETED;
  const paid = order.status === WEB_ORDER_PAID;
  const code = orderCodeOf(order);
  const step = nextFulfillmentStep({
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    code,
    doorstep: isDoorstepOrder(order),
  });
  const payment = orderStatusLine(order);
  const hasPhone = Boolean(order.customerPhone?.trim());

  if (cancelled) return null;

  const run = async (action: () => Promise<void>, failMessage: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : failMessage);
    } finally {
      setBusy(false);
    }
  };

  const voidOrder = () => {
    const who = order.customerName?.trim() || "this order";
    showConfirmModal({
      id: `void-web-order-${order.id}`,
      title: `Void ${who}?`,
      description: paid
        ? "Stock goes back on the shelf. Settle any payment already received with the customer."
        : "Stock held for it goes back on the shelf.",
      confirmLabel: "Void",
      onConfirm: () =>
        run(async () => {
          onUpdated(await voidWebOrder(order.id));
        }, "Could not void this order."),
    });
  };

  const markPaid = () => {
    const who = order.customerName?.trim() || "this order";
    showConfirmModal({
      id: `mark-paid-web-order-${order.id}`,
      title: `Mark ${who} as paid?`,
      description:
        "Use this when the customer already paid: cash, send-money, or the till. The order can then be confirmed.",
      confirmLabel: "Mark as paid",
      confirmVariant: "default",
      onConfirm: () =>
        run(async () => {
          onUpdated(await markWebOrderPaid(order.id));
          toast.success("Marked as paid.");
        }, "Could not mark this order paid."),
    });
  };

  const sendPrompt = () =>
    run(async () => {
      const result = await requestWebOrderStk(order.id);
      if (!result.accepted) {
        setError(result.message || "Could not send the M-Pesa prompt.");
        return;
      }
      setNotice("M-Pesa prompt sent. The order is paid when they enter the PIN.");
      toast.success("M-Pesa prompt sent.");
    }, "Could not send the M-Pesa prompt.");

  const sendPaymentMessage = () =>
    run(async () => {
      const result = await sendWebOrderMessage(order.id, { kind: "payment_request" });
      if (!result.sent) {
        setError(result.detail || "Could not send the payment message.");
        return;
      }
      const via = result.channel ? ` via ${result.channel}` : "";
      setNotice(`Payment message sent${via}.`);
      toast.success("Payment message sent.");
    }, "Could not send the payment message.");

  const advance = () => {
    if (!step) return;
    void run(async () => {
      onUpdated(await updateWebOrderFulfillment(order.id, step.status));
    }, "Could not update this order.");
  };

  return (
    <div className="space-y-3">
      {!paid ? (
        <section className={CARD}>
          <p className="text-sm font-medium">{payment.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Collect payment before packing or delivery.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy || !hasPhone} onClick={sendPrompt}>
              Send M-Pesa prompt
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !hasPhone}
              onClick={sendPaymentMessage}
            >
              Send payment on WhatsApp
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={markPaid}>
              Mark paid
            </Button>
          </div>
        </section>
      ) : null}

      {step ? (
        <section className={CARD}>
          <p className="text-sm font-medium">{step.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Or text {step.command} from the shop WhatsApp.
          </p>
          <div className="mt-3">
            <Button type="button" size="sm" disabled={busy} onClick={advance}>
              {busy ? "Saving…" : step.label}
            </Button>
          </div>
        </section>
      ) : null}

      {completed ? (
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
          Order complete.
        </p>
      ) : (
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={voidOrder}>
          Void order
        </Button>
      )}

      {notice ? (
        <p className="text-xs text-emerald-800 dark:text-emerald-300">{notice}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
