import { previewCommission, type CommissionType } from "./service-business-api";

/**
 * How a new person in a service shop is paid: a monthly salary, commission on the work they do,
 * or both. A receptionist is on a salary; a barber is usually on commission; a senior stylist
 * may get a small retainer and commission on top. The new-user form asks this once, in the
 * shop's own terms, and the answer becomes a salary record, a commission plan, or both.
 */
export type PayMode = "salary" | "commission" | "both";

export type PayPlanDraft = {
  mode: PayMode;
  /** Monthly salary in shillings, as typed; blank means "set it later". */
  salary: string;
  commissionType: CommissionType;
  /** Percent of each service, or shillings per service, as typed. */
  commissionRate: string;
  /** Percent of products they sell; blank for none. */
  productRate: string;
};

export const DEFAULT_PAY_PLAN: PayPlanDraft = {
  mode: "commission",
  salary: "",
  commissionType: "PERCENT",
  commissionRate: "",
  productRate: "",
};

export const PAY_MODES: readonly { value: PayMode; label: string; blurb: string }[] = [
  { value: "salary", label: "Salary", blurb: "A fixed amount each month" },
  { value: "commission", label: "Commission", blurb: "A share of the work they do" },
  { value: "both", label: "Both", blurb: "A salary, and commission on top" },
];

export const paysSalary = (mode: PayMode) => mode === "salary" || mode === "both";
export const paysCommission = (mode: PayMode) => mode === "commission" || mode === "both";

const number = (text: string): number | null => {
  const cleaned = text.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : NaN;
};

export type PayPlan = {
  /** Monthly salary to record, or null to leave it for later. */
  salary: number | null;
  /** The commission plan to set, or null when they are not on commission. */
  commission: { type: CommissionType; rate: number; productRate: number | null } | null;
};

export type PayPlanResult = { ok: true; plan: PayPlan } | { ok: false; error: string };

/** Checks what was typed and says what to save. Only the fields the chosen mode shows are read. */
export function buildPayPlan(draft: PayPlanDraft): PayPlanResult {
  let salary: number | null = null;
  if (paysSalary(draft.mode)) {
    const typed = number(draft.salary);
    if (typed != null && !(typed >= 0)) {
      return { ok: false, error: "Enter the monthly salary as a number, or leave it empty to set it later." };
    }
    salary = typed != null && typed > 0 ? Math.round(typed * 100) / 100 : null;
  }
  let commission: PayPlan["commission"] = null;
  if (paysCommission(draft.mode)) {
    const rate = number(draft.commissionRate);
    if (rate == null || !(rate >= 0)) {
      return {
        ok: false,
        error:
          draft.commissionType === "PERCENT"
            ? "Enter the percent of each service they keep, for example 40."
            : "Enter the amount they get for each service, for example 100.",
      };
    }
    if (draft.commissionType === "PERCENT" && rate > 100) {
      return { ok: false, error: "A commission percent cannot be more than 100." };
    }
    const productRate = number(draft.productRate);
    if (productRate != null && !(productRate >= 0 && productRate <= 100)) {
      return { ok: false, error: "Commission on products is a percent between 0 and 100, or empty for none." };
    }
    commission = { type: draft.commissionType, rate, productRate: productRate != null && productRate > 0 ? productRate : null };
  }
  return { ok: true, plan: { salary, commission } };
}

/**
 * The commission in plain numbers, on a service of `price`: what the person gets and what the
 * shop keeps. Null until a usable rate has been typed.
 */
export function payPlanExample(draft: PayPlanDraft, price: number): { theirs: number; shop: number } | null {
  if (!paysCommission(draft.mode)) return null;
  const rate = number(draft.commissionRate);
  if (rate == null || !(rate >= 0) || (draft.commissionType === "PERCENT" && rate > 100)) return null;
  const theirs = previewCommission(price, draft.commissionType, rate);
  return { theirs, shop: Math.max(0, price - theirs) };
}
