"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { useSessionBranch } from "@/hooks/use-session-scope";
import {
  fetchVatReport,
  fetchVatReportBuckets,
  fetchVatReportExportCsv,
  type VatBucketRecord,
  type VatReportRecord,
  type VatReportTaxCodeRow,
} from "@/lib/api";
import {
  parseISODate,
  startOfMonth,
  toISODate,
} from "@/lib/analytics-date-range";
import {
  HUB_BORDER,
  HUB_CARD,
  HUB_DIVIDE,
  HUB_MUTED,
  HUB_SURFACE,
} from "@/lib/business-hub/constants";
import { APP_ROUTES } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { formatYmd } from "@/lib/ymd-date";

/** KRA VAT classes. An empty code means the sale lines carried no tax rate. */
const TAX_CODE_LABELS: Record<string, string> = {
  A: "A · Exempt",
  B: "B · 16%",
  C: "C · 0%",
  D: "D · Non-VAT",
  E: "E · 8%",
};

function taxCodeLabel(code: string): string {
  const key = code.trim().toUpperCase();
  if (!key) return "— not taxed —";
  return TAX_CODE_LABELS[key] ?? key;
}

const BUCKET_OPTIONS = ["day", "month"] as const;
type VatBucketSize = (typeof BUCKET_OPTIONS)[number];

/**
 * Label for a breakdown bucket. Day buckets show the raw `periodStart`; month
 * buckets derive a friendly "Oct 2026" from the parsed date (not by slicing
 * the string), so any date format the API sends is handled.
 */
function bucketLabel(row: VatBucketRecord, bucket: VatBucketSize): string {
  if (bucket === "day") return row.periodStart;
  return formatYmd(row.periodStart, "MMM yyyy") || row.periodStart;
}

/** First day of the current month → today, in Africa/Nairobi business days. */
function defaultVatRange(): { from: string; to: string } {
  const today = parseISODate(toISODate(new Date()));
  return {
    from: toISODate(startOfMonth(today)),
    to: toISODate(today),
  };
}

function StatCard({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <article className={cn(HUB_CARD, "p-4", emphasis && "border-[var(--pos-primary,#0f766e)]")}>
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.08em]",
          HUB_MUTED,
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-heading font-semibold leading-none tracking-[-0.03em] tabular-nums",
          emphasis
            ? "text-[1.75rem] text-[var(--pos-primary,#0f766e)]"
            : "text-[1.375rem] text-[#101828]",
        )}
      >
        {value}
      </p>
      <p className={cn("mt-1.5 text-[12px] leading-snug", HUB_MUTED)}>{hint}</p>
    </article>
  );
}

