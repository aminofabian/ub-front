"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import {
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { OneOffExpenseDrawer } from "@/components/payments/one-off-expense-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSessionBranch } from "@/hooks/use-session-scope";
import {
  fetchFinancePulse,
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

const METHOD_CHIPS: {
  id: MethodChipId;
  label: string;
  short: string;
  bar: string;
  chip: string;
}[] = [
  {
    id: "cash",
    label: "Cash",
    short: "Cash",
    bar: "bg-emerald-600",
    chip: "text-emerald-800 bg-emerald-50",
  },
  {
    id: "mpesa",
    label: "M-Pesa",
    short: "M-Pesa",
    bar: "bg-teal-600",
    chip: "text-teal-800 bg-teal-50",
  },
  {
    id: "credit",
    label: "Credit",
    short: "Credit",
    bar: "bg-amber-600",
    chip: "text-amber-900 bg-amber-50",
  },
  {
    id: "card",
    label: "Card",
    short: "Card",
    bar: "bg-slate-600",
    chip: "text-slate-800 bg-slate-100",
  },
  {
    id: "wallet",
    label: "Wallet",
    short: "Wallet",
    bar: "bg-sky-600",
    chip: "text-sky-900 bg-sky-50",
  },
  {
    id: "loyalty",
    label: "Loyalty",
    short: "Loyalty",
    bar: "bg-rose-600",
    chip: "text-rose-900 bg-rose-50",
  },
];

/** Primary filters the user asked for — always shown when present. */
const PRIMARY_CHIPS: MethodChipId[] = ["cash", "mpesa", "credit"];

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

function fmtAmt(n: number | string | null | undefined): string {
  const v = toNum(n);
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function pctOf(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
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
  for (const chip of METHOD_CHIPS) {
    if (chip.id === "card") {
      if (method.trim().toLowerCase() === "card") {
        return { bar: chip.bar, chip: chip.chip };
      }
      continue;
    }
    if (cats.has(chip.id)) {
      return { bar: chip.bar, chip: chip.chip };
    }
  }
  return { bar: "bg-stone-500", chip: "text-stone-800 bg-stone-100" };
}

function matchesMethodChip(method: string, chip: MethodChipId): boolean {
  if (chip === "card") {
    return method.trim().toLowerCase() === "card";
  }
  return salePaymentCategories(method, method).has(chip);
}

function isMpesaRow(row: PaymentLedgerRow): boolean {
  return matchesMethodChip(row.method, "mpesa");
}

function isMpesaVerified(row: PaymentLedgerRow): boolean {
  return Boolean(row.mpesaVerified);
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

export function DayLedgerPage() {
  const {
    business,
    branches,
    canViewSalesIntelligence,
    canReadFinanceExpenses,
    canWriteFinanceExpenses,
  } = useDashboard();
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
  const [showUnverifiedList, setShowUnverifiedList] = useState(false);
  const [expensesTotal, setExpensesTotal] = useState<number | null>(null);
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [expenseFeedback, setExpenseFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setMarks(loadPaymentLedgerMarks(businessId, day));
    setShowUnverifiedList(false);
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
        const [data, pulse] = await Promise.all([
          fetchPaymentLedger(day, day, branchId.trim() || undefined),
          canReadFinanceExpenses
            ? fetchFinancePulse(day, branchId.trim() || undefined).catch(() => null)
            : Promise.resolve(null),
        ]);
        setRows(Array.isArray(data) ? data : []);
        setExpensesTotal(pulse ? Number(pulse.expensesTotal) : null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load payments.");
        if (!silent) setRows([]);
        setExpensesTotal(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [allowed, branchId, day, canReadFinanceExpenses],
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

  const mpesaRows = useMemo(() => rows.filter(isMpesaRow), [rows]);
  const unverifiedMpesa = useMemo(
    () => mpesaRows.filter((r) => !isMpesaVerified(r)),
    [mpesaRows],
  );
  const unverifiedMpesaTotal = useMemo(
    () => unverifiedMpesa.reduce((s, r) => s + toNum(r.amount), 0),
    [unverifiedMpesa],
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

  const mixChips = useMemo(() => {
    const primary = METHOD_CHIPS.filter(
      (c) => PRIMARY_CHIPS.includes(c.id) && chipTotals[c.id].count > 0,
    );
    const rest = METHOD_CHIPS.filter(
      (c) => !PRIMARY_CHIPS.includes(c.id) && chipTotals[c.id].count > 0,
    );
    return [...primary, ...rest];
  }, [chipTotals]);

  const toggleMethod = (id: MethodChipId) => {
    setMethodFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectOnlyMethod = (id: MethodChipId) => {
    setMethodFilters(new Set([id]));
    if (id === "mpesa" && unverifiedMpesa.length > 0) {
      setShowUnverifiedList(true);
    }
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
      {expenseFeedback ? (
        <DashboardFeedback kind={expenseFeedback.kind} text={expenseFeedback.text} />
      ) : null}

      {canReadFinanceExpenses && expensesTotal != null && expensesTotal > 0 ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-sm">
          <div>
            <p className="text-sm font-medium">Expenses recorded today</p>
            <p className="text-xs text-muted-foreground">
              {fmtKes(expensesTotal)} posted to finance — rent, bills, and petty cash.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={`${APP_ROUTES.fixedCosts}?tab=history`}>View expenses</Link>
            </Button>
            {canWriteFinanceExpenses ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setExpenseDrawerOpen(true)}
              >
                <Plus className="mr-1.5 size-3.5" aria-hidden />
                Record expense
              </Button>
            ) : null}
          </div>
        </section>
      ) : canWriteFinanceExpenses ? (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setExpenseDrawerOpen(true)}>
            <Plus className="mr-1.5 size-3.5" aria-hidden />
            Record expense
          </Button>
        </div>
      ) : null}

      {/* Ledger mix — share of day by tender */}
      {rows.length > 0 ? (
        <section className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Tender mix
            </p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {fmtKes(grandTotal)} total
            </p>
          </div>

          <div
            className="flex h-2.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label="Payment method mix"
          >
            {mixChips.map((chip) => {
              const share = pctOf(chipTotals[chip.id].total, grandTotal);
              if (share <= 0) return null;
              return (
                <button
                  key={chip.id}
                  type="button"
                  title={`${chip.label} ${share}%`}
                  onClick={() => selectOnlyMethod(chip.id)}
                  className={cn(
                    "h-full min-w-[2px] transition-opacity hover:opacity-90",
                    chip.bar,
                    methodFilters.size > 0 &&
                      !methodFilters.has(chip.id) &&
                      "opacity-30",
                  )}
                  style={{ width: `${share}%` }}
                />
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PRIMARY_CHIPS.map((id) => {
              const chip = METHOD_CHIPS.find((c) => c.id === id)!;
              const stats = chipTotals[id];
              const share = pctOf(stats.total, grandTotal);
              const selected = methodFilters.has(id);
              const inactive =
                methodFilters.size > 0 && !selected && stats.count === 0;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={stats.count === 0}
                  onClick={() => toggleMethod(id)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors",
                    stats.count === 0
                      ? "cursor-not-allowed border-border/40 bg-muted/30 opacity-50"
                      : selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/70 bg-background hover:border-foreground/30",
                    inactive && "opacity-60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          selected ? "bg-background/80" : chip.bar,
                        )}
                        aria-hidden
                      />
                      {chip.label}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        selected ? "text-background" : "text-foreground",
                      )}
                    >
                      {share}%
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-[11px] tabular-nums",
                      selected ? "text-background/75" : "text-muted-foreground",
                    )}
                  >
                    {fmtKes(stats.total)} · {stats.count} payment
                    {stats.count === 1 ? "" : "s"}
                  </p>
                  {id === "mpesa" && stats.count > 0 ? (
                    <p
                      className={cn(
                        "mt-1.5 text-[11px] font-medium",
                        selected
                          ? unverifiedMpesa.length > 0
                            ? "text-amber-200"
                            : "text-emerald-200"
                          : unverifiedMpesa.length > 0
                            ? "text-amber-800"
                            : "text-emerald-800",
                      )}
                    >
                      {unverifiedMpesa.length === 0
                        ? `${mpesaRows.length} verified`
                        : `${unverifiedMpesa.length} of ${mpesaRows.length} unverified`}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Secondary methods */}
          {METHOD_CHIPS.some(
            (c) => !PRIMARY_CHIPS.includes(c.id) && chipTotals[c.id].count > 0,
          ) ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {METHOD_CHIPS.filter(
                (c) =>
                  !PRIMARY_CHIPS.includes(c.id) && chipTotals[c.id].count > 0,
              ).map((chip) => {
                const stats = chipTotals[chip.id];
                const share = pctOf(stats.total, grandTotal);
                const selected = methodFilters.has(chip.id);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => toggleMethod(chip.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/70 bg-background text-foreground hover:border-foreground/25",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        selected ? "bg-background/80" : chip.bar,
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
                      {share}% · {fmtAmt(stats.total)}
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
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : methodFilters.size > 0 ? (
            <div className="mt-2">
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => setMethodFilters(new Set())}
              >
                Clear filters
              </button>
            </div>
          ) : null}

          {/* Unverified M-Pesa reveal */}
          {mpesaRows.length > 0 ? (
            <div className="mt-3 border-t border-border/50 pt-3">
              <button
                type="button"
                onClick={() => {
                  if (unverifiedMpesa.length === 0) return;
                  setShowUnverifiedList((v) => !v);
                  if (!methodFilters.has("mpesa")) {
                    setMethodFilters(new Set(["mpesa"]));
                  }
                }}
                disabled={unverifiedMpesa.length === 0}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                  unverifiedMpesa.length === 0
                    ? "cursor-default border-emerald-200/80 bg-emerald-50/60"
                    : "border-amber-200 bg-amber-50/70 hover:bg-amber-50",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {unverifiedMpesa.length === 0 ? (
                    <ShieldCheck className="size-4 shrink-0 text-emerald-700" />
                  ) : (
                    <ShieldAlert className="size-4 shrink-0 text-amber-700" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {unverifiedMpesa.length === 0
                        ? "All M-Pesa payments verified"
                        : `${unverifiedMpesa.length} unverified M-Pesa payment${unverifiedMpesa.length === 1 ? "" : "s"}`}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {unverifiedMpesa.length === 0
                        ? "Gateway receipt on every M-Pesa tender today."
                        : `${fmtKes(unverifiedMpesaTotal)} without gateway verification — tap to list them.`}
                    </span>
                  </span>
                </span>
                {unverifiedMpesa.length > 0 ? (
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-amber-800 transition-transform",
                      showUnverifiedList && "rotate-180",
                    )}
                  />
                ) : null}
              </button>

              {showUnverifiedList && unverifiedMpesa.length > 0 ? (
                <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-amber-200/80 bg-background">
                  {unverifiedMpesa.map((row) => (
                    <li
                      key={row.paymentId}
                      className="flex items-center gap-2 border-b border-border/30 px-3 py-2 text-xs last:border-0"
                    >
                      <span className="w-[4.25rem] shrink-0 font-mono tabular-nums text-muted-foreground">
                        {formatTime(row.soldAt)}
                      </span>
                      <span className="w-[5.5rem] shrink-0 text-right font-semibold tabular-nums">
                        {fmtAmt(row.amount)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {[
                          receiptLabel(row),
                          row.cashierName?.trim() || null,
                          row.customerName?.trim() || null,
                          row.reference?.trim()
                            ? `ref ${row.reference.trim()}`
                            : "no ref",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 text-[11px] font-medium text-teal-800 hover:underline"
                        onClick={() => {
                          setMethodFilters(new Set(["mpesa"]));
                          setSearch(receiptLabel(row));
                          setShowUnverifiedList(false);
                        }}
                      >
                        Find
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
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
            {methodFilters.size > 0 ? (
              <span className="ml-1 text-foreground/70">
                ·{" "}
                {[...methodFilters]
                  .map(
                    (id) =>
                      METHOD_CHIPS.find((c) => c.id === id)?.short ?? id,
                  )
                  .join(", ")}
              </span>
            ) : null}
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
                      const mpesa = isMpesaRow(row);
                      const verified = mpesa && isMpesaVerified(row);
                      const unverified = mpesa && !isMpesaVerified(row);
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
                            unverified && !mark.reviewed && "bg-amber-50/25",
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

                            {verified ? (
                              <span
                                className="inline-flex shrink-0 items-center gap-0.5 rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-semibold uppercase text-emerald-800"
                                title="Gateway verified"
                              >
                                <ShieldCheck className="size-2.5" />
                                Verified
                              </span>
                            ) : null}
                            {unverified ? (
                              <span
                                className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase text-amber-900"
                                title="No gateway receipt"
                              >
                                <ShieldAlert className="size-2.5" />
                                Unverified
                              </span>
                            ) : null}

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

      <OneOffExpenseDrawer
        open={expenseDrawerOpen}
        onOpenChange={setExpenseDrawerOpen}
        expenseDate={day}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        canManage={canWriteFinanceExpenses}
        onSaved={() => {
          setExpenseFeedback({ kind: "success", text: "Expense recorded." });
          void load({ silent: true });
        }}
        onError={(text) => setExpenseFeedback({ kind: "error", text })}
      />
    </div>
  );
}
