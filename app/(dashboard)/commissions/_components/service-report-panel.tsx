"use client";

import { useEffect, useState } from "react";

import {
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  dashboardHintClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { fetchServiceReport, sendEarningsSms, type ServiceReport } from "@/lib/service-business-api";
import { cn } from "@/lib/utils";

const kes = (n: number) => formatMoney(n, "KES");
const HEAD = "whitespace-nowrap px-2.5 py-1.5 text-left text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted)]";
const MONEY = "whitespace-nowrap px-2.5 py-1.5 text-right font-mono text-[12.5px] tabular-nums tracking-[-0.02em]";
const COUNT = "whitespace-nowrap px-2.5 py-1.5 text-right font-mono text-[12.5px] tabular-nums";
const ACTION = "h-11 rounded-[2px] px-2 text-[12px] shadow-none sm:h-7";

const FIGURES = [
  { key: "revenue", label: "Sold" },
  { key: "commission", label: "Commission" },
  { key: "productCost", label: "Products used" },
  { key: "contribution", label: "Left for the shop" },
] as const;

function hours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * What each service and each person brought in over the period, after commission and the
 * products a service uses. Read-only; the numbers come from sales and the staff ledger.
 */
export function ServiceReportPanel({ from, to, canText }: { from: string; to: string; canText: boolean }) {
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [texting, setTexting] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setFailed(false);
    void fetchServiceReport(from, to)
      .then((next) => {
        if (live) setReport(next);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [from, to, attempt]);

  async function text(staffProfileId: string, name: string) {
    if (!window.confirm(`Text ${name} what they earned today? This uses one SMS credit.`)) return;
    setTexting(staffProfileId);
    setNote(null);
    try {
      const out = await sendEarningsSms(staffProfileId);
      setNote(
        out.sent
          ? `Sent to ${name} (${out.phoneMasked}).`
          : `The text to ${name} was not sent. Check your SMS set-up.`,
      );
    } catch (err) {
      setNote(smsFailure(err));
    } finally {
      setTexting(null);
    }
  }

  if (failed) return <ReportFailed onRetry={() => setAttempt((n) => n + 1)} />;
  if (!report) return <ReportSkeleton />;
  if (report.services.length === 0 && report.staff.length === 0) return <ReportEmpty />;

  const both = report.services.length > 0 && report.staff.length > 0;

  return (
    <section className={DASHBOARD_TABLE_SURFACE} aria-labelledby="service-contribution-heading">
      <div className={DASHBOARD_TABLE_HEAD}>
        <h2 id="service-contribution-heading" className="text-[13px] font-semibold tracking-[-0.02em]">
          What the services brought in
        </h2>
      </div>
      <ReportFigures report={report} />
      <div className={cn("grid", both && "lg:grid-cols-2 lg:divide-x lg:divide-[var(--op-rule)]")}>
        {report.services.length > 0 ? <ServiceBreakdown rows={report.services} /> : null}
        {report.staff.length > 0 ? (
          <StaffBreakdown
            rows={report.staff}
            canText={canText}
            texting={texting}
            onText={text}
            className={both ? "border-t border-[var(--op-rule)] lg:border-t-0" : undefined}
          />
        ) : null}
      </div>
      <p className={cn("border-t border-[var(--op-rule)] px-3 py-2", dashboardHintClass())}>
        Time worked is the planned length of each service. Products used are counted at the latest delivery cost, for
        services that list what they use.
      </p>
      {note ? (
        <p role="status" className="border-t border-[var(--op-rule-soft)] px-3 py-2 text-[13px]">
          {note}
        </p>
      ) : null}
    </section>
  );
}

function smsFailure(err: unknown): string {
  const detail = err instanceof ApiRequestError ? (err.payload as { detail?: unknown } | null)?.detail : null;
  return typeof detail === "string" ? detail : "The text was not sent.";
}

function ReportSkeleton() {
  return (
    <div className="h-36 animate-pulse rounded-[2px] bg-[var(--op-surface)] ring-1 ring-[var(--op-rule)]" aria-busy="true">
      <span className="sr-only">Loading the services report</span>
    </div>
  );
}

function ReportFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={cn(DASHBOARD_TABLE_SURFACE, "flex flex-wrap items-center justify-between gap-2 px-3 py-3")}>
      <p className="text-[13px]">Could not load the services report.</p>
      <Button type="button" variant="outline" size="sm" className={ACTION} onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function ReportEmpty() {
  return (
    <section className={DASHBOARD_TABLE_SURFACE}>
      <div className={DASHBOARD_TABLE_HEAD}>
        <h2 className="text-[13px] font-semibold tracking-[-0.02em]">What the services brought in</h2>
      </div>
      <p className={cn("px-3 py-3", dashboardHintClass())}>No services were sold in this period.</p>
    </section>
  );
}

function ReportFigures({ report }: { report: ServiceReport }) {
  return (
    <dl className="grid grid-cols-2 gap-px border-b border-[var(--op-rule)] bg-[var(--op-rule)] sm:grid-cols-4">
      {FIGURES.map((figure) => (
        <div key={figure.key} className="bg-[var(--op-surface)] px-3 py-2">
          <dt className="text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted)]">{figure.label}</dt>
          <dd
            className={cn(
              "mt-1 truncate font-mono text-[15px] font-semibold tabular-nums leading-none tracking-[-0.03em]",
              figure.key === "contribution" && report.contribution > 0 && "text-[var(--op-accent)]",
            )}
            title={kes(report[figure.key])}
          >
            {kes(report[figure.key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ServiceBreakdown({ rows }: { rows: ServiceReport["services"] }) {
  return (
    <div className="min-w-0">
      <h3 className="px-2.5 pt-2 text-[12px] font-semibold tracking-[-0.02em]">By service</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--op-rule)] bg-[var(--op-bg)]">
              <th className={HEAD}>Service</th>
              <th className={cn(HEAD, "text-right")}>Times</th>
              <th className={cn(HEAD, "text-right")}>Sold</th>
              <th className={cn(HEAD, "text-right")}>Commission</th>
              <th className={cn(HEAD, "text-right")}>Products</th>
              <th className={cn(HEAD, "text-right")}>Left</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.serviceId} className="border-b border-[var(--op-rule)] last:border-b-0">
                <td className="max-w-[12rem] truncate px-2.5 py-1.5" title={row.name}>
                  {row.name}
                </td>
                <td className={COUNT}>{row.timesDone}</td>
                <td className={MONEY}>{kes(row.revenue)}</td>
                <td className={MONEY}>{kes(row.commission)}</td>
                <td className={MONEY}>{kes(row.productCost)}</td>
                <td className={cn(MONEY, "font-semibold")}>{kes(row.contribution)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StaffBreakdown({
  rows,
  canText,
  texting,
  onText,
  className,
}: {
  rows: ServiceReport["staff"];
  canText: boolean;
  texting: string | null;
  onText: (staffProfileId: string, name: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <h3 className="px-2.5 pt-2 text-[12px] font-semibold tracking-[-0.02em]">By person</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--op-rule)] bg-[var(--op-bg)]">
              <th className={HEAD}>Who</th>
              <th className={cn(HEAD, "text-right")}>Services</th>
              <th className={cn(HEAD, "text-right")}>Time worked</th>
              <th className={cn(HEAD, "text-right")}>Sold</th>
              <th className={cn(HEAD, "text-right")}>Redone free</th>
              {canText ? <th className={HEAD}><span className="sr-only">Text</span></th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.staffProfileId} className="border-b border-[var(--op-rule)] last:border-b-0">
                <td className="max-w-[12rem] truncate px-2.5 py-1.5 font-medium" title={row.displayName}>
                  {row.displayName}
                </td>
                <td className={COUNT}>{row.servicesDone}</td>
                <td className={COUNT}>{hours(row.minutes)}</td>
                <td className={MONEY}>{kes(row.revenue)}</td>
                <td className={COUNT}>{row.redos}</td>
                {canText ? (
                  <td className="px-2.5 py-1 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className={ACTION}
                      disabled={texting === row.staffProfileId}
                      aria-label={`Text ${row.displayName} today's earnings`}
                      onClick={() => onText(row.staffProfileId, row.displayName)}
                    >
                      {texting === row.staffProfileId ? "Sending…" : "Text today"}
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
