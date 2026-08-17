"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, Users } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
import { DashboardFeedback } from "@/components/dashboard-page-ui";
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

const NAVY = "#0c3a66";
const NAVY_DEEP = "#071e36";
const BAR = "#2a6aa3";
const BAR_LEAD = "#0c3a66";
const SLICE = "#16487a";
const INK = "#0c3a66";
const MUTED = "#3a5570";
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

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

function WhiteCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-none bg-white", className)}
      style={{ boxShadow: "0 4px 14px rgba(7, 30, 54, 0.22)" }}
    >
      {children}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1280px] rounded-none p-4 pb-10 sm:p-5"
      style={{ background: NAVY }}
      aria-busy
      aria-label="Loading shoppers"
    >
      <div className="mb-6 h-12 w-64 bg-white/15" />
      <div className="mb-4 h-8 w-full max-w-xl bg-white/10" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-28 bg-white" />
        <div className="h-28 bg-white/90" />
        <div className="h-28 bg-white/80" />
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-white" />
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
          className="inline-block size-2"
          style={{
            background: i < shown ? BAR_LEAD : "#d5deea",
          }}
        />
      ))}
    </span>
  );
}

export function CustomerSpendBoard() {
  const { business, me, setBranchId: setHeaderBranchId } = useDashboard();
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

  const load = useCallback(async () => {
    setError(null);
    if (!hasLoadedRef.current) setLoading(true);
    else setRefreshing(true);
    try {
      const branchList = await fetchBranches();
      setBranches(branchList.filter((b) => b.active !== false));
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

  if (loading) return <BoardSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1280px] pb-16">
      {error ? (
        <div className="mb-3">
          <DashboardFeedback kind="error" text={error} />
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-none p-4 sm:p-5",
          refreshing && "opacity-80",
        )}
        style={{ background: NAVY }}
      >
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center bg-white">
              <Users className="size-6" aria-hidden style={{ color: NAVY }} />
            </span>
            <h1 className="min-w-0 font-sans text-[1.4rem] font-bold uppercase leading-tight tracking-[-0.02em] text-white sm:text-[1.75rem]">
              Who shops here
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-[11px] font-medium uppercase tracking-[-0.02em] text-white/85 sm:block">
              {me?.name || business?.name || ""}
            </p>
            <Link
              href={APP_ROUTES.analytics}
              className="text-[12px] text-white/85 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Analytics
            </Link>
            <Link
              href={APP_ROUTES.analyticsActivity}
              className="text-[12px] text-white/85 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Activity
            </Link>
            <button
              type="button"
              className="flex size-11 items-center justify-center text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
              onClick={() => {
                setRefreshing(true);
                void load();
              }}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <RefreshCw
                className={cn("size-4", refreshing && "animate-spin")}
                aria-hidden
              />
            </button>
          </div>
        </header>

        {data ? (
          <p className="mb-5 max-w-[72ch] text-[15px] leading-relaxed text-white">
            {data.identifiedCustomerCount === 0 ? (
              <>
                No named shoppers in this window
                {rangeLabel ? ` · ${rangeLabel}` : ""}.
                {toNum(data.walkInSpend) > 0
                  ? ` Walk-ins without a name still rang ${money(data.walkInSpend)} across ${data.walkInSaleCount.toLocaleString("en-KE")} tills.`
                  : " Match a Lipa Na M-Pesa receipt to a person and they will rank here."}
              </>
            ) : (
              <>
                {data.identifiedCustomerCount.toLocaleString("en-KE")} named
                shopper
                {data.identifiedCustomerCount === 1 ? "" : "s"} spent{" "}
                <span className="font-semibold">
                  {money(data.identifiedSpend)}
                </span>{" "}
                on {data.identifiedSaleCount.toLocaleString("en-KE")} till
                {data.identifiedSaleCount === 1 ? "" : "s"}
                {rangeLabel ? ` · ${rangeLabel}` : ""}.
                {toNum(data.walkInSpend) > 0
                  ? ` Another ${money(data.walkInSpend)} came from ${data.walkInSaleCount.toLocaleString("en-KE")} walk-ins without a name.`
                  : ""}
              </>
            )}
          </p>
        ) : (
          <p className="mb-5 max-w-[72ch] text-[15px] leading-relaxed text-white">
            Pick a period to rank shoppers by what they spent.
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-2">
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Sort shoppers"
              >
                {SORTS.map((item) => {
                  const selected = sortKey === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSortKey(item.key)}
                      className={cn(
                        "min-h-11 px-3 text-[13px] font-medium tracking-[-0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                        selected ? "bg-white" : "text-white hover:bg-white/10",
                      )}
                      style={selected ? { color: INK } : undefined}
                      aria-pressed={selected}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Filter by shopping pattern"
              >
                {COHORTS.map((item) => {
                  const selected = cohort === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setCohort(item.key)}
                      className={cn(
                        "min-h-10 px-3 text-[12px] font-medium tracking-[-0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                        selected ? "bg-white" : "text-white/90 hover:bg-white/10",
                      )}
                      style={
                        selected
                          ? { color: INK }
                          : { background: SLICE }
                      }
                      aria-pressed={selected}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <label className="relative block max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/70"
                  aria-hidden
                />
                <span className="sr-only">Search shoppers</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a name, C-number, or phone mask"
                  className="h-11 w-full border-0 bg-white/10 pl-10 pr-3 text-sm text-white placeholder:text-[#d7e3ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                />
              </label>
            </div>

            {filtered.length === 0 ? (
              <WhiteCard className="px-5 py-10">
                <p
                  className="max-w-[65ch] text-[15px] leading-relaxed"
                  style={{ color: INK }}
                >
                  {data && (data.rows?.length ?? 0) > 0
                    ? "No shopper matches that search or filter. Clear it to see the full ranking."
                    : "Till sales with a customer name rank here. Lipa Na M-Pesa payers appear once a receipt is matched to a person."}
                </p>
              </WhiteCard>
            ) : (
              <>
                {podium.length > 0 ? (
                  <ol className="grid gap-3 md:grid-cols-3">
                    {podium.map((row, index) => {
                      const lead = index === 0;
                      return (
                        <li key={row.customerId}>
                          <Link
                            href={`${APP_ROUTES.customers}/${encodeURIComponent(row.customerId)}`}
                            className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          >
                            <WhiteCard
                              className={cn(
                                "flex h-full flex-col justify-between px-4 py-4",
                                lead ? "min-h-[9.5rem]" : "min-h-[8rem]",
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <p
                                  className={cn(
                                    "tabular-nums font-bold tracking-[-0.03em]",
                                    lead ? "text-[2rem] leading-none" : "text-[1.5rem] leading-none",
                                  )}
                                  style={{ color: INK }}
                                >
                                  {index + 1}
                                </p>
                                <div className="min-w-0">
                                  <p
                                    className={cn(
                                      "font-bold tracking-[-0.03em]",
                                      lead
                                        ? "text-[1.45rem] leading-tight"
                                        : "text-[1.2rem] leading-tight",
                                    )}
                                    style={{ color: INK }}
                                  >
                                    {row.name}
                                  </p>
                                  <p
                                    className="mt-1 text-[1.35rem] font-bold tabular-nums tracking-[-0.03em]"
                                    style={{ color: INK }}
                                  >
                                    {money(row.spend)}
                                  </p>
                                  <p
                                    className="mt-1 text-[12px]"
                                    style={{ color: MUTED }}
                                  >
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
                          </Link>
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
                      return (
                        <li
                          key={row.customerId}
                          className="border-b border-[#eef1f4] last:border-0"
                        >
                          <Link
                            href={`${APP_ROUTES.customers}/${encodeURIComponent(row.customerId)}`}
                            className="grid gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-[#f4f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0c3a66] sm:grid-cols-[2.25rem_minmax(0,1fr)_auto]"
                          >
                            <p
                              className="text-[13px] font-semibold tabular-nums"
                              style={{ color: MUTED }}
                            >
                              {index + 1}
                            </p>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <p
                                  className="truncate text-[15px] font-semibold tracking-[-0.02em]"
                                  style={{ color: INK }}
                                >
                                  {row.name}
                                </p>
                                {no ? (
                                  <span
                                    className="text-[12px] tabular-nums"
                                    style={{ color: MUTED }}
                                  >
                                    {no}
                                  </span>
                                ) : null}
                                {row.maskedHint ? (
                                  <span
                                    className="text-[12px] tabular-nums"
                                    style={{ color: MUTED }}
                                  >
                                    {row.maskedHint}
                                  </span>
                                ) : null}
                                {row.origin === "mpesa_inferred" &&
                                !row.phoneVerified ? (
                                  <span
                                    className="text-[11px] font-medium"
                                    style={{ color: MUTED }}
                                  >
                                    Unverified number
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-2 h-2 w-full max-w-md bg-[#d5deea]">
                                <div
                                  className="h-2 origin-left motion-reduce:transition-none"
                                  style={{
                                    width: "100%",
                                    transform: `scaleX(${pct / 100})`,
                                    background: index === 0 ? BAR_LEAD : BAR,
                                    boxShadow:
                                      "1px 2px 4px rgba(7, 30, 54, 0.22)",
                                    transition: `transform 220ms ${EASE}`,
                                  }}
                                />
                              </div>
                              <p
                                className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] leading-snug"
                                style={{ color: MUTED }}
                              >
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
                              <p
                                className="text-[1.15rem] font-bold tabular-nums tracking-[-0.03em]"
                                style={{ color: INK }}
                              >
                                {moneyFull(row.spend)}
                              </p>
                              <p
                                className="text-[11px] tabular-nums"
                                style={{ color: MUTED }}
                              >
                                {toNum(row.sharePct).toLocaleString("en-KE", {
                                  maximumFractionDigits: 1,
                                })}
                                % of named spend
                              </p>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  {data?.truncated && cohort === "all" && !query.trim() ? (
                    <p
                      className="border-t px-4 py-3 text-[12px]"
                      style={{ color: MUTED, borderColor: "#d5deea" }}
                    >
                      Showing the top spenders in this window. Narrow the period
                      if you need a smaller book.
                    </p>
                  ) : null}
                </WhiteCard>
              </>
            )}
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-3 lg:self-start">
            <section
              className="overflow-hidden rounded-none"
              style={{ background: NAVY_DEEP }}
            >
              <h2 className="px-3 pt-3 pb-2 text-[13px] font-semibold tracking-[-0.02em] text-white">
                Period
              </h2>
              <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto px-3 pb-3">
                {ANALYTICS_PRESET_LABELS.map((item) => {
                  const selected = preset === item.key;
                  return (
                    <label key={item.key} className="block">
                      <input
                        type="radio"
                        name="shopper-period"
                        className="peer sr-only"
                        checked={selected}
                        onChange={() => setPreset(item.key)}
                      />
                      <span
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center justify-center px-3 py-2 text-center text-[13px] font-medium tracking-[-0.02em] transition-colors duration-150",
                          "peer-focus-visible:ring-2 peer-focus-visible:ring-white peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#071e36]",
                          selected
                            ? "bg-white"
                            : "text-white hover:bg-white/10",
                        )}
                        style={
                          selected
                            ? { color: INK }
                            : { background: SLICE, color: "#fff" }
                        }
                      >
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            {preset === "custom" ? (
              <div className="space-y-2 text-[12px] text-white">
                <label className="flex flex-col gap-1">
                  From
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-11 rounded-none border-0 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    style={{ color: INK }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  To
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-11 rounded-none border-0 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    style={{ color: INK }}
                  />
                </label>
              </div>
            ) : null}

            <section
              className="overflow-hidden rounded-none"
              style={{ background: NAVY_DEEP }}
            >
              <h2 className="px-3 pt-3 pb-2 text-[13px] font-semibold tracking-[-0.02em] text-white">
                Branch
              </h2>
              <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto px-3 pb-3">
                {(branchLocked
                  ? branches.map((b) => ({ id: b.id, label: b.name }))
                  : [
                      { id: "", label: "All branches" },
                      ...branches.map((b) => ({ id: b.id, label: b.name })),
                    ]
                ).map((item) => {
                  const selected = branchId === item.id;
                  return (
                    <label key={item.id || "all-branches"} className="block">
                      <input
                        type="radio"
                        name="shopper-branch"
                        className="peer sr-only"
                        checked={selected}
                        onChange={() => onChangeBranch(item.id)}
                      />
                      <span
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center justify-center px-3 py-2 text-center text-[13px] font-medium tracking-[-0.02em] transition-colors duration-150",
                          "peer-focus-visible:ring-2 peer-focus-visible:ring-white peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#071e36]",
                          selected
                            ? "bg-white"
                            : "text-white hover:bg-white/10",
                        )}
                        style={
                          selected
                            ? { color: INK }
                            : { background: SLICE, color: "#fff" }
                        }
                      >
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
