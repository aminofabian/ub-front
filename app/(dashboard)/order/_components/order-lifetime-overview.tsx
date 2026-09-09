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
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-heading font-semibold leading-none tracking-[-0.03em] tabular-nums text-[var(--order-ink,#15231f)]",
          emphasize ? "text-[15px] sm:text-[16px]" : "text-[14px] sm:text-[15px]",
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
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 px-3 py-2.5 sm:flex-nowrap sm:gap-x-5">
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

        <div className="ml-auto flex w-[6.5rem] shrink-0 flex-col gap-1 sm:w-[7.5rem]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
              Paid
            </span>
            <span className="font-heading text-[12px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
              {loading ? "—" : `${Math.round(paidRatio)}%`}
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-none bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
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
