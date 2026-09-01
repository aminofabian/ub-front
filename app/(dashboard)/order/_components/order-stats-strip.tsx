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
    <section aria-label="Order stats" className="space-y-3 px-0.5 sm:px-1">
      <OrderLifetimeOverview loading={loading} lifetime={lifetime} />

      <div className="space-y-2.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
              Right now
            </p>
            <p className="mt-0.5 text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              Your live basket and in-flight orders
            </p>
          </div>
          {!loading && confirmActive ? (
            <Link
              href={APP_ROUTES.orderReceive}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--order-ink,#15231f)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#0f1a17]"
            >
              <ClipboardCheck className="size-3.5" aria-hidden />
              Confirm goods
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
                : "POs you saved locally"
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
