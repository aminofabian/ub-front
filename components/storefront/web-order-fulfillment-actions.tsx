"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { updateWebOrderFulfillment, type WebOrderDetail } from "@/lib/api";

type Props = {
  order: WebOrderDetail;
  onUpdated: (next: WebOrderDetail) => void;
};

function label(status: string): string {
  return status.replace(/_/g, " ");
}

export function WebOrderFulfillmentActions({ order, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (order.status !== "paid") {
    return null;
  }

  const fulfillment = order.fulfillmentStatus ?? "awaiting_confirmation";
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
      {nextAction ? (
        <Button
          type="button"
          size="sm"
          className="mt-3"
          disabled={busy}
          onClick={() => void advance(nextAction.status)}
        >
          {busy ? "Saving…" : nextAction.label}
        </Button>
      ) : (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">Pickup complete.</p>
      )}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
