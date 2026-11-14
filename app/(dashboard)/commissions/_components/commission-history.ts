import type { StaffLedgerEntryRecord } from "@/lib/service-business-api";

const whole = (n: number) => `Ksh ${Math.round(n).toLocaleString("en-KE")}`;

/** "PERCENT 40 (staff) shared" → how the amount was arrived at, in the owner's words. */
function ruleInWords(rule: string | null, base: number | null): string | null {
  if (!rule) return null;
  const shared = /\bshared\b/.test(rule);
  const toHelpers = /\bless ([0-9.]+) to helpers\b/.exec(rule)?.[1];
  const productCost = /\bafter ([0-9.]+) product cost\b/.exec(rule)?.[1];
  const [, type = "", value = "", origin = ""] = /^([A-Z_]+)\s*([0-9.]*)\s*(?:\(([^)]*)\))?/.exec(rule) ?? [];
  const from =
    origin === "service" ? "the service's own rate" : origin === "staff" ? "their plan" : origin === "product" ? "products sold" : "";
  let text: string;
  if (type === "SET") text = `set at ${whole(Number(value))} when the service was done`;
  else if (type === "PERCENT") {
    const on = base != null ? Math.max(0, base - Number(productCost ?? 0)) : null;
    text = `${Number(value)}%${on != null ? ` of ${whole(on)}` : ""}${from ? `, ${from}` : ""}`;
  }
  else if (type === "NONE") text = "no commission set for them";
  else if (value) text = `${whole(Number(value))} a service${from ? `, ${from}` : ""}`;
  else return null;
  if (productCost) text = `${text}, after ${whole(Number(productCost))} product cost`;
  if (toHelpers) return `${text}, less ${whole(Number(toHelpers))} paid to helpers`;
  return shared ? `${text}, shared work` : text;
}

const PAID_BY: Record<string, string> = { DRAWER: "cash from the till", MPESA: "M-Pesa", OTHER: "another way" };

/**
 * One line of a person's earnings history: what happened, and the detail an owner would ask for
 * (how a commission was worked out, how a payout was paid, why an adjustment was made).
 */
export function describeLedgerEntry(entry: StaffLedgerEntryRecord): { what: string; detail: string | null } {
  switch (entry.kind) {
    case "COMMISSION":
      return {
        what: entry.source === "PRODUCT" ? "Commission on products" : "Commission on a service",
        detail: ruleInWords(entry.rule, entry.baseAmount),
      };
    case "TIP":
      return { what: "Tip", detail: null };
    case "PAYOUT": {
      const how = entry.payoutMethod ? PAID_BY[entry.payoutMethod] ?? null : null;
      const parts = [how, entry.reference ? `ref ${entry.reference}` : null].filter(Boolean);
      return {
        what: entry.amount > 0 ? "Payout undone" : "Paid out",
        detail: parts.length > 0 ? parts.join(", ") : entry.reason,
      };
    }
    case "REVERSAL":
      return {
        what: entry.bucket === "TIPS" ? "Tip taken back" : "Commission taken back",
        detail: entry.reason,
      };
    case "ADJUSTMENT":
      return { what: entry.amount < 0 ? "Deduction" : "Added by hand", detail: entry.reason };
    default:
      return { what: "Entry", detail: entry.reason };
  }
}

/** Newest first, the way a statement is read. */
export function newestFirst(entries: readonly StaffLedgerEntryRecord[]): StaffLedgerEntryRecord[] {
  return [...entries].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0));
}

/** The first day of the period that ends today: today, the last 7 days, or this month so far. */
export function periodStart(preset: "today" | "week" | "month", today: string): string {
  if (preset === "today") return today;
  if (preset === "month") return `${today.slice(0, 8)}01`;
  const at = new Date(`${today}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() - 6);
  return at.toISOString().slice(0, 10);
}
