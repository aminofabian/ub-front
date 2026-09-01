"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardLoading } from "@/components/dashboard-page-ui";
import {
  INK,
  MUTED,
  WhiteCard,
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

type Props = {
  customer: CustomerRecord | null;
  currency: string;
  canViewAnalytics: boolean;
};

function StatBlock({
  label,
  value,
  lead,
}: {
  label: string;
  value: string;
  lead?: boolean;
}) {
  return (
    <WhiteCard className={lead ? "px-4 py-4 min-h-[5.5rem]" : "px-3 py-3"}>
      <p className="text-[11px] font-semibold uppercase tracking-[-0.02em]" style={{ color: MUTED }}>
        {label}
      </p>
      <p
        className={lead ? "mt-1 text-[1.45rem] font-bold tabular-nums tracking-[-0.03em]" : "mt-1 text-[1.15rem] font-bold tabular-nums tracking-[-0.03em]"}
        style={{ color: INK }}
      >
        {value}
      </p>
    </WhiteCard>
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
      <WhiteCard className="px-5 py-10">
        <p className="max-w-[65ch] text-[15px] leading-relaxed" style={{ color: INK }}>
          Select a customer to see visits, items bought, favourite products, and purchase history.
        </p>
      </WhiteCard>
    );
  }

  if (loading) {
    return <DashboardLoading label="Loading purchases…" />;
  }

  return (
    <div className="min-h-0 space-y-3 overflow-y-auto">
      {display ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatBlock label="Visits" value={String(display.visitCount)} />
            <StatBlock label="Items bought" value={String(Math.round(display.itemsBought))} />
            <StatBlock label="Total spend" value={money(display.totalSpend)} lead />
            <StatBlock label="Avg basket" value={money(display.avgBasket)} />
          </div>

          {display.topItem ? (
            <WhiteCard className="px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[-0.02em]" style={{ color: MUTED }}>
                Most bought
              </p>
              <p className="mt-1 text-[1.2rem] font-bold tracking-[-0.03em]" style={{ color: INK }}>
                {display.topItem.name}
              </p>
              {display.topItem.sku ? (
                <p className="font-mono text-[12px]" style={{ color: MUTED }}>
                  {display.topItem.sku}
                </p>
              ) : null}
              <p className="mt-2 text-[12px]" style={{ color: MUTED }}>
                {Math.round(display.topItem.quantity)} units · {money(display.topItem.spend)}
              </p>
              {display.topItems.length > 1 ? (
                <ul className="mt-3 space-y-2 border-t border-[#eef1f4] pt-3">
                  {display.topItems.slice(1).map((item) => {
                    const pct = Math.max((item.quantity / maxQty) * 100, 4);
                    return (
                      <li key={item.key}>
                        <div className="flex items-center justify-between gap-2 text-[12px]" style={{ color: MUTED }}>
                          <span className="min-w-0 truncate">{item.name}</span>
                          <span className="tabular-nums">{Math.round(item.quantity)}</span>
                        </div>
                        <div className="mt-1 h-2 w-full bg-[#d5deea]">
                          <div
                            className="h-2 origin-left"
                            style={{
                              width: "100%",
                              transform: `scaleX(${pct / 100})`,
                              background: "#2a6aa3",
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </WhiteCard>
          ) : null}

          {spendRow?.cohort ? (
            <p className="text-[12px] text-white/90">
              30-day pattern:{" "}
              <span className="font-semibold text-white capitalize">
                {String(spendRow.cohort).replace(/_/g, " ")}
              </span>
            </p>
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
