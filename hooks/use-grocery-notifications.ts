"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";

/**
 * Subscribe to grocery realtime events and show toast notifications.
 * Call once at app level (e.g., in a provider or layout).
 */
export function useGroceryNotifications() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    const client = getRealtimeClient();
    const unregister = client.registerListener("grocery-notifications", {
      channels: ["grocery"],
      onGroceryInvoiceCreated: (frame: RealtimeFrame) => {
        const d = frame.data;
        const barcode = String(d.barcodeCode ?? "");
        const total = String(d.grandTotal ?? "");
        const items = String(d.lineCount ?? "");
        const by = String(d.createdByName ?? "Staff");

        toast.success(`New grocery invoice ${barcode}`, {
          description: `${items} items · ${total} · by ${by}`,
          duration: 10_000,
          action: {
            label: "View",
            onClick: () =>
              routerRef.current.push(`/cashier?invoice=${encodeURIComponent(barcode)}`),
          },
        });
      },
      onGroceryInvoiceLocked: (frame: RealtimeFrame) => {
        const d = frame.data;
        const barcode = String(d.barcodeCode ?? "");
        const by = String(d.lockedByName ?? "Another cashier");
        toast.info(`Invoice ${barcode} is being processed`, {
          description: `Locked by ${by}`,
          duration: 6_000,
        });
      },
      onGroceryInvoicePaid: (frame: RealtimeFrame) => {
        const d = frame.data;
        const barcode = String(d.barcodeCode ?? "");
        toast.success(`Invoice ${barcode} has been paid`, {
          duration: 5_000,
        });
      },
      onGroceryInvoiceCancelled: (frame: RealtimeFrame) => {
        const d = frame.data;
        const barcode = String(d.barcodeCode ?? "");
        toast("Invoice cancelled", {
          description: `${barcode} is no longer available`,
          duration: 5_000,
        });
      },
      onGroceryInvoiceExpired: (frame: RealtimeFrame) => {
        const d = frame.data;
        const barcode = String(d.barcodeCode ?? "");
        toast("Invoice expired", {
          description: `${barcode} has expired`,
          duration: 5_000,
        });
      },
      onGroceryInvoiceUnlocked: () => {
        // Silent — just clears the locked state on other cashiers' screens
      },
    });

    return () => {
      unregister();
    };
  }, []);
}
