"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Package,
  Receipt,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { DashboardLoading } from "@/components/dashboard-page-ui";
import { CustomerPurchasesSection } from "@/components/credits/customer-purchases-section";
import {
  insightsFromPurchases,
  mergeSpendIntelligence,
  type CustomerPurchaseInsights,
} from "@/components/credits/customer-purchase-insights";
import { CRM_MAIN } from "@/components/credits/customer-crm-ui";
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
  formatKes: (n: number | string) => string;
  canViewAnalytics: boolean;
};

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Receipt;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        accent
          ? "border-[#8B6F3A]/25 bg-[linear-gradient(145deg,#F9F6F0,#fff)]"
          : "border-border/55 bg-card/70",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

export function CustomerInsightsColumn({
  customer,
  formatKes,
  canViewAnalytics,
}: Props) {
  const [insights, setInsights] = useState<CustomerPurchaseInsights | null>(null);
  const [spendRow, setSpendRow] = useState<CustomerSpendRow | null>(null);
  const [loading, setLoading] = useState(false);

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
      const base = insightsFromPurchases(purchases.rows, purchases.hasMore);
      setSpendRow(spend);
      setInsights(mergeSpendIntelligence(base, spend));
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

  return (
    <main
      className={cn(
        CRM_MAIN,
        "border-x border-border/40 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--muted)_18%,transparent),transparent_120px)] lg:max-h-none",
      )}
    >
      <div className="shrink-0 border-b border-border/50 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Purchase intelligence
        </p>
        <h2 className="text-sm font-semibold">
          {customer ? customer.name : "Select someone"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {customer
            ? "Visits, basket, favourites, and receipt history"
            : "Pick a customer from the list to see what they buy"}
        </p>
      </div>

      {!customer ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20">
            <BarChart3 className="size-6 text-muted-foreground/45" />
          </div>
          <p className="text-sm font-medium">No shopper selected</p>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            Their spend story, favourite products, and every linked receipt land here.
          </p>
        </div>
      ) : loading ? (
        <DashboardLoading label="Crunching purchases…" />
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {display ? (
            <>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                <StatTile
                  label="Visits"
                  value={String(display.visitCount)}
                  icon={Receipt}
                />
                <StatTile
                  label="Items"
                  value={String(Math.round(display.itemsBought))}
                  icon={ShoppingBag}
                />
                <StatTile
                  label="Total spend"
                  value={formatKes(display.totalSpend)}
                  icon={TrendingUp}
                  accent
                />
                <StatTile
                  label="Avg basket"
                  value={formatKes(display.avgBasket)}
                  icon={BarChart3}
                />
              </div>

              {display.topItem ? (
                <section className="overflow-hidden rounded-2xl border border-[#8B6F3A]/20 bg-[#F9F6F0]/40">
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#8B6F3A]/15 text-[#8B6F3A]">
                      <Package className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B6F3A]">
                        Most bought
                      </p>
                      <p className="truncate text-base font-semibold">
                        {display.topItem.name}
                      </p>
                      {display.topItem.sku ? (
                        <p className="font-mono text-xs text-muted-foreground">
                          {display.topItem.sku}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Math.round(display.topItem.quantity)} units ·{" "}
                        {formatKes(display.topItem.spend)} on this item
                        {display.hasMoreHistory ? " · partial history" : ""}
                      </p>
                    </div>
                  </div>
                  {display.topItems.length > 1 ? (
                    <ul className="border-t border-[#8B6F3A]/10 px-4 py-2">
                      {display.topItems.slice(1).map((item) => {
                        const pct =
                          display.topItem && display.topItem.quantity > 0
                            ? Math.round(
                                (item.quantity / display.topItem.quantity) * 100,
                              )
                            : 0;
                        return (
                          <li
                            key={item.key}
                            className="flex items-center gap-2 py-1.5 text-xs"
                          >
                            <span className="min-w-0 flex-1 truncate text-muted-foreground">
                              {item.name}
                            </span>
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <span
                                className="block h-full rounded-full bg-[#8B6F3A]/50"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </span>
                            <span className="w-8 text-right tabular-nums">
                              {Math.round(item.quantity)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </section>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  No line items yet — link this customer at checkout to build history.
                </div>
              )}

              {spendRow?.cohort ? (
                <p className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-xs text-muted-foreground">
                  <Sparkles className="size-3.5 text-[#8B6F3A]" />
                  30-day cohort:{" "}
                  <span className="font-medium capitalize text-foreground">
                    {String(spendRow.cohort).replace(/_/g, " ")}
                  </span>
                </p>
              ) : null}
            </>
          ) : null}

          <CustomerPurchasesSection customerId={customer.id} />
        </div>
      )}
    </main>
  );
}
