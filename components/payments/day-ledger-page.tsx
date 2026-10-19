"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  Wallet,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { StatStrip } from "@/components/dashboard/stat-strip";
import {
  salesHair,
  salesInk,
  salesMute,
  salesPaper,
  salesSurface,
  SalesPeriodChip,
  salesToolBtnClass,
} from "@/components/sales/sales-surface";
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
}[] = [
  { id: "cash", label: "Cash", short: "Cash" },
  { id: "mpesa", label: "M-Pesa", short: "M-Pesa" },
  { id: "credit", label: "Credit", short: "Credit" },
  { id: "card", label: "Card", short: "Card" },
  { id: "wallet", label: "Wallet", short: "Wallet" },
  { id: "loyalty", label: "Loyalty", short: "Loyalty" },
];

/** Primary filters — always shown when present. */
const PRIMARY_CHIPS: MethodChipId[] = ["cash", "mpesa", "credit"];

const INK_RULE = salesHair;

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

function PulseCard({
  label,
  value,
  hint,
  tone,
  className,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ink" | "owed" | "warn";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <article
      className={cn(
        salesSurface,
        "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] p-3.5",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-semibold leading-none tracking-[-0.04em] tabular-nums",
          tone === "owed"
            ? "text-[#9a2e16]"
            : tone === "warn"
              ? "text-amber-900"
              : "text-foreground",
          value.length > 18 ? "text-[1.35rem]" : "text-[2.05rem]",
        )}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
      {hint ? (
        <p className={cn(dashboardHintClass(), "mt-2")}>{hint}</p>
      ) : null}
      {children}
    </article>
  );
}

