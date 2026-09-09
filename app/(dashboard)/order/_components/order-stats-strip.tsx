"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { useOrderPipelineStats } from "@/app/(dashboard)/order/_hooks/use-order-pipeline-stats";
import { OrderLifetimeOverview } from "./order-lifetime-overview";
import {
  PipelineStat,
  PipelineStatsGrid,
} from "./order-pipeline-stat";

export function OrderStatsStrip() {
  const { loading, localStats, sentStats, savedStats, lifetime } =
    useOrderPipelineStats();

  const buildingActive = localStats.units > 0;
  const sentActive = sentStats.count > 0;
  const confirmActive = sentStats.awaitingUnits > 0;

  return (
    <section aria-label="Order stats" className="space-y-2">
      <OrderLifetimeOverview loading={loading} lifetime={lifetime} />

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <p className="text-[13px] font-medium text-[var(--order-ink,#15231f)]">
            Live basket and in-flight orders
          </p>
          {!loading && confirmActive ? (
            <Link
              href={APP_ROUTES.orderReceive}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-none border border-[var(--pos-primary,#0f766e)] bg-white px-2.5 text-[12px] font-semibold text-[var(--pos-primary,#0f766e)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,#fff)]"
            >
              <ClipboardCheck className="size-3.5" aria-hidden />
              Confirm supply
            </Link>
          ) : null}
        </div>

        <PipelineStatsGrid>
          <PipelineStat
            label="In your basket"
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
            label="Saved drafts"
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
            label="Awaiting stock"
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
    </section>
  );
}
