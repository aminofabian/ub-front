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
  DASHBOARD_MAX_WIDE,
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
    bar: "bg-emerald-500",
    chip: "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-900 dark:text-emerald-100",
    amount: "text-emerald-700 dark:text-emerald-400",
  },
  watch: {
    bar: "bg-amber-500",
    chip: "border-amber-500/25 bg-amber-500/[0.08] text-amber-950 dark:text-amber-100",
    amount: "text-amber-700 dark:text-amber-400",
  },
  due: {
    bar: "bg-orange-500",
    chip: "border-orange-500/25 bg-orange-500/[0.08] text-orange-950 dark:text-orange-100",
    amount: "text-orange-700 dark:text-orange-400",
  },
  late: {
    bar: "bg-rose-500",
    chip: "border-rose-500/25 bg-rose-500/[0.08] text-rose-950 dark:text-rose-100",
    amount: "text-rose-700 dark:text-rose-400",
  },
  critical: {
    bar: "bg-rose-700",
    chip: "border-rose-700/30 bg-rose-700/[0.12] text-rose-950 dark:text-rose-50",
    amount: "text-rose-800 dark:text-rose-300",
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
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
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
      className={cn(DASHBOARD_MAX_WIDE, "pb-10")}
      style={PROCUREMENT_VARS}
    >
      <div className="mb-4 rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_92%,transparent)] p-0.5 shadow-sm">
        <ProcurementHubNav />
      </div>

      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--pos-primary,#0f766e)] text-white shadow-[0_8px_20px_-12px_color-mix(in_srgb,var(--pos-primary,#0f766e)_70%,transparent)]">
              <Receipt className="size-4" aria-hidden />
            </span>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.03em] text-[var(--order-ink,#15231f)]">
              Unpaid bills
            </h1>
          </div>
          <p className="mt-1.5 max-w-xl text-sm text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
            What you still owe suppliers
            {branchName ? (
              <>
                {" "}
                · <span className="font-medium text-foreground/80">{branchName}</span>
              </>
            ) : null}
            . Settle from Supplies when you are ready.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-card px-2.5 py-1.5 text-xs">
            <CalendarClock className="size-3.5 text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">As of</span>
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
            className="h-9 gap-1.5"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw
              className={cn("size-3.5", loading && "animate-spin")}
              aria-hidden
            />
            Refresh
          </Button>
          <Button asChild className="h-9 gap-1.5">
            <Link href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}>
              <CreditCard className="size-3.5" aria-hidden />
              Pay on Supplies
            </Link>
          </Button>
        </div>
      </header>

      {message ? <DashboardFeedback kind="error" text={message} /> : null}

      {/* Pulse strip */}
      <section className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        {/* Aging urgency */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <section className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_94%,transparent)] shadow-[0_10px_28px_-22px_rgba(21,35,31,0.35)]">
            <header className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3.5 py-2.5">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--order-ink,#15231f)]">
                How late is it?
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Open AP by due-date age
                {aging?.asOf ? ` · as of ${aging.asOf}` : ""}
              </p>
            </header>
            <div className="space-y-3 p-3.5">
              {loading && !aging ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded-lg bg-muted/40"
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
                        "rounded-lg border px-3 py-2.5",
                        tone.chip,
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-[0.1em]">
                            {def.label}
                          </p>
                          <p className="mt-0.5 text-[10px] opacity-80">
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
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                        <div
                          className={cn("h-full rounded-full transition-all", tone.bar)}
                          style={{ width: `${amount > 0 ? Math.max(pct, 4) : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aging buckets unavailable.
                </p>
              )}
            </div>
          </section>

          <nav
            className="flex flex-col gap-1.5 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] p-3"
            aria-label="Related"
          >
            <Link
              href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--pos-primary,#0f766e)] hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)]"
            >
              <CreditCard className="size-3.5" aria-hidden />
              Pay on Supplies
            </Link>
            <Link
              href={APP_ROUTES.purchasingIntelligence}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <LineChart className="size-3.5" aria-hidden />
              Supplier intelligence
            </Link>
            <Link
              href={APP_ROUTES.suppliers}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <Truck className="size-3.5" aria-hidden />
              Supplier directory
            </Link>
          </nav>
        </aside>

        {/* Unpaid bill list */}
        <section className="min-w-0 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_94%,transparent)] shadow-[0_10px_28px_-22px_rgba(21,35,31,0.35)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3.5 py-2.5">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-[var(--order-ink,#15231f)]">
                Open invoices
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Largest balances first · pay from Supplies
              </p>
            </div>
            <label className="relative block w-full max-w-[14rem]">
              <span className="sr-only">Search unpaid bills</span>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Vendor or invoice…"
                className="h-8 w-full rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-background pl-8 pr-2.5 text-sm outline-none focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_22%,transparent)]"
              />
            </label>
          </header>

          {loading && unpaid.length === 0 ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/40" />
              ))}
            </div>
          ) : filteredUnpaid.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <CheckCircle2 className="mb-3 size-8 text-emerald-600" aria-hidden />
              <p className="text-sm font-semibold text-foreground">
                {query.trim()
                  ? "No matching unpaid bills"
                  : "You are clear — nothing unpaid"}
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {query.trim()
                  ? "Try another supplier or invoice number."
                  : "When deliveries post with a balance, they show up here so you can settle them on Supplies."}
              </p>
              {!query.trim() ? (
                <Button asChild variant="outline" className="mt-4 h-9 gap-1.5">
                  <Link href={APP_ROUTES.purchasingAddSupplies}>
                    View supplies
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {bySupplier.map((group) => (
                <li key={group.supplierId} className="p-3.5">
                  <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--order-ink,#15231f)]">
                        {group.supplierName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {group.count} open bill{group.count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-heading text-base font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
                        {currency} {money(group.total)}
                      </p>
                      <Link
                        href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)] px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--pos-primary,#0f766e)] transition hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)]"
                      >
                        Pay
                        <ArrowRight className="size-3" aria-hidden />
                      </Link>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {group.bills.map((bill) => (
                      <li
                        key={bill.supplierInvoiceId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_55%,transparent)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {bill.invoiceNumber}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
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
                          <p className="text-sm font-semibold tabular-nums">
                            {money(bill.balanceOpen)}
                          </p>
                          <p className="text-[10px] tabular-nums text-muted-foreground">
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
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-md border",
            tone === "ok" &&
              "border-emerald-500/25 text-emerald-700 dark:text-emerald-400",
            tone === "warn" &&
              "border-amber-500/25 text-amber-700 dark:text-amber-400",
            tone === "default" &&
              "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-muted-foreground",
            emphasize &&
              "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] text-[var(--pos-primary,#0f766e)]",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-heading font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]",
          emphasize ? "text-lg tabular-nums" : "text-base",
          !emphasize && value.includes(" ") === false && "tabular-nums",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
    </>
  );

  const className = cn(
    "rounded-xl border px-3.5 py-3 transition",
    emphasize
      ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_22%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]"
      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_94%,transparent)]",
    href &&
      "hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_30%,transparent)]",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