function TenderMixBars({
  chips,
  totals,
  grand,
  methodFilters,
  onSelect,
}: {
  chips: typeof METHOD_CHIPS;
  totals: Record<MethodChipId, { count: number; total: number }>;
  grand: number;
  methodFilters: Set<MethodChipId>;
  onSelect: (id: MethodChipId) => void;
}) {
  return (
    <div
      className="mt-2 flex h-8 items-end gap-px"
      role="img"
      aria-label="Tender mix"
    >
      {chips.map((chip) => {
        const share = pctOf(totals[chip.id].total, grand);
        if (share <= 0) return null;
        const dim =
          methodFilters.size > 0 && !methodFilters.has(chip.id);
        return (
          <button
            key={chip.id}
            type="button"
            title={`${chip.label} ${share}%`}
            onClick={() => onSelect(chip.id)}
            className="min-w-0 flex-1 bg-[var(--pos-primary,#0f766e)] transition-opacity hover:opacity-90"
            style={{
              height: `${Math.max(18, share)}%`,
              opacity: dim ? 0.22 : 0.28 + (share / 100) * 0.72,
            }}
          />
        );
      })}
    </div>
  );
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
            ? fetchFinancePulse(day, branchId.trim() || undefined).catch(
                () => null,
              )
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
      <DashboardAccessDenied
        title="Day ledger"
        description="You need sales intelligence access to view the day payment ledger."
        backHref={APP_ROUTES.sales}
        backLabel="Sales"
      />
    );
  }

  const isToday = day === todayIsoLocal();
  const progress =
    rows.length === 0 ? 0 : Math.round((reviewedCount / rows.length) * 100);
  const openCount = rows.length - reviewedCount;

  const dayNav = (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        className={cn(salesToolBtnClass(), "size-8 justify-center px-0")}
        onClick={() => setDay((d) => shiftDay(d, -1))}
        aria-label="Previous day"
      >
        <ChevronLeft className="size-4" />
      </button>
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
        <span
          className={cn(
            salesToolBtnClass(true),
            "inline-flex min-w-[7.5rem] justify-center tabular-nums",
          )}
        >
          {formatDayShort(day)}
        </span>
      </label>
      <button
        type="button"
        className={cn(salesToolBtnClass(), "size-8 justify-center px-0")}
        disabled={isToday}
        onClick={() => setDay((d) => shiftDay(d, 1))}
        aria-label="Next day"
      >
        <ChevronRight className="size-4" />
      </button>
      {!isToday ? (
        <SalesPeriodChip active={false} onClick={() => setDay(todayIsoLocal())}>
          Today
        </SalesPeriodChip>
      ) : (
        <SalesPeriodChip active onClick={() => setDay(todayIsoLocal())}>
          Today
        </SalesPeriodChip>
      )}
    </div>
  );

  const dayPeriodStrip = (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-3.5",
        salesHair,
      )}
    >
      <div role="group" aria-label="Day">
        {dayNav}
      </div>
      {isToday ? (
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium",
            salesMute,
          )}
        >
          <span
            className="size-1.5 rounded-full bg-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Live day
        </span>
      ) : null}
    </div>
  );

  const pulse = (
    <div className="relative h-full min-h-[22rem] overflow-hidden">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M22 42 C 38 28, 58 22, 72 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M28 48 C 48 58, 62 52, 74 62"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M24 52 C 30 72, 48 78, 38 86"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <p
        className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
        aria-hidden
      >
        The day
      </p>

      {loading ? (
        <div className="absolute left-[8%] top-[26%] h-36 w-56 animate-pulse bg-white/80" />
      ) : rows.length === 0 ? (
        <p
          className={cn(
            dashboardHintClass(),
            "absolute left-[8%] top-[36%] max-w-[16rem]",
          )}
        >
          Nothing on the ledger for this day yet.
        </p>
      ) : (
        <>
          <PulseCard
            className="left-[8%] top-[24%]"
            label="Taken"
            value={fmtKes(grandTotal)}
            hint={`${rows.length} payment${rows.length === 1 ? "" : "s"} · ${formatDayShort(day)}`}
          >
            {mixChips.length > 0 ? (
              <TenderMixBars
                chips={mixChips}
                totals={chipTotals}
                grand={grandTotal}
                methodFilters={methodFilters}
                onSelect={selectOnlyMethod}
              />
            ) : null}
          </PulseCard>

          <PulseCard
            className="right-[7%] top-[14%] !w-[min(13.5rem,calc(100%-1.5rem))]"
            label="Reviewed"
            value={`${progress}%`}
            hint={
              flaggedCount > 0
                ? `${reviewedCount}/${rows.length} · ${flaggedCount} flagged`
                : `${reviewedCount} of ${rows.length} checked`
            }
          >
            <div className="mt-2 h-1.5 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              <div
                className="h-full bg-[var(--pos-primary,#0f766e)] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </PulseCard>

          {PRIMARY_CHIPS.map((id, index) => {
            const chip = METHOD_CHIPS.find((c) => c.id === id)!;
            const stats = chipTotals[id];
            if (stats.count === 0) return null;
            const share = pctOf(stats.total, grandTotal);
            const selected = methodFilters.has(id);
            const place =
              index === 0
                ? "right-[10%] top-[46%] !w-[min(13.5rem,calc(100%-1.5rem))]"
                : index === 1
                  ? "left-[12%] bottom-[10%] !w-[min(14rem,calc(100%-1.5rem))]"
                  : "right-[18%] bottom-[8%] !w-[min(13.5rem,calc(100%-1.5rem))]";
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleMethod(id)}
                className={cn(
                  salesSurface,
                  "absolute z-[1] p-3 text-left transition-colors",
                  place,
                  selected &&
                    "ring-[var(--pos-primary,#0f766e)] ring-1",
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {chip.label}
                </p>
                <p
                  className="mt-1.5 text-[1.35rem] font-semibold leading-none tracking-[-0.03em] tabular-nums"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {fmtKes(stats.total)}
                </p>
                <p className={cn(dashboardHintClass(), "mt-1.5")}>
                  {share}% · {stats.count} payment
                  {stats.count === 1 ? "" : "s"}
                  {id === "mpesa" && unverifiedMpesa.length > 0
                    ? ` · ${unverifiedMpesa.length} unverified`
                    : id === "mpesa"
                      ? " · verified"
                      : ""}
                </p>
              </button>
            );
          })}
        </>
      )}
    </div>
  );

  const feed = (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className={cn("shrink-0 space-y-2 border-b px-3 py-2 sm:px-3.5", salesHair)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              className={cn(
                "font-heading text-[15px] font-semibold tracking-[-0.02em]",
                salesInk,
              )}
            >
              Payments
            </h2>
            <p className={dashboardHintClass()}>
              {loading
                ? "Loading…"
                : `${filtered.length}${filtered.length !== rows.length ? ` / ${rows.length}` : ""} · ${fmtKes(filteredTotal)}`}
            </p>
          </div>
          <Link
            href={APP_ROUTES.salesTransactions}
            className="text-[11px] font-medium text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
          >
            Transactions
          </Link>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Receipt, cashier, ref…"
            className={cn(dashboardInputClass(), "h-8 py-1.5 pl-8 text-sm")}
            aria-label="Search payments"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["all", "All"],
              ["unreviewed", `Open${openCount > 0 ? ` ${openCount}` : ""}`],
              ["reviewed", "Done"],
              ["flagged", "Flagged"],
            ] as const
          ).map(([id, label]) => (
            <SalesPeriodChip
              key={id}
              active={markFilter === id}
              onClick={() => setMarkFilter(id)}
              className="!h-8 px-2.5 text-[11px]"
            >
              {label}
            </SalesPeriodChip>
          ))}
          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={markAllVisibleReviewed}
            className={cn(
              salesToolBtnClass(),
              "ml-auto disabled:opacity-40",
            )}
          >
            Mark all
          </button>
        </div>

        {mixChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {mixChips.map((chip) => {
              const selected = methodFilters.has(chip.id);
              return (
                <SalesPeriodChip
                  key={chip.id}
                  active={selected}
                  onClick={() => toggleMethod(chip.id)}
                  className="!h-8 px-2.5 text-[11px]"
                >
                  {chip.short}
                </SalesPeriodChip>
              );
            })}
            {methodFilters.size > 0 ? (
              <button
                type="button"
                className={salesToolBtnClass()}
                onClick={() => setMethodFilters(new Set())}
              >
                Clear
              </button>
            ) : null}
          </div>
        ) : null}

        {mpesaRows.length > 0 ? (
          <div>
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
                "flex w-full items-center justify-between gap-2 border px-2.5 py-1.5 text-left",
                INK_RULE,
                unverifiedMpesa.length === 0
                  ? "cursor-default bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]"
                  : "bg-[color-mix(in_srgb,#b45309_6%,white)] hover:bg-[color-mix(in_srgb,#b45309_10%,white)]",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                {unverifiedMpesa.length === 0 ? (
                  <ShieldCheck className="size-3.5 shrink-0 text-[var(--pos-primary,#0f766e)]" />
                ) : (
                  <ShieldAlert className="size-3.5 shrink-0 text-amber-800" />
                )}
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-foreground">
                    {unverifiedMpesa.length === 0
                      ? "All M-Pesa verified"
                      : `${unverifiedMpesa.length} unverified M-Pesa`}
                  </span>
                  <span className={cn(dashboardHintClass(), "block")}>
                    {unverifiedMpesa.length === 0
                      ? "Gateway receipt on every tender."
                      : `${fmtKes(unverifiedMpesaTotal)} without gateway check.`}
                  </span>
                </span>
              </span>
              {unverifiedMpesa.length > 0 ? (
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-amber-900 transition-transform",
                    showUnverifiedList && "rotate-180",
                  )}
                />
              ) : null}
            </button>

            {showUnverifiedList && unverifiedMpesa.length > 0 ? (
              <ul className={cn("mt-1 max-h-40 overflow-y-auto border", INK_RULE)}>
                {unverifiedMpesa.map((row) => (
                  <li
                    key={row.paymentId}
                    className={cn(
                      "flex items-center gap-2 border-b px-2.5 py-1.5 text-xs last:border-0",
                      INK_RULE,
                    )}
                  >
                    <span className="w-[4.25rem] shrink-0 tabular-nums text-muted-foreground">
                      {formatTime(row.soldAt)}
                    </span>
                    <span className="w-[5.5rem] shrink-0 text-right font-semibold tabular-nums">
                      {fmtAmt(row.amount)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {receiptLabel(row)}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-[11px] font-medium text-[var(--pos-primary,#0f766e)] hover:underline"
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No payments</p>
            <p className={cn(dashboardHintClass(), "mt-0.5")}>
              {rows.length === 0
                ? "Nothing recorded for this day yet."
                : "Clear filters to see more."}
            </p>
          </div>
        ) : (
          hourGroups.map((group) => {
            const hourTotal = group.rows.reduce(
              (s, r) => s + toNum(r.amount),
              0,
            );
            return (
              <div key={group.key}>
                <div
                  className={cn(
                    "sticky top-0 z-[1] flex items-center justify-between gap-2 border-b bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,#faf8f4)] px-3 py-1",
                    INK_RULE,
                  )}
                >
                  <p className="text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
                    {group.label}
                  </p>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {group.rows.length} · {fmtAmt(hourTotal)}
                  </p>
                </div>
                <ul>
                  {group.rows.map((row) => {
                    const mark = getMark(marks, row.paymentId);
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
                          "group border-b last:border-0",
                          INK_RULE,
                          mark.reviewed &&
                            "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)]",
                          mark.flagged &&
                            !mark.reviewed &&
                            "bg-[color-mix(in_srgb,#b45309_6%,white)]",
                          unverified &&
                            !mark.reviewed &&
                            "bg-[color-mix(in_srgb,#b45309_4%,white)]",
                        )}
                      >
                        <div className="flex items-center gap-2 py-1.5 pr-2 pl-2.5 sm:gap-2.5 sm:pr-3 sm:pl-3">
                          <button
                            type="button"
                            onClick={() =>
                              patchMark(row.paymentId, {
                                reviewed: !mark.reviewed,
                              })
                            }
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center border transition-colors",
                              mark.reviewed
                                ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                                : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)] bg-white text-transparent hover:border-[var(--pos-primary,#0f766e)]",
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

                          <span className="w-[4.25rem] shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            {formatTime(row.soldAt)}
                          </span>

                          <span
                            className={cn(
                              "w-[5.5rem] shrink-0 text-right text-sm font-semibold tabular-nums tracking-[-0.02em] sm:w-[6.25rem] sm:text-[15px]",
                              refunded
                                ? "text-[#9a2e16]"
                                : mark.reviewed
                                  ? "text-foreground/45 line-through decoration-foreground/20"
                                  : "text-foreground",
                            )}
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {fmtAmt(row.amount)}
                          </span>

                          <span
                            className={cn(
                              "shrink-0 border px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
                              INK_RULE,
                              "text-muted-foreground",
                            )}
                          >
                            {formatPaymentMethodLabel(row.method)}
                          </span>

                          {verified ? (
                            <span
                              className="inline-flex shrink-0 items-center gap-0.5 border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] px-1 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]"
                              title="Gateway verified"
                            >
                              <ShieldCheck className="size-2.5" />
                              Verified
                            </span>
                          ) : null}
                          {unverified ? (
                            <span
                              className="inline-flex shrink-0 items-center gap-0.5 border border-amber-700/30 px-1 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-amber-900"
                              title="No gateway receipt"
                            >
                              <ShieldAlert className="size-2.5" />
                              Unverified
                            </span>
                          ) : null}
                          {refunded ? (
                            <span className="shrink-0 border border-destructive/30 px-1 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-destructive">
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
                                "px-1 py-0.5 text-[10px] font-medium transition-colors",
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
                                "flex size-6 items-center justify-center transition-colors",
                                mark.flagged
                                  ? "text-amber-800"
                                  : "text-muted-foreground/35 hover:text-amber-800",
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
                          <div
                            className={cn(
                              "border-t bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-3 py-1.5 pl-9",
                              INK_RULE,
                            )}
                          >
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
          })
        )}
      </div>
    </div>
  );

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, salesPaper, "flex flex-col gap-1.5")}>
      <DashboardPageHero
        icon={Wallet}
        title="Day ledger"
        description={`${formatDayShort(day)} · check every tender.`}
        showActiveScope
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-none shadow-none"
          onClick={() => void load({ silent: true })}
          disabled={refreshing || loading}
        >
          {refreshing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          Refresh
        </Button>
        {canWriteFinanceExpenses ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-none shadow-none"
            onClick={() => setExpenseDrawerOpen(true)}
          >
            <Plus className="size-3.5" aria-hidden />
            Expense
          </Button>
        ) : null}
      </DashboardPageHero>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {expenseFeedback ? (
        <DashboardFeedback
          kind={expenseFeedback.kind}
          text={expenseFeedback.text}
        />
      ) : null}

      {canReadFinanceExpenses &&
      expensesTotal != null &&
      expensesTotal > 0 ? (
        <div className={cn(salesSurface, "flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-4")}>
          <div>
            <p
              className={cn(
                "font-heading text-sm font-semibold tracking-[-0.02em]",
                salesInk,
              )}
            >
              {fmtKes(expensesTotal)} in expenses
            </p>
            <p className={dashboardHintClass()}>
              Rent, bills, and petty cash posted to finance.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-none shadow-none"
            asChild
          >
            <Link href={`${APP_ROUTES.fixedCosts}?tab=history`}>
              View expenses
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-col gap-1.5">
        <div
          className={cn(
            salesSurface,
            "hidden min-h-0 flex-col overflow-hidden lg:flex",
            "h-[min(80dvh,52rem)]",
          )}
        >
          {dayPeriodStrip}
          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
            <div className={cn("min-h-0 overflow-hidden border-r", salesHair)}>
              {feed}
            </div>
            <div className="relative min-h-0 overflow-hidden bg-[#f4f7f5]">
              {pulse}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-1.5 lg:hidden">
          <div className={cn(salesSurface, "overflow-hidden")}>
            {dayPeriodStrip}
            <div className="space-y-2 p-2">
            {loading ? (
              <div className="grid grid-cols-2 gap-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-[4.75rem] animate-pulse border bg-white/70",
                      INK_RULE,
                    )}
                  />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className={cn(dashboardHintClass(), "px-1 py-4 text-center")}>
                Nothing on the ledger for this day yet.
              </p>
            ) : (
              <>
                <StatStrip
                  items={[
                    {
                      id: "taken",
                      label: "Taken",
                      value: fmtKes(grandTotal),
                      hint: `${rows.length} payment${rows.length === 1 ? "" : "s"} · ${formatDayShort(day)}`,
                      tone: "teal",
                      children:
                        mixChips.length > 0 ? (
                          <TenderMixBars
                            chips={mixChips}
                            totals={chipTotals}
                            grand={grandTotal}
                            methodFilters={methodFilters}
                            onSelect={selectOnlyMethod}
                          />
                        ) : undefined,
                    },
                    {
                      id: "reviewed",
                      label: "Reviewed",
                      value: `${progress}%`,
                      hint:
                        flaggedCount > 0
                          ? `${reviewedCount}/${rows.length} · ${flaggedCount} flagged`
                          : `${reviewedCount} of ${rows.length} checked`,
                      tone: "emerald",
                      children: (
                        <div className="h-1.5 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
                          <div
                            className="h-full bg-[var(--pos-primary,#0f766e)] transition-[width] duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      ),
                    },
                  ]}
                />
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {PRIMARY_CHIPS.map((id) => {
                    const chip = METHOD_CHIPS.find((c) => c.id === id)!;
                    const stats = chipTotals[id];
                    if (stats.count === 0) return null;
                    const selected = methodFilters.has(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleMethod(id)}
                        aria-pressed={selected}
                        className={cn(
                          "inline-flex h-9 shrink-0 items-center gap-1.5 border px-2.5 text-[12px] font-semibold",
                          INK_RULE,
                          selected
                            ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] text-[var(--order-ink,#15231f)]"
                            : "bg-white text-muted-foreground",
                        )}
                      >
                        {chip.label}
                        <span className="tabular-nums text-muted-foreground">
                          {fmtKes(stats.total)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            </div>
          </div>
          <div className={cn(salesSurface, "overflow-hidden")}>{feed}</div>
        </div>
      </div>

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
