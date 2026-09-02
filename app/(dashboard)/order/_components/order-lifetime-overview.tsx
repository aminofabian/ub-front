"use client";

import { cn, formatMoney, formatMoneyCompact } from "@/lib/utils";

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
  const width = 72;
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
      className={cn("h-[18px] w-[4.5rem] text-[var(--pos-primary,#0f766e)]", className)}
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LedgerChip({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="min-w-0" title={hint}>
      <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,#fff_46%,transparent)]">
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-heading text-[13px] font-semibold leading-none tracking-[-0.03em] text-white tabular-nums sm:text-[14px]">
        {value}
      </dd>
    </div>
  );
}

export function OrderLifetimeOverview({
  loading,
  lifetime,
  className,
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
  className?: string;
}) {
  const paidRatio =
    lifetime.confirmedValue > 0
      ? Math.min(100, (lifetime.paidValue / lifetime.confirmedValue) * 100)
      : 0;

  return (
    <div
      className={cn(
        "relative flex min-h-[4.5rem] flex-col justify-center gap-2.5 overflow-hidden bg-[var(--order-ink,#15231f)] px-3.5 py-2.5",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="font-heading text-[20px] font-semibold leading-none tracking-[-0.03em] text-white tabular-nums sm:text-[22px]">
              {loading ? "—" : formatMoney(lifetime.totalSpend, CURRENCY)}
            </p>
            <p className="mt-1 text-[10px] leading-none text-[color-mix(in_srgb,#fff_58%,transparent)]">
              {loading
                ? "Loading purchase history…"
                : `${lifetime.ordersPlaced} order${lifetime.ordersPlaced === 1 ? "" : "s"} · ${lifetime.confirmedInvoices} bill${lifetime.confirmedInvoices === 1 ? "" : "s"}`}
            </p>
          </div>
          {!loading && lifetime.spendTrend.length > 1 ? (
            <MiniSparkline
              points={lifetime.spendTrend}
              className="hidden shrink-0 opacity-90 xl:block"
            />
          ) : null}
        </div>

        <dl className="grid min-w-0 grid-cols-4 gap-x-2.5 sm:ml-auto sm:gap-4">
          <LedgerChip
            label="Placed"
            value={loading ? "—" : String(lifetime.ordersPlaced)}
            hint={`${lifetime.inFlightCount} in flight`}
          />
          <LedgerChip
            label="Confirmed"
            value={loading ? "—" : String(lifetime.fullyReceived)}
            hint={
              loading
                ? "Fully received POs"
                : `${lifetime.confirmedInvoices} bills · ${formatMoneyCompact(lifetime.confirmedValue, CURRENCY)}`
            }
          />
          <LedgerChip
            label="Paid"
            value={
              loading ? "—" : formatMoneyCompact(lifetime.paidValue, CURRENCY)
            }
            hint={
              loading
                ? "Settled to suppliers"
                : `${lifetime.paidCount} paid${lifetime.partialPayCount > 0 ? ` · ${lifetime.partialPayCount} partial` : ""}`
            }
          />
          <LedgerChip
            label="Open"
            value={
              loading ? "—" : formatMoneyCompact(lifetime.openBalance, CURRENCY)
            }
            hint={
              lifetime.unpaidCount > 0
                ? `${lifetime.unpaidCount} bill${lifetime.unpaidCount === 1 ? "" : "s"} still open`
                : "All caught up"
            }
          />
        </dl>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,#fff_10%,transparent)]">
          <div
            className="h-full rounded-full bg-[var(--pos-primary,#0f766e)] transition-[width] duration-500"
            style={{ width: loading ? "0%" : `${paidRatio}%` }}
          />
        </div>
        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[color-mix(in_srgb,#fff_48%,transparent)] tabular-nums">
          {loading ? "—" : `${Math.round(paidRatio)}% paid`}
        </span>
      </div>
    </div>
  );
}
