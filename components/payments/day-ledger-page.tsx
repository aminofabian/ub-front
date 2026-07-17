"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import {
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSessionBranch } from "@/hooks/use-session-scope";
import {
  fetchPaymentLedger,
  type PaymentLedgerRow,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import {
  getMark,
  loadPaymentLedgerMarks,
  savePaymentLedgerMarks,
  type PaymentLedgerMark,
  type PaymentLedgerMarksMap,
} from "@/lib/payment-ledger-marks";
import {
  formatPaymentMethodLabel,
  salePaymentCategories,
} from "@/lib/sale-payment-filter";
import { cn } from "@/lib/utils";

type MarkFilter = "all" | "unreviewed" | "flagged" | "reviewed";

type MethodChipId = "cash" | "mpesa" | "card" | "credit" | "wallet" | "loyalty";

const METHOD_CHIPS: { id: MethodChipId; label: string; short: string }[] = [
  { id: "cash", label: "Cash", short: "Cash" },
  { id: "mpesa", label: "M-Pesa", short: "M-Pesa" },
  { id: "card", label: "Card", short: "Card" },
  { id: "credit", label: "Credit", short: "Credit" },
  { id: "wallet", label: "Wallet", short: "Wallet" },
  { id: "loyalty", label: "Loyalty", short: "Loyalty" },
];

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function fmtKes(n: number | string | null | undefined): string {
  const v = toNum(n);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

/** Compact amount without currency symbol for dense rows. */
function fmtAmt(n: number | string | null | undefined): string {
  const v = toNum(n);
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDayShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  const today = todayIsoLocal();
  if (iso === today) return "Today";
  if (iso === shiftDay(today, -1)) return "Yesterday";
  return dt.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function hourBucketLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleTimeString("en-KE", { hour: "numeric" })
    .replace(/\s+/g, " ");
}

function hourKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
}

function methodAccent(method: string): { bar: string; chip: string } {
  const cats = salePaymentCategories(method, method);
  if (cats.has("cash")) {
    return { bar: "bg-emerald-600", chip: "text-emerald-800 bg-emerald-50" };
  }
  if (cats.has("mpesa")) {
    return { bar: "bg-teal-600", chip: "text-teal-800 bg-teal-50" };
  }
  if (cats.has("credit")) {
    return { bar: "bg-amber-600", chip: "text-amber-900 bg-amber-50" };
  }
  if (cats.has("wallet")) {
    return { bar: "bg-sky-600", chip: "text-sky-900 bg-sky-50" };
  }
  if (cats.has("loyalty")) {
    return { bar: "bg-rose-600", chip: "text-rose-900 bg-rose-50" };
  }
  if (method.toLowerCase().includes("card")) {
    return { bar: "bg-slate-600", chip: "text-slate-800 bg-slate-100" };
  }
  return { bar: "bg-stone-500", chip: "text-stone-800 bg-stone-100" };
}

function matchesMethodChip(method: string, chip: MethodChipId): boolean {
  if (chip === "card") {
    return method.trim().toLowerCase() === "card";
  }
  return salePaymentCategories(method, method).has(chip);
}

function receiptLabel(row: PaymentLedgerRow): string {
  if (row.receiptNo != null) return `#${row.receiptNo}`;
  const id = row.saleId.trim();
  return id.length <= 8 ? id.toUpperCase() : id.slice(-8).toUpperCase();
}

function rowSearchBlob(row: PaymentLedgerRow): string {
  return [
    row.method,
    row.reference ?? "",
    row.cashierName,
    row.customerName,
    receiptLabel(row),
    String(row.amount),
  ]
    .join(" ")
    .toLowerCase();
}

function methodFilterValue(chip: MethodChipId): string {
  if (chip === "mpesa") return "mpesa_manual";
  if (chip === "credit") return "customer_credit";
  if (chip === "wallet") return "customer_wallet";
  if (chip === "loyalty") return "loyalty_redeem";
  return chip;
}

export function DayLedgerPage() {
  const { business, canViewSalesIntelligence } = useDashboard();
  const { branchId } = useSessionBranch();
  const businessId = business?.id?.trim() || "default";
  const allowed = canViewSalesIntelligence;

  const [day, setDay] = useState(todayIsoLocal);
  const [rows, setRows] = useState<PaymentLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [methodFilters, setMethodFilters] = useState<Set<MethodChipId>>(
    () => new Set(),
  );
  const [markFilter, setMarkFilter] = useState<MarkFilter>("all");
  const [search, setSearch] = useState("");
  const [marks, setMarks] = useState<PaymentLedgerMarksMap>({});
  const [noteDraftId, setNoteDraftId] = useState<string | null>(null);

  useEffect(() => {
    setMarks(loadPaymentLedgerMarks(businessId, day));
  }, [businessId, day]);

  const persistMarks = useCallback(
    (next: PaymentLedgerMarksMap) => {
      setMarks(next);
      savePaymentLedgerMarks(businessId, day, next);
    },
    [businessId, day],
  );

  const patchMark = useCallback(
    (paymentId: string, patch: Partial<PaymentLedgerMark>) => {
      const current = getMark(marks, paymentId);
      const nextMark = { ...current, ...patch };
      const next = { ...marks };
      if (!nextMark.reviewed && !nextMark.flagged && !nextMark.note.trim()) {
        delete next[paymentId];
      } else {
        next[paymentId] = nextMark;
      }
      persistMarks(next);
    },
    [marks, persistMarks],
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!allowed) return;
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const data = await fetchPaymentLedger(
          day,
          day,
          branchId.trim() || undefined,
        );
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load payments.");
        if (!silent) setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [allowed, branchId, day],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const chipTotals = useMemo(() => {
    const out: Record<MethodChipId, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      mpesa: { count: 0, total: 0 },
      card: { count: 0, total: 0 },
      credit: { count: 0, total: 0 },
      wallet: { count: 0, total: 0 },
      loyalty: { count: 0, total: 0 },
    };
    for (const row of rows) {
      for (const chip of METHOD_CHIPS) {
        if (matchesMethodChip(row.method, chip.id)) {
          out[chip.id].count += 1;
          out[chip.id].total += toNum(row.amount);
        }
      }
    }
    return out;
  }, [rows]);

  const grandTotal = useMemo(
    () => rows.reduce((sum, r) => sum + toNum(r.amount), 0),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (methodFilters.size > 0) {
        let hit = false;
        for (const chip of methodFilters) {
          if (matchesMethodChip(row.method, chip)) {
            hit = true;
            break;
          }
        }
        if (!hit) return false;
      }
      const mark = getMark(marks, row.paymentId);
      if (markFilter === "unreviewed" && mark.reviewed) return false;
      if (markFilter === "reviewed" && !mark.reviewed) return false;
      if (markFilter === "flagged" && !mark.flagged) return false;
      if (q && !rowSearchBlob(row).includes(q)) return false;
      return true;
    });
  }, [rows, methodFilters, markFilter, marks, search]);

  const reviewedCount = useMemo(() => {
    let n = 0;
    for (const row of rows) {
      if (getMark(marks, row.paymentId).reviewed) n += 1;
    }
    return n;
  }, [rows, marks]);

  const flaggedCount = useMemo(() => {
    let n = 0;
    for (const row of rows) {
      if (getMark(marks, row.paymentId).flagged) n += 1;
    }
    return n;
  }, [rows, marks]);

  const hourGroups = useMemo(() => {
    const groups: { key: string; label: string; rows: PaymentLedgerRow[] }[] =
      [];
    const index = new Map<string, number>();
    for (const row of filtered) {
      const key = hourKey(row.soldAt);
      let i = index.get(key);
      if (i == null) {
        i = groups.length;
        index.set(key, i);
        groups.push({ key, label: hourBucketLabel(row.soldAt), rows: [] });
      }
      groups[i]!.rows.push(row);
    }
    return groups;
  }, [filtered]);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, r) => sum + toNum(r.amount), 0),
    [filtered],
  );

  const visibleChips = useMemo(
    () => METHOD_CHIPS.filter((c) => chipTotals[c.id].count > 0),
    [chipTotals],
  );

  const toggleMethod = (id: MethodChipId) => {
    setMethodFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markAllVisibleReviewed = () => {
    const next = { ...marks };
    for (const row of filtered) {
      const cur = getMark(next, row.paymentId);
      next[row.paymentId] = { ...cur, reviewed: true };
    }
    persistMarks(next);
  };

  if (!allowed) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 pb-16">
        <DashboardFeedback
          kind="warning"
          text="You need sales intelligence access to view the day payment ledger."
        />
      </div>
    );
  }

  const isToday = day === todayIsoLocal();
  const progress =
    rows.length === 0 ? 0 : Math.round((reviewedCount / rows.length) * 100);
  const openCount = rows.length - reviewedCount;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-3 pb-16">
      {/* Compact header + day nav */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Day ledger
            </h1>
            <span className="text-xs tabular-nums text-muted-foreground">
              {rows.length} · {fmtKes(grandTotal)}
            </span>
          </div>
          <ActiveScopeSubtitle className="text-[11px] text-muted-foreground" />
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setDay((d) => shiftDay(d, -1))}
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <label className="relative">
            <span className="sr-only">Pick day</span>
            <input
              type="date"
              value={day}
              max={todayIsoLocal()}
              onChange={(e) => {
                const v = e.target.value;
                if (v) setDay(v);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            <span className="inline-flex min-w-[7.5rem] items-center justify-center rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-sm font-semibold tabular-nums">
              {formatDayShort(day)}
            </span>
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={isToday}
            onClick={() => setDay((d) => shiftDay(d, 1))}
            aria-label="Next day"
          >
            <ChevronRight className="size-4" />
          </Button>
          {!isToday ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setDay(todayIsoLocal())}
            >
              Today
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => void load({ silent: true })}
            disabled={refreshing || loading}
            aria-label="Refresh"
          >
            {refreshing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
          </Button>
        </div>
      </header>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {/* Method pills — only methods with activity */}
      {visibleChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {visibleChips.map((chip) => {
            const stats = chipTotals[chip.id];
            const selected = methodFilters.has(chip.id);
            const accent = methodAccent(methodFilterValue(chip.id));
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => toggleMethod(chip.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/70 bg-card text-foreground hover:border-foreground/25",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    selected ? "bg-background/80" : accent.bar,
                  )}
                  aria-hidden
                />
                <span className="font-medium">{chip.short}</span>
                <span
                  className={cn(
                    "tabular-nums",
                    selected ? "text-background/75" : "text-muted-foreground",
                  )}
                >
                  {fmtAmt(stats.total)}
                  <span className="opacity-60"> · {stats.count}</span>
                </span>
              </button>
            );
          })}
          {methodFilters.size > 0 ? (
            <button
              type="button"
              className="px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => setMethodFilters(new Set())}
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Toolbar: progress + search + status filters */}
      <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card px-2.5 py-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-[4.5rem] shrink-0">
            <p className="text-[10px] font-medium tabular-nums text-muted-foreground">
              {reviewedCount}/{rows.length}
              {flaggedCount > 0 ? (
                <span className="text-amber-700"> · {flaggedCount}⚑</span>
              ) : null}
            </p>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-600 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Receipt, cashier, ref…"
              className={cn(
                dashboardInputClass(),
                "h-8 border-border/50 py-1 pl-7 text-xs",
              )}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              ["all", "All"],
              ["unreviewed", `Open${openCount > 0 ? ` ${openCount}` : ""}`],
              ["reviewed", "Done"],
              ["flagged", "Flagged"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMarkFilter(id)}
              className={cn(
                "rounded px-2 py-1 text-[11px] font-medium transition-colors",
                markFilter === id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={markAllVisibleReviewed}
            className="ml-0.5 rounded px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-40"
          >
            Mark all
          </button>
        </div>
      </div>

      {/* Dense tender list */}
      <section className={DASHBOARD_TABLE_SURFACE}>
        <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-1.5">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">
              {filtered.length}
            </span>
            {filtered.length !== rows.length ? ` / ${rows.length}` : ""}{" "}
            payments · {fmtKes(filteredTotal)}
          </p>
          <Link
            href={APP_ROUTES.salesTransactions}
            className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
          >
            Transactions
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No payments</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {rows.length === 0
                ? "Nothing recorded for this day yet."
                : "Clear filters to see more."}
            </p>
          </div>
        ) : (
          <div>
            {hourGroups.map((group) => {
              const hourTotal = group.rows.reduce(
                (s, r) => s + toNum(r.amount),
                0,
              );
              return (
                <div key={group.key}>
                  <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 bg-muted/80 px-3 py-1 backdrop-blur-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {group.label}
                    </p>
                    <p className="text-[10px] tabular-nums text-muted-foreground">
                      {group.rows.length} · {fmtAmt(hourTotal)}
                    </p>
                  </div>
                  <ul>
                    {group.rows.map((row) => {
                      const mark = getMark(marks, row.paymentId);
                      const accent = methodAccent(row.method);
                      const refunded = (row.status ?? "")
                        .toLowerCase()
                        .includes("refund");
                      const noteOpen = noteDraftId === row.paymentId;
                      const meta = [
                        receiptLabel(row),
                        row.cashierName?.trim() || null,
                        row.customerName?.trim() || null,
                        row.reference?.trim()
                          ? `ref ${row.reference.trim()}`
                          : null,
                        toNum(row.saleGrandTotal) !== toNum(row.amount)
                          ? `of ${fmtAmt(row.saleGrandTotal)}`
                          : null,
                      ].filter(Boolean);

                      return (
                        <li
                          key={row.paymentId}
                          className={cn(
                            "group relative border-b border-border/30 last:border-0",
                            mark.reviewed && "bg-emerald-50/35",
                            mark.flagged && !mark.reviewed && "bg-amber-50/40",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0 bottom-0 left-0 w-[2px]",
                              accent.bar,
                            )}
                            aria-hidden
                          />
                          <div className="flex items-center gap-2 py-1.5 pr-2 pl-2.5 sm:gap-2.5 sm:pr-3 sm:pl-3">
                            <button
                              type="button"
                              onClick={() =>
                                patchMark(row.paymentId, {
                                  reviewed: !mark.reviewed,
                                })
                              }
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                                mark.reviewed
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-border/80 bg-background text-transparent hover:border-emerald-600/70",
                              )}
                              aria-label={
                                mark.reviewed
                                  ? "Mark as not reviewed"
                                  : "Mark as reviewed"
                              }
                              aria-pressed={mark.reviewed}
                            >
                              <Check className="size-3" strokeWidth={3} />
                            </button>

                            <span className="w-[4.25rem] shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                              {formatTime(row.soldAt)}
                            </span>

                            <span
                              className={cn(
                                "w-[5.5rem] shrink-0 text-right text-sm font-semibold tabular-nums tracking-tight sm:w-[6.25rem] sm:text-[15px]",
                                mark.reviewed
                                  ? "text-foreground/45 line-through decoration-foreground/20"
                                  : "text-foreground",
                              )}
                            >
                              {fmtAmt(row.amount)}
                            </span>

                            <span
                              className={cn(
                                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                accent.chip,
                              )}
                            >
                              {formatPaymentMethodLabel(row.method)}
                            </span>

                            {refunded ? (
                              <span className="shrink-0 rounded bg-destructive/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-destructive">
                                Refund
                              </span>
                            ) : null}

                            <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                              {meta.join(" · ")}
                            </p>

                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setNoteDraftId(
                                    noteOpen ? null : row.paymentId,
                                  )
                                }
                                className={cn(
                                  "rounded px-1 py-0.5 text-[10px] font-medium transition-colors",
                                  mark.note || noteOpen
                                    ? "text-foreground"
                                    : "text-transparent group-hover:text-muted-foreground hover:!text-foreground",
                                )}
                              >
                                Note
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  patchMark(row.paymentId, {
                                    flagged: !mark.flagged,
                                  })
                                }
                                className={cn(
                                  "flex size-6 items-center justify-center rounded transition-colors",
                                  mark.flagged
                                    ? "text-amber-700"
                                    : "text-muted-foreground/35 hover:text-amber-700",
                                )}
                                aria-label={
                                  mark.flagged
                                    ? "Remove flag"
                                    : "Flag for follow-up"
                                }
                                aria-pressed={mark.flagged}
                              >
                                <Flag
                                  className="size-3"
                                  fill={mark.flagged ? "currentColor" : "none"}
                                />
                              </button>
                            </div>
                          </div>

                          {noteOpen || mark.note ? (
                            <div className="border-t border-border/20 bg-muted/20 px-3 py-1.5 pl-9">
                              {noteOpen ? (
                                <input
                                  autoFocus
                                  type="text"
                                  value={mark.note}
                                  placeholder="Note…"
                                  onChange={(e) =>
                                    patchMark(row.paymentId, {
                                      note: e.target.value,
                                    })
                                  }
                                  onBlur={() => setNoteDraftId(null)}
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === "Enter" ||
                                      e.key === "Escape"
                                    ) {
                                      setNoteDraftId(null);
                                    }
                                  }}
                                  className={cn(
                                    dashboardInputClass(),
                                    "h-7 py-1 text-xs",
                                  )}
                                />
                              ) : (
                                <button
                                  type="button"
                                  className="w-full text-left text-[11px] text-muted-foreground italic hover:text-foreground"
                                  onClick={() => setNoteDraftId(row.paymentId)}
                                >
                                  {mark.note}
                                </button>
                              )}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
