"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useOrderPipelineStats } from "@/app/(dashboard)/order/_hooks/use-order-pipeline-stats";

const ORDER_PHONE_AWAITING_SLOT_ID = "order-phone-awaiting";

function PhoneDuePortal({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById(ORDER_PHONE_AWAITING_SLOT_ID));
  }, []);

  if (!slot || !children) return null;
  return createPortal(children, slot);
}

/**
 * One slim pulse for the buying-journey row. No second strip under it.
 */
export function OrderStatsStrip() {
  const { me } = useDashboard();
  const isStockFloor =
    me?.role?.key?.trim().toLowerCase() === "stock_manager";
  const { loading, localStats, sentStats, savedStats } =
    useOrderPipelineStats();

  const buildingActive = localStats.units > 0;
  const sentActive = sentStats.count > 0;
  const confirmActive = sentStats.awaitingUnits > 0;
  const dash = "—";

  const phoneDue = confirmActive ? (
    <Link
      href={APP_ROUTES.orderReceive}
      className="flex items-center gap-3 rounded-[2px] border border-[color-mix(in_srgb,var(--op-highlight,#A55237)_28%,transparent)] bg-[color-mix(in_srgb,var(--op-highlight,#A55237)_8%,var(--op-surface,#FCFAF5))] px-3.5 py-3 active:scale-[0.99]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[2px] border border-[color-mix(in_srgb,var(--op-highlight,#A55237)_28%,transparent)] bg-[var(--op-surface,#FCFAF5)] text-[var(--op-highlight,#A55237)]">
        <ClipboardCheck className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-tight tracking-[-0.02em] text-[var(--op-highlight,#A55237)]">
          {loading
            ? "Checking arrivals"
            : `${sentStats.awaitingUnits.toLocaleString()} units still to receive`}
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-[color-mix(in_srgb,var(--op-highlight,#A55237)_78%,transparent)]">
          Booked in when the delivery arrives
        </span>
      </span>
      <span className="inline-flex h-11 shrink-0 items-center rounded-[2px] bg-[var(--op-highlight,#A55237)] px-4 text-[14px] font-semibold text-[var(--op-surface,#FCFAF5)]">
        Receive
      </span>
    </Link>
  ) : null;

  const pulse = (
    <p
      aria-label="Order pulse"
      className="flex min-w-0 items-baseline justify-end gap-x-2.5 text-[11px] tabular-nums"
    >
      <span
        className="inline-flex items-baseline gap-1"
        title={
          localStats.lines > 0
            ? `${localStats.lines} lines from ${localStats.suppliers} suppliers`
            : "Type a quantity in the list to start"
        }
      >
        <span
          className={cn(
            "font-semibold",
            buildingActive
              ? "text-[var(--pos-primary,#1D4B3B)]"
              : "text-[var(--op-ink,#121A16)]",
          )}
        >
          {loading ? dash : localStats.units}
        </span>
        <span className="font-normal text-[var(--op-muted,#556159)]">
          basket
        </span>
      </span>
      {sentActive ? (
        <Link
          href={APP_ROUTES.orderReceive}
          className="inline-flex items-baseline gap-1 rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]"
          title={`${sentStats.awaitingUnits} units out`}
        >
          <span className="font-semibold text-[var(--pos-primary,#1D4B3B)]">
            {sentStats.count}
          </span>
          <span className="font-normal text-[var(--op-muted,#556159)]">out</span>
        </Link>
      ) : null}
      {confirmActive ? (
        <Link
          href={APP_ROUTES.orderReceive}
          className="inline-flex items-center gap-1 rounded-[2px] font-semibold text-[var(--op-highlight,#A55237)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]"
          title="Units still to receive"
        >
          <ClipboardCheck className="size-3" aria-hidden />
          {sentStats.awaitingUnits} due
        </Link>
      ) : !isStockFloor && savedStats.count > 0 ? (
        <span
          className="inline-flex items-baseline gap-1"
          title={`${savedStats.lineCount} lines, not sent yet`}
        >
          <span className="font-semibold text-[var(--op-ink,#121A16)]">
            {savedStats.count}
          </span>
          <span className="font-normal text-[var(--op-muted,#556159)]">
            drafts
          </span>
        </span>
      ) : null}
    </p>
  );

  return (
    <>
      <PhoneDuePortal>{phoneDue}</PhoneDuePortal>
      <div className="hidden sm:block">{pulse}</div>
    </>
  );
}
