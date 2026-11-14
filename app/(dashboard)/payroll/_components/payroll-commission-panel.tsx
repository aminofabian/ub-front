"use client";

import { ArrowRight, Percent } from "lucide-react";
import Link from "next/link";

import { dashboardHintClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import type { CommissionMonth } from "@/lib/payroll-commission";
import { cn } from "@/lib/utils";

/** Whole shillings read as people say them: "Ksh 900", not "Ksh 900.00". */
const kes = (n: number) => formatMoney(n, "KES").replace(/\.00$/, "");

/**
 * Commission and tips for the month on the pay run, for a shop whose team is paid by what they
 * do. It answers the three things an owner asks at month end: what did each person earn, what
 * have I already handed over, and what do I still owe. Paying out stays on the Commissions page;
 * this is the month's picture beside the salaries.
 */
export function PayrollCommissionPanel({
  month,
  monthLabel,
  loading,
  failed,
  canSelect,
  onSelectPerson,
  canPayOut,
  payingId,
  onPayOut,
}: {
  month: CommissionMonth;
  /** "November 2026". */
  monthLabel: string;
  loading: boolean;
  failed: boolean;
  /** Staff profiles that have a row in the pay run below, so a tap can open that person. */
  canSelect: ReadonlySet<string>;
  onSelectPerson: (staffProfileId: string) => void;
  /** This person may hand commission over (`commissions.payout`). */
  canPayOut: boolean;
  /** The person whose pay-out is being opened, while today's balance is read. */
  payingId: string | null;
  onPayOut: (staffProfileId: string) => void;
}) {
  // Each person's bar is their month against the biggest month on the team.
  const widest = Math.max(1, ...month.people.map((p) => Math.max(p.broughtForward, 0) + Math.max(p.earned, 0)));

  return (
    <section aria-label={`Commission and tips, ${monthLabel}`} className="rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--op-rule)] px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold tracking-[-0.02em] text-[var(--op-ink)]">
          <Percent className="size-3.5 text-[var(--op-muted)]" aria-hidden />
          Commission and tips
          <span className="font-normal text-[var(--op-muted)]">· {monthLabel}</span>
        </h2>
        <Link
          href={APP_ROUTES.commissions}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--op-accent)] underline-offset-2 hover:underline"
        >
          {canPayOut ? "Open Commissions" : "Pay out in Commissions"} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </header>

      {failed ? (
        <p className={cn(dashboardHintClass(), "px-3 py-3")}>Commission could not be loaded. The salaries below are not affected.</p>
      ) : loading ? (
        <p className={cn(dashboardHintClass(), "px-3 py-3")}>Adding up the month…</p>
      ) : month.people.length === 0 ? (
        <p className={cn(dashboardHintClass(), "px-3 py-3")}>
          Nobody earned commission or tips in {monthLabel}, and nothing is owed from before.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 border-b border-[var(--op-rule)] lg:grid-cols-4">
            <Figure
              label="Earned this month"
              value={kes(month.earned)}
              note={
                month.tips > 0 ? `${kes(month.commission)} commission, ${kes(month.tips)} tips` : `${kes(month.commission)} commission`
              }
            />
            <Figure label="Paid out" value={kes(month.paidOut)} note={`${month.paidPercent}% of what was due`} />
            <Figure
              label="Still owed"
              value={kes(month.owed)}
              note={month.owed > 0 ? "to hand over" : "all settled"}
              hot={month.owed > 0}
            />
            <Figure
              label="Brought forward"
              value={kes(month.broughtForward)}
              note={month.broughtForward > 0 ? "owed from earlier months" : "nothing from earlier"}
            />
          </dl>

          <div className="overflow-x-auto">
            <table className={cn("w-full text-[13px]", canPayOut ? "min-w-[40rem]" : "min-w-[34rem]")}>
              <thead>
                <tr className="bg-[var(--op-bg)] text-left text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted)]">
                  <th scope="col" className="px-3 py-1.5 font-semibold">
                    Who
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                    Done
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                    Brought in
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                    Earned
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                    Paid out
                  </th>
                  <th scope="col" className="px-3 py-1.5 text-right font-semibold">
                    Still owed
                  </th>
                  {canPayOut ? (
                    <th scope="col" className="py-1.5 pr-3">
                      <span className="sr-only">Pay out</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {month.people.map((person) => {
                  const due = Math.max(person.broughtForward, 0) + Math.max(person.earned, 0);
                  const paidShare = due > 0 ? Math.min(1, person.paidOut / due) : 0;
                  const selectable = canSelect.has(person.staffProfileId);
                  return (
                    <tr
                      key={person.staffProfileId}
                      tabIndex={selectable ? 0 : undefined}
                      onClick={selectable ? () => onSelectPerson(person.staffProfileId) : undefined}
                      onKeyDown={
                        selectable
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onSelectPerson(person.staffProfileId);
                              }
                            }
                          : undefined
                      }
                      className={cn("border-t border-[var(--op-rule)]", selectable && "cursor-pointer hover:bg-[var(--op-bg)]")}
                    >
                      <th scope="row" className="px-3 py-1.5 text-left font-medium">
                        <span className="block max-w-[14rem] truncate text-[var(--op-ink)]">{person.displayName}</span>
                        {/* How far through paying this person the shop is: paid in green, the rest still to hand over. */}
                        <span
                          aria-hidden
                          className="mt-1 block h-[3px] max-w-[14rem] bg-[color-mix(in_srgb,var(--op-ink,#121A16)_8%,transparent)]"
                          style={{ width: `${Math.max(8, Math.round((due / widest) * 100))}%` }}
                        >
                          <span className="block h-full bg-[var(--op-accent)]" style={{ width: `${Math.round(paidShare * 100)}%` }} />
                        </span>
                      </th>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{person.servicesDone}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{kes(person.broughtIn)}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                        {kes(person.earned)}
                        {person.tips > 0 || person.corrections !== 0 ? (
                          <span className="block font-sans text-[11px] text-[var(--op-muted)]">
                            {person.tips > 0 ? `with ${kes(person.tips)} tips` : ""}
                            {person.tips > 0 && person.corrections !== 0 ? ", " : ""}
                            {person.corrections !== 0 ? `${kes(person.corrections)} corrections` : ""}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{kes(person.paidOut)}</td>
                      <td
                        className={cn(
                          "px-3 py-1.5 text-right font-mono font-semibold tabular-nums",
                          person.owed > 0 && "text-[var(--op-highlight)]",
                        )}
                      >
                        {person.overpaid > 0 ? (
                          <>
                            {kes(0)}
                            <span className="block font-sans text-[11px] font-normal text-[var(--op-muted)]">
                              {kes(person.overpaid)} paid ahead
                            </span>
                          </>
                        ) : (
                          kes(person.owed)
                        )}
                      </td>
                      {canPayOut ? (
                        <td className="py-1.5 pr-3 text-right">
                          {person.owed > 0 ? (
                            <Button
                              size="sm"
                              className="h-8"
                              disabled={payingId != null}
                              onClick={(event) => {
                                // The row itself opens the person in the pay run; this button only pays.
                                event.stopPropagation();
                                onPayOut(person.staffProfileId);
                              }}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              {payingId === person.staffProfileId ? "Opening…" : "Pay out"}
                            </Button>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={cn(dashboardHintClass(), "border-t border-[var(--op-rule)] px-3 py-2")}>
            Commission and tips are paid out on their own, not with the salaries below. Still owed is the balance at the end of {monthLabel};
            a pay-out always uses what is owed today.
          </p>
        </>
      )}
    </section>
  );
}

function Figure({ label, value, note, hot = false }: { label: string; value: string; note?: string; hot?: boolean }) {
  return (
    <div className="border-r border-[var(--op-rule)] px-3 py-2 [&:nth-child(2n)]:border-r-0 [&:nth-child(-n+2)]:border-b lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(-n+2)]:border-b-0 lg:last:border-r-0">
      <dt className="text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted)]">{label}</dt>
      <dd className={cn("mt-0.5 font-mono text-lg font-semibold leading-tight tabular-nums text-[var(--op-ink)]", hot && "text-[var(--op-highlight)]")}>
        {value}
      </dd>
      {note ? <dd className={cn(dashboardHintClass(), "truncate")}>{note}</dd> : null}
    </div>
  );
}
