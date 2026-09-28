"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { getSessionTokens } from "@/lib/auth";
import {
  claimTillPrint,
  fetchPendingTillPrints,
  type TillPrintPendingJob,
} from "@/lib/api";
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
 * Prints purchase orders and goods receipts aimed at this logged-in till user.
 * Prints first, then claims — so a bridge hiccup keeps the slip for retry.
 */
export function CashierTillPrintListener() {
  const dash = useOptionalDashboard();
  const roleKey = dash?.me?.role?.key?.trim().toLowerCase() ?? "";
  const userId = dash?.me?.id?.trim() ?? "";
  const branchId = dash?.branchId;
  const inflight = useRef(new Set<string>());
  const bridgeWarned = useRef(false);

  useEffect(() => {
    // Any till role, or whoever has pending jobs for their user id (owner on a till).
    const isTill = TILL_ROLES.has(roleKey);
    if (!userId || !getSessionTokens()) {
      return;
    }

    let cancelled = false;

    const deliverJob = async (job: TillPrintPendingJob) => {
      const id = job.id?.trim();
      if (!id || !job.slip || inflight.current.has(id)) return;
      inflight.current.add(id);
      try {
        const bridgeUp = await isTillPrintBridgeUp();
        if (!bridgeUp) {
          if (!bridgeWarned.current && isTill) {
            bridgeWarned.current = true;
            toast.message(
              "A slip is waiting for this till. Start the Print Bridge (or Kiosk Desktop), then it will print itself.",
              { duration: 12_000 },
            );
          }
          return;
        }
        if (cancelled) return;

        const kind: TillSlipKind = job.kind === "receipt" ? "receipt" : "order";
        const printed = await printTillSlip(
          job.slip,
          kind,
          DESKTOP_THERMAL_WIDTH_MM,
          { branchId: branchId || null },
          { quiet: true },
        );
        if (!printed || cancelled) {
          if (!bridgeWarned.current && isTill) {
            bridgeWarned.current = true;
            toast.message(
              "Could not print a waiting slip. Check Detect printers on this till, then it will retry.",
              { duration: 12_000 },
            );
          }
          return;
        }

        await claimTillPrint(id);
        toast.success(
          `${kind === "receipt" ? "Goods receipt" : "Purchase order"} ${job.reference || ""} printed.`
            .replace(/\s+/g, " ")
            .trim(),
        );
      } finally {
        inflight.current.delete(id);
      }
    };

    const pullPending = async () => {
      try {
        const rows = await fetchPendingTillPrints();
        if (cancelled) return;
        for (const row of rows) {
          void deliverJob(row);
        }
      } catch {
        // till can retry on the next pass
      }
    };

    void pullPending();
    const timer = window.setInterval(() => {
      void pullPending();
    }, 8_000);

    const client = getRealtimeClient();
    const unregister = client.registerListener("cashier-till-print", {
      channels: ["notifications"],
      onTillPrint: (frame) => {
        if (frame.delivery === "poll") return;
        const jobId = readJobId(frame);
        if (!jobId) return;
        // Prefer a fresh pending list so we have the slip without claiming yet.
        void pullPending();
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
