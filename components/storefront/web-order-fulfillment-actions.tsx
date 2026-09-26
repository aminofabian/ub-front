"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  updateWebOrderFulfillment,
  voidWebOrder,
  type WebOrderDetail,
} from "@/lib/api";

type Props = {
  order: WebOrderDetail;
  onUpdated: (next: WebOrderDetail) => void;
};

function label(status: string): string {
  return status.replace(/_/g, " ");
}

/** WhatsApp orders settle in chat, so the merchant drives fulfillment while pending_payment. */
function isWhatsAppOrder(order: WebOrderDetail): boolean {
  return (
    order.channel === "WHATSAPP" ||
    (order.notes ?? "").toLowerCase().includes("channel: whatsapp")
  );
}

export function WebOrderFulfillmentActions({ order, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fulfillment = order.fulfillmentStatus ?? "awaiting_confirmation";
  const cancelled =
    order.status === "cancelled" || fulfillment === "cancelled";
  const completed = fulfillment === "completed";
  const canAdvance = order.status === "paid" || isWhatsAppOrder(order);

  const voidOrder = async () => {
    const who = order.customerName?.trim() || "this order";
    const paidNote =
      order.status === "paid"
        ? " Stock goes back on the shelf. Settle any payment already received with the customer."
        : " Stock held for it goes back on the shelf.";
    if (!window.confirm(`Void ${who}?${paidNote}`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await voidWebOrder(order.id);
      onUpdated(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not void this order.");
    } finally {
      setBusy(false);
    }
  };

  if (cancelled || (completed && !canAdvance)) {
    return null;
  }

  if (!canAdvance) {
    return (
      <div className="rounded-lg border border-border px-4 py-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void voidOrder()}
        >
          {busy ? "Voiding…" : "Void order"}
        </Button>
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }
  const nextAction =
    fulfillment === "awaiting_confirmation"
      ? { status: "confirmed" as const, label: "Confirm order" }
      : fulfillment === "confirmed"
        ? { status: "dispatched" as const, label: "Mark ready for pickup" }
        : fulfillment === "dispatched"
          ? { status: "completed" as const, label: "Complete pickup" }
          : null;

  const advance = async (status: "confirmed" | "dispatched" | "completed") => {
    setBusy(true);
    setError("");
    try {
      const next = await updateWebOrderFulfillment(order.id, status);
      onUpdated(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update fulfillment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
      <p className="text-sm font-medium">Fulfillment</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Status: <span className="font-medium text-foreground">{label(fulfillment)}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {nextAction ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void advance(nextAction.status)}
          >
            {busy ? "Saving…" : nextAction.label}
          </Button>
        ) : completed ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Pickup complete.
          </p>
        ) : null}
        {!completed ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void voidOrder()}
          >
            Void order
          </Button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
