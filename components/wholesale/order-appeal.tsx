"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { appealSalesOrder } from "@/lib/api";

/**
 * "This is wrong" on an answered order. The appeal opens in the supplier's support chat with the order attached;
 * platform support decides whether the order leaves the standing, and can reverse it.
 */
export function OrderAppeal({ orderId }: { orderId: string }) {
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p className="mt-4 text-[13px] text-muted-foreground">
        Sent to platform support, in your support chat with this order attached.
      </p>
    );
  }
  if (!editing) {
    return (
      <button
        type="button"
        className="mt-4 text-[13px] font-medium underline underline-offset-4"
        onClick={() => setEditing(true)}
      >
        This is wrong
      </button>
    );
  }

  const send = async () => {
    setBusy(true);
    try {
      await appealSalesOrder(orderId, reason);
      setSent(true);
      toast.success("Sent to platform support");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not go through");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <p className="text-[13px] text-muted-foreground">
        Say what is wrong with this order. It goes to platform support in your support chat. This order counts
        against your standing until platform support decides otherwise.
      </p>
      <Textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="What is wrong with this order?"
      />
      <div className="flex gap-2">
        <Button type="button" disabled={busy || reason.trim() === ""} onClick={() => void send()}>
          Send appeal
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
