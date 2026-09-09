"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  LineChart,
  Receipt,
  RefreshCw,
  Search,
  Truck,
  Wallet,
} from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import {
  PROCUREMENT_VARS,
  ProcurementHubNav,
} from "@/components/procurement/procurement-hub-nav";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSessionBranch } from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchApAging,
  fetchPathBSupplies,
  type ApAgingBuckets,
  type ApAgingTotalsResponse,
  type PathBSupplyListRowRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function money(n: number | string): string {
  const val = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(val)) return "0.00";
  return val.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function n(v: number | string | null | undefined): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function isUnpaid(row: PathBSupplyListRowRecord): boolean {
  return n(row.balanceOpen) > 0.009;
}

type BucketDef = {
  key: keyof ApAgingBuckets;
  label: string;
  hint: string;
  tone: "ok" | "watch" | "due" | "late" | "critical";
};

const BUCKETS: BucketDef[] = [
  {
    key: "current",
    label: "Not due yet",
    hint: "Still within terms",
    tone: "ok",
  },
  {
    key: "days1To30",
    label: "1–30 days late",
    hint: "Follow up this week",
    tone: "watch",
  },
  {
    key: "days31To60",
    label: "31–60 days late",
    hint: "Getting serious",
    tone: "due",
  },
  {
    key: "days61To90",
    label: "61–90 days late",
    hint: "Escalate with vendor",
    tone: "late",
  },
  {
    key: "daysOver90",
    label: "90+ days late",
    hint: "At risk of credit hold",
    tone: "critical",
  },
];

const TONE = {
  ok: {
    bar: "bg-[var(--pos-primary,#0f766e)]",
    chip: "border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]",
    amount: "text-[var(--pos-primary,#0f766e)]",
  },
  watch: {
    bar: "bg-amber-700",
    chip: "border-amber-700/40 bg-white text-amber-800 dark:text-amber-200",
    amount: "text-amber-800 dark:text-amber-200",
  },
  due: {
    bar: "bg-orange-700",
    chip: "border-orange-700/40 bg-white text-orange-800 dark:text-orange-200",
    amount: "text-orange-800 dark:text-orange-200",
  },
  late: {
    bar: "bg-rose-600",
    chip: "border-rose-500/40 bg-white text-rose-800 dark:text-rose-200",
    amount: "text-rose-800 dark:text-rose-200",
  },
  critical: {
    bar: "bg-rose-800",
    chip: "border-rose-700/50 bg-white text-rose-800 dark:text-rose-200",
    amount: "text-rose-800 dark:text-rose-200",
  },
} as const;

function statusLabel(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === "UNPAID" || s === "OPEN") return "Unpaid";
  if (s === "PARTIAL") return "Part paid";
  if (s === "PAID") return "Paid";
  return status || "Open";
}

