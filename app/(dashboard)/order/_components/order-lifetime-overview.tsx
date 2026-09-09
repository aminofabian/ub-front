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
    <div className="min-w-0 flex items-baseline gap-1.5 sm:flex-col sm:items-start sm:gap-0">
      <p className="shrink-0 text-[7px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,#fff_48%,transparent)]">
        {label}
      </p>
      <p
        className={cn(
          "font-heading font-semibold leading-none tracking-[-0.03em] tabular-nums text-white",
          emphasize ? "text-[13px] sm:text-[14px]" : "text-[12px] sm:text-[13px]",
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
    <div className="overflow-hidden rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[var(--order-ink,#15231f)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1.5 sm:flex-nowrap sm:gap-x-4 sm:px-3">
        <p className="shrink-0 text-[8px] font-bold uppercase tracking-[0.14em] text-[color-mix(in_srgb,#fff_45%,transparent)]">
          Ledger
        </p>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4">
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
        </div>

        <div className="ml-auto flex w-[5.5rem] shrink-0 items-center gap-1.5 sm:w-[6.5rem]">
          <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[color-mix(in_srgb,#fff_42%,transparent)]">
            Paid
          </span>
          <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,#fff_10%,transparent)]">
            <div
              className="h-full rounded-full bg-[var(--pos-primary,#0f766e)] transition-[width] duration-500"
              style={{ width: loading ? "0%" : `${paidRatio}%` }}
            />
          </div>
          <span className="tabular-nums text-[9px] font-semibold text-[color-mix(in_srgb,#fff_70%,transparent)]">
            {loading ? "—" : `${Math.round(paidRatio)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}
