"use client";

import { toast } from "sonner";

import { claimTillPrint, type TillPrintPendingJob, type TillPrintSlipPayload } from "@/lib/api";
import { playCashierChime } from "@/lib/cashier-chime";
import { DESKTOP_THERMAL_WIDTH_MM, printTillSlip } from "@/lib/desktop-print";
import { isTillPrintBridgeUp } from "@/lib/till-print-bridge";
import type { TillSlipKind } from "@/lib/till-slip";

const inflight = new Set<string>();
const announced = new Set<string>();

export type TillSendStatus = {
  userId: string;
  name: string;
  online: boolean;
};

export function describeTillSend(
  kind: "order" | "receipt",
  tills: TillSendStatus[],
): string {
  const label = kind === "receipt" ? "Receipt" : "Order";
  const names = (rows: TillSendStatus[]) =>
    rows.map((row) => row.name?.trim() || "the till").join(", ");
  const online = tills.filter((row) => row.online);
  const offline = tills.filter((row) => !row.online);
  if (tills.length === 0) {
    return `${label} queued for the till.`;
  }
  if (offline.length === 0) {
    return `${label} sent to ${names(online)}. Their screen will chime and the slip will print.`;
  }
  if (online.length === 0) {
    const who = names(offline);
    return tills.length === 1
      ? `${who} is not on Sell right now. The slip is waiting — they will hear a chime and it will print when they open the till.`
      : `${who} are not on Sell right now. The slips are waiting until they open the till.`;
  }
  return `${label} printing for ${names(online)}. ${names(offline)} will get it when they open Sell.`;
}

function slipLabel(kind: string, reference: string): string {
  const what = kind === "receipt" ? "Goods receipt" : "Purchase order";
  const ref = reference.trim();
  return ref ? `${what} ${ref}` : what;
}

/** Chime + toast once per job, even if the printer is offline. */
export function announceTillSlip(job: { id: string; kind: string; reference?: string | null }): void {
  const id = job.id.trim();
  if (!id || announced.has(id)) return;
  announced.add(id);
  playCashierChime("order");
  toast.info(slipLabel(job.kind, job.reference || ""), {
    description: "From the order desk. Printing on this till.",
    duration: 20_000,
  });
}

/**
 * Notify first, then print. The job stays queued until paper actually comes out.
 */
export async function deliverTillSlip(
  job: TillPrintPendingJob,
  branchId?: string | null,
): Promise<void> {
  const id = job.id?.trim();
  if (!id || inflight.has(id)) return;
  announceTillSlip(job);
  if (!job.slip?.lines?.length) return;
  inflight.add(id);
  try {
    const bridgeUp = await isTillPrintBridgeUp();
    if (!bridgeUp) return;
    const kind: TillSlipKind = job.kind === "receipt" ? "receipt" : "order";
    const printed = await printTillSlip(
      job.slip,
      kind,
      DESKTOP_THERMAL_WIDTH_MM,
      { branchId: branchId || null },
      { quiet: true },
    );
    if (!printed) return;
    await claimTillPrint(id);
    toast.success(`${slipLabel(kind, job.reference || job.slip.reference || "")} printed.`);
  } finally {
    inflight.delete(id);
  }
}

export function slipFromJson(raw: string): TillPrintSlipPayload | null {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as TillPrintSlipPayload;
    if (!parsed || !Array.isArray(parsed.lines) || parsed.lines.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}
