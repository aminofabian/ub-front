"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardLoading } from "@/components/dashboard-page-ui";
import {
  CrmBar,
  WhiteCard,
  boardMoney,
} from "@/components/credits/customer-board-theme";
import { DirectoryStat } from "@/components/credits/directory-workspace-ui";
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

type Props = {
  customer: CustomerRecord | null;
  currency: string;
  canViewAnalytics: boolean;
};

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
      setInsights(mergeSpendIntelligence(
        insightsFromPurchases(purchases.rows, purchases.hasMore),
        spend,
      ));
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
    <div className="flex min-h-0 flex-col gap-2">
      {customer ? (
        <div className="shrink-0 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2">
          <p className="truncate text-sm font-semibold text-foreground">{customer.name}</p>
          {spendRow?.cohort ? (
            <p className="mt-0.5 text-[10px] capitalize text-muted-foreground">
              30-day · {String(spendRow.cohort).replace(/_/g, " ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {display ? (
        <>
          <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-4">
            <DirectoryStat label="Visits" value={String(display.visitCount)} />
            <DirectoryStat
              label="Items"
              value={String(Math.round(display.itemsBought))}
            />
            <DirectoryStat label="Spend" value={money(display.totalSpend)} />
            <DirectoryStat label="Basket" value={money(display.avgBasket)} />
          </div>

          {display.topItem ? (
            <WhiteCard className="px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Favourite
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                {display.topItem.name}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {Math.round(display.topItem.quantity)} units · {money(display.topItem.spend)}
              </p>
              {display.topItems.length > 1 ? (
                <ul className="mt-2 space-y-1.5 border-t border-border/50 pt-2">
                  {display.topItems.slice(1, 4).map((item) => {
                    const pct = Math.max((item.quantity / maxQty) * 100, 4);
                    return (
                      <li key={item.key}>
                        <div className="flex justify-between gap-2 text-[10px] text-muted-foreground">
                          <span className="min-w-0 truncate">{item.name}</span>
                          <span className="tabular-nums">{Math.round(item.quantity)}</span>
                        </div>
                        <CrmBar pct={pct} className="mt-0.5" />
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </WhiteCard>
          ) : null}
        </>
      ) : null}

      <CustomerPurchasesSection
        customerId={customer.id}
        variant="board"
        currency={currency}
      />
    </div>
  );
}
