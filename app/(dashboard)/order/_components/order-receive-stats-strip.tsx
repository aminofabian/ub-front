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
import { useOrderPipelineStats } from "@/app/(dashboard)/order/_hooks/use-order-pipeline-stats";
import { OrderLifetimeOverview } from "./order-lifetime-overview";
import {
  PipelineStat,
  PipelineStatsGrid,
} from "./order-pipeline-stat";

export function OrderReceiveStatsStrip() {
  const { loading, receiveStats, localStats, lifetime } = useOrderPipelineStats();

  const queueActive = receiveStats.openCount > 0;
  const dueActive = receiveStats.awaitingUnits > 0;
  const partialActive = receiveStats.partialCount > 0;
  const basketActive = localStats.units > 0;

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