export default function ApAgingPage() {
  const { me, business } = useDashboard();
  const { branchId, branchName } = useSessionBranch();
  const allowed = hasPermission(
    me?.permissions,
    Permission.PurchasingPaymentRead,
  );
  const currency = business?.currency?.trim().toUpperCase() || "KES";

  const [asOf, setAsOf] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [aging, setAging] = useState<ApAgingTotalsResponse | null>(null);
  const [bills, setBills] = useState<PathBSupplyListRowRecord[]>([]);

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    try {
      const [agingRow, supplyRows] = await Promise.all([
        fetchApAging(asOf.trim() || undefined),
        fetchPathBSupplies({ branchId: branchId?.trim() || null }),
      ]);
      setAging(agingRow);
      setBills(supplyRows);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load unpaid bills.",
      );
    } finally {
      setLoading(false);
    }
  }, [asOf, branchId]);

  useEffect(() => {
    if (!allowed) return;
    void load();
  }, [allowed, load]);

  const unpaid = useMemo(
    () =>
      bills
        .filter(isUnpaid)
        .sort((a, b) => n(b.balanceOpen) - n(a.balanceOpen)),
    [bills],
  );

  const filteredUnpaid = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unpaid;
    return unpaid.filter(
      (r) =>
        r.supplierName.toLowerCase().includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q),
    );
  }, [unpaid, query]);

  const bySupplier = useMemo(() => {
    const map = new Map<
      string,
      {
        supplierId: string;
        supplierName: string;
        count: number;
        total: number;
        bills: PathBSupplyListRowRecord[];
      }
    >();
    for (const row of filteredUnpaid) {
      const prev = map.get(row.supplierId);
      if (prev) {
        prev.count += 1;
        prev.total += n(row.balanceOpen);
        prev.bills.push(row);
      } else {
        map.set(row.supplierId, {
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          count: 1,
          total: n(row.balanceOpen),
          bills: [row],
        });
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filteredUnpaid]);

  const overdueTotal = useMemo(() => {
    if (!aging?.buckets) return 0;
    const b = aging.buckets;
    return b.days1To30 + b.days31To60 + b.days61To90 + b.daysOver90;
  }, [aging]);

  const bucketMax = useMemo(() => {
    if (!aging?.buckets) return 1;
    return Math.max(
      1,
      ...BUCKETS.map((def) => n(aging.buckets[def.key])),
    );
  }, [aging]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Unpaid bills"
        description={
          <>
            You do not have permission to view accounts payable. Ask an
            administrator to grant{" "}
            <code className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-1 py-0.5 text-xs">
              {Permission.PurchasingPaymentRead}
            </code>
            .
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  const totalOpen = aging?.totalOpen ?? unpaid.reduce((s, r) => s + n(r.balanceOpen), 0);
  const credit = aging?.totalSupplierPrepaymentBalance ?? 0;
  const billCount = unpaid.length;
  const supplierCount = bySupplier.length;

  return (
    <div
      className="relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col bg-white px-3 pt-1 sm:px-5 sm:pt-1.5"
      style={PROCUREMENT_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-1">
        <div className="shrink-0 rounded-none border border-[color-mix(in_srgb,var(--order-ink)_12%,transparent)] bg-white">
          <ProcurementHubNav />
        </div>

        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2.5 py-1 sm:px-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]">
                <Receipt className="size-3.5" aria-hidden />
              </span>
              <h1 className="truncate font-heading text-[15px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
                Unpaid bills
              </h1>
            </div>
            <span
              aria-hidden
              className="hidden h-3.5 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
            />
            <p className="min-w-0 truncate text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              What you still owe
              {branchName ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-medium text-[var(--order-ink,#15231f)]">
                    {branchName}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <label className="flex h-8 items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 text-[12px]">
              <CalendarClock
                className="size-3.5 text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]"
                aria-hidden
              />
              <span className="font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
                As of
              </span>
              <input
                type="date"
                className="border-0 bg-transparent text-sm tabular-nums outline-none"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              className="h-8 gap-1.5 rounded-none"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
                aria-hidden
              />
              Refresh
            </Button>
            <Button
              asChild
              className="h-8 gap-1.5 rounded-none bg-[var(--pos-primary,#0f766e)] px-2.5 font-semibold text-white hover:bg-[#0d6b63]"
            >
              <Link href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}>
                <CreditCard className="size-3.5" aria-hidden />
                Pay on Supplies
              </Link>
            </Button>
          </div>
        </header>

      {message ? <DashboardFeedback kind="error" text={message} /> : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto pb-4">
      <section className="grid grid-cols-2 gap-1 lg:grid-cols-4" aria-label="Payables pulse">
        <PulseCard
          label="Still owing"
          value={`${currency} ${money(totalOpen)}`}
          hint={
            billCount === 0
              ? "Nothing open"
              : `${billCount} bill${billCount === 1 ? "" : "s"} · ${supplierCount} vendor${supplierCount === 1 ? "" : "s"}`
          }
          icon={Wallet}
          emphasize
        />
        <PulseCard
          label="Past due"
          value={`${currency} ${money(overdueTotal)}`}
          hint={
            overdueTotal > 0.009
              ? "Outside payment terms"
              : "Everything still current"
          }
          icon={AlertTriangle}
          tone={overdueTotal > 0.009 ? "warn" : "ok"}
        />
        <PulseCard
          label="Supplier credit"
          value={`${currency} ${money(credit)}`}
          hint="Prepayments you can apply"
          icon={CheckCircle2}
          tone={credit > 0.009 ? "ok" : "default"}
        />
        <PulseCard
          label="Next step"
          value="Pay bills"
          hint="Open the unpaid filter on Supplies"
          icon={ArrowRight}
          href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}
        />
      </section>

      <div className="grid min-h-0 flex-1 items-start gap-1 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <aside className="space-y-1 lg:sticky lg:top-0">
          <section className="overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
            <header className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 py-1.5">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--order-ink,#15231f)]">
                How late is it?
              </h2>
              <p className="mt-0.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                Open AP by due-date age
                {aging?.asOf ? ` · as of ${aging.asOf}` : ""}
              </p>
            </header>
            <div className="space-y-1 p-2">
              {loading && !aging ? (
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded-none bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]"
                    />
                  ))}
                </div>
              ) : aging?.buckets ? (
                BUCKETS.map((def) => {
                  const amount = n(aging.buckets[def.key]);
                  const pct = Math.round((amount / bucketMax) * 100);
                  const tone = TONE[def.tone];
                  return (
                    <div
                      key={def.key}
                      className={cn(
                        "rounded-none border bg-white px-3 py-2",
                        tone.chip,
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold tracking-[-0.02em]">
                            {def.label}
                          </p>
                          <p className="mt-0.5 text-[11px] opacity-80">
                            {def.hint}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "shrink-0 font-heading text-sm font-semibold tabular-nums",
                            tone.amount,
                          )}
                        >
                          {money(amount)}
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-none bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
                        <div
                          className={cn("h-full rounded-none transition-all", tone.bar)}
                          style={{ width: `${amount > 0 ? Math.max(pct, 4) : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-4 text-center text-sm text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                  Aging buckets unavailable.
                </p>
              )}
            </div>
          </section>

          <nav
            className="flex flex-col gap-0 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
            aria-label="Related"
          >
            <Link
              href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}
              className="inline-flex h-8 items-center gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 text-[12px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)]"
            >
              <CreditCard className="size-3.5" aria-hidden />
              Pay on Supplies
            </Link>
            <Link
              href={APP_ROUTES.purchasingIntelligence}
              className="inline-flex h-8 items-center gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 text-[12px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:text-[var(--order-ink,#15231f)]"
            >
              <LineChart className="size-3.5" aria-hidden />
              Compare
            </Link>
            <Link
              href={APP_ROUTES.suppliers}
              className="inline-flex h-8 items-center gap-2 px-3 text-[12px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:text-[var(--order-ink,#15231f)]"
            >
              <Truck className="size-3.5" aria-hidden />
              Suppliers
            </Link>
          </nav>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 py-1.5">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-[var(--order-ink,#15231f)]">
                Open invoices
              </h2>
              <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                Largest balances first · pay from Supplies
              </p>
            </div>
            <label className="relative block w-full max-w-[14rem]">
              <span className="sr-only">Search unpaid bills</span>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]"
                aria-hidden
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Vendor or invoice…"
                className="h-8 w-full rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white pl-8 pr-2.5 text-sm outline-none focus-visible:border-[var(--pos-primary,#0f766e)]"
              />
            </label>
          </header>

          {loading && unpaid.length === 0 ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-none bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]"
                />
              ))}
            </div>
          ) : filteredUnpaid.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <CheckCircle2
                className="mb-3 size-8 text-[var(--pos-primary,#0f766e)]"
                aria-hidden
              />
              <p className="text-sm font-semibold text-[var(--order-ink,#15231f)]">
                {query.trim()
                  ? "No matching unpaid bills"
                  : "You are clear — nothing unpaid"}
              </p>
              <p className="mt-1 max-w-sm text-xs text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                {query.trim()
                  ? "Try another supplier or invoice number."
                  : "When deliveries post with a balance, they show up here so you can settle them on Supplies."}
              </p>
              {!query.trim() ? (
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 h-8 gap-1.5 rounded-none"
                >
                  <Link href={APP_ROUTES.purchasingAddSupplies}>
                    View supplies
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
              {bySupplier.map((group) => (
                <li key={group.supplierId} className="p-3">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--order-ink,#15231f)]">
                        {group.supplierName}
                      </p>
                      <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                        {group.count} open bill{group.count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-heading text-base font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
                        {currency} {money(group.total)}
                      </p>
                      <Link
                        href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}
                        className="inline-flex h-8 items-center gap-1 rounded-none bg-[var(--pos-primary,#0f766e)] px-2.5 text-[12px] font-semibold tracking-[-0.02em] text-white hover:bg-[#0d6b63]"
                      >
                        Pay
                        <ArrowRight className="size-3" aria-hidden />
                      </Link>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {group.bills.map((bill) => (
                      <li
                        key={bill.supplierInvoiceId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--order-ink,#15231f)]">
                            {bill.invoiceNumber}
                          </p>
                          <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                            {statusLabel(bill.paymentStatus)}
                            {bill.createdAt
                              ? ` · ${new Date(bill.createdAt).toLocaleDateString("en-KE", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}`
                              : null}
                            {" · "}
                            {bill.lineCount} line
                            {bill.lineCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-amber-800">
                            {money(bill.balanceOpen)}
                          </p>
                          <p className="text-[10px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                            of {money(bill.grandTotal)} · paid{" "}
                            {money(bill.amountPaid)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      </div>
      </div>
    </div>
  );
}

function PulseCard({
  label,
  value,
  hint,
  icon: Icon,
  emphasize = false,
  tone = "default",
  href,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  emphasize?: boolean;
  tone?: "default" | "ok" | "warn";
  href?: string;
}) {
  const body = (
    <>
      <span
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-none border",
          tone === "ok" &&
            "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]",
          tone === "warn" && "border-amber-700/40 text-amber-800",
          tone === "default" &&
            "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]",
          emphasize &&
            "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]",
        )}
      >
        <Icon className="size-3" aria-hidden />
      </span>
      <span className="min-w-0 truncate text-[11px] font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
        {label}
      </span>
      <span
        className={cn(
          "ml-auto shrink-0 font-heading text-[13px] font-semibold leading-none tracking-[-0.03em] text-[var(--order-ink,#15231f)]",
          tone === "ok" && "text-[var(--pos-primary,#0f766e)]",
          tone === "warn" && "text-amber-800",
        )}
        title={hint}
      >
        {value}
      </span>
    </>
  );

  const className = cn(
    "flex min-w-0 w-full items-center gap-1.5 rounded-none border bg-white px-2 py-1",
    emphasize || href
      ? "border-[var(--pos-primary,#0f766e)]"
      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
    href && "hover:text-[var(--pos-primary,#0f766e)]",
  );

  if (href) {
    return (
      <Link href={href} className={className} title={hint}>
        {body}
      </Link>
    );
  }
  return (
    <div className={className} title={hint}>
      {body}
    </div>
  );
}
