import type { ReactNode } from "react";

import type { SmsCampaignStatus, SmsReach } from "@/lib/sms-hub-api";
import { cn } from "@/lib/utils";

/** Shared look for SMS Hub tables and chips (operator surface tokens). */
export const SMS_TH =
  "px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-3.5";
export const SMS_TD = "px-3 py-2.5 align-top text-sm sm:px-3.5";
export const SMS_ROW =
  "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] last:border-0";

export const REACH_LABEL: Record<SmsReach, string> = {
  CAN_TEXT: "Can text",
  RECEIPTS_ONLY: "Receipts only",
  OPTED_OUT: "Opted out",
  NO_NUMBER: "No number",
};

export const REACH_HINT: Record<SmsReach, string> = {
  CAN_TEXT: "Agreed to offers. Gets order updates and promotions.",
  RECEIPTS_ONLY: "Has not agreed to offers. Gets order updates only.",
  OPTED_OUT: "Asked not to get offers. Gets order updates only.",
  NO_NUMBER: "No number we can text, or only an M-Pesa masked number.",
};

export function reachTone(reach: SmsReach): string {
  switch (reach) {
    case "CAN_TEXT":
      return "bg-emerald-500/10 text-emerald-900 ring-emerald-600/20";
    case "OPTED_OUT":
      return "bg-red-500/10 text-red-900 ring-red-600/20";
    case "NO_NUMBER":
      return "bg-muted text-muted-foreground ring-border";
    default:
      return "bg-amber-500/10 text-amber-900 ring-amber-600/20";
  }
}

export const CAMPAIGN_STATUS_LABEL: Record<SmsCampaignStatus, string> = {
  DRAFT: "Draft",
  QUEUED: "Sending soon",
  SCHEDULED: "Scheduled",
  RUNNING: "Sending",
  COMPLETED: "Sent",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export function campaignTone(status: SmsCampaignStatus): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-900 ring-emerald-600/20";
    case "RUNNING":
    case "QUEUED":
      return "bg-sky-500/10 text-sky-900 ring-sky-600/20";
    case "SCHEDULED":
      return "bg-violet-500/10 text-violet-900 ring-violet-600/20";
    case "FAILED":
      return "bg-red-500/10 text-red-900 ring-red-600/20";
    case "CANCELLED":
      return "bg-muted text-muted-foreground ring-border";
    default:
      return "bg-amber-500/10 text-amber-900 ring-amber-600/20";
  }
}

export function Chip({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-KE", { dateStyle: "medium" });
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-KE")} ${n === 1 ? one : many}`;
}

export function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** What a message was for, in shop language. Keys are backend ledger reason codes. */
export const REASON_LABEL: Record<string, string> = {
  campaign: "Campaign",
  automation: "Automatic offer",
  notification: "Order update",
  credit_reminder: "Tab reminder",
  ops_alert: "Owner alert",
  payroll: "Staff message",
  otp: "Sign-in code",
  sms: "Other",
  ai_logo: "Other",
};

export function reasonLabel(reason: string | null | undefined): string {
  if (!reason) return "Other";
  return REASON_LABEL[reason] ?? "Other";
}
