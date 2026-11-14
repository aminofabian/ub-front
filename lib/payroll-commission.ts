import type { CommissionStatement } from "./service-business-api";

/**
 * Commission on the payroll page. A service shop pays its team by commission and tips, not (or
 * not only) by salary, so a pay run that showed salaries alone would say the team earned nothing.
 * These helpers turn the staff ledger's statement for a month into what the pay run shows: what
 * each person earned, what has been handed over, and what the shop still owes them.
 */

const pad2 = (n: number) => String(n).padStart(2, "0");

/** First and last day of a month as YYYY-MM-DD (month is 1 to 12). */
export function payrollMonthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad2(month)}-01`, to: `${year}-${pad2(month)}-${pad2(lastDay)}` };
}

const round = (n: number) => Math.round(n * 100) / 100;

export type CommissionPerson = {
  staffProfileId: string;
  displayName: string;
  servicesDone: number;
  /** What their work brought the shop in the month. */
  broughtIn: number;
  /** Owed to them from before the month began (negative when they had been overpaid). */
  broughtForward: number;
  commission: number;
  tips: number;
  /** Commission and tips taken back by voids and refunds, and manual adjustments, netted together. */
  corrections: number;
  /** Commission + tips + corrections: what the month added to what they are owed. */
  earned: number;
  paidOut: number;
  /** What the shop owes them at the end of the month; zero when nothing or when overpaid. */
  owed: number;
  /** Paid more than earned so far; comes off what they earn next. */
  overpaid: number;
};

export type CommissionMonth = {
  people: CommissionPerson[];
  earned: number;
  commission: number;
  tips: number;
  paidOut: number;
  owed: number;
  broughtForward: number;
  /** How much of everything owed during the month (brought forward plus earned) has been handed over, 0 to 100. */
  paidPercent: number;
};

/** People who earned, were paid or are owed something in the month, biggest earner first. */
export function commissionMonth(statement: Pick<CommissionStatement, "rows"> | null | undefined): CommissionMonth {
  const people: CommissionPerson[] = [];
  for (const row of statement?.rows ?? []) {
    const corrections = round(row.reversals + row.adjustments);
    const earned = round(row.commission + row.tips + corrections);
    const idle = earned === 0 && row.paid === 0 && row.opening === 0 && row.closing === 0 && row.servicesDone === 0;
    if (idle) continue;
    people.push({
      staffProfileId: row.staffProfileId,
      displayName: row.displayName,
      servicesDone: row.servicesDone,
      broughtIn: round(row.serviceRevenue),
      broughtForward: round(row.opening),
      commission: round(row.commission),
      tips: round(row.tips),
      corrections,
      earned,
      paidOut: round(row.paid),
      owed: round(Math.max(row.closing, 0)),
      overpaid: round(Math.max(-row.closing, 0)),
    });
  }
  people.sort((a, b) => b.earned - a.earned || a.displayName.localeCompare(b.displayName));
  const sum = (pick: (p: CommissionPerson) => number) => round(people.reduce((total, p) => total + pick(p), 0));
  const earned = sum((p) => p.earned);
  const paidOut = sum((p) => p.paidOut);
  const broughtForward = sum((p) => Math.max(p.broughtForward, 0));
  const due = broughtForward + earned;
  return {
    people,
    earned,
    commission: sum((p) => p.commission),
    tips: sum((p) => p.tips),
    paidOut,
    owed: sum((p) => p.owed),
    broughtForward,
    paidPercent: due > 0 ? Math.max(0, Math.min(100, Math.round((paidOut / due) * 100))) : 0,
  };
}
