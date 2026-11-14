import type { CommissionPlanRecord, CommissionStatementRow, CommissionType } from "@/lib/service-business-api";

export type CommissionPeriodTotals = {
  owed: number;
  commission: number;
  tips: number;
  paid: number;
  broughtIn: number;
};

const EMPTY_TOTALS: CommissionPeriodTotals = {
  owed: 0,
  commission: 0,
  tips: 0,
  paid: 0,
  broughtIn: 0,
};

/** Owed ignores a negative closing. That balance is already settled past zero. */
export function summarizeCommissionRows(rows: CommissionStatementRow[]): CommissionPeriodTotals {
  return rows.reduce(
    (sum, row) => ({
      owed: sum.owed + Math.max(row.closing, 0),
      commission: sum.commission + row.commission,
      tips: sum.tips + row.tips,
      paid: sum.paid + row.paid,
      broughtIn: sum.broughtIn + row.serviceRevenue,
    }),
    EMPTY_TOTALS,
  );
}

export function commissionPlanDraftError(
  type: CommissionType | "",
  rate: string,
  productRate: string,
): string | null {
  const rateNumber = rate.trim() === "" ? null : Number(rate);
  const productNumber = productRate.trim() === "" ? null : Number(productRate);
  if (type !== "" && (rateNumber == null || !Number.isFinite(rateNumber) || rateNumber < 0)) {
    return "Enter the rate";
  }
  if (type === "PERCENT" && rateNumber != null && rateNumber > 100) {
    return "A percent cannot be more than 100";
  }
  if (productNumber != null && (!Number.isFinite(productNumber) || productNumber < 0 || productNumber > 100)) {
    return "Product commission is a percent from 0 to 100";
  }
  return null;
}

export type CommissionSetupStep = {
  id: "team" | "model" | "rates" | "sign-ins";
  title: string;
  /** What is there now, or what the step is for. */
  detail: string;
  done: boolean;
  /** Not needed before the team can be paid. */
  optional?: boolean;
  /** The id of the part of the page that does it. */
  target: string;
  actionLabel: string;
  changeLabel: string;
};

/**
 * The order of work for setting up pay, read from what is already there: who is on the team,
 * whether what commission is worked out on has been chosen, who has a share set, who can sign in.
 */
export function commissionSetupSteps(
  plans: readonly Pick<CommissionPlanRecord, "current" | "type" | "rate" | "canSignIn">[],
  modelChosen: boolean,
): CommissionSetupStep[] {
  const team = plans.filter((plan) => plan.current);
  const people = team.length === 1 ? "1 person" : `${team.length} people`;
  const withShare = team.filter((plan) => plan.type != null && plan.rate != null).length;
  const signedIn = team.filter((plan) => plan.canSignIn).length;
  return [
    {
      id: "team",
      title: "Add your team",
      detail: team.length > 0 ? `${people} on the team.` : "Everyone who serves customers. A name is enough to start.",
      done: team.length > 0,
      target: "team-add",
      actionLabel: "Add the first person",
      changeLabel: "Add another",
    },
    {
      id: "model",
      title: "Choose what the share is taken of",
      detail: "The full price, or what is left after the gel or dye the shop bought.",
      done: modelChosen,
      target: "pay-model",
      actionLabel: "Choose",
      changeLabel: "Change",
    },
    {
      id: "rates",
      title: "Set each person's share",
      detail:
        team.length === 0
          ? "Add someone first, then say what they earn on each service."
          : withShare === team.length
            ? "Everyone has a share set."
            : `${withShare} of ${team.length} set. Someone on a salary can stay on no commission.`,
      done: team.length > 0 && withShare === team.length,
      target: "team",
      actionLabel: "Set shares",
      changeLabel: "Change",
    },
    {
      id: "sign-ins",
      title: "Send them their sign-ins",
      detail:
        team.length === 0
          ? "Optional. Lets each person see their own bookings and earnings."
          : `Optional. ${signedIn} of ${team.length} can sign in to see their own earnings.`,
      done: team.length > 0 && signedIn === team.length,
      optional: true,
      target: "team-sign-ins",
      actionLabel: "Send sign-ins",
      changeLabel: "Send a new PIN",
    },
  ];
}

