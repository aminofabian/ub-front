"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardLoading } from "@/components/dashboard-page-ui";
import { CrmBar, boardMoney } from "@/components/credits/customer-board-theme";
import { CustomerPurchasesSection } from "@/components/credits/customer-purchases-section";
import {
  insightsFromPurchases,
  mergeSpendIntelligence,
  type CustomerPurchaseInsights,
} from "@/components/credits/customer-purchase-insights";
import {
  fetchCustomerItemRhythm,
  fetchCustomerSpend,
  fetchCustomerTabPurchases,
  type CustomerItemRhythmResponse,
  type CustomerRecord,
  type CustomerSpendRow,
  type TabPurchaseRowRecord,
} from "@/lib/api";
import { addDays, presetRange, toISODate } from "@/lib/analytics-date-range";
import { cn } from "@/lib/utils";

type InsightWindow = "last30" | "last90" | "all";

type Props = {
  customer: CustomerRecord | null;
  currency: string;
  canViewAnalytics: boolean;
};

function cohortLabel(cohort: string): string {
  return cohort.replace(/_/g, " ");
}

function windowRange(window: InsightWindow): { from: string; to: string } | null {
  const today = new Date();
  if (window === "last30") return presetRange("last30");
  if (window === "last90") {
    return { from: toISODate(addDays(today, -89)), to: toISODate(today) };
  }
  return null;
}

function saleInWindow(
  soldAt: string,
  range: { from: string; to: string } | null,
): boolean {
  if (!range) return true;
  const day = soldAt.slice(0, 10);
  return day >= range.from && day <= range.to;
}

