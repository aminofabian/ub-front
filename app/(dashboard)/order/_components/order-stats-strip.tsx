"use client";

import Link from "next/link";
import { ClipboardCheck, Package, ShoppingCart, Truck } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useOrderPipelineStats } from "@/app/(dashboard)/order/_hooks/use-order-pipeline-stats";
import { OrderLifetimeOverview } from "./order-lifetime-overview";
import { PipelineStat, PipelineStatsGrid } from "./order-pipeline-stat";

export function OrderStatsStrip() {
  const { me } = useDashboard();
  const isStockFloor =
    me?.role?.key?.trim().toLowerCase() === "stock_manager";
  const { loading, localStats, sentStats, savedStats, lifetime } =
    useOrderPipelineStats();

  const buildingActive = localStats.units > 0;
  const sentActive = sentStats.count > 0;
  const confirmActive = sentStats.awaitingUnits > 0;

  if (isStockFloor) {
    return (
      <section
        aria-label="Order pulse"
        className="flex items-stretch gap-px border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
              Building
            </p>
            <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
              {loading ? (
                "—"
              ) : (
                <>
                  <span
                    className={cn(
                      buildingActive && "text-[var(--pos-primary,#0f766e)]",
                    )}
                  >
                    {localStats.units}
                  </span>
                  <span className="mx-1 font-normal text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]">
                    in basket
                  </span>
                  <span
                    className={cn(confirmActive && "text-amber-800")}
                  >
                    {sentStats.awaitingUnits}
                  </span>
                  <span className="ml-1 font-normal text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]">
                    due in
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        {confirmActive ? (
          <Link
            href={APP_ROUTES.orderReceive}
            className="inline-flex shrink-0 items-center gap-1.5 bg-white px-3 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]"
          >
            <ClipboardCheck className="size-3.5" aria-hidden />
            Receive
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section aria-label="Order stats" className="space-y-1">
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
            className="inline-flex h-7 shrink-0 items-center gap-1 self-center rounded-none border border-[var(--pos-primary,#0f766e)] bg-white px-2 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,#fff)]"
          >
            <ClipboardCheck className="size-3" aria-hidden />
            Confirm
          </Link>
        ) : null}
      </div>
    </section>
  );
}
