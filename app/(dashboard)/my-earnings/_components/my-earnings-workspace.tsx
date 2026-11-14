"use client";

import { Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { fetchMyEarnings, type MyEarnings, type StaffLedgerEntryRecord } from "@/lib/service-business-api";
import { cn } from "@/lib/utils";

const kes = (n: number) => formatMoney(n, "KES");

const time = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", hour: "numeric", minute: "2-digit", hour12: true }).format(
    new Date(iso),
  );
const day = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", weekday: "short", day: "numeric", month: "short" }).format(
    new Date(iso),
  );

/** What a row in the staff ledger means to the person it belongs to. */
export function describeEntry(entry: Pick<StaffLedgerEntryRecord, "kind" | "source" | "reason" | "payoutMethod">): string {
  switch (entry.kind) {
    case "COMMISSION":
      return entry.source === "PRODUCT" ? "Commission on a product you sold" : "Commission on a service";
    case "TIP":
      return "Tip";
    case "PAYOUT":
      return entry.payoutMethod === "MPESA" ? "Paid to you by M-Pesa" : entry.payoutMethod === "DRAWER" ? "Paid to you in cash" : "Paid to you";
    case "REVERSAL":
      return entry.reason ? `Taken back: ${entry.reason.toLowerCase()}` : "Taken back";
    case "ADJUSTMENT":
      return entry.reason ? `Adjustment: ${entry.reason}` : "Adjustment";
    default:
      return "Entry";
  }
}

/**
 * A staff member's own page: what the shop owes them, what they made today, who is booked with
 * them, and every entry behind the number. It only ever shows their own figures.
 */
export function MyEarningsWorkspace() {
  const [data, setData] = useState<MyEarnings | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setData(await fetchMyEarnings());
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoadError title="My earnings" message="Could not load your earnings. Check your connection." onRetry={() => void load()} />
      </div>
    );
  }
  if (data === undefined) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoading label="Loading your earnings…" />
      </div>
    );
  }
  if (data === null) {
    return (
      <div className={DASHBOARD_MAX}>
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">You are not on the team yet</p>
          <p className={dashboardHintClass()}>
            Earnings are kept for people who serve customers. Ask the owner to add you to the team.
          </p>
        </div>
      </div>
    );
  }

  const plan =
    data.commissionType === "PERCENT"
      ? `You earn ${data.commissionRate}% of each service you do.`
      : data.commissionType === "FIXED"
        ? `You earn ${kes(data.commissionRate ?? 0)} for each service you do.`
        : "No commission is set for you yet.";

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero icon={Wallet} title={`Hello, ${data.displayName.split(/\s+/)[0]}`} description={plan}>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          Refresh
        </Button>
      </DashboardPageHero>

      <section className={DASHBOARD_SECTION_SURFACE} aria-label="Owed to you">
        <p className={dashboardLabelClass()}>The shop owes you</p>
        <p className="font-mono text-4xl font-semibold tabular-nums leading-tight">{kes(data.owed)}</p>
        <p className={dashboardHintClass()}>Commission and tips, less what you have been paid.</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Services today", String(data.servicesToday)],
            ["Commission today", kes(data.commissionToday)],
            ["Tips today", kes(data.tipsToday)],
            ["Paid to you today", kes(data.paidToday)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className={dashboardHintClass()}>{label}</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={DASHBOARD_SECTION_SURFACE} aria-label="Booked with you today">
        <h2 className={dashboardLabelClass()}>Booked with you today ({data.bookingsToday.length})</h2>
        {data.bookingsToday.length === 0 ? (
          <p className={cn("mt-2", dashboardHintClass())}>Nobody else is booked with you today.</p>
        ) : (
          <ul className="mt-1 divide-y">
            {data.bookingsToday.map((b) => (
              <li key={b.ticketId} className="flex items-baseline gap-3 py-2 text-sm">
                <span className="w-20 shrink-0 font-mono font-semibold tabular-nums">{time(b.start)}</span>
                <span className="min-w-0">
                  <span className="font-medium">{b.customerName}</span>
                  <span className={cn("block", dashboardHintClass())}>{b.services}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={DASHBOARD_SECTION_SURFACE} aria-label="Your last 30 days">
        <h2 className={dashboardLabelClass()}>Your last 30 days</h2>
        {data.entries.length === 0 ? (
          <p className={cn("mt-2", dashboardHintClass())}>Nothing yet. Your first service will show here.</p>
        ) : (
          <ul className="mt-1 divide-y">
            {data.entries.map((entry) => (
              <li key={entry.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block">{describeEntry(entry)}</span>
                  <span className={dashboardHintClass()}>
                    {day(entry.occurredAt)} · {time(entry.occurredAt)}
                  </span>
                </span>
                <span className={cn("shrink-0 font-mono tabular-nums", entry.amount < 0 && "text-red-700")}>
                  {entry.amount < 0 ? "−" : "+"}
                  {kes(Math.abs(entry.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className={cn("mt-2", dashboardHintClass())}>If something looks wrong, tell the owner. Entries are never edited; a mistake is put right with a new line.</p>
      </section>
    </div>
  );
}
