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
} from "@/components/dashboard-page-ui";
import {
  PROCUREMENT_VARS,
  ProcurementHubNav,
} from "@/components/procurement/procurement-hub-nav";
import { PaySupplyDrawer } from "@/app/(dashboard)/supplies/_components/pay-supply-drawer";
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

const OWED = "text-[#d92d20]";
const CARD =
  "rounded-2xl bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(16,24,40,0.05)]";

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
  size = "lg",
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ink" | "ok" | "warn" | "owed";
  size?: "lg" | "sm";
  children?: ReactNode;
}) {
  return (
    <article className={cn(CARD, "p-4")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-semibold leading-none tracking-[-0.03em] tabular-nums",
          tone === "owed"
            ? OWED
            : tone === "warn"
              ? "text-[#b45309]"
              : tone === "ok"
                ? "text-[#0f766e]"
                : "text-[#101828]",
          size === "sm" ? "text-[1.5rem]" : "text-[2rem]",
        )}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[12px] text-[#667085]">{hint}</p>
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
  const [payTarget, setPayTarget] = useState<{
    row: PathBSupplyListRowRecord;
    settleAll: boolean;
  } | null>(null);

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

  const paySeed = bySupplier[0]?.bills[0] ?? null;
  const legendColors = ["#0f766e", "#12b76a", "#7ecbb8", "#cbd2d9"];
  const supplierLegend = bySupplier.slice(0, 4);

  const stillOwingBar =
    totalOpen > 0 && supplierLegend.length > 0 ? (
      <div className="mt-3 flex h-2.5 w-full gap-[3px] overflow-hidden">
        {supplierLegend.map((group, index) => {
          const share = (group.total / totalOpen) * 100;
          if (share <= 0) return null;
          return (
            <span
              key={group.supplierId}
              className="h-full rounded-full"
              style={{
                width: `${share}%`,
                backgroundColor: legendColors[index % legendColors.length],
              }}
              aria-hidden
            />
          );
        })}
      </div>
    ) : null;

  const stillOwingLegend =
    supplierLegend.length > 0 ? (
      <ul className="mt-3 flex flex-col gap-2">
        {supplierLegend.map((group, index) => {
          const share =
            totalOpen > 0 ? Math.round((group.total / totalOpen) * 100) : 0;
          return (
            <li
              key={group.supplierId}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex min-w-0 items-center gap-2 text-[13px] text-[#344054]">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: legendColors[index % legendColors.length],
                  }}
                  aria-hidden
                />
                <span className="truncate">{group.supplierName}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2 text-[13px] tabular-nums">
                <span className="font-semibold text-[#101828]">
                  {money(group.total)}
                </span>
                <span className="w-8 text-right text-[12px] text-[#98a2b3]">
                  {share}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    ) : null;

  const ageList = (
    <div className={cn(CARD, "p-4")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#101828]">
          How old it is
        </h3>
        <span className="text-[12px] text-[#98a2b3]">Payables by age</span>
      </div>
      <ul className="mt-3.5 space-y-3">
        {aging?.buckets ? (
          BUCKETS.map((def) => {
            const amount = n(aging.buckets[def.key]);
            const share = bucketMax > 0 ? (amount / bucketMax) * 100 : 0;
            const has = amount > 0.009;
            return (
              <li
                key={def.key}
                className="flex flex-col gap-1.5 sm:grid sm:grid-cols-[8.5rem_minmax(0,1fr)_5.5rem] sm:items-center sm:gap-3"
              >
                <div className="flex items-baseline justify-between gap-3 sm:contents">
                  <span
                    className={cn(
                      "text-[13px] font-medium",
                      has ? "text-[#0f766e]" : "text-[#667085]",
                    )}
                  >
                    {def.label}
                  </span>
                  <span
                    className={cn(
                      "text-right text-[13px] font-semibold tabular-nums sm:order-last",
                      has ? "text-[#101828]" : "text-[#98a2b3]",
                    )}
                  >
                    {money(amount)}
                  </span>
                </div>
                <span className="h-2 overflow-hidden rounded-full bg-[#eef1f0]">
                  <span
                    className="block h-full rounded-full bg-[#0f766e]"
                    style={{ width: `${share}%` }}
                  />
                </span>
              </li>
            );
          })
        ) : (
          <li className="text-[12px] text-[#98a2b3]">
            Aging buckets unavailable.
          </li>
        )}
      </ul>
    </div>
  );

  const pulseStack =
    loading && !aging ? (
      <div className="flex flex-col gap-2.5">
        <div className={cn(CARD, "h-32 animate-pulse")} />
        <div className="grid grid-cols-2 gap-2.5">
          <div className={cn(CARD, "h-24 animate-pulse")} />
          <div className={cn(CARD, "h-24 animate-pulse")} />
        </div>
        <div className={cn(CARD, "h-40 animate-pulse")} />
      </div>
    ) : (
      <div className="flex flex-col gap-2.5">
        <PulseCard
          label="Still owing"
          value={`${currency} ${money(totalOpen)}`}
          hint={
            billCount === 0
              ? "Nothing open"
              : `${billCount} bill${billCount === 1 ? "" : "s"} · ${supplierCount} vendor${supplierCount === 1 ? "" : "s"}`
          }
          tone={totalOpen > 0.009 ? "owed" : "ok"}
        >
          {stillOwingBar}
          {stillOwingLegend}
        </PulseCard>

        <div className="grid grid-cols-2 gap-2.5">
          <PulseCard
            size="sm"
            label="Past due"
            value={`${currency} ${money(overdueTotal)}`}
            hint={
              overdueTotal > 0.009 ? "Outside terms" : "Everything current"
            }
            tone={overdueTotal > 0.009 ? "warn" : "ok"}
          />
          <PulseCard
            size="sm"
            label="Supplier credit"
            value={`${currency} ${money(credit)}`}
            hint="Prepayments you can apply"
            tone="ink"
          />
        </div>
      </div>
    );

  const feed = (
    <div className={cn(CARD, "flex h-full min-h-0 flex-col overflow-hidden")}>
      <div className="shrink-0 space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#101828]">
              Open invoices
            </h2>
            <p className="mt-0.5 text-[12px] text-[#667085]">
              {loading && unpaid.length === 0
                ? "Loading…"
                : `${filteredUnpaid.length} bill${filteredUnpaid.length === 1 ? "" : "s"} · largest first`}
            </p>
          </div>
          <button
            type="button"
            disabled={!paySeed}
            onClick={() =>
              paySeed && setPayTarget({ row: paySeed, settleAll: true })
            }
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#e6f4f0] px-3.5 text-[13px] font-semibold text-[#0f766e] transition-colors hover:bg-[#d9ede7] disabled:opacity-50"
          >
            <CreditCard className="size-4" aria-hidden />
            Pay
          </button>
        </div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#98a2b3]"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Vendor or invoice"
            className="h-11 w-full rounded-full bg-[#f1f5f4] pl-10 pr-3 text-[14px] outline-none placeholder:text-[#98a2b3] focus:ring-2 focus:ring-[#0f766e]/40"
            aria-label="Search unpaid bills"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {loading && unpaid.length === 0 ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-[#eef1f0]"
              />
            ))}
          </div>
        ) : filteredUnpaid.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-16 text-center">
            <CheckCircle2
              className="mb-3 size-8 text-[#0f766e]"
              aria-hidden
            />
            <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#101828]">
              {query.trim()
                ? "No matching unpaid bills"
                : "You are clear — nothing unpaid"}
            </p>
            <p className="mt-1 max-w-sm text-[12px] leading-snug text-[#667085]">
              {query.trim()
                ? "Try another supplier or invoice number."
                : "When deliveries post with a balance, they show up here so you can settle them on Supplies."}
            </p>
            {!query.trim() ? (
              <Link
                href={APP_ROUTES.purchasingAddSupplies}
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-[#0f766e] ring-1 ring-black/[0.05] transition-colors hover:bg-[#f2f7f5]"
              >
                View supplies
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {bySupplier.map((group) => (
              <li key={group.supplierId} className={cn(CARD, "p-3.5")}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#101828]">
                      {group.supplierName}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#667085]">
                      {group.count} open bill{group.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-[15px] font-semibold tabular-nums",
                      OWED,
                    )}
                  >
                    {currency} {money(group.total)}
                  </p>
                </div>
                <ul className="mt-2.5 space-y-2">
                  {group.bills.map((bill) => (
                    <li
                      key={bill.supplierInvoiceId}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f8f7] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#101828]">
                          {bill.invoiceNumber}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[#667085]">
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
                        <p className="mt-0.5 text-[11px] tabular-nums text-[#98a2b3] sm:hidden">
                          {money(bill.balanceOpen)} of {money(bill.grandTotal)} ·
                          paid {money(bill.amountPaid)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="hidden text-right sm:block">
                          <p
                            className={cn(
                              "text-[13px] font-semibold tabular-nums",
                              OWED,
                            )}
                          >
                            {money(bill.balanceOpen)}
                          </p>
                          <p className="text-[11px] tabular-nums text-[#98a2b3]">
                            of {money(bill.grandTotal)} · paid{" "}
                            {money(bill.amountPaid)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPayTarget({ row: bill, settleAll: false })
                          }
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0f766e] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0d6b63]"
                        >
                          Pay
                          <ArrowRight className="size-4" aria-hidden />
                        </button>
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
      className="relative mx-auto flex w-full max-w-[1400px] flex-col bg-transparent px-3 pt-1 sm:px-5 sm:pt-1.5 lg:h-full lg:min-h-0"
      style={PROCUREMENT_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-3 lg:overflow-y-auto">
        <div className={cn(CARD, "shrink-0 overflow-hidden")}>
          <ProcurementHubNav />
        </div>

        <header className={cn(CARD, "p-4")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e6f4f0] text-[#0f766e]">
                <Receipt className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-[#101828]">
                  Unpaid bills
                </h1>
                <p className="mt-0.5 text-[13px] text-[#667085]">
                  What you still owe
                  {branchName ? <> · {branchName}</> : null}
                  {aging?.asOf ? ` · as of ${aging.asOf}` : null}
                </p>
              </div>
            </div>
            <nav
              aria-label="Related"
              className="flex flex-wrap items-center gap-2"
            >
              <Link
                href={APP_ROUTES.purchasingIntelligence}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#e6f4f0] px-3.5 text-[13px] font-semibold text-[#0f766e] transition-colors hover:bg-[#d9ede7]"
              >
                <LineChart className="size-4" aria-hidden />
                Compare
              </Link>
              <Link
                href={APP_ROUTES.suppliers}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#e6f4f0] px-3.5 text-[13px] font-semibold text-[#0f766e] transition-colors hover:bg-[#d9ede7]"
              >
                <Truck className="size-4" aria-hidden />
                Suppliers
              </Link>
              <label className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#f1f5f4] px-3.5 text-[13px]">
                <CalendarClock
                  className="size-4 text-[#98a2b3]"
                  aria-hidden
                />
                <span className="font-semibold text-[#667085]">As of</span>
                <input
                  type="date"
                  className="border-0 bg-transparent text-[13px] tabular-nums outline-none"
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={loading}
                onClick={() => void load()}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#f1f5f4] px-3.5 text-[13px] font-semibold text-[#344054] transition-colors hover:bg-[#e6eae9] disabled:opacity-60"
              >
                <RefreshCw
                  className={cn("size-4", loading && "animate-spin")}
                  aria-hidden
                />
                Refresh
              </button>
            </nav>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!paySeed}
              onClick={() =>
                paySeed && setPayTarget({ row: paySeed, settleAll: true })
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0f766e] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#0d6b63] disabled:opacity-50"
            >
              <CreditCard className="size-4" aria-hidden />
              Pay on Supplies
            </button>
          </div>
        </header>

        {message ? <DashboardFeedback kind="error" text={message} /> : null}

        <div className="flex min-h-0 flex-col gap-3">
          <div className="hidden lg:grid lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)] lg:items-start lg:gap-4">
            <div className="min-w-0">{feed}</div>
            <div className="flex min-w-0 flex-col gap-2.5">
              {pulseStack}
              {ageList}
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-3 lg:hidden">
            {pulseStack}
            {feed}
            {ageList}
          </div>
        </div>

        {/* Phone: keep the settle-up action in thumb reach while the roster scrolls. */}
        {unpaid.length > 0 ? (
          <div className="sticky bottom-[var(--shell-bottom-inset)] z-[3] mt-1 flex items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white px-4 py-3 shadow-[0_-10px_28px_-16px_color-mix(in_srgb,var(--order-ink,#15231f)_30%,transparent)] lg:hidden">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Still owing
              </p>
              <p
                className="mt-1 truncate text-[18px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[#101828]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {currency} {money(totalOpen)}
              </p>
            </div>
            <button
              type="button"
              disabled={!paySeed}
              onClick={() =>
                paySeed && setPayTarget({ row: paySeed, settleAll: true })
              }
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#0d6b63] disabled:opacity-50"
            >
              <CreditCard className="size-4" aria-hidden />
              Pay bills
            </button>
          </div>
        ) : null}

        <PaySupplyDrawer
          open={payTarget != null}
          onOpenChange={(open) => {
            if (!open) setPayTarget(null);
          }}
          row={payTarget?.row ?? null}
          settleAllOnOpen={payTarget?.settleAll ?? false}
          onPaid={() => {
            void load();
          }}
        />
      </div>
    </div>
  );
}
