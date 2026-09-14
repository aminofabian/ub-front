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
        className="flex items-stretch gap-px border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
              Queue
            </p>
            <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
              {loading ? "—" : (
                <>
                  <span
                    className={cn(
                      queueActive && "text-[var(--pos-primary,#0f766e)]",
                    )}
                  >
                    {receiveStats.openCount}
                  </span>
                  <span className="mx-1 font-normal text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]">
                    open
                  </span>
                  <span
                    className={cn(
                      dueActive && "text-amber-800",
                    )}
                  >
                    {receiveStats.awaitingUnits}
                  </span>
                  <span className="ml-1 font-normal text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]">
                    units due
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <Link
          href={APP_ROUTES.order}
          className="inline-flex shrink-0 items-center gap-1.5 bg-white px-3 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]"
        >
          <ShoppingCart className="size-3.5" aria-hidden />
          Order
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="Receive desk stats" className="space-y-1">
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
            className="inline-flex h-7 shrink-0 items-center gap-1 self-center rounded-none border border-[var(--pos-primary,#0f766e)] bg-white px-2 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,#fff)]"
          >
            <ShoppingCart className="size-3" aria-hidden />
            New order
          </Link>
        ) : null}
      </div>
    </section>
  );
}
