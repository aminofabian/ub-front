"use client";

import { useEffect, useRef } from "react";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { hasAccessSession } from "@/lib/auth";
import { fetchPendingTillPrints, type BranchRecord } from "@/lib/api";
import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";
import type { LocalReceiptPrinterTarget } from "@/lib/desktop-print";
import {
  announceTillSlip,
  deliverTillSlip,
  notePendingTillPrintError,
  slipFromJson,
} from "@/lib/till-remote-print";

function payloadOf(data: Record<string, unknown>): Record<string, unknown> | null {
  const nested = data.payload;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return null;
}

function readField(data: Record<string, unknown>, key: string): string {
  const nested = payloadOf(data);
  const fromNested = nested?.[key];
  if (typeof fromNested === "string" && fromNested.trim()) return fromNested.trim();
  const direct = data[key];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return "";
}

function readSlip(data: Record<string, unknown>) {
  const nested = payloadOf(data);
  return slipFromJson(nested?.slipJson ?? nested?.slip ?? data.slipJson ?? data.slip);
}

function printerForTill(
  branches: BranchRecord[] | undefined,
  branchId: string | undefined,
  assignedBranchId: string | undefined,
): LocalReceiptPrinterTarget {
  const preferred = branchId?.trim() || assignedBranchId?.trim() || "";
  const list = branches ?? [];
  const branch =
    list.find((row) => row.id === preferred) ??
    (list.length === 1 ? list[0] : undefined);
  return {
    cupsName: branch?.receipt?.printerCupsName ?? null,
    branchId: branch?.id || preferred || null,
  };
}

function notificationType(data: Record<string, unknown>): string {
  return readField(data, "notificationType") || readField(data, "type");
}

/**
 * Remote slips from Order / Receive.
 * Chimes on this till, then prints on the same receipt printer Sell uses.
 * The till session is the httpOnly cookie, so this must poll even when no
 * access token is kept in memory. Polling also covers a till whose live
 * socket is connected to a different API server than the order desk.
 */
export function CashierTillPrintListener() {
  const dash = useOptionalDashboard();
  const userId = dash?.me?.id?.trim() ?? "";
  const signedIn = hasAccessSession() || Boolean(userId);
  const printerRef = useRef<LocalReceiptPrinterTarget | null>(null);
  printerRef.current = printerForTill(
    dash?.branches,
    dash?.branchId,
    dash?.me?.branchId,
  );

  useEffect(() => {
    if (!signedIn) return;

    let cancelled = false;

    const pullPending = async () => {
      try {
        const rows = await fetchPendingTillPrints();
        if (cancelled) return;
        for (const row of rows) {
          void deliverTillSlip(row, printerRef.current);
        }
      } catch {
        notePendingTillPrintError();
      }
    };

    const onLive = (frame: RealtimeFrame) => {
      if (frame.delivery === "poll") return;
      const data = frame.data as Record<string, unknown>;
      if (frame.type === "notification.created" && notificationType(data) !== "till.slip") {
        return;
      }
      const jobId = readField(data, "jobId");
      const kind = readField(data, "kind") || "order";
      const reference = readField(data, "reference");
      const slip = readSlip(data);
      if (jobId) {
        announceTillSlip({ id: jobId, kind, reference });
        if (slip) {
          void deliverTillSlip(
            { id: jobId, kind, reference, slip },
            printerRef.current,
          );
          return;
        }
      }
      void pullPending();
    };

    void pullPending();
    const timer = window.setInterval(() => {
      void pullPending();
    }, 5_000);

    const client = getRealtimeClient();
    const unregister = client.registerListener("cashier-till-print", {
      channels: ["notifications"],
      onTillPrint: onLive,
      onNotification: onLive,
    });
    client.connect().catch(() => {
      // polling still delivers
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      unregister();
    };
  }, [signedIn]);

  return null;
}
