"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ClipboardCheck, Package, ShoppingCart, Truck } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useOrderPipelineStats } from "@/app/(dashboard)/order/_hooks/use-order-pipeline-stats";
import { OrderLifetimeOverview } from "./order-lifetime-overview";
import { PipelineStat, PipelineStatsGrid } from "./order-pipeline-stat";

const ORDER_PHONE_AWAITING_SLOT_ID = "order-phone-awaiting";

function PhoneDuePortal({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById(ORDER_PHONE_AWAITING_SLOT_ID));
  }, []);

  if (!slot || !children) return null;
  return createPortal(children, slot);
}

export function OrderStatsStrip() {
  const { me } = useDashboard();
  const isStockFloor =
    me?.role?.key?.trim().toLowerCase() === "stock_manager";
  const { loading, localStats, sentStats, savedStats, lifetime } =
    useOrderPipelineStats();

  const buildingActive = localStats.units > 0;
  const sentActive = sentStats.count > 0;
  const confirmActive = sentStats.awaitingUnits > 0;

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

  const compactPulse = (
    <section
      aria-label="Order pulse"
      className="flex items-center justify-between gap-3 rounded-[2px] border border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)] bg-[var(--op-surface,#FCFAF5)] p-3"
    >
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--op-ink,#121A16)]">
          {loading ? (
            "—"
          ) : (
            <>
              <span
                className={cn(
                  buildingActive && "text-[var(--pos-primary,#1D4B3B)]",
                )}
              >
                {localStats.units}
              </span>
              <span className="mx-1 font-normal text-[var(--op-muted,#556159)]">
                in basket
              </span>
              <span
                className={cn(
                  confirmActive && "text-[var(--op-highlight,#A55237)]",
                )}
              >
                {sentStats.awaitingUnits}
              </span>
              <span className="ml-1 font-normal text-[var(--op-muted,#556159)]">
                due in
              </span>
            </>
          )}
        </p>
      </div>
      {confirmActive ? (
        <Link
          href={APP_ROUTES.orderReceive}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[2px] border border-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_28%,transparent)] bg-[var(--op-surface,#FCFAF5)] px-3 py-2 text-[13px] font-semibold text-[var(--pos-primary,#1D4B3B)]"
        >
          <ClipboardCheck className="size-3.5" aria-hidden />
          Receive
        </Link>
      ) : null}
    </section>
  );

  if (isStockFloor) {
    return (
      <>
        <PhoneDuePortal>{phoneDue}</PhoneDuePortal>
        <div className="hidden lg:block">{compactPulse}</div>
      </>
    );
  }

  return (
    <>
      <PhoneDuePortal>{phoneDue}</PhoneDuePortal>
      <section aria-label="Order stats" className="hidden space-y-2 lg:block">
      <OrderLifetimeOverview loading={loading} lifetime={lifetime} />

      <div className="flex items-stretch gap-1">
        <div className="min-w-0 flex-1">
          <PipelineStatsGrid>
            <PipelineStat
              label="In basket"
              value={loading ? "—" : localStats.units}
              hint={
                localStats.lines > 0
                  ? `${localStats.lines} line${localStats.lines === 1 ? "" : "s"} · ${localStats.suppliers} supplier${localStats.suppliers === 1 ? "" : "s"}`
                  : "Tap products below to start"
              }
              icon={ShoppingCart}
              active={buildingActive}
              loading={loading}
            />
            <PipelineStat
              label="Drafts"
              value={loading ? "—" : savedStats.count}
              hint={
                savedStats.count > 0
                  ? `${savedStats.lineCount} lines · not sent yet`
                  : "Purchase orders not sent yet"
              }
              icon={Package}
              active={savedStats.count > 0}
              loading={loading}
            />
            <PipelineStat
              label="With suppliers"
              value={loading ? "—" : sentStats.count}
              hint={
                sentStats.count > 0
                  ? `${sentStats.awaitingUnits} units out`
                  : "Sent purchase orders"
              }
              icon={Truck}
              active={sentActive}
              href={sentStats.count > 0 ? APP_ROUTES.orderReceive : undefined}
              loading={loading}
            />
            <PipelineStat
              label="Awaiting"
              value={loading ? "—" : sentStats.awaitingUnits}
              hint={
                confirmActive ? "Units still to receive" : "Nothing due in yet"
              }
              icon={ClipboardCheck}
              active={confirmActive}
              href={confirmActive ? APP_ROUTES.orderReceive : undefined}
              loading={loading}
            />
          </PipelineStatsGrid>
        </div>
        {!loading && confirmActive ? (
          <Link
            href={APP_ROUTES.orderReceive}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 self-center rounded-xl bg-white px-3 text-[12px] font-semibold text-[#0f766e] ring-1 ring-black/[0.05] transition-colors hover:bg-[#e9f5f1]"
          >
            <ClipboardCheck className="size-3.5" aria-hidden />
            Confirm
          </Link>
        ) : null}
      </div>
      </section>
    </>
  );
}