export default function VatReportPage() {
  const { me, business } = useDashboard();
  const { branchId, branchName } = useSessionBranch();
  const allowed = hasPermission(me?.permissions, Permission.FinanceReportsRead);
  const currency = business?.currency?.trim().toUpperCase() || "KES";

  const [from, setFrom] = useState(() => defaultVatRange().from);
  const [to, setTo] = useState(() => defaultVatRange().to);
  const [bucket, setBucket] = useState<VatBucketSize>("day");

  // Summary (cards + by-tax-code) and buckets load independently so one failure
  // never blanks the other.
  const [report, setReport] = useState<VatReportRecord | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [buckets, setBuckets] = useState<VatBucketRecord[]>([]);
  const [bucketsLoading, setBucketsLoading] = useState(true);
  const [bucketsError, setBucketsError] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState("");

  const summaryRunRef = useRef(0);
  const bucketsRunRef = useRef(0);
  // One toast per load cycle at most, even when both loads fail together.
  const loadCycleRef = useRef(0);
  const toastedCycleRef = useRef(-1);

  const rangeInvalid = from.trim() !== "" && to.trim() !== "" && from > to;

  const notifyOnce = useCallback((msg: string) => {
    if (toastedCycleRef.current === loadCycleRef.current) return;
    toastedCycleRef.current = loadCycleRef.current;
    toast.error(msg);
  }, []);

  const loadSummary = useCallback(
    async (start: string, end: string) => {
      const run = (summaryRunRef.current += 1);
      setSummaryLoading(true);
      setSummaryError("");
      try {
        const data = await fetchVatReport(
          start,
          end,
          branchId?.trim() || undefined,
        );
        if (summaryRunRef.current !== run) return;
        setReport(data);
      } catch (e) {
        if (summaryRunRef.current !== run) return;
        const msg =
          e instanceof Error ? e.message : "Could not load the VAT report.";
        setSummaryError(msg);
        setReport(null);
        notifyOnce(msg);
      } finally {
        if (summaryRunRef.current === run) setSummaryLoading(false);
      }
    },
    [branchId, notifyOnce],
  );

  const loadBuckets = useCallback(
    async (start: string, end: string, size: VatBucketSize) => {
      const run = (bucketsRunRef.current += 1);
      setBucketsLoading(true);
      setBucketsError("");
      try {
        const rows = await fetchVatReportBuckets(
          start,
          end,
          size,
          branchId?.trim() || undefined,
        );
        if (bucketsRunRef.current !== run) return;
        setBuckets(rows);
      } catch (e) {
        if (bucketsRunRef.current !== run) return;
        const msg =
          e instanceof Error ? e.message : "Could not load the breakdown.";
        setBucketsError(msg);
        setBuckets([]);
        notifyOnce(msg);
      } finally {
        if (bucketsRunRef.current === run) setBucketsLoading(false);
      }
    },
    [branchId, notifyOnce],
  );

  useEffect(() => {
    if (!allowed) return;
    const start = from.trim();
    const end = to.trim();
    if (!start || !end || start > end) {
      summaryRunRef.current += 1;
      bucketsRunRef.current += 1;
      setReport(null);
      setSummaryError("");
      setSummaryLoading(false);
      setBuckets([]);
      setBucketsError("");
      setBucketsLoading(false);
      return;
    }
    loadCycleRef.current += 1;
    void loadSummary(start, end);
    void loadBuckets(start, end, bucket);
  }, [allowed, from, to, bucket, loadSummary, loadBuckets]);

  const onDownloadCsv = useCallback(async () => {
    const start = from.trim();
    const end = to.trim();
    if (!start || !end || start > end) return;
    setExportBusy(true);
    setExportError("");
    try {
      const blob = await fetchVatReportExportCsv(
        start,
        end,
        bucket,
        branchId?.trim() || undefined,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vat-report-${start}-to-${end}-${bucket}.csv`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      // requestBinary already raises a toast for HTTP problems.
      setExportError(
        e instanceof Error ? e.message : "Could not download the VAT report.",
      );
    } finally {
      setExportBusy(false);
    }
  }, [from, to, bucket, branchId]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="VAT report"
        description="You need permission to view finance reports. Ask an administrator to grant it."
        backHref={APP_ROUTES.business}
        backLabel="Back to business"
      />
    );
  }

  const rows = report?.byTaxCode ?? [];

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
      <DashboardPageHero
        icon={ReceiptText}
        eyebrow="Finance"
        title="VAT report"
        description="The VAT you collected, reversed, and need to remit for the period you choose."
      >
        <Button
          type="button"
          variant="outline"
          disabled={rangeInvalid || exportBusy}
          onClick={() => void onDownloadCsv()}
          className="h-11 gap-1.5 rounded-xl px-3 text-[13px] font-semibold sm:h-8"
        >
          {exportBusy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="size-3.5" aria-hidden />
          )}
          Download CSV
        </Button>
      </DashboardPageHero>

      <section className={cn(HUB_SURFACE, "p-4")}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 sm:max-w-[12rem]">
            <span className={dashboardLabelClass()}>From</span>
            <input
              type="date"
              className={dashboardInputClass()}
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Period start date"
            />
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 sm:max-w-[12rem]">
            <span className={dashboardLabelClass()}>To</span>
            <input
              type="date"
              className={dashboardInputClass()}
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              aria-label="Period end date"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className={dashboardLabelClass()}>Group by</span>
            <div className={cn("inline-flex rounded-xl border p-0.5", HUB_BORDER)}>
              {BUCKET_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBucket(option)}
                  aria-pressed={bucket === option}
                  className={cn(
                    "h-11 rounded-lg px-3.5 text-[13px] font-semibold capitalize transition-colors sm:h-8",
                    bucket === option
                      ? "bg-[var(--pos-primary,#0f766e)] text-white"
                      : "text-[#344054] hover:bg-black/[0.04]",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <p className={cn("pb-2 text-[12px]", HUB_MUTED)}>
            Scope: {branchName || "All branches"}
          </p>
        </div>
        {rangeInvalid ? (
          <DashboardFeedback
            kind="error"
            className="mt-3"
            text="The start date must be on or before the end date."
          />
        ) : exportError ? (
          <DashboardFeedback kind="error" className="mt-3" text={exportError} />
        ) : null}
      </section>

      {rangeInvalid ? null : (
        <>
          {summaryLoading && !report ? (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(HUB_CARD, "h-[104px] animate-pulse")}
                />
              ))}
            </div>
          ) : report ? (
            <>
              {summaryError ? (
                <DashboardFeedback kind="error" text={summaryError} />
              ) : null}

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="VAT payable"
                  value={formatMoney(report.vatPayable, currency)}
                  hint="Collected minus reversed — what you remit to KRA"
                  emphasis
                />
                <StatCard
                  label="VAT collected"
                  value={formatMoney(report.vatCollected, currency)}
                  hint="Charged on sales this period"
                />
                <StatCard
                  label="VAT reversed"
                  value={formatMoney(report.vatReversed, currency)}
                  hint="Removed by voids and refunds"
                />
                <StatCard
                  label="Net revenue"
                  value={formatMoney(report.netRevenue, currency)}
                  hint="Sales revenue, net of VAT"
                />
              </div>

              <section className={cn(HUB_SURFACE)}>
                <div
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5",
                    HUB_BORDER,
                  )}
                >
                  <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[#101828]">
                    VAT by tax class
                  </h2>
                  <span className={cn("text-[12px]", HUB_MUTED)}>
                    {rows.length === 0
                      ? "No sales"
                      : `${rows.length} tax class${rows.length === 1 ? "" : "es"}`}
                  </span>
                </div>

                {rows.length === 0 ? (
                  <p
                    className={cn(
                      "px-4 py-10 text-center text-[13px]",
                      HUB_MUTED,
                    )}
                  >
                    No sales in this period.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[28rem] text-left text-[13px]">
                      <thead className={cn("border-b", HUB_BORDER)}>
                        <tr
                          className={cn(
                            "text-[11px] font-semibold uppercase tracking-[0.08em]",
                            HUB_MUTED,
                          )}
                        >
                          <th className="px-4 py-2.5 font-semibold">
                            Tax class
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold">
                            Taxable amount
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold">
                            VAT
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold">
                            Lines
                          </th>
                        </tr>
                      </thead>
                      <tbody className={cn("divide-y", HUB_DIVIDE)}>
                        {rows.map((row: VatReportTaxCodeRow, index) => (
                          <tr key={`${row.taxCode}-${index}`}>
                            <td className="px-4 py-2.5 font-medium text-[#101828]">
                              {taxCodeLabel(row.taxCode)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-[#344054]">
                              {formatMoney(row.taxableAmount, currency)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-[#101828]">
                              {formatMoney(row.taxAmount, currency)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-[#344054]">
                              {row.lineCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : summaryError ? (
            <DashboardFeedback kind="error" text={summaryError} />
          ) : null}

          <section className={cn(HUB_SURFACE)}>
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5",
                HUB_BORDER,
              )}
            >
              <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[#101828]">
                Breakdown by {bucket}
              </h2>
              <span className={cn("text-[12px]", HUB_MUTED)}>
                {bucketsError
                  ? "—"
                  : buckets.length === 0
                    ? "No activity"
                    : `${buckets.length} bucket${buckets.length === 1 ? "" : "s"}`}
              </span>
            </div>

            {bucketsError ? (
              <DashboardFeedback
                kind="error"
                className="m-4"
                text={bucketsError}
              />
            ) : bucketsLoading && buckets.length === 0 ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-7 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)]"
                  />
                ))}
              </div>
            ) : buckets.length === 0 ? (
              <p className={cn("px-4 py-6 text-center text-[13px]", HUB_MUTED)}>
                No activity in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-[13px]">
                  <thead className={cn("border-b", HUB_BORDER)}>
                    <tr
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-[0.08em]",
                        HUB_MUTED,
                      )}
                    >
                      <th className="px-4 py-2.5 font-semibold">Period</th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        VAT collected
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        VAT reversed
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        VAT payable
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        Net revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", HUB_DIVIDE)}>
                    {buckets.map((row, index) => (
                      <tr key={`${row.periodStart}-${index}`}>
                        <td className="px-4 py-2.5 font-medium tabular-nums text-[#101828]">
                          {bucketLabel(row, bucket)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#344054]">
                          {formatMoney(row.vatCollected, currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#344054]">
                          {formatMoney(row.vatReversed, currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#101828]">
                          {formatMoney(row.vatPayable, currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#344054]">
                          {formatMoney(row.netRevenue, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
