"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardLoading } from "@/components/dashboard-page-ui";
import {
  CrmBar,
  boardMoney,
} from "@/components/credits/customer-board-theme";
import { CustomerPurchasesSection } from "@/components/credits/customer-purchases-section";
import {
  insightsFromPurchases,
  mergeSpendIntelligence,
  type CustomerPurchaseInsights,
} from "@/components/credits/customer-purchase-insights";
import {
  fetchCustomerSpend,
  fetchCustomerTabPurchases,
  type CustomerRecord,
  type CustomerSpendRow,
} from "@/lib/api";
import { presetRange } from "@/lib/analytics-date-range";
import { cn } from "@/lib/utils";

type Props = {
  customer: CustomerRecord | null;
  currency: string;
  canViewAnalytics: boolean;
};

function cohortLabel(cohort: string): string {
  return cohort.replace(/_/g, " ");
}

function MetricCell({
  label,
  value,
  lead,
}: {
  label: string;
  value: string;
  lead?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 px-1.5 py-1 text-center first:pl-0 last:pr-0">
      <p className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "truncate font-semibold tabular-nums tracking-tight text-foreground",
          lead ? "text-sm" : "text-xs",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function TopItemsStrip({
  items,
  maxQty,
}: {
  items: CustomerPurchaseInsights["topItems"];
  maxQty: number;
}) {
  if (items.length === 0) return null;

  return (
    <div className="shrink-0 rounded-md border border-border/60 bg-background/60 px-2 py-1.5">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Top picks
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {items.slice(0, 3).map((item) => {
          const pct = Math.max((item.quantity / maxQty) * 100, 4);
          return (
            <div key={item.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-[10px] font-medium text-foreground">
                  {item.name}
                </span>
                <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">
                  {Math.round(item.quantity)}
                </span>
              </div>
              <CrmBar pct={pct} className="mt-0.5 h-0.5" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CustomerInsightsColumn({
  customer,
  currency,
  canViewAnalytics,
}: Props) {
  const [insights, setInsights] = useState<CustomerPurchaseInsights | null>(null);
  const [spendRow, setSpendRow] = useState<CustomerSpendRow | null>(null);
  const [loading, setLoading] = useState(false);

  const money = useCallback(
    (n: number | string | null | undefined) => boardMoney(n, currency),
    [currency],
  );

  const load = useCallback(async () => {
    if (!customer) {
      setInsights(null);
      setSpendRow(null);
      return;
    }
    setLoading(true);
    try {
      const range = presetRange("last30");
      const [purchases, spend] = await Promise.all([
        fetchCustomerTabPurchases(customer.id, { offset: 0, limit: 100 }),
        canViewAnalytics && range
          ? fetchCustomerSpend(range.from, range.to, undefined, 500).then((res) =>
              res.rows.find((r) => r.customerId === customer.id) ?? null,
            )
          : Promise.resolve(null),
      ]);
      setSpendRow(spend);
      setInsights(
        mergeSpendIntelligence(
          insightsFromPurchases(purchases.rows, purchases.hasMore),
          spend,
        ),
      );
    } catch {
      setInsights(null);
      setSpendRow(null);
    } finally {
      setLoading(false);
    }
  }, [customer, canViewAnalytics]);

  useEffect(() => {
    void load();
  }, [load]);

  const display = useMemo(() => insights, [insights]);
  const maxQty = display?.topItems[0]?.quantity ?? 1;

  if (!customer) {
    return (
      <p className="px-1 py-4 text-xs leading-relaxed text-muted-foreground">
        Select a customer to see visits, favourites, and purchase history.
      </p>
    );
  }

  if (loading) {
    return <DashboardLoading label="Loading purchases…" />;
  }

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      {display ? (
        <div className="shrink-0 space-y-1.5">
          <div className="rounded-md border border-border/60 bg-muted/25 px-2 py-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              {spendRow?.cohort ? (
                <span className="rounded bg-foreground/8 px-1.5 py-0.5 text-[9px] font-semibold capitalize text-muted-foreground">
                  {cohortLabel(String(spendRow.cohort))}
                </span>
              ) : (
                <span className="text-[9px] text-muted-foreground">Last 30 days</span>
              )}
              {spendRow?.weekStreak && spendRow.weekStreak > 0 ? (
                <span className="text-[9px] tabular-nums text-muted-foreground">
                  {spendRow.weekStreak}w streak
                </span>
              ) : null}
            </div>
            <div className="flex divide-x divide-border/50">
              <MetricCell label="Visits" value={String(display.visitCount)} />
              <MetricCell
                label="Items"
                value={String(Math.round(display.itemsBought))}
              />
              <MetricCell label="Spend" value={money(display.totalSpend)} lead />
              <MetricCell label="Basket" value={money(display.avgBasket)} />
            </div>
          </div>

          <TopItemsStrip items={display.topItems} maxQty={maxQty} />
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <CustomerPurchasesSection
          customerId={customer.id}
          variant="board"
          compact
          currency={currency}
        />
      </div>
    </div>
  );
}
