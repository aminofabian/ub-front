"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { playCashierChime } from "@/lib/cashier-chime";
import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";

function dispatchGroceryInvoiceEvent(
  type: string,
  data: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("grocery-invoice-event", {
      detail: { type, barcode: data.barcodeCode, data },
    }),
  );
}

/**
 * Subscribe to grocery realtime events and show toast notifications.
 * Handles both WebSocket frames AND REST polling fallback (notification.created).
 */
export function useGroceryNotifications() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const shownEventIds = useRef<Set<string>>(new Set());
  const shownInvoiceIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const client = getRealtimeClient();

    const handleInvoiceCreated = (data: Record<string, unknown>) => {
      const invoiceId = String(data.invoiceId ?? "");
      const barcode = String(data.barcodeCode ?? "");
      const total = String(data.grandTotal ?? "");
      const items = String(data.lineCount ?? "");
      const by = String(data.createdByName ?? "Staff");

      // Dedupe by invoice id so WS + REST poll do not double-notify.
      if (invoiceId && shownInvoiceIds.current.has(invoiceId)) return;
      if (invoiceId) shownInvoiceIds.current.add(invoiceId);

      playCashierChime("grocery");
      dispatchGroceryInvoiceEvent("created", data);

      toast.success(`New grocery invoice ${barcode}`, {
        description: `${items} items · ${total} · by ${by}`,
        duration: 10_000,
        action: {
          label: "Load",
          onClick: () =>
            routerRef.current.push(
              `/cashier?invoice=${encodeURIComponent(barcode)}`,
            ),
        },
      });
    };

    const unregister = client.registerListener("grocery-notifications", {
      channels: ["grocery", "notifications"],

      // WebSocket path: direct grocery.invoice.created frame
      onGroceryInvoiceCreated: (frame: RealtimeFrame) => {
        if (shownEventIds.current.has(frame.eventId)) return;
        shownEventIds.current.add(frame.eventId);
        handleInvoiceCreated(frame.data);
      },

      // REST polling path: notification.created frame from Notification rows
      onNotification: (frame: RealtimeFrame) => {
        const data = frame.data as Record<string, unknown>;
        const type = String(data.notificationType ?? data.type ?? "");
        if (type !== "grocery.invoice.created") return;

        const notifId = String(data.id ?? frame.eventId);
        if (shownEventIds.current.has(notifId)) return;
        shownEventIds.current.add(notifId);

        // Notification payload is nested differently
        const payload = (data.payload as Record<string, unknown>) ?? data;
        handleInvoiceCreated(payload);
      },

      onGroceryInvoiceLocked: (frame: RealtimeFrame) => {
        const d = frame.data;
        dispatchGroceryInvoiceEvent("locked", d);
        const barcode = String(d.barcodeCode ?? "");
        const by = String(d.lockedByName ?? "Another cashier");
        toast.info(`Invoice ${barcode} is being processed`, {
          description: `Locked by ${by}`,
          duration: 6_000,
        });
      },

      onGroceryInvoicePaid: (frame: RealtimeFrame) => {
        const d = frame.data;
        dispatchGroceryInvoiceEvent("paid", d);
        const barcode = String(d.barcodeCode ?? "");
        toast.success(`Invoice ${barcode} has been paid`, {
          duration: 5_000,
        });
      },

      onGroceryInvoiceCancelled: (frame: RealtimeFrame) => {
        const d = frame.data;
        dispatchGroceryInvoiceEvent("cancelled", d);
        const barcode = String(d.barcodeCode ?? "");
        toast("Invoice cancelled", {
          description: `${barcode} is no longer available`,
          duration: 5_000,
        });
      },

      onGroceryInvoiceExpired: (frame: RealtimeFrame) => {
        const d = frame.data;
        dispatchGroceryInvoiceEvent("expired", d);
        const barcode = String(d.barcodeCode ?? "");
        toast("Invoice expired", {
          description: `${barcode} has expired`,
          duration: 5_000,
        });
      },

      onGroceryInvoiceUnlocked: (frame: RealtimeFrame) => {
        dispatchGroceryInvoiceEvent("unlocked", frame.data);
      },
    });

    return () => {
      unregister();
    };
  }, []);
}
