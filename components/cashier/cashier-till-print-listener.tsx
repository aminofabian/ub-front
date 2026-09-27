"use client";

import { useEffect, useRef } from "react";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { getSessionTokens } from "@/lib/auth";
import { claimTillPrint, fetchPendingTillPrints } from "@/lib/api";
import {
  DESKTOP_THERMAL_WIDTH_MM,
  printTillSlip,
} from "@/lib/desktop-print";
import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";
import { isTillPrintBridgeUp } from "@/lib/till-print-bridge";
import type { TillSlipKind } from "@/lib/till-slip";

const TILL_ROLES = new Set(["cashier", "butcher_cashier"]);

function readJobId(frame: RealtimeFrame): string {
  const data = frame.data as Record<string, unknown>;
  const id = data.jobId;
  return typeof id === "string" ? id.trim() : "";
}

/**
 * Prints purchase orders and goods receipts that were aimed at this cashier.
 * Other tills never receive the job. A till that is closed keeps the slip
 * for a few hours and prints it when the cashier next opens Sell.
 */
export function CashierTillPrintListener() {
  const dash = useOptionalDashboard();
  const roleKey = dash?.me?.role?.key?.trim().toLowerCase() ?? "";
  const userId = dash?.me?.id?.trim() ?? "";
  const branchId = dash?.branchId;
  const inflight = useRef(new Set<string>());

  useEffect(() => {
    if (!TILL_ROLES.has(roleKey) || !userId || !getSessionTokens()) {
      return;
    }

    let cancelled = false;

    const deliver = async (jobId: string) => {
      const id = jobId.trim();
      if (!id || inflight.current.has(id)) return;
      inflight.current.add(id);
      try {
        const bridgeUp = await isTillPrintBridgeUp();
        if (!bridgeUp || cancelled) return;
        const job = await claimTillPrint(id);
        if (!job || cancelled) return;
        const kind: TillSlipKind = job.kind === "receipt" ? "receipt" : "order";
        await printTillSlip(job.slip, kind, DESKTOP_THERMAL_WIDTH_MM, {
          branchId: branchId || null,
        });
      } finally {
        inflight.current.delete(id);
      }
    };

    const pullPending = async () => {
      try {
        const rows = await fetchPendingTillPrints();
        if (cancelled) return;
        for (const row of rows) {
          void deliver(row.id);
        }
      } catch {
        // till can retry on the next pass
      }
    };

    void pullPending();
    const timer = window.setInterval(() => {
      void pullPending();
    }, 15_000);

    const client = getRealtimeClient();
    const unregister = client.registerListener("cashier-till-print", {
      channels: ["notifications"],
      onTillPrint: (frame) => {
        if (frame.delivery === "poll") return;
        void deliver(readJobId(frame));
      },
    });
    client.connect().catch(() => {
      // pending poll still prints once the till is open
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      unregister();
    };
  }, [roleKey, userId, branchId]);

  return null;
}
