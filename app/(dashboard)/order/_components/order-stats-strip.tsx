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

  const phoneDue = confirmActive ? (
    <Link
      href={APP_ROUTES.orderReceive}
      className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-[#fff4e8] px-3.5 py-2.5 active:scale-[0.99]"
    >
      <span className="min-w-0 text-[14px] font-semibold tracking-[-0.02em] text-[#9a3412]">
        {loading ? "Checking arrivals" : `${sentStats.awaitingUnits} still to receive`}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[#0f766e]">
        <ClipboardCheck className="size-3.5" aria-hidden />
        Receive
      </span>
    </Link>
  ) : null;

  const compactPulse = (
    <section
      aria-label="Order pulse"
      className="flex items-center justify-between gap-3 rounded-2xl bg-[#e9f5f1] p-3.5"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
          Building
        </p>
        <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums tracking-[-0.02em] text-[#101828]">
          {loading ? (
            "—"
          ) : (
            <>
              <span className={cn(buildingActive && "text-[#0f766e]")}>
                {localStats.units}
              </span>
              <span className="mx-1 font-normal text-[#667085]">
                in basket
              </span>
              <span className={cn(confirmActive && "text-[#b45309]")}>
                {sentStats.awaitingUnits}
              </span>
              <span className="ml-1 font-normal text-[#667085]">due in</span>
            </>
          )}
        </p>
      </div>
      {confirmActive ? (
        <Link
          href={APP_ROUTES.orderReceive}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-[#0f766e] ring-1 ring-black/[0.05]"
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
        <div className="lg:hidden">{phoneDue}</div>
        <div className="hidden lg:block">{compactPulse}</div>
      </>
    );
  }

  return (
    <>
      <div className="lg:hidden">{phoneDue}</div>
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
