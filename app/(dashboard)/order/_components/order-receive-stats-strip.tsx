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
  OrderInstrumentShell,
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
    <OrderInstrumentShell
      label="Receive desk stats"
      ledger={<OrderLifetimeOverview loading={loading} lifetime={lifetime} />}
      live={
        <div className="flex h-full min-w-0 flex-col border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] lg:border-l sm:flex-row sm:items-stretch">
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
              label="To receive"
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
              label="Partial"
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
              label="Suppliers"
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

          {!loading && basketActive ? (
            <div className="flex items-center justify-end border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-2 py-1.5 sm:border-l sm:border-t-0">
              <Link
                href={APP_ROUTES.order}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)] px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--pos-primary,#0f766e)] transition duration-150 ease-out hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_16%,transparent)] active:scale-[0.97]"
              >
                <ShoppingCart className="size-3.5" aria-hidden />
                Finish order
              </Link>
            </div>
          ) : null}
        </div>
      }
    />
  );
}
