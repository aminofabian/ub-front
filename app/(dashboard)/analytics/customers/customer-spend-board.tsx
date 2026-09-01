"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, Users } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import {
  DashboardFeedback,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import {
  BoardFilterButton,
  CrmBar,
  NavyRadioOption,
  NavySidebarSection,
  WhiteCard,
} from "@/components/credits/customer-board-theme";
import {
  DirectoryColumn,
  DirectoryToolbar,
  directoryFrameClass,
} from "@/components/credits/directory-workspace-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_ROUTES } from "@/lib/config";
import {
  ANALYTICS_PRESET_LABELS,
  type DatePreset,
  formatDateRangeLabel,
  parseISODate,
  presetRange,
} from "@/lib/analytics-date-range";
import {
  fetchBranches,
  fetchCustomerSpend,
  type BranchRecord,
  type CustomerSpendCohort,
  type CustomerSpendResponse,
  type CustomerSpendRow,
} from "@/lib/api";

type SortKey = "spend" | "visits" | "streak" | "recency" | "basket";
type CohortFilter = "all" | CustomerSpendCohort;

const SORTS: { key: SortKey; label: string }[] = [
  { key: "spend", label: "Biggest spenders" },
  { key: "visits", label: "Most visits" },
  { key: "streak", label: "Longest streak" },
  { key: "recency", label: "Last seen" },
  { key: "basket", label: "Biggest baskets" },
];

const COHORTS: { key: CohortFilter; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "champion", label: "Champions" },
  { key: "regular", label: "Regulars" },
  { key: "new_face", label: "New" },
  { key: "at_risk", label: "Been away" },
  { key: "dormant", label: "Quiet" },
  { key: "one_off", label: "Once" },
];

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function compactMoney(
  n: number | string | null | undefined,
  currency: string,
): string {
  const val = toNum(n);
  const abs = Math.abs(val);
  const sign = val < 0 ? "−" : "";
  let body: string;
  if (abs >= 1_000_000) {
    body = `${(abs / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
  } else if (abs >= 10_000) {
    body = `${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  } else {
    body = abs.toLocaleString("en-KE", { maximumFractionDigits: 0 });
  }
  const prefix =
    currency === "KES" ? "KSh " : currency.trim() ? `${currency.trim()} ` : "";
  return `${sign}${prefix}${body}`;
}

function fullMoney(
  n: number | string | null | undefined,
  currency: string,
): string {
  const val = toNum(n);
  const body = val.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const prefix =
    currency === "KES" ? "KSh " : currency.trim() ? `${currency.trim()} ` : "";
  return `${prefix}${body}`;
}

function customerNoLabel(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return `C-${n}`;
}

function customerHref(id: string | null | undefined): string | null {
  const value = id?.trim() ?? "";
  if (!value || value.startsWith("mpesa:")) return null;
  return `${APP_ROUTES.customers}/${encodeURIComponent(value)}`;
}

function lastSeenLabel(
  days: number | null | undefined,
  lastVisit: string | null | undefined,
): string {
  if (days == null) return "No visit in this window";
  if (days === 0) return "In today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (lastVisit) {
    return parseISODate(lastVisit).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
    });
  }
  return `${days} days ago`;
}

function cohortLabel(cohort: string): string {
  const found = COHORTS.find((c) => c.key === cohort);
  return found && found.key !== "all" ? found.label : cohort;
}

function sortRows(rows: CustomerSpendRow[], key: SortKey): CustomerSpendRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (key) {
      case "visits":
        return (
          b.saleCount - a.saleCount || toNum(b.spend) - toNum(a.spend)
        );
      case "streak":
        return (
          b.weekStreak - a.weekStreak ||
          b.longestWeekStreak - a.longestWeekStreak ||
          toNum(b.spend) - toNum(a.spend)
        );
      case "recency":
        return (
          (a.daysSinceLastVisit ?? 9999) - (b.daysSinceLastVisit ?? 9999) ||
          toNum(b.spend) - toNum(a.spend)
        );
      case "basket":
        return toNum(b.avgBasket) - toNum(a.avgBasket) || toNum(b.spend) - toNum(a.spend);
      default:
        return toNum(b.spend) - toNum(a.spend) || b.saleCount - a.saleCount;
    }
  });
  return copy;
}

function BoardSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1280px] px-2 py-4 sm:px-4"
      aria-busy
      aria-label="Loading shoppers"
    >
      <div className="mb-6 h-10 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="mb-4 h-8 w-full max-w-xl animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

function StreakTicks({ count }: { count: number }) {
  const shown = Math.min(Math.max(count, 0), 8);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${count} week shopping streak`}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block size-2 rounded-sm",
            i < shown ? "bg-foreground" : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

export function CustomerSpendBoard() {
  const { business, setBranchId: setHeaderBranchId } = useDashboard();
  const currency = business?.currency?.trim() || "KES";
  const money = useCallback(
    (n: number | string | null | undefined) => compactMoney(n, currency),
    [currency],
  );
  const moneyFull = useCallback(
    (n: number | string | null | undefined) => fullMoney(n, currency),
    [currency],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<CustomerSpendResponse | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [cohort, setCohort] = useState<CohortFilter>("all");
  const [query, setQuery] = useState("");
  const hasLoadedRef = useRef(false);

  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: branchId,
    setValue: setBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
    allowAll: true,
  });

  const onChangeBranch = useCallback(
    (id: string) => {
      setBranchId(id);
      if (!branchLocked) setHeaderBranchId(id.trim());
    },
    [branchLocked, setHeaderBranchId],
  );

  const dateRange = useMemo(() => {
    if (preset === "custom") {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  // Kept off the ranking's path: a branch-list hiccup must not blank the board.
  useEffect(() => {
    let cancelled = false;
    void fetchBranches()
      .then((list) => {
        if (!cancelled) setBranches(list.filter((b) => b.active !== false));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setError(null);
    if (!hasLoadedRef.current) setLoading(true);
    else setRefreshing(true);
    try {
      if (!dateRange) {
        setData(null);
        return;
      }
      const res = await fetchCustomerSpend(
        dateRange.from,
        dateRange.to,
        branchId || undefined,
      );
      setData(res);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load shopper ranking.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const rows = data?.rows ?? [];
    const q = query.trim().toLowerCase();
    const matched = rows.filter((row) => {
      if (cohort !== "all" && row.cohort !== cohort) return false;
      if (!q) return true;
      const no = customerNoLabel(row.customerNo)?.toLowerCase() ?? "";
      return (
        row.name.toLowerCase().includes(q) ||
        no.includes(q) ||
        (row.maskedHint ?? "").toLowerCase().includes(q) ||
        (row.favoriteWeekday ?? "").toLowerCase().includes(q)
      );
    });
    return sortRows(matched, sortKey);
  }, [data, query, cohort, sortKey]);

  const maxSpend = useMemo(() => {
    return Math.max(...filtered.map((r) => toNum(r.spend)), 1);
  }, [filtered]);

  const podium = filtered.slice(0, 3);
  const rangeLabel = dateRange
    ? formatDateRangeLabel(dateRange.from, dateRange.to)
    : "";

  const summary = data ? (
    data.identifiedCustomerCount === 0 ? (
      <>
        No named shoppers in this window
        {rangeLabel ? ` · ${rangeLabel}` : ""}.
        {toNum(data.walkInSpend) > 0
          ? ` Walk-ins without a name still rang ${money(data.walkInSpend)} across ${data.walkInSaleCount.toLocaleString("en-KE")} tills.`
          : " Ring a sale against a customer, or take it on the till, and the payer ranks here."}
      </>
    ) : (
      <>
        {data.identifiedCustomerCount.toLocaleString("en-KE")} named shopper
        {data.identifiedCustomerCount === 1 ? "" : "s"} spent{" "}
        <span className="font-semibold text-foreground">
          {money(data.identifiedSpend)}
        </span>{" "}
        on {data.identifiedSaleCount.toLocaleString("en-KE")} till
        {data.identifiedSaleCount === 1 ? "" : "s"}
        {rangeLabel ? ` · ${rangeLabel}` : ""}.
        {toNum(data.walkInSpend) > 0
          ? ` Another ${money(data.walkInSpend)} came from ${data.walkInSaleCount.toLocaleString("en-KE")} walk-ins without a name.`
          : ""}
      </>
    )
  ) : (
    "Pick a period to rank shoppers by what they spent."
  );

  if (loading) return <BoardSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1320px] px-2 pb-14 pt-1 sm:px-3 sm:pt-2">
      {error ? (
        <div className="mb-2">
          <DashboardFeedback kind="error" text={error} />
        </div>
      ) : null}

      <DirectoryToolbar
        icon={Users}
        eyebrow="Analytics"
        title="Shoppers"
        meta={summary}
        links={[
          { href: APP_ROUTES.analytics, label: "Overview" },
          { href: APP_ROUTES.analyticsActivity, label: "Activity" },
        ]}
        actions={
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8"
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            disabled={refreshing}
            aria-label="Refresh"
          >
            <RefreshCw
              className={cn("size-3.5", refreshing && "animate-spin")}
              aria-hidden
            />
          </Button>
        }
      />

      <div className={cn(directoryFrameClass, refreshing && "opacity-90")}>
        <div className="grid min-h-0 flex-1 divide-y lg:grid-cols-[minmax(0,1fr)_12.5rem] lg:divide-x lg:divide-y-0 divide-border/60">
          <DirectoryColumn
            title="Ranking"
            hint={rangeLabel || "Pick a period"}
            badge={filtered.length}
            className="lg:order-1"
          >
            <div className="flex min-h-0 flex-col gap-2">
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label="Sort shoppers"
              >
                {SORTS.map((item) => (
                  <BoardFilterButton
                    key={item.key}
                    selected={sortKey === item.key}
                    onClick={() => setSortKey(item.key)}
                  >
                    {item.label}
                  </BoardFilterButton>
                ))}
              </div>
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label="Filter by shopping pattern"
              >
                {COHORTS.map((item) => (
                  <BoardFilterButton
                    key={item.key}
                    compact
                    selected={cohort === item.key}
                    onClick={() => setCohort(item.key)}
                  >
                    {item.label}
                  </BoardFilterButton>
                ))}
              </div>
              <label className="relative block max-w-sm">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <span className="sr-only">Search shoppers</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, C-number, phone mask"
                  className={dashboardInputClass(false, "h-8 pl-8 text-sm")}
                />
              </label>

            {filtered.length === 0 ? (
              <WhiteCard className="px-4 py-8">
                <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                  {data && (data.rows?.length ?? 0) > 0
                    ? "No shopper matches that search or filter. Clear it to see the full ranking."
                    : "Shoppers you rang against a customer rank here, and so do Lipa Na M-Pesa payers — M-Pesa gives us the name on the receipt even when there is no tab open."}
                </p>
              </WhiteCard>
            ) : (
              <>
                {podium.length > 0 ? (
                  <ol className="grid gap-2 sm:grid-cols-3">
                    {podium.map((row, index) => {
                      const lead = index === 0;
                      const href = customerHref(row.customerId);
                      const card = (
                            <WhiteCard
                              className={cn(
                                "flex h-full flex-col justify-between px-3 py-3",
                                lead ? "min-h-[7.5rem]" : "min-h-[6.5rem]",
                              )}
                            >
                              <div className="flex items-start gap-2.5">
                                <p
                                  className={cn(
                                    "tabular-nums font-bold tracking-tight text-foreground",
                                    lead ? "text-2xl leading-none" : "text-xl leading-none",
                                  )}
                                >
                                  {index + 1}
                                </p>
                                <div className="min-w-0">
                                  <p
                                    className={cn(
                                      "truncate font-semibold tracking-tight text-foreground",
                                      lead ? "text-base leading-tight" : "text-sm leading-tight",
                                    )}
                                  >
                                    {row.name}
                                  </p>
                                  <p className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-foreground">
                                    {money(row.spend)}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {row.saleCount} till
                                    {row.saleCount === 1 ? "" : "s"}
                                    {row.weekStreak > 1
                                      ? ` · ${row.weekStreak}-week streak`
                                      : ""}
                                    {` · ${cohortLabel(row.cohort)}`}
                                  </p>
                                </div>
                              </div>
                            </WhiteCard>
                      );
                      return (
                        <li key={row.customerId}>
                          {href ? (
                            <Link
                              href={href}
                              className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {card}
                            </Link>
                          ) : (
                            card
                          )}
                        </li>
                      );
                    })}
                  </ol>
                ) : null}

                <WhiteCard className="overflow-hidden">
                  <ul>
                    {filtered.map((row, index) => {
                      const pct = Math.max(
                        (toNum(row.spend) / maxSpend) * 100,
                        toNum(row.spend) ? 4 : 0,
                      );
                      const no = customerNoLabel(row.customerNo);
                      const href = customerHref(row.customerId);
                      const rowClass =
                        "grid gap-2 px-3 py-2.5 sm:grid-cols-[1.75rem_minmax(0,1fr)_auto]";
                      const body = (
                        <>
                            <p className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                              {index + 1}
                            </p>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                                  {row.name}
                                </p>
                                {no ? (
                                  <span className="text-[12px] tabular-nums text-muted-foreground">
                                    {no}
                                  </span>
                                ) : null}
                                {row.maskedHint ? (
                                  <span className="text-[12px] tabular-nums text-muted-foreground">
                                    {row.maskedHint}
                                  </span>
                                ) : null}
                                {row.origin === "mpesa_inferred" &&
                                !row.phoneVerified ? (
                                  <span className="text-[11px] font-medium text-muted-foreground">
                                    Unverified number
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1.5 max-w-md">
                                <CrmBar pct={pct} />
                              </div>
                              <p className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] leading-snug text-muted-foreground">
                                <span>
                                  {row.saleCount} till
                                  {row.saleCount === 1 ? "" : "s"}
                                  {row.visitDays !== row.saleCount
                                    ? ` · ${row.visitDays} shopping days`
                                    : ""}
                                </span>
                                <span>
                                  Basket {money(row.avgBasket)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <StreakTicks count={row.weekStreak} />
                                  {row.weekStreak > 0
                                    ? `${row.weekStreak} week${row.weekStreak === 1 ? "" : "s"} in a row`
                                    : "Streak broken"}
                                  {row.longestWeekStreak > row.weekStreak
                                    ? ` · best ${row.longestWeekStreak}`
                                    : ""}
                                </span>
                                <span>{row.cadence}</span>
                                {row.favoriteWeekday ? (
                                  <span>{row.favoriteWeekday}s</span>
                                ) : null}
                                <span>
                                  {lastSeenLabel(
                                    row.daysSinceLastVisit,
                                    row.lastVisit,
                                  )}
                                </span>
                                <span>{cohortLabel(row.cohort)}</span>
                              </p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-base font-bold tabular-nums tracking-tight text-foreground">
                                {moneyFull(row.spend)}
                              </p>
                              <p className="text-[10px] tabular-nums text-muted-foreground">
                                {toNum(row.sharePct).toLocaleString("en-KE", {
                                  maximumFractionDigits: 1,
                                })}
                                % of named spend
                              </p>
                            </div>
                        </>
                      );
                      return (
                        <li
                          key={row.customerId}
                          className="border-b border-border/50 last:border-0"
                        >
                          {href ? (
                            <Link
                              href={href}
                              className={`${rowClass} transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`}
                            >
                              {body}
                            </Link>
                          ) : (
                            <div className={rowClass}>{body}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {data?.truncated && cohort === "all" && !query.trim() ? (
                    <p className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
                      Showing the top spenders in this window. Narrow the period
                      if you need a smaller book.
                    </p>
                  ) : null}
                </WhiteCard>
              </>
            )}
            </div>
          </DirectoryColumn>

          <DirectoryColumn title="Scope" hint="Period & branch" className="lg:order-2">
            <div className="flex flex-col gap-2">
            <NavySidebarSection title="Period">
              {ANALYTICS_PRESET_LABELS.map((item) => (
                <NavyRadioOption
                  key={item.key}
                  name="shopper-period"
                  value={item.key}
                  checked={preset === item.key}
                  onChange={() => setPreset(item.key)}
                  label={item.label}
                />
              ))}
            </NavySidebarSection>

            {preset === "custom" ? (
              <WhiteCard className="space-y-2 p-3">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  From
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className={dashboardInputClass(false, "h-10")}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  To
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className={dashboardInputClass(false, "h-10")}
                  />
                </label>
              </WhiteCard>
            ) : null}

            <NavySidebarSection title="Branch">
              {(branchLocked
                ? branches.map((b) => ({ id: b.id, label: b.name }))
                : [
                    { id: "", label: "All branches" },
                    ...branches.map((b) => ({ id: b.id, label: b.name })),
                  ]
              ).map((item) => (
                <NavyRadioOption
                  key={item.id || "all-branches"}
                  name="shopper-branch"
                  value={item.id}
                  checked={branchId === item.id}
                  onChange={() => onChangeBranch(item.id)}
                  label={item.label}
                />
              ))}
            </NavySidebarSection>
            </div>
          </DirectoryColumn>
        </div>
      </div>
    </div>
  );
}
