"use client";

import { useEffect, useState } from "react";

import { dashboardHintClass } from "@/components/dashboard-page-ui";
import { formatMoney } from "@/lib/money";
import { fetchStaffLedgerEntries, type StaffLedgerEntryRecord } from "@/lib/service-business-api";
import { cn } from "@/lib/utils";

import { describeLedgerEntry, newestFirst } from "./commission-history";

const kes = (n: number) => formatMoney(n, "KES");

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));

/**
 * Everything that changed what one person is owed in the period, newest first: each commission
 * and how it was worked out, each tip, each payout, each adjustment and anything taken back.
 */
export function StaffHistory({
  staffProfileId,
  name,
  from,
  to,
}: {
  staffProfileId: string;
  name: string;
  from: string;
  to: string;
}) {
  const [entries, setEntries] = useState<StaffLedgerEntryRecord[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setEntries(null);
    setFailed(false);
    fetchStaffLedgerEntries(staffProfileId, from, to)
      .then((found) => {
        if (live) setEntries(newestFirst(found));
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [staffProfileId, from, to]);

  if (failed) {
    return <p className={cn("px-2.5 py-2", dashboardHintClass())}>Could not load {name}&apos;s history. Close it and open it again.</p>;
  }
  if (entries == null) {
    return <p className={cn("px-2.5 py-2", dashboardHintClass())} aria-busy="true">Loading {name}&apos;s history…</p>;
  }
  if (entries.length === 0) {
    return (
      <p className={cn("px-2.5 py-2", dashboardHintClass())}>
        Nothing for {name} in this period. Choose an earlier From date to look further back.
      </p>
    );
  }

  return (
    <ol aria-label={`${name}'s history`} className="max-h-[22rem] overflow-y-auto">
      {entries.map((entry) => {
        const { what, detail } = describeLedgerEntry(entry);
        return (
          <li
            key={entry.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-t border-[var(--op-rule)] px-2.5 py-1.5 first:border-t-0 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto]"
          >
            <span className="col-span-2 font-mono text-[11.5px] tabular-nums text-[var(--op-muted)] sm:col-span-1 sm:pt-px">
              {when(entry.occurredAt)}
            </span>
            <span className="min-w-0 text-[13px]">
              <span className="font-medium text-[var(--op-ink)]">{what}</span>
              {detail ? <span className="text-[var(--op-muted)]"> · {detail}</span> : null}
            </span>
            <span
              className={cn(
                "whitespace-nowrap text-right font-mono text-[12.5px] tabular-nums tracking-[-0.02em]",
                entry.amount < 0 ? "text-[var(--op-highlight)]" : "text-[var(--op-ink)]",
              )}
            >
              {entry.amount > 0 ? "+" : ""}
              {kes(entry.amount)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
