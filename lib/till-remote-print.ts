"use client";

import { toast } from "sonner";

import { claimTillPrint, type TillPrintPendingJob, type TillPrintSlipPayload } from "@/lib/api";
import { playCashierChime } from "@/lib/cashier-chime";
import {
  DESKTOP_THERMAL_WIDTH_MM,
  printTillSlip,
  type LocalReceiptPrinterTarget,
} from "@/lib/desktop-print";
import type { TillSlipKind } from "@/lib/till-slip";

const inflight = new Set<string>();
const announced = new Set<string>();
const warned = new Set<string>();
const sent = new Set<string>();
const attempts = new Map<string, number>();
let pendingErrorTold = false;

/** A job that already reached the printer must not be sent again, even after a refresh. */
const SENT_PREFIX = "palmart.till-slip-sent:";
/** One automatic retry only when nothing was handed to the printer. */
const MAX_ATTEMPTS = 2;

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

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Accept the slip whether the API sent numbers or numeric strings. */
export function normalizeTillSlip(raw: unknown): TillPrintSlipPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (!Array.isArray(row.lines) || row.lines.length === 0) return null;
  const lines = row.lines.flatMap((line) => {
    if (!line || typeof line !== "object") return [];
    const item = line as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) return [];
    return [
      {
        name,
        qty: asNumber(item.qty),
        unitCost: asNumber(item.unitCost),
        lineTotal: asNumber(item.lineTotal),
      },
    ];
  });
  if (lines.length === 0) return null;
  const text = (key: string) => (typeof row[key] === "string" ? (row[key] as string) : null);
  return {
    reference: text("reference")?.trim() || "",
    supplierName: text("supplierName"),
    businessName: text("businessName"),
    branchName: text("branchName"),
    placedByName: text("placedByName"),
    currency: text("currency"),
    lines,
  };
}

export function slipFromJson(raw: unknown): TillPrintSlipPayload | null {
  if (typeof raw === "string") {
    if (!raw.trim()) return null;
    try {
      return normalizeTillSlip(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }
  return normalizeTillSlip(raw);
}

function wasSent(id: string): boolean {
  if (sent.has(id)) return true;
  try {
    if (window.localStorage.getItem(SENT_PREFIX + id) === "1") {
      sent.add(id);
      return true;
    }
  } catch {
    // private mode
  }
  return false;
}

function rememberSent(id: string): void {
  sent.add(id);
  try {
    window.localStorage.setItem(SENT_PREFIX + id, "1");
  } catch {
    // private mode — the in-memory set still blocks this tab
  }
}

/** One toast when the till cannot load its queue. Polling keeps trying. */
export function notePendingTillPrintError(): void {
  if (pendingErrorTold) return;
  pendingErrorTold = true;
  toast.error("This till could not load the order slip. It will keep trying.", {
    duration: 12_000,
  });
}

/**
 * Chime, then print one copy on this till.
 * A second live alert or poll for the same job does not print again.
 * If the printer helper never accepted the bytes, one later attempt is allowed.
 */
export async function deliverTillSlip(
  job: TillPrintPendingJob,
  printer?: LocalReceiptPrinterTarget | null,
): Promise<void> {
  const id = job.id?.trim();
  if (!id || inflight.has(id)) return;
  if (wasSent(id)) {
    await claimTillPrint(id);
    return;
  }
  const slip = normalizeTillSlip(job.slip);
  announceTillSlip({
    id,
    kind: job.kind,
    reference: job.reference || slip?.reference,
  });
  if (!slip) return;
  const tries = attempts.get(id) ?? 0;
  if (tries >= MAX_ATTEMPTS) {
    rememberSent(id);
    await claimTillPrint(id);
    return;
  }
  inflight.add(id);
  attempts.set(id, tries + 1);
  const alreadyWarned = warned.has(id);
  try {
    const kind: TillSlipKind = job.kind === "receipt" ? "receipt" : "order";
    const result = await printTillSlip(
      slip,
      kind,
      DESKTOP_THERMAL_WIDTH_MM,
      printer,
      { quiet: alreadyWarned },
    );
    if (result === "failed") {
      warned.add(id);
      return;
    }
    // "printed" and "maybe" (timeout) both mean the spool may already have the slip.
    rememberSent(id);
    warned.delete(id);
    await claimTillPrint(id);
    if (alreadyWarned && result === "printed") {
      toast.success(`${slipLabel(kind, job.reference || slip.reference)} printed.`);
    }
  } finally {
    inflight.delete(id);
  }
}
