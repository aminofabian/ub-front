"use client";

import { cn, formatMoney } from "@/lib/utils";

const CURRENCY = "KES";

function LedgerMetric({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <p className="shrink-0 text-[10px] font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
        {label}
      </p>
      <p
        className={cn(
          "truncate font-heading font-semibold leading-none tracking-[-0.03em] tabular-nums text-[var(--order-ink,#15231f)]",
          emphasize ? "text-[13px]" : "text-[12px]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function OrderLifetimeOverview({
  loading,
  lifetime,
}: {
  loading: boolean;
  lifetime: {
    totalSpend: number;
    ordersPlaced: number;
    fullyReceived: number;
    confirmedInvoices: number;
    confirmedValue: number;
    paidValue: number;
    openBalance: number;
    paidCount: number;
    partialPayCount: number;
    unpaidCount: number;
    inFlightCount: number;
    spendTrend: { date: string; spend: number }[];
  };
}) {
  const paidRatio =
    lifetime.confirmedValue > 0
      ? Math.min(100, (lifetime.paidValue / lifetime.confirmedValue) * 100)
      : 0;

  return (
    <div className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1 sm:flex-nowrap sm:gap-x-4">
        <LedgerMetric
          label="Spend"
          value={loading ? "—" : formatMoney(lifetime.totalSpend, CURRENCY)}
          emphasize
        />
        <LedgerMetric
          label="Placed"
          value={loading ? "—" : String(lifetime.ordersPlaced)}
        />
        <LedgerMetric
          label="Confirmed"
          value={loading ? "—" : String(lifetime.fullyReceived)}
        />
        <LedgerMetric
          label="Paid"
          value={loading ? "—" : formatMoney(lifetime.paidValue, CURRENCY)}
        />
        <LedgerMetric
          label="Open"
          value={loading ? "—" : formatMoney(lifetime.openBalance, CURRENCY)}
        />

        <div className="ml-auto flex w-[5.5rem] shrink-0 items-center gap-1.5 sm:w-[6.5rem]">
          <span className="text-[10px] font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
            {loading ? "—" : `${Math.round(paidRatio)}%`}
          </span>
          <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-none bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
            <div
              className="h-full rounded-none bg-[var(--pos-primary,#0f766e)] transition-[width] duration-500"
              style={{ width: loading ? "0%" : `${paidRatio}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
