import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { DispensingClass } from "@/lib/pharmacy-api";

/**
 * Pharmacy screens use the operator shell look (DESIGN.md): ivory ground, paper surfaces, 2px
 * corners, hairline rules, one forest accent, terracotta for attention. The shared pieces
 * (Panel, Chip, Figure, EmptyState) come from the SMS Hub kit, which already implements it.
 */
export const RX_INK = "text-[var(--op-ink,#121a16)]";
export const RX_MUTED = "text-[var(--op-muted,#556159)]";
export const RX_RULE = "border-[var(--op-rule,rgba(18,26,22,0.1))]";
export const RX_TH = cn("px-3 py-2 text-left text-[12px] font-medium sm:px-4", RX_MUTED);
export const RX_TD = "px-3 py-3 align-middle text-sm sm:px-4";
export const RX_ROW = cn("border-b last:border-0", RX_RULE);
/** Timestamps: quiet, tabular, never wrapping. Mono is kept for identifiers (lot, receipt, member number). */
export const RX_META = cn("whitespace-nowrap text-[13px] tabular-nums", RX_MUTED);
export const RX_INPUT = cn(
  "h-11 w-full rounded-[2px] border bg-[var(--op-surface,#FCFAF5)] px-2.5 text-sm sm:h-9",
  RX_RULE,
  "focus-visible:border-[var(--op-accent,#1d4b3b)] focus-visible:outline-none",
);

export function classTone(cls: DispensingClass): "good" | "live" | "quiet" | "warn" {
  switch (cls) {
    case "OTC":
      return "good";
    case "PRESCRIPTION_ONLY":
      return "live";
    case "CONTROLLED":
      return "warn";
    default:
      return "warn";
  }
}

export function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function formatQty(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "0";
  return Number(n).toLocaleString("en-KE", { maximumFractionDigits: 3 });
}

/** A calendar date (yyyy-MM-dd) as "14 Mar 2027". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Whole days from today to a calendar date; negative when it has passed. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5 text-sm", className)}>
      <span className={cn("font-medium", RX_INK)}>{label}</span>
      {children}
      {hint ? <span className={cn("block text-[12px] leading-snug", RX_MUTED)}>{hint}</span> : null}
    </label>
  );
}