function lastSeenLabel(days: number | null | undefined): string | null {
  if (days == null) return null;
  if (days === 0) return "In today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return `${days}d ago`;
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
      <p className="truncate text-[9px] font-medium tracking-[-0.02em] text-muted-foreground">
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
    <div className="shrink-0 rounded-none border border-border/60 bg-background/60 px-2 py-1.5">
      <p className="mb-1 text-[9px] font-semibold tracking-[-0.02em] text-muted-foreground">
        Usually buys
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

function LastBasketCard({
  row,
  currency,
}: {
  row: TabPurchaseRowRecord;
  currency: string;
}) {
  const money = boardMoney(row.grandTotal, currency);
  const when = new Date(row.soldAt).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const names = row.lines
    .map((line) => line.itemName?.trim())
    .filter(Boolean)
    .slice(0, 4);
  const extra = row.lines.length - names.length;

  return (
    <div className="shrink-0 rounded-none border border-border/60 bg-background/60 px-2 py-1.5">
      <div className="mb-0.5 flex items-baseline justify-between gap-2">
        <p className="text-[9px] font-semibold tracking-[-0.02em] text-muted-foreground">
          Last basket
        </p>
        <p className="text-[10px] tabular-nums text-muted-foreground">
          {when}
          {row.receiptNo != null ? ` · #${row.receiptNo}` : ""}
        </p>
      </div>
      <p className="truncate text-[11px] font-medium leading-snug text-foreground">
        {names.join(" · ") || "Sale"}
        {extra > 0 ? ` +${extra}` : ""}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-foreground">
        {money}
      </p>
    </div>
  );
}

function DueToBuyList({ data }: { data: CustomerItemRhythmResponse }) {
  if (data.linkedSaleCount < 8) {
    return null;
  }
  if (data.rows.length === 0) {
    return (
      <div className="shrink-0 rounded-none border border-border/60 bg-background/60 px-2 py-1.5">
        <p className="text-[9px] font-semibold tracking-[-0.02em] text-muted-foreground">
          Due to buy
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Not enough repeats of one product yet.
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 rounded-none border border-border/60 bg-background/60 px-2 py-1.5">
      <p className="mb-1 text-[9px] font-semibold tracking-[-0.02em] text-muted-foreground">
        Due to buy
      </p>
      <ul className="space-y-1">
        {data.rows.slice(0, 6).map((row) => (
          <li key={row.itemId} className="min-w-0">
            <p className="truncate text-[11px] font-medium text-foreground">
              {row.itemName}
              {row.dueish ? (
                <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Due
                </span>
              ) : null}
            </p>
            <p className="text-[10px] leading-snug text-muted-foreground">
              {row.summary}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const WINDOWS: { key: InsightWindow; label: string }[] = [
  { key: "last30", label: "30d" },
  { key: "last90", label: "90d" },
  { key: "all", label: "All" },
];

export function CustomerInsightsColumn({
  customer,
  currency,
  canViewAnalytics,
}: Props) {
  const [insights, setInsights] = useState<CustomerPurchaseInsights | null>(
    null,
  );
  const [spendRow, setSpendRow] = useState<CustomerSpendRow | null>(null);
  const [lastBasket, setLastBasket] = useState<TabPurchaseRowRecord | null>(
    null,
  );
  const [rhythm, setRhythm] = useState<CustomerItemRhythmResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [insightWindow, setInsightWindow] = useState<InsightWindow>("last30");

  const money = useCallback(
    (n: number | string | null | undefined) => boardMoney(n, currency),
    [currency],
  );

  const load = useCallback(async () => {
    if (!customer) {
      setInsights(null);
      setSpendRow(null);
      setLastBasket(null);
      setRhythm(null);
      return;
    }
    setLoading(true);
    try {
      const range = windowRange(insightWindow);
      const spendRange = range ?? presetRange("last30");
      const [purchases, spend, rhythmRes] = await Promise.all([
        fetchCustomerTabPurchases(customer.id, { offset: 0, limit: 100 }),
        canViewAnalytics && spendRange
          ? fetchCustomerSpend(
              spendRange.from,
              spendRange.to,
              undefined,
              500,
            ).then(
              (res) =>
                res.rows.find((r) => r.customerId === customer.id) ?? null,
            )
          : Promise.resolve(null),
        canViewAnalytics
          ? fetchCustomerItemRhythm(customer.id).catch(() => null)
          : Promise.resolve(null),
      ]);
      setSpendRow(spend);
      setLastBasket(purchases.rows[0] ?? null);
      setRhythm(rhythmRes);
      const windowed = purchases.rows.filter((row) =>
        saleInWindow(row.soldAt, range),
      );
      const fromHistory = insightsFromPurchases(windowed, purchases.hasMore);
      setInsights(
        insightWindow === "all"
          ? fromHistory
          : mergeSpendIntelligence(fromHistory, spend),
      );
    } catch {
      setInsights(null);
      setSpendRow(null);
      setLastBasket(null);
      setRhythm(null);
    } finally {
      setLoading(false);
    }
  }, [customer, canViewAnalytics, insightWindow]);

  useEffect(() => {
    void load();
  }, [load]);

  const display = useMemo(() => insights, [insights]);
  const maxQty = display?.topItems[0]?.quantity ?? 1;
  const seen = lastSeenLabel(spendRow?.daysSinceLastVisit ?? null);

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
          <div className="rounded-none border border-border/60 bg-muted/25 px-2 py-1">
            <div className="mb-1 flex flex-wrap items-center gap-1">
              {spendRow?.cohort ? (
                <span className="rounded bg-foreground/8 px-1.5 py-0.5 text-[9px] font-semibold capitalize text-muted-foreground">
                  {cohortLabel(String(spendRow.cohort))}
                </span>
              ) : null}
              {spendRow?.cadence ? (
                <span className="rounded bg-foreground/8 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                  {spendRow.cadence}
                </span>
              ) : null}
              {spendRow?.favoriteWeekday ? (
                <span className="rounded bg-foreground/8 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                  {spendRow.favoriteWeekday}s
                </span>
              ) : null}
              {seen ? (
                <span className="rounded bg-foreground/8 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground">
                  {seen}
                </span>
              ) : null}
              {spendRow?.weekStreak && spendRow.weekStreak > 0 ? (
                <span className="ml-auto text-[9px] tabular-nums text-muted-foreground">
                  {spendRow.weekStreak}w streak
                </span>
              ) : (
                <span className="ml-auto text-[9px] text-muted-foreground">
                  {insightWindow === "all" ? "All visits" : "Window"}
                </span>
              )}
            </div>
            <div
              className="mb-1 flex gap-0.5"
              role="group"
              aria-label="Insight window"
            >
              {WINDOWS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setInsightWindow(item.key)}
                  className={cn(
                    "h-5 min-w-[2.25rem] rounded-none px-1.5 text-[9px] font-semibold",
                    insightWindow === item.key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex divide-x divide-border/50">
              <MetricCell label="Visits" value={String(display.visitCount)} />
              <MetricCell
                label="Items"
                value={String(Math.round(display.itemsBought))}
              />
              <MetricCell
                label="Spend"
                value={money(display.totalSpend)}
                lead
              />
              <MetricCell label="Basket" value={money(display.avgBasket)} />
            </div>
          </div>

          {lastBasket ? (
            <LastBasketCard row={lastBasket} currency={currency} />
          ) : null}

          <TopItemsStrip items={display.topItems} maxQty={maxQty} />

          {rhythm ? <DueToBuyList data={rhythm} /> : null}
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
