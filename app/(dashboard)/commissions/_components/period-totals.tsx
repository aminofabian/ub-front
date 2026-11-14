import { dashboardHintClass } from "@/components/dashboard-page-ui";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import type { CommissionPeriodTotals } from "./commission-summary";

const kes = (n: number) => formatMoney(n, "KES");

const FIGURES: { key: keyof CommissionPeriodTotals; label: string; lead?: boolean }[] = [
  { key: "owed", label: "Owed", lead: true },
  { key: "commission", label: "Commission" },
  { key: "tips", label: "Tips" },
  { key: "paid", label: "Paid" },
  { key: "broughtIn", label: "Brought in" },
];

export function PeriodTotals({
  totals,
  people,
}: {
  totals: CommissionPeriodTotals;
  people: number;
}) {
  const peopleLabel = people === 1 ? "1 person" : `${people} people`;

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[2px] bg-[var(--op-rule)] ring-1 ring-[var(--op-rule)] lg:grid-cols-5">
      {FIGURES.map((figure, index) => {
        const last = index === FIGURES.length - 1;
        return (
          <div
            key={figure.key}
            className={cn(
              "bg-[var(--op-surface)] px-3 py-2",
              last && "col-span-2 lg:col-span-1",
            )}
          >
            <dt className="text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted)]">
              {figure.label}
            </dt>
            <dd
              className={cn(
                "mt-1 truncate font-mono text-[15px] font-semibold tabular-nums leading-none tracking-[-0.03em] text-[var(--op-ink)]",
                figure.lead && totals.owed > 0 && "text-[var(--op-accent)]",
              )}
              title={kes(totals[figure.key])}
            >
              {kes(totals[figure.key])}
            </dd>
            {figure.lead ? <p className={cn("mt-1", dashboardHintClass())}>{peopleLabel}</p> : null}
          </div>
        );
      })}
    </dl>
  );
}
