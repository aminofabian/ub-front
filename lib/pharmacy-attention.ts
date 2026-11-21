/**
 * The short version of the pharmacy's "needs attention" list, for places outside the Pharmacy
 * workspace (the business hub). Urgent things first: those stop a medicine being sold safely.
 */

import type { PharmacyDashboard } from "@/lib/pharmacy-api";

export type PharmacyAttention = {
  /** Things that stop a sale or put the licence at risk. */
  urgent: string[];
  /** Things to get to, but nothing is blocked. */
  routine: string[];
};

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function pharmacyAttention(
  dashboard: PharmacyDashboard | null | undefined,
  opts: { canReadStock: boolean },
): PharmacyAttention {
  const urgent: string[] = [];
  const routine: string[] = [];
  if (!dashboard) return { urgent, routine };
  const { medicines, stock } = dashboard;
  if (medicines.unclassified > 0) {
    urgent.push(n(medicines.unclassified, "medicine cannot be sold until it has a class", "medicines cannot be sold until they have a class"));
  }
  if (opts.canReadStock && stock.expired > 0) {
    urgent.push(n(stock.expired, "expired batch is still on the shelf", "expired batches are still on the shelf"));
  }
  if (opts.canReadStock && stock.medicineMissingDetails > 0) {
    urgent.push(n(stock.medicineMissingDetails, "medicine batch has no lot number or expiry date", "medicine batches have no lot number or expiry date"));
  }
  const days = dashboard.licenceDaysLeft;
  if (days != null && days < 0) {
    urgent.push("the premises licence date has passed");
  } else if (days != null && days <= 60) {
    routine.push(`the premises licence expires in ${n(days, "day", "days")}`);
  }
  const checks = dashboard.awaitingSecondCheck ?? 0;
  if (checks > 0) {
    routine.push(n(checks, "dispensing record is waiting for a second check", "dispensing records are waiting for a second check"));
  }
  if (opts.canReadStock && stock.quarantined > 0) {
    routine.push(n(stock.quarantined, "batch is in quarantine", "batches are in quarantine"));
  }
  if (opts.canReadStock && stock.shortDated > 0) {
    routine.push(`${n(stock.shortDated, "batch expires", "batches expire")} within ${stock.shortDatedDays} days`);
  }
  return { urgent, routine };
}

/** "A, B and C" with a capital first letter and a full stop. Empty for an empty list. */
export function sentenceFromList(parts: string[]): string {
  if (parts.length === 0) return "";
  const joined =
    parts.length === 1
      ? parts[0]!
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
}
