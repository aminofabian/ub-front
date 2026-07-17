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
  DASHBOARD_MAX,
  DASHBOARD_TABLE_HEAD,
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

const METHOD_CHIPS: { id: MethodChipId; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "mpesa", label: "M-Pesa" },
  { id: "card", label: "Card" },
  { id: "credit", label: "Credit" },
  { id: "wallet", label: "Wallet" },
  { id: "loyalty", label: "Loyalty" },
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

function formatDayHeading(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  const today = todayIsoLocal();
  const label = dt.toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (iso === today) return `Today · ${label}`;
  if (iso === shiftDay(today, -1)) return `Yesterday · ${label}`;
  return label;
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

function methodAccent(method: string): {
  bar: string;
  chip: string;
  soft: string;
} {
  const cats = salePaymentCategories(method, method);
  if (cats.has("cash")) {
    return {
      bar: "bg-emerald-600",
      chip: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
      soft: "bg-emerald-500/10",
    };
  }
  if (cats.has("mpesa")) {
    return {
      bar: "bg-teal-600",
      chip: "bg-teal-50 text-teal-900 ring-teal-200/80",
      soft: "bg-teal-500/10",
    };
  }
  if (cats.has("credit")) {
    return {
      bar: "bg-amber-600",
      chip: "bg-amber-50 text-amber-950 ring-amber-200/80",
      soft: "bg-amber-500/10",
    };
  }
  if (cats.has("wallet")) {
    return {
      bar: "bg-sky-600",
      chip: "bg-sky-50 text-sky-950 ring-sky-200/80",
      soft: "bg-sky-500/10",
    };
  }
  if (cats.has("loyalty")) {
    return {
      bar: "bg-rose-600",
      chip: "bg-rose-50 text-rose-950 ring-rose-200/80",
      soft: "bg-rose-500/10",
    };
  }
  if (method.toLowerCase().includes("card")) {
    return {
      bar: "bg-slate-600",
      chip: "bg-slate-100 text-slate-800 ring-slate-200/80",
      soft: "bg-slate-500/10",
    };
  }
  return {
    bar: "bg-stone-500",
    chip: "bg-stone-100 text-stone-800 ring-stone-200/80",
    soft: "bg-stone-500/10",
  };
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

  const totalsByMethod = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const row of rows) {
      const key = row.method.trim().toLowerCase() || "unknown";
      const cur = map.get(key) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += toNum(row.amount);
      map.set(key, cur);
    }
    return map;
  }, [rows]);

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

  const clearMarksForDay = () => {
    persistMarks({});
  };

  if (!allowed) {
    return (
      <div className={DASHBOARD_MAX}>
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

  return (
    <div className={DASHBOARD_MAX}>
      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Payments
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Day ledger
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Follow every tender as it lands — cash, M-Pesa, credit — then tick
              each one off as you reconcile.
            </p>
            <ActiveScopeSubtitle className="mt-0.5" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load({ silent: true })}
              disabled={refreshing || loading}
            >
              {refreshing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Date navigator */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-gradient-to-br from-muted/40 via-background to-emerald-50/40 px-3 py-3 sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => setDay((d) => shiftDay(d, -1))}
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="truncate text-base font-semibold tracking-tight text-foreground">
              {formatDayHeading(day)}
            </p>
            <p className="text-xs text-muted-foreground">
              {rows.length} tender{rows.length === 1 ? "" : "s"} ·{" "}
              {fmtKes(grandTotal)} taken
            </p>
          </div>
          <input
            type="date"
            value={day}
            max={todayIsoLocal()}
            onChange={(e) => {
              const v = e.target.value;
              if (v) setDay(v);
            }}
            className={cn(dashboardInputClass(), "w-auto shrink-0 py-1.5 text-sm")}
            aria-label="Pick day"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
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
              onClick={() => setDay(todayIsoLocal())}
            >
              Today
            </Button>
          ) : null}
        </div>
      </header>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {/* Method totals + filters */}
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {METHOD_CHIPS.map((chip) => {
            const stats = chipTotals[chip.id];
            const active =
              methodFilters.size === 0 || methodFilters.has(chip.id);
            const selected = methodFilters.has(chip.id);
            const accent = methodAccent(
              chip.id === "mpesa"
                ? "mpesa_manual"
                : chip.id === "credit"
                  ? "customer_credit"
                  : chip.id === "wallet"
                    ? "customer_wallet"
                    : chip.id === "loyalty"
                      ? "loyalty_redeem"
                      : chip.id,
            );
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => toggleMethod(chip.id)}
                className={cn(
                  "min-w-[7.5rem] flex-1 rounded-xl border px-3 py-2.5 text-left transition-all sm:flex-none",
                  selected
                    ? "border-foreground/25 bg-foreground text-background shadow-sm"
                    : active
                      ? "border-border/70 bg-card hover:border-foreground/20"
                      : "border-border/40 bg-muted/20 opacity-50",
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.14em]",
                    selected ? "text-background/70" : "text-muted-foreground",
                  )}
                >
                  {chip.label}
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">
                  {fmtKes(stats.total)}
                </p>
                <p
                  className={cn(
                    "text-[11px]",
                    selected ? "text-background/65" : "text-muted-foreground",
                  )}
                >
                  {stats.count} payment{stats.count === 1 ? "" : "s"}
                </p>
                {!selected ? (
                  <span
                    className={cn(
                      "mt-2 block h-0.5 w-8 rounded-full",
                      accent.bar,
                    )}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        {methodFilters.size > 0 ? (
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setMethodFilters(new Set())}
          >
            Clear method filters
          </button>
        ) : null}
      </section>

      {/* Follow-along progress */}
      <section
        className={cn(
          DASHBOARD_TABLE_SURFACE,
          "bg-gradient-to-r from-card via-card to-emerald-50/30",
        )}
      >
        <div className={cn(DASHBOARD_TABLE_HEAD, "flex flex-wrap items-center justify-between gap-3")}>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Follow along
            </p>
            <p className="mt-0.5 text-sm text-foreground">
              <span className="font-semibold tabular-nums">{reviewedCount}</span>
              {" of "}
              <span className="font-semibold tabular-nums">{rows.length}</span>
              {" reviewed"}
              {flaggedCount > 0 ? (
                <>
                  {" · "}
                  <span className="font-semibold text-amber-800">
                    {flaggedCount} flagged
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={filtered.length === 0}
              onClick={markAllVisibleReviewed}
            >
              <Check className="size-3.5" />
              Mark visible done
            </Button>
            {reviewedCount > 0 || flaggedCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearMarksForDay}
              >
                Clear marks
              </Button>
            ) : null}
          </div>
        </div>
        <div className="px-5 py-3 sm:px-6">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Marks stay on this device for this day — handy while you count the
            drawer or match M-Pesa statements.
          </p>
        </div>
      </section>

      {/* Search + mark filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt, cashier, reference…"
            className={cn(dashboardInputClass(), "pl-9")}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["unreviewed", "Open"],
              ["reviewed", "Done"],
              ["flagged", "Flagged"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMarkFilter(id)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                markFilter === id
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tape / timeline */}
      <section className={DASHBOARD_TABLE_SURFACE}>
        <div
          className={cn(
            DASHBOARD_TABLE_HEAD,
            "flex flex-wrap items-baseline justify-between gap-2",
          )}
        >
          <div>
            <p className="text-sm font-semibold text-foreground">
              Tender tape
            </p>
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length}
              {filtered.length !== rows.length ? ` of ${rows.length}` : ""} ·{" "}
              {fmtKes(filteredTotal)}
            </p>
          </div>
          <Link
            href={APP_ROUTES.salesTransactions}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Full transactions →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading payments…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium text-foreground">
              No payments match
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {rows.length === 0
                ? "Nothing recorded for this day yet."
                : "Try clearing filters or searching differently."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {hourGroups.map((group) => {
              const hourTotal = group.rows.reduce(
                (s, r) => s + toNum(r.amount),
                0,
              );
              return (
                <div key={group.key}>
                  <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-border/30 bg-muted/50 px-4 py-1.5 backdrop-blur-sm sm:px-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {group.label}
                    </p>
                    <p className="text-[11px] tabular-nums text-muted-foreground">
                      {group.rows.length} · {fmtKes(hourTotal)}
                    </p>
                  </div>
                  <ul className="divide-y divide-border/30">
                    {group.rows.map((row) => {
                      const mark = getMark(marks, row.paymentId);
                      const accent = methodAccent(row.method);
                      const refunded = (row.status ?? "")
                        .toLowerCase()
                        .includes("refund");
                      const noteOpen = noteDraftId === row.paymentId;
                      return (
                        <li
                          key={row.paymentId}
                          className={cn(
                            "relative transition-colors",
                            mark.reviewed && "bg-emerald-50/40",
                            mark.flagged && !mark.reviewed && "bg-amber-50/50",
                            refunded && "opacity-80",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0 bottom-0 left-0 w-0.5",
                              accent.bar,
                            )}
                            aria-hidden
                          />
                          <div className="flex items-start gap-3 py-3 pr-4 pl-4 sm:gap-4 sm:pr-5 sm:pl-5">
                            <button
                              type="button"
                              onClick={() =>
                                patchMark(row.paymentId, {
                                  reviewed: !mark.reviewed,
                                })
                              }
                              className={cn(
                                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                                mark.reviewed
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-border bg-background text-transparent hover:border-emerald-600/60",
                              )}
                              aria-label={
                                mark.reviewed
                                  ? "Mark as not reviewed"
                                  : "Mark as reviewed"
                              }
                              aria-pressed={mark.reviewed}
                            >
                              <Check className="size-3.5" strokeWidth={3} />
                            </button>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                                <span className="font-mono text-xs font-medium tabular-nums text-muted-foreground">
                                  {formatTime(row.soldAt)}
                                </span>
                                <span
                                  className={cn(
                                    "text-xl font-semibold tracking-tight tabular-nums sm:text-2xl",
                                    mark.reviewed
                                      ? "text-foreground/55 line-through decoration-foreground/25"
                                      : "text-foreground",
                                  )}
                                >
                                  {fmtKes(row.amount)}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                                    accent.chip,
                                  )}
                                >
                                  {formatPaymentMethodLabel(row.method)}
                                </span>
                                {refunded ? (
                                  <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                                    Refunded sale
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
                                <Link
                                  href={APP_ROUTES.salesTransactions}
                                  className="font-mono font-medium text-foreground/70 hover:text-foreground hover:underline"
                                >
                                  {receiptLabel(row)}
                                </Link>
                                {row.cashierName?.trim() ? (
                                  <span>· {row.cashierName.trim()}</span>
                                ) : null}
                                {row.customerName?.trim() ? (
                                  <span>· {row.customerName.trim()}</span>
                                ) : null}
                                {row.reference?.trim() ? (
                                  <span className="font-mono">
                                    · ref {row.reference.trim()}
                                  </span>
                                ) : null}
                                {toNum(row.saleGrandTotal) !==
                                  toNum(row.amount) ? (
                                  <span>
                                    · of {fmtKes(row.saleGrandTotal)} sale
                                  </span>
                                ) : null}
                              </div>
                              {noteOpen || mark.note ? (
                                <div className="pt-1">
                                  {noteOpen ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      value={mark.note}
                                      placeholder="Note for this tender…"
                                      onChange={(e) =>
                                        patchMark(row.paymentId, {
                                          note: e.target.value,
                                        })
                                      }
                                      onBlur={() => setNoteDraftId(null)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === "Escape") {
                                          setNoteDraftId(null);
                                        }
                                      }}
                                      className={cn(
                                        dashboardInputClass(),
                                        "py-1.5 text-xs",
                                      )}
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      className="text-left text-[11px] text-muted-foreground italic hover:text-foreground"
                                      onClick={() =>
                                        setNoteDraftId(row.paymentId)
                                      }
                                    >
                                      {mark.note}
                                    </button>
                                  )}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  patchMark(row.paymentId, {
                                    flagged: !mark.flagged,
                                  })
                                }
                                className={cn(
                                  "flex size-8 items-center justify-center rounded-md transition-colors",
                                  mark.flagged
                                    ? "bg-amber-100 text-amber-800"
                                    : "text-muted-foreground/50 hover:bg-muted hover:text-amber-700",
                                )}
                                aria-label={
                                  mark.flagged ? "Remove flag" : "Flag for follow-up"
                                }
                                aria-pressed={mark.flagged}
                              >
                                <Flag
                                  className="size-3.5"
                                  fill={mark.flagged ? "currentColor" : "none"}
                                />
                              </button>
                              {!mark.note && !noteOpen ? (
                                <button
                                  type="button"
                                  className="px-1 text-[10px] font-medium text-muted-foreground/70 hover:text-foreground"
                                  onClick={() =>
                                    setNoteDraftId(row.paymentId)
                                  }
                                >
                                  Note
                                </button>
                              ) : null}
                            </div>
                          </div>
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

      {/* Raw method breakdown for card / other */}
      {totalsByMethod.size > 0 ? (
        <p className="text-center text-[11px] text-muted-foreground">
          Methods in play:{" "}
          {[...totalsByMethod.entries()]
            .sort((a, b) => b[1].total - a[1].total)
            .map(
              ([method, stats]) =>
                `${formatPaymentMethodLabel(method)} ${fmtKes(stats.total)} (${stats.count})`,
            )
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
