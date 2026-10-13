"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  Package,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useOrderPipelineStats } from "@/app/(dashboard)/order/_hooks/use-order-pipeline-stats";
import { OrderLifetimeOverview } from "./order-lifetime-overview";
import { PipelineStat, PipelineStatsGrid } from "./order-pipeline-stat";

export function OrderReceiveStatsStrip({
  compact = false,
}: {
  /** Stock floor — one pulse row, no lifetime ledger. */
  compact?: boolean;
}) {
  const { loading, receiveStats, localStats, lifetime } =
    useOrderPipelineStats();

  const queueActive = receiveStats.openCount > 0;
  const dueActive = receiveStats.awaitingUnits > 0;
  const partialActive = receiveStats.partialCount > 0;
  const basketActive = localStats.units > 0;

  if (compact) {
    return (
      <section
        aria-label="Receive desk pulse"
        className="flex items-center justify-between gap-3 rounded-2xl bg-[#e9f5f1] p-3.5"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
            Queue
          </p>
          <p className="mt-1 truncate text-[13px] font-semibold tabular-nums tracking-[-0.01em] text-[#101828]">
            {loading ? (
              "—"
            ) : (
              <>
                <span className={cn(queueActive && "text-[#0f766e]")}>
                  {receiveStats.openCount}
                </span>
                <span className="mx-1 font-normal text-[#667085]">open</span>
                <span className={cn(dueActive && "text-[#b45309]")}>
                  {receiveStats.awaitingUnits}
                </span>
                <span className="ml-1 font-normal text-[#667085]">
                  units due
                </span>
              </>
            )}
          </p>
        </div>
        <Link
          href={APP_ROUTES.order}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 text-[13px] font-semibold text-[#0f766e] ring-1 ring-black/[0.05] transition-colors hover:bg-[#f2f7f5]"
        >
          <ShoppingCart className="size-4" aria-hidden />
          Order
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="Receive desk stats" className="space-y-2.5">
      <OrderLifetimeOverview loading={loading} lifetime={lifetime} />

      <div className="flex items-stretch gap-1">
        <div className="min-w-0 flex-1">
          <PipelineStatsGrid>
            <PipelineStat
              label="Open POs"
              value={loading ? "—" : receiveStats.openCount}
              hint={
                receiveStats.openCount > 0
                  ? `${receiveStats.lineCount} lines across the queue`
                  : "Nothing in the sidebar yet"
              }
              icon={Truck}
              active={queueActive}
              loading={loading}
            />
            <PipelineStat
              label="Units to receive"
              value={loading ? "—" : receiveStats.awaitingUnits}
              hint={
                dueActive
                  ? "Select lines below, then confirm"
                  : "You're fully received"
              }
              icon={ClipboardCheck}
              active={dueActive}
              loading={loading}
            />
            <PipelineStat
              label="Partial receipts"
              value={loading ? "—" : receiveStats.partialCount}
              hint={
                partialActive
                  ? "Orders with some stock already in"
                  : "None started yet"
              }
              icon={Package}
              active={partialActive}
              loading={loading}
            />
            <PipelineStat
              label="Suppliers waiting"
              value={loading ? "—" : receiveStats.supplierCount}
              hint={
                receiveStats.oldestDays != null && receiveStats.oldestDays > 0
                  ? `Oldest open ${receiveStats.oldestDays} day${receiveStats.oldestDays === 1 ? "" : "s"}`
                  : receiveStats.supplierCount > 0
                    ? "Vendors with goods due"
                    : "No vendors in queue"
              }
              icon={Users}
              active={receiveStats.supplierCount > 0}
              loading={loading}
            />
          </PipelineStatsGrid>
        </div>
        {!loading && basketActive ? (
          <Link
            href={APP_ROUTES.order}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 self-center rounded-xl bg-[#e6f4f0] px-3.5 text-[13px] font-semibold text-[#0f766e] transition-colors hover:bg-[#d9ede7]"
          >
            <ShoppingCart className="size-4" aria-hidden />
            New order
          </Link>
        ) : null}
      </div>
    </section>
  );
}
