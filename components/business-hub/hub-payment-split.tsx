"use client";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export type HubPaymentSplitProps = {
  cash: number;
  mpesa: number;
  credit: number;
  format: (value: number) => string;
  periodLabel: string;
  /** Stack the legend under the bar for the narrow right rail. */
  compact?: boolean;
};

const LANES = [
  { id: "cash", label: "Cash", bar: "bg-[#0f766e]", dot: "bg-[#0f766e]" },
  { id: "mpesa", label: "M-Pesa", bar: "bg-[#34A853]", dot: "bg-[#34A853]" },
  { id: "credit", label: "Credit", bar: "bg-[#D9A441]", dot: "bg-[#D9A441]" },
] as const;

/** How the money actually arrived — one bar, three tenders. */
export function HubPaymentSplit({
  cash,
  mpesa,
  credit,
  format,
  periodLabel,
  compact = false,
}: HubPaymentSplitProps) {
  const totals = { cash, mpesa, credit };
  const total = cash + mpesa + credit;

  return (
    <section className={cn(HUB_SURFACE, "p-3.5")}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[12px] font-semibold tracking-[-0.02em] text-[#141414]">
          How you got paid
        </h3>
        <p className="shrink-0 text-[11px] text-[#8A8A8A]">{periodLabel}</p>
      </div>

      <div className="mt-2.5 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-[#F1F3F2]">
        {total > 0
          ? LANES.map((lane) => {
              const share = (totals[lane.id] / total) * 100;
              if (share <= 0) return null;
              return (
                <span
                  key={lane.id}
                  className={cn("h-full rounded-full", lane.bar)}
                  style={{ width: `${share}%` }}
                  aria-hidden
                />
              );
            })
          : null}
      </div>

      <dl
        className={cn(
          "mt-3 grid gap-2",
          compact ? "grid-cols-1" : "grid-cols-3",
        )}
      >
        {LANES.map((lane) => {
          const value = totals[lane.id];
          const share = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div
              key={lane.id}
              className={cn(
                "min-w-0",
                compact && "flex items-baseline justify-between gap-2",
              )}
            >
              <dt className="flex items-center gap-1.5 text-[11px] text-[#6F6F6F]">
                <span
                  className={cn("size-1.5 rounded-full", lane.dot)}
                  aria-hidden
                />
                {lane.label}
              </dt>
              <dd
                className={cn(
                  "min-w-0 text-[13px] font-semibold tabular-nums tracking-[-0.02em] text-[#141414]",
                  compact ? "text-right" : "mt-0.5",
                )}
              >
                <span className="truncate">{format(value)}</span>
                {total > 0 ? (
                  <span className="ml-1.5 text-[10px] font-medium text-[#A0A0A0]">
                    {share}%
                  </span>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
