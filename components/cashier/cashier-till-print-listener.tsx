"use client";

import { useEffect, useRef } from "react";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { getSessionTokens } from "@/lib/auth";
import { fetchPendingTillPrints } from "@/lib/api";
import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";
import {
  announceTillSlip,
  deliverTillSlip,
  slipFromJson,
} from "@/lib/till-remote-print";

function readField(data: Record<string, unknown>, key: string): string {
  const nested =
    data.payload && typeof data.payload === "object" && !Array.isArray(data.payload)
      ? (data.payload as Record<string, unknown>)
      : null;
  const fromNested = nested?.[key];
  if (typeof fromNested === "string" && fromNested.trim()) return fromNested.trim();
  const direct = data[key];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return "";
}

function notificationType(data: Record<string, unknown>): string {
  return readField(data, "notificationType") || readField(data, "type");
}

/**
 * Remote slips from Order / Receive.
 * Always chimes on this till, then prints when the local printer helper is up.
 * Polling covers a till whose live socket is on another server.
 */
export function CashierTillPrintListener() {
  const dash = useOptionalDashboard();
  const userId = dash?.me?.id?.trim() ?? "";
  const branchId = dash?.branchId;
  const branchRef = useRef(branchId);
  branchRef.current = branchId;

  useEffect(() => {
    if (!userId || !getSessionTokens()) return;

    let cancelled = false;

    const pullPending = async () => {
      try {
        const rows = await fetchPendingTillPrints();
        if (cancelled) return;
        for (const row of rows) {
          void deliverTillSlip(row, branchRef.current);
        }
      } catch {
        // next pass retries
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
      const slip = slipFromJson(readField(data, "slipJson"));
      if (jobId) {
        announceTillSlip({ id: jobId, kind, reference });
        if (slip) {
          void deliverTillSlip(
            { id: jobId, kind, reference, slip },
            branchRef.current,
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
  }, [userId]);

  return null;
}
