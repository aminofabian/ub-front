"use client";

import { cn, formatMoney } from "@/lib/utils";

const CURRENCY = "KES";

function MiniSparkline({
  points,
  className,
}: {
  points: { date: string; spend: number }[];
  className?: string;
}) {
  const slice = points.slice(-14);
  if (slice.length < 2) return null;

  const max = Math.max(...slice.map((p) => p.spend), 1);
  const width = 96;
  const height = 18;
  const step = width / (slice.length - 1);
  const path = slice
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.spend / max) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-4 w-[5.5rem] text-[var(--pos-primary,#0f766e)]", className)}
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LedgerMetric({
  label,
  value,
  hint,
  emphasize = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,#fff_52%,transparent)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-heading font-semibold leading-none tracking-[-0.03em] tabular-nums text-white",
          emphasize ? "text-[18px] sm:text-[20px]" : "text-[14px] sm:text-[15px]",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[9px] leading-snug text-[color-mix(in_srgb,#fff_55%,transparent)]">
          {hint}
        </p>
      ) : null}
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
    <div className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[var(--order-ink,#15231f)] shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_8%,transparent),0_12px_28px_-20px_color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
      <div className="flex flex-col gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:gap-5">
        <div className="flex min-w-0 shrink-0 items-center justify-between gap-3 lg:w-[11.5rem] lg:flex-col lg:items-start lg:justify-center lg:gap-1">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color-mix(in_srgb,#fff_48%,transparent)]">
              Procurement ledger
            </p>
            <p className="mt-0.5 hidden text-[11px] text-[color-mix(in_srgb,#fff_58%,transparent)] sm:block lg:hidden xl:block">
              Ordered · confirmed · paid
            </p>
          </div>
          {!loading && lifetime.spendTrend.length > 1 ? (
            <MiniSparkline points={lifetime.spendTrend} className="shrink-0" />
          ) : null}
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-5">
          <LedgerMetric
            label="Total spend"
            value={loading ? "—" : formatMoney(lifetime.totalSpend, CURRENCY)}
            hint={
              loading
                ? "Loading…"
                : `${lifetime.ordersPlaced} order${lifetime.ordersPlaced === 1 ? "" : "s"}`
            }
            emphasize
          />
          <LedgerMetric
            label="Placed"
            value={loading ? "—" : String(lifetime.ordersPlaced)}
            hint={`${lifetime.inFlightCount} in flight`}
          />
          <LedgerMetric
            label="Confirmed"
            value={loading ? "—" : String(lifetime.fullyReceived)}
            hint={
              loading
                ? "Fully received"
                : `${lifetime.confirmedInvoices} bill${lifetime.confirmedInvoices === 1 ? "" : "s"}`
            }
          />
          <LedgerMetric
            label="Paid"
            value={loading ? "—" : formatMoney(lifetime.paidValue, CURRENCY)}
            hint={
              loading
                ? "Settled"
                : `${lifetime.paidCount} paid${lifetime.partialPayCount > 0 ? ` · ${lifetime.partialPayCount} partial` : ""}`
            }
          />
          <LedgerMetric
            label="Outstanding"
            value={loading ? "—" : formatMoney(lifetime.openBalance, CURRENCY)}
            hint={
              lifetime.unpaidCount > 0
                ? `${lifetime.unpaidCount} open`
                : "All caught up"
            }
          />
        </div>

        <div className="flex w-full shrink-0 items-center gap-2.5 lg:w-[7.5rem] lg:flex-col lg:items-stretch lg:gap-1.5">
          <div className="flex flex-1 items-center justify-between gap-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[color-mix(in_srgb,#fff_45%,transparent)] lg:flex-none">
            <span>Paid down</span>
            <span className="tabular-nums text-[color-mix(in_srgb,#fff_70%,transparent)]">
              {loading ? "—" : `${Math.round(paidRatio)}%`}
            </span>
          </div>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,#fff_10%,transparent)] lg:flex-none">
            <div
              className="h-full rounded-full bg-[var(--pos-primary,#0f766e)] transition-[width] duration-500"
              style={{ width: loading ? "0%" : `${paidRatio}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
