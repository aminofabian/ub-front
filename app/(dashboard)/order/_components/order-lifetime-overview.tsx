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
  const width = 120;
  const height = 28;
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
      className={cn("h-7 w-[7.5rem] text-[var(--pos-primary,#0f766e)]", className)}
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
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
  hint: string;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color-mix(in_srgb,#fff_52%,transparent)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-heading font-semibold leading-none tracking-[-0.03em] tabular-nums text-white",
          emphasize ? "text-[26px] sm:text-[28px]" : "text-[18px] sm:text-[20px]",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-snug text-[color-mix(in_srgb,#fff_58%,transparent)]">
        {hint}
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
    <div className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[var(--order-ink,#15231f)] shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_8%,transparent),0_16px_40px_-24px_color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.15fr_1fr] lg:items-end">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,#fff_48%,transparent)]">
                Procurement ledger
              </p>
              <p className="mt-1 text-[12px] text-[color-mix(in_srgb,#fff_62%,transparent)]">
                Everything you&apos;ve ordered, confirmed, and paid
              </p>
            </div>
            {!loading && lifetime.spendTrend.length > 1 ? (
              <MiniSparkline points={lifetime.spendTrend} />
            ) : null}
          </div>
          <LedgerMetric
            label="Total spend"
            value={loading ? "—" : formatMoney(lifetime.totalSpend, CURRENCY)}
            hint={
              loading
                ? "Loading purchase history…"
                : `${lifetime.ordersPlaced} order${lifetime.ordersPlaced === 1 ? "" : "s"} placed · ${lifetime.confirmedInvoices} supply bill${lifetime.confirmedInvoices === 1 ? "" : "s"}`
            }
            emphasize
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
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
                ? "Fully received POs"
                : `${lifetime.confirmedInvoices} bills · ${formatMoney(lifetime.confirmedValue, CURRENCY)}`
            }
          />
          <LedgerMetric
            label="Paid"
            value={loading ? "—" : formatMoney(lifetime.paidValue, CURRENCY)}
            hint={
              loading
                ? "Settled to suppliers"
                : `${lifetime.paidCount} paid${lifetime.partialPayCount > 0 ? ` · ${lifetime.partialPayCount} partial` : ""}`
            }
          />
          <LedgerMetric
            label="Outstanding"
            value={loading ? "—" : formatMoney(lifetime.openBalance, CURRENCY)}
            hint={
              lifetime.unpaidCount > 0
                ? `${lifetime.unpaidCount} bill${lifetime.unpaidCount === 1 ? "" : "s"} still open`
                : "All caught up"
            }
          />
        </div>
      </div>

      <div className="border-t border-[color-mix(in_srgb,#fff_8%,transparent)] px-4 pb-4 pt-3 sm:px-5">
        <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[color-mix(in_srgb,#fff_45%,transparent)]">
          <span>Paid down</span>
          <span className="tabular-nums text-[color-mix(in_srgb,#fff_70%,transparent)]">
            {loading ? "—" : `${Math.round(paidRatio)}%`}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,#fff_10%,transparent)]">
          <div
            className="h-full rounded-full bg-[var(--pos-primary,#0f766e)] transition-[width] duration-500"
            style={{ width: loading ? "0%" : `${paidRatio}%` }}
          />
        </div>
      </div>
    </div>
  );
}
