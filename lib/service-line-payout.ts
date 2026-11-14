import type { CommissionType } from "@/lib/service-business-api";

/** A person's commission rule: the service's own, otherwise their plan. Null when neither is set. */
export type CommissionRule = { type: CommissionType; rate: number } | null;

export type HelperCut = {
  staffProfileId: string;
  /** Whole shillings set at the till. Null means they are paid by their rule. */
  amount: number | null;
  /** Their percent of the service, the way the helpers call stores it. */
  sharePercent: number;
};

export type ServiceLinePayout = {
  /** The lead first, then each helper. Null when that person is on a rule we cannot see. */
  takes: { staffProfileId: string; amount: number | null }[];
  /** Price less every take. Null when any take is unknown. */
  shop: number | null;
};

const money = (value: number) => Math.round(value * 100) / 100;

/** Whole shillings, half up, the way commission is posted. */
const wholeShillings = (value: number) => Math.round(value);

/**
 * What the person leading a service earns on it when nobody helps: their set amount, otherwise
 * their rule on the whole price. This is what helpers are paid out of. Null when their rule
 * cannot be seen.
 */
export function leadEarnsAlone(input: {
  price: number;
  leadAmount: number | null;
  rule: CommissionRule;
  quantity?: number;
  /** Taken off the price before commission, where the shop pays commission after product cost. */
  productCost?: number;
}): number | null {
  const price = money(input.price);
  return takeOf(input.leadAmount, earnsOn(price, 1, costOf(input.productCost, price)), 1, input.quantity ?? 1, input.rule);
}

/** The product cost that comes off a line: never negative, never more than the line. */
function costOf(productCost: number | undefined, price: number): number {
  return Math.min(Math.max(0, money(productCost ?? 0)), price);
}

/** What a person's commission is worked out on: their part of the price less their part of the product cost. */
function earnsOn(base: number, fraction: number, productCost: number): number {
  return Math.max(0, money(base - money(productCost * fraction)));
}

/**
 * What each person on one service gets, and what the shop keeps.
 * The same split `StaffEarningsService` records. A helper on a set amount is paid out of what
 * the lead earns, never out of the shop's part: the lead earns on the whole price and keeps what
 * is left after those helpers. A helper paid by their own plan takes a share of the price, and
 * the lead earns on the rest. `productCost`, where the shop pays commission after product cost,
 * comes off before any rule is applied and stays with the shop.
 */
export function serviceLinePayout(input: {
  price: number;
  leadId: string;
  leadAmount: number | null;
  helpers: readonly HelperCut[];
  ruleFor: (staffProfileId: string) => CommissionRule;
  quantity?: number;
  productCost?: number;
}): ServiceLinePayout {
  const price = money(input.price);
  const productCost = costOf(input.productCost, price);
  const quantity = input.quantity ?? 1;
  let leadBase = price;
  let leadFraction = 1;
  let toHelpers = 0;
  const helperBases = input.helpers.map((helper) => {
    if (helper.amount != null) {
      toHelpers = money(toHelpers + helper.amount);
      return { helper, base: 0, fraction: 0 };
    }
    const fraction = money4(helper.sharePercent / 100);
    const base = money(price * fraction);
    leadBase = money(leadBase - base);
    leadFraction = money4(leadFraction - fraction);
    return { helper, base, fraction };
  });
  let leadTake = takeOf(input.leadAmount, earnsOn(leadBase, leadFraction, productCost), leadFraction, quantity, input.ruleFor(input.leadId));
  if (input.leadAmount == null && leadTake != null && leadTake > 0 && toHelpers > 0) {
    leadTake = Math.max(0, money(leadTake - toHelpers));
  }
  const takes = [
    { staffProfileId: input.leadId, amount: leadTake },
    ...helperBases.map(({ helper, base, fraction }) => ({
      staffProfileId: helper.staffProfileId,
      amount: takeOf(helper.amount, earnsOn(base, fraction, productCost), fraction, quantity, input.ruleFor(helper.staffProfileId)),
    })),
  ];
  const known = takes.every((row) => row.amount != null);
  const paid = takes.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  return { takes, shop: known ? money(price - paid) : null };
}

function takeOf(
  setAmount: number | null,
  base: number,
  fraction: number,
  quantity: number,
  rule: CommissionRule,
): number | null {
  if (setAmount != null) return money(setAmount);
  if (!rule || base <= 0) return rule ? 0 : null;
  const raw = rule.type === "PERCENT" ? (base * rule.rate) / 100 : rule.rate * quantity * fraction;
  return Math.min(wholeShillings(raw), Math.floor(base));
}

function money4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
