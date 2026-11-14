import { describe, expect, test } from "bun:test";

import type { CommissionStatementRow } from "@/lib/service-business-api";

import { commissionPlanDraftError, commissionSetupSteps, summarizeCommissionRows } from "./commission-summary";

function row(partial: Partial<CommissionStatementRow>): CommissionStatementRow {
  return {
    staffProfileId: "s",
    displayName: "Amina",
    current: true,
    servicesDone: 0,
    serviceRevenue: 0,
    opening: 0,
    commission: 0,
    tips: 0,
    reversals: 0,
    adjustments: 0,
    paid: 0,
    closing: 0,
    ...partial,
  };
}

describe("summarizeCommissionRows", () => {
  test("adds the period and leaves a negative closing out of what is owed", () => {
    const totals = summarizeCommissionRows([
      row({ serviceRevenue: 1000, commission: 400, tips: 50, paid: 100, closing: 350 }),
      row({ serviceRevenue: 200, commission: 80, tips: 0, paid: 500, closing: -40 }),
    ]);
    expect(totals).toEqual({
      owed: 350,
      commission: 480,
      tips: 50,
      paid: 600,
      broughtIn: 1200,
    });
  });

  test("an empty statement is zero", () => {
    expect(summarizeCommissionRows([])).toEqual({
      owed: 0,
      commission: 0,
      tips: 0,
      paid: 0,
      broughtIn: 0,
    });
  });
});

describe("commissionPlanDraftError", () => {
  test("a blank rate is refused once a service rule is chosen", () => {
    expect(commissionPlanDraftError("PERCENT", "", "0")).toBe("Enter the rate");
  });

  test("percent cannot pass 100, and an empty product rate is allowed", () => {
    expect(commissionPlanDraftError("PERCENT", "40", "")).toBeNull();
    expect(commissionPlanDraftError("PERCENT", "140", "")).toBe("A percent cannot be more than 100");
  });

  test("product commission stays a percent from 0 to 100", () => {
    expect(commissionPlanDraftError("FIXED", "100", "101")).toBe(
      "Product commission is a percent from 0 to 100",
    );
    expect(commissionPlanDraftError("", "", "10")).toBeNull();
  });
});

describe("the order of work for setting up pay", () => {
  const person = (patch: Partial<{ current: boolean; type: "PERCENT" | null; rate: number | null; canSignIn: boolean }>) => ({
    current: true,
    type: null,
    rate: null,
    canSignIn: false,
    ...patch,
  });

  test("a new shop has nothing done and starts with the team", () => {
    const steps = commissionSetupSteps([], false);
    expect(steps.map((s) => s.id)).toEqual(["team", "model", "rates", "sign-ins"]);
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(steps.find((s) => !s.done)?.id).toBe("team");
    expect(steps[3]!.optional).toBe(true);
  });

  test("it counts who is set, ignores people who have left, and says so plainly", () => {
    const steps = commissionSetupSteps(
      [person({ type: "PERCENT", rate: 40, canSignIn: true }), person({}), person({ current: false })],
      true,
    );
    expect(steps[0]).toMatchObject({ done: true, detail: "2 people on the team." });
    expect(steps[1]!.done).toBe(true);
    expect(steps[2]).toMatchObject({ done: false, detail: "1 of 2 set. Someone on a salary can stay on no commission." });
    expect(steps[3]).toMatchObject({ done: false, detail: "Optional. 1 of 2 can sign in to see their own earnings." });
  });

  test("everything done when everyone has a share and a sign-in", () => {
    const steps = commissionSetupSteps([person({ type: "PERCENT", rate: 50, canSignIn: true })], true);
    expect(steps.every((s) => s.done)).toBe(true);
    expect(steps[0]!.detail).toBe("1 person on the team.");
  });
});

