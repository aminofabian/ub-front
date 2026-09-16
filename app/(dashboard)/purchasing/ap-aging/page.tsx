"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  LineChart,
  Receipt,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
  dashboardHintClass,
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

const INK_RULE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PAPER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]";
const ROSTER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]";

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
  tone: "ok" | "watch" | "late" | "critical";
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
    tone: "watch",
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
    chip: "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] text-[var(--pos-primary,#0f766e)]",
    amount: "text-[var(--pos-primary,#0f766e)]",
  },
  watch: {
    bar: "bg-amber-800",
    chip: "border-amber-700/30 text-amber-900",
    amount: "text-amber-900",
  },
  late: {
    bar: "bg-[#9a2e16]",
    chip: "border-[#9a2e16]/35 text-[#9a2e16]",
    amount: "text-[#9a2e16]",
  },
  critical: {
    bar: "bg-[#9a2e16]",
    chip: "border-[#9a2e16]/45 text-[#9a2e16]",
    amount: "text-[#9a2e16]",
  },
} as const;

function statusLabel(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === "UNPAID" || s === "OPEN") return "Unpaid";
  if (s === "PARTIAL") return "Part paid";
  if (s === "PAID") return "Paid";
  return status || "Open";
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
  tone?: "ink" | "ok" | "warn" | "owed";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <article
      className={cn(
        "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]",
        INK_RULE,
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
              : tone === "ok"
                ? "text-[var(--pos-primary,#0f766e)]"
                : "text-foreground",
          value.length > 18 ? "text-[1.25rem]" : "text-[1.85rem]",
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
    return Math.max(1, ...BUCKETS.map((def) => n(aging.buckets[def.key])));
  }, [aging]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Unpaid bills"
        description={
          <>
            You do not have permission to view accounts payable. Ask an
            administrator to grant{" "}
            <code
              className={cn(
                "rounded-none border bg-white px-1 py-0.5 text-xs",
                INK_RULE,
              )}
            >
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

  const totalOpen =
    aging?.totalOpen ?? unpaid.reduce((s, r) => s + n(r.balanceOpen), 0);
  const credit = aging?.totalSupplierPrepaymentBalance ?? 0;
  const billCount = unpaid.length;
  const supplierCount = bySupplier.length;

  const agingBars =
    aging?.buckets && bucketMax > 0 ? (
      <div
        className="mt-2 flex h-8 items-end gap-px"
        role="img"
        aria-label="Aging mix"
      >
        {BUCKETS.map((def) => {
          const amount = n(aging.buckets[def.key]);
          const share = amount / bucketMax;
          if (amount <= 0) return null;
          return (
            <div
              key={def.key}
              title={`${def.label}: ${currency} ${money(amount)}`}
              className={cn("min-w-0 flex-1", TONE[def.tone].bar)}
              style={{
                height: `${Math.max(18, share * 100)}%`,
                opacity: 0.35 + share * 0.65,
              }}
            />
          );
        })}
      </div>
    ) : null;

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
        Payables
      </p>

      {loading && !aging ? (
        <>
          <div className="absolute left-[8%] top-[24%] h-36 w-56 animate-pulse bg-white/80" />
          <div className="absolute right-[7%] top-[14%] h-24 w-40 animate-pulse bg-white/70" />
        </>
      ) : (
        <>
          <PulseCard
            className="left-[8%] top-[22%]"
            label="Still owing"
            value={`${currency} ${money(totalOpen)}`}
            hint={
              billCount === 0
                ? "Nothing open"
                : `${billCount} bill${billCount === 1 ? "" : "s"} · ${supplierCount} vendor${supplierCount === 1 ? "" : "s"}`
            }
            tone={totalOpen > 0.009 ? "owed" : "ok"}
          >
            {agingBars}
          </PulseCard>

          <PulseCard
            className="right-[7%] top-[14%] !w-[min(13.5rem,calc(100%-1.5rem))]"
            label="Past due"
            value={`${currency} ${money(overdueTotal)}`}
            hint={
              overdueTotal > 0.009
                ? "Outside payment terms"
                : "Everything still current"
            }
            tone={overdueTotal > 0.009 ? "warn" : "ok"}
          />

          <PulseCard
            className="right-[10%] top-[46%] !w-[min(13.5rem,calc(100%-1.5rem))]"
            label="Supplier credit"
            value={`${currency} ${money(credit)}`}
            hint="Prepayments you can apply"
            tone={credit > 0.009 ? "ok" : "ink"}
          />

          <div
            className={cn(
              "absolute bottom-[8%] left-[10%] z-[1] w-[min(18rem,calc(100%-2rem))] border bg-white p-3 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]",
              INK_RULE,
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Age
            </p>
            <ul className="mt-2 space-y-1.5">
              {aging?.buckets
                ? BUCKETS.map((def) => {
                    const amount = n(aging.buckets[def.key]);
                    const tone = TONE[def.tone];
                    return (
                      <li
                        key={def.key}
                        className="flex items-baseline justify-between gap-2 text-[11px]"
                      >
                        <span className={cn("font-medium", tone.amount)}>
                          {def.label}
                        </span>
                        <span
                          className={cn(
                            "tabular-nums font-semibold",
                            tone.amount,
                          )}
                        >
                          {money(amount)}
                        </span>
                      </li>
                    );
                  })
                : (
                  <li className="text-muted-foreground">
                    Aging buckets unavailable.
                  </li>
                )}
            </ul>
          </div>
        </>
      )}
    </div>
  );

  const feed = (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className={cn("shrink-0 space-y-2 border-b px-3 py-2 sm:px-3.5", INK_RULE)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              className="text-[15px] font-semibold tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Open invoices
            </h2>
            <p className={dashboardHintClass()}>
              {loading && unpaid.length === 0
                ? "Loading…"
                : `${filteredUnpaid.length} bill${filteredUnpaid.length === 1 ? "" : "s"} · largest first`}
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="h-8 gap-1.5 rounded-none shadow-none"
          >
            <Link href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}>
              <CreditCard className="size-3.5" aria-hidden />
              Pay
            </Link>
          </Button>
        </div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Vendor or invoice…"
            className={cn(
              "h-8 w-full border bg-white pl-8 pr-2.5 text-sm outline-none focus-visible:border-[var(--pos-primary,#0f766e)]",
              INK_RULE,
            )}
            aria-label="Search unpaid bills"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && unpaid.length === 0 ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]"
              />
            ))}
          </div>
        ) : filteredUnpaid.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-16 text-center">
            <CheckCircle2
              className="mb-3 size-7 text-[var(--pos-primary,#0f766e)]"
              aria-hidden
            />
            <p
              className="text-sm font-semibold tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {query.trim()
                ? "No matching unpaid bills"
                : "You are clear — nothing unpaid"}
            </p>
            <p className={cn(dashboardHintClass(), "mt-1 max-w-sm")}>
              {query.trim()
                ? "Try another supplier or invoice number."
                : "When deliveries post with a balance, they show up here so you can settle them on Supplies."}
            </p>
            {!query.trim() ? (
              <Button
                asChild
                variant="outline"
                className="mt-4 h-8 gap-1.5 rounded-none shadow-none"
              >
                <Link href={APP_ROUTES.purchasingAddSupplies}>
                  View supplies
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <ul>
            {bySupplier.map((group) => (
              <li
                key={group.supplierId}
                className={cn("border-b p-3 last:border-0", INK_RULE)}
              >
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold tracking-[-0.02em]"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {group.supplierName}
                    </p>
                    <p className={dashboardHintClass()}>
                      {group.count} open bill
                      {group.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p
                      className="text-base font-semibold tabular-nums tracking-[-0.02em] text-[#9a2e16]"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {currency} {money(group.total)}
                    </p>
                    <Link
                      href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}
                      className="inline-flex h-7 items-center gap-1 bg-[var(--pos-primary,#0f766e)] px-2 text-[11px] font-semibold text-white"
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
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2 border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_1.5%,white)] px-2.5 py-1.5",
                        INK_RULE,
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {bill.invoiceNumber}
                        </p>
                        <p className={dashboardHintClass()}>
                          {statusLabel(bill.paymentStatus)}
                          {bill.createdAt
                            ? ` · ${new Date(bill.createdAt).toLocaleDateString(
                                "en-KE",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}`
                            : null}
                          {" · "}
                          {bill.lineCount} line
                          {bill.lineCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-sm font-semibold tabular-nums text-[#9a2e16]"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {money(bill.balanceOpen)}
                        </p>
                        <p className={cn(dashboardHintClass(), "tabular-nums")}>
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
      </div>
    </div>
  );

  return (
    <div
      className="relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col bg-transparent px-3 pt-1 sm:px-5 sm:pt-1.5"
      style={PROCUREMENT_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-1.5">
        <div className={cn("shrink-0 border bg-white", INK_RULE)}>
          <ProcurementHubNav />
        </div>

        <header
          className={cn(
            "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
            INK_RULE,
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex size-7 shrink-0 items-center justify-center border bg-[var(--pos-primary,#0f766e)] text-white">
                <Receipt className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h1
                  className="truncate text-[15px] font-semibold tracking-[-0.02em]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Unpaid bills
                </h1>
                <p className={dashboardHintClass()}>
                  What you still owe
                  {branchName ? (
                    <>
                      {" "}
                      ·{" "}
                      <span className="font-medium text-foreground">
                        {branchName}
                      </span>
                    </>
                  ) : null}
                  {aging?.asOf ? ` · as of ${aging.asOf}` : null}
                </p>
              </div>
            </div>
            <nav
              aria-label="Related"
              className="flex min-w-0 flex-wrap items-center gap-0.5"
            >
              <Link
                href={APP_ROUTES.purchasingIntelligence}
                className="inline-flex h-8 items-center gap-1 px-2 text-[12px] font-semibold text-muted-foreground hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground"
              >
                <LineChart className="size-3" aria-hidden />
                Compare
              </Link>
              <Link
                href={APP_ROUTES.suppliers}
                className="inline-flex h-8 items-center gap-1 px-2 text-[12px] font-semibold text-muted-foreground hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground"
              >
                <Truck className="size-3" aria-hidden />
                Suppliers
              </Link>
            </nav>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <label
              className={cn(
                "flex h-8 items-center gap-1.5 border bg-white px-2 text-[12px]",
                INK_RULE,
              )}
            >
              <CalendarClock
                className="size-3.5 text-muted-foreground"
                aria-hidden
              />
              <span className="font-semibold text-muted-foreground">As of</span>
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
              className="h-8 gap-1.5 rounded-none shadow-none"
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
              className="h-8 gap-1.5 rounded-none shadow-none"
            >
              <Link href={`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`}>
                <CreditCard className="size-3.5" aria-hidden />
                Pay on Supplies
              </Link>
            </Button>
          </div>
        </header>

        {message ? <DashboardFeedback kind="error" text={message} /> : null}

        <div className="flex min-h-0 flex-col gap-1.5">
          <div
            className={cn(
              "hidden overflow-hidden border lg:grid",
              "h-[min(80dvh,52rem)]",
              INK_RULE,
              PAPER,
              "lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]",
            )}
          >
            <div className={cn("min-h-0 overflow-hidden border-r", INK_RULE, ROSTER)}>
              {feed}
            </div>
            <div className="relative min-h-0 overflow-hidden">{pulse}</div>
          </div>

          <div className="flex min-h-0 flex-col gap-1.5 lg:hidden">
            <div className={cn("min-h-[22rem] border", INK_RULE, PAPER)}>
              {pulse}
            </div>
            <div className={cn("border", INK_RULE)}>{feed}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
