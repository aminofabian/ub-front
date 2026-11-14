import { describe, expect, test } from "bun:test";

import { buildPayPlan, DEFAULT_PAY_PLAN, payPlanExample, paysCommission, paysSalary } from "./user-pay-plan";

const draft = (over: Partial<typeof DEFAULT_PAY_PLAN>) => ({ ...DEFAULT_PAY_PLAN, ...over });

describe("buildPayPlan", () => {
  test("commission only: a plan and no salary, whatever was typed in the hidden salary box", () => {
    const result = buildPayPlan(draft({ mode: "commission", commissionRate: "40", salary: "25000" }));
    expect(result).toEqual({ ok: true, plan: { salary: null, commission: { type: "PERCENT", rate: 40, productRate: null } } });
  });

  test("salary only: a salary and no plan; an empty salary is set later", () => {
    expect(buildPayPlan(draft({ mode: "salary", salary: "25,000", commissionRate: "40" }))).toEqual({
      ok: true,
      plan: { salary: 25000, commission: null },
    });
    expect(buildPayPlan(draft({ mode: "salary", salary: "" }))).toEqual({ ok: true, plan: { salary: null, commission: null } });
  });

  test("both: a retainer and commission on top, with a share of products", () => {
    const result = buildPayPlan(
      draft({ mode: "both", salary: "10000", commissionType: "FIXED", commissionRate: "100", productRate: "5" }),
    );
    expect(result).toEqual({
      ok: true,
      plan: { salary: 10000, commission: { type: "FIXED", rate: 100, productRate: 5 } },
    });
  });

  test("a missing or impossible rate is explained, not saved", () => {
    expect(buildPayPlan(draft({ mode: "commission", commissionRate: "" })).ok).toBe(false);
    expect(buildPayPlan(draft({ mode: "commission", commissionRate: "abc" })).ok).toBe(false);
    expect(buildPayPlan(draft({ mode: "commission", commissionRate: "120" }))).toEqual({
      ok: false,
      error: "A commission percent cannot be more than 100.",
    });
    // A fixed amount per service may be more than 100 shillings.
    expect(buildPayPlan(draft({ mode: "commission", commissionType: "FIXED", commissionRate: "150" })).ok).toBe(true);
    expect(buildPayPlan(draft({ mode: "commission", commissionRate: "40", productRate: "140" })).ok).toBe(false);
    expect(buildPayPlan(draft({ mode: "both", salary: "-5", commissionRate: "40" })).ok).toBe(false);
  });

  test("zero percent is a real answer: on the team, earning nothing per service", () => {
    expect(buildPayPlan(draft({ mode: "commission", commissionRate: "0" }))).toEqual({
      ok: true,
      plan: { salary: null, commission: { type: "PERCENT", rate: 0, productRate: null } },
    });
  });
});

describe("payPlanExample", () => {
  test("shows the split on a real price", () => {
    expect(payPlanExample(draft({ commissionRate: "25" }), 300)).toEqual({ theirs: 75, shop: 225 });
    expect(payPlanExample(draft({ commissionType: "FIXED", commissionRate: "100" }), 300)).toEqual({ theirs: 100, shop: 200 });
    // A fixed amount never pays more than the service cost.
    expect(payPlanExample(draft({ commissionType: "FIXED", commissionRate: "500" }), 300)).toEqual({ theirs: 300, shop: 0 });
  });

  test("says nothing until there is something to show", () => {
    expect(payPlanExample(draft({ commissionRate: "" }), 300)).toBeNull();
    expect(payPlanExample(draft({ mode: "salary", commissionRate: "25" }), 300)).toBeNull();
    expect(payPlanExample(draft({ commissionRate: "140" }), 300)).toBeNull();
  });
});

describe("modes", () => {
  test("which parts each mode shows", () => {
    expect([paysSalary("salary"), paysCommission("salary")]).toEqual([true, false]);
    expect([paysSalary("commission"), paysCommission("commission")]).toEqual([false, true]);
    expect([paysSalary("both"), paysCommission("both")]).toEqual([true, true]);
  });
});
