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
    <section aria-label="Receive desk stats" className="space-y-3 px-0.5 sm:px-1">
      <OrderLifetimeOverview loading={loading} lifetime={lifetime} />

      <div className="space-y-2.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
              Confirm supply
            </p>
            <p className="mt-0.5 text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              {dueActive
                ? `${receiveStats.awaitingUnits} unit${receiveStats.awaitingUnits === 1 ? "" : "s"} still to post into stock`
                : "All caught up — nothing waiting to confirm"}
            </p>
          </div>
          {!loading && basketActive ? (
            <Link
              href={APP_ROUTES.order}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--pos-primary,#0f766e)] transition duration-150 ease-out hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_16%,transparent)] active:scale-[0.97]"
            >
              <ShoppingCart className="size-3.5" aria-hidden />
              New order
            </Link>
          ) : null}
        </div>

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
    </section>
  );
}
