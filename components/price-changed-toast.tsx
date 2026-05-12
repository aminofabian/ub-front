"use client";

import { toast } from "sonner";

import { dashboardBrandingAccentStops } from "@/lib/brand-theme";
import type { BrandingRecord } from "@/lib/api";
import type { RealtimeFrame } from "@/lib/realtime";

const DEFAULT_PRIMARY = "#0f766e";
const MAX_SEEN_PRICE_EVENTS = 128;
const seenPriceEventIds = new Set<string>();

function rememberPriceEvent(eventId: string): boolean {
  if (seenPriceEventIds.has(eventId)) {
    return false;
  }
  seenPriceEventIds.add(eventId);
  if (seenPriceEventIds.size > MAX_SEEN_PRICE_EVENTS) {
    seenPriceEventIds.clear();
  }
  return true;
}

function parseMoney(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? ""));
  return Number.isFinite(n) ? n : null;
}

function formatMoney(currency: string, amount: number): string {
  const code = currency.trim().length === 3 ? currency.trim() : "KES";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

function hasMeaningfulPrior(oldAmount: number | null, newAmount: number | null): boolean {
  return (
    oldAmount != null &&
    newAmount != null &&
    oldAmount > 0 &&
    Math.abs(oldAmount - newAmount) >= 0.005
  );
}

/** Staff toast when a live selling price update arrives over the POS channel. */
export function showPriceChangedToast(
  frame: RealtimeFrame,
  currency = "KES",
  branding?: BrandingRecord | null,
): void {
  if (frame.type !== "price.changed") {
    return;
  }

  const name = String(frame.data.itemName ?? "Product").trim() || "Product";
  const oldAmount = parseMoney(frame.data.oldPrice);
  const newAmount = parseMoney(frame.data.newPrice);
  if (newAmount == null) {
    return;
  }

  const eventId = frame.eventId?.trim();
  if (eventId && !rememberPriceEvent(eventId)) {
    return;
  }

  const primary =
    dashboardBrandingAccentStops(branding)?.from ?? DEFAULT_PRIMARY;
  const showPrior = hasMeaningfulPrior(oldAmount, newAmount);
  const newLabel = formatMoney(currency, newAmount);
  const oldLabel =
    oldAmount != null ? formatMoney(currency, oldAmount) : null;
  const priceLine =
    showPrior && oldLabel
      ? `Price changed from ${oldLabel} to ${newLabel}`
      : `Price set to ${newLabel}`;

  toast.custom(
    () => (
      <div
        className="pointer-events-auto max-w-[20rem] rounded-md border border-border/80 bg-background px-2.5 py-1.5 text-xs leading-snug shadow-sm"
        style={{ borderLeft: `2px solid ${primary}` }}
      >
        <p className="truncate font-medium text-foreground">{name}</p>
        <p className="mt-0.5 tabular-nums text-muted-foreground">{priceLine}</p>
      </div>
    ),
    {
      id: eventId ? `price-changed:${eventId}` : undefined,
      duration: 4000,
    },
  );
}
