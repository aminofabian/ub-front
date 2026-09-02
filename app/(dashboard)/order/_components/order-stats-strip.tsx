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
  OrderInstrumentShell,
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
    <OrderInstrumentShell
      label="Order stats"
      ledger={<OrderLifetimeOverview loading={loading} lifetime={lifetime} />}
      live={
        <div className="flex h-full min-w-0 flex-col border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] lg:border-l sm:flex-row sm:items-stretch">
          <PipelineStatsGrid>
            <PipelineStat
              label="Basket"
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
                  : "POs you saved locally"
              }
              icon={Package}
              active={savedStats.count > 0}
              loading={loading}
            />
            <PipelineStat
              label="Sent"
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
              label="Due"
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

          {!loading && confirmActive ? (
            <div className="flex items-center justify-end border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-2 py-1.5 sm:border-l sm:border-t-0">
              <Link
                href={APP_ROUTES.orderReceive}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[var(--order-ink,#15231f)] px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition duration-150 ease-out hover:bg-[#0f1a17] active:scale-[0.97]"
              >
                <ClipboardCheck className="size-3.5" aria-hidden />
                Confirm
              </Link>
            </div>
          ) : null}
        </div>
      }
    />
  );
}
