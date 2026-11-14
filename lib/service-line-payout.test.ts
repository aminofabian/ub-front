import { describe, expect, test } from "bun:test";

import { leadEarnsAlone, serviceLinePayout, type CommissionRule } from "./service-line-payout";

const percent = (rate: number): CommissionRule => ({ type: "PERCENT", rate });

describe("serviceLinePayout", () => {
  test("the shop's part is fixed by the lead's plan; helpers are paid out of the lead's part", () => {
    // 500 with the barber on 50%: the shop keeps 250. The groomer's quarter of the barber's 250
    // is 62 (whole shillings, rounded down), and the barber keeps the rest.
    const pool = leadEarnsAlone({ price: 500, leadAmount: null, rule: percent(50) });
    expect(pool).toBe(250);
    const payout = serviceLinePayout({
      price: 500,
      leadId: "barber",
      leadAmount: null,
      helpers: [{ staffProfileId: "groomer", amount: 62, sharePercent: 1 }],
      ruleFor: () => percent(50),
    });
    expect(payout.takes).toEqual([
      { staffProfileId: "barber", amount: 188 },
      { staffProfileId: "groomer", amount: 62 },
    ]);
    expect(payout.shop).toBe(250);
  });

  test("a set helper amount comes out of the lead's commission, not the shop's part", () => {
    const payout = serviceLinePayout({
      price: 500,
      leadId: "mikerua",
      leadAmount: null,
      helpers: [{ staffProfileId: "akother", amount: 50, sharePercent: 10 }],
      ruleFor: () => percent(40),
    });
    expect(payout.takes).toEqual([
      { staffProfileId: "mikerua", amount: 150 },
      { staffProfileId: "akother", amount: 50 },
    ]);
    expect(payout.shop).toBe(300);
  });

  test("an equal plan split pays each person their rate on their share", () => {
    const payout = serviceLinePayout({
      price: 300,
      leadId: "mike",
      leadAmount: null,
      helpers: [
        { staffProfileId: "lenah", amount: null, sharePercent: 33.33 },
        { staffProfileId: "peter", amount: null, sharePercent: 33.33 },
      ],
      ruleFor: () => percent(40),
    });
    expect(payout.takes.map((row) => row.amount)).toEqual([40, 40, 40]);
    expect(payout.shop).toBe(180);
  });

  test("a missing plan leaves that person's take and the shop unknown", () => {
    const payout = serviceLinePayout({
      price: 500,
      leadId: "mikerua",
      leadAmount: null,
      helpers: [{ staffProfileId: "akother", amount: 50, sharePercent: 10 }],
      ruleFor: (id) => (id === "akother" ? percent(40) : null),
    });
    expect(payout.takes[0]).toEqual({ staffProfileId: "mikerua", amount: null });
    expect(payout.takes[1]?.amount).toBe(50);
    expect(payout.shop).toBeNull();
  });

  test("after product cost: the cost comes off first and stays with the shop", () => {
    // 1,000 gel set, 300 of gel, 50%: 350 to the person, 650 to the shop (its 350 and the gel).
    const net = serviceLinePayout({ price: 1000, leadId: "amina", leadAmount: null, helpers: [], ruleFor: () => percent(50), productCost: 300 });
    expect(net.takes[0]?.amount).toBe(350);
    expect(net.shop).toBe(650);
    expect(leadEarnsAlone({ price: 1000, leadAmount: null, rule: percent(50), productCost: 300 })).toBe(350);
    // On the full price the same service pays 500.
    const gross = serviceLinePayout({ price: 1000, leadId: "amina", leadAmount: null, helpers: [], ruleFor: () => percent(50) });
    expect(gross.takes[0]?.amount).toBe(500);
    // A cost above the price leaves nothing to earn on, never a negative.
    expect(leadEarnsAlone({ price: 200, leadAmount: null, rule: percent(50), productCost: 300 })).toBe(0);
    // A set amount is not changed by it.
    expect(leadEarnsAlone({ price: 1000, leadAmount: 400, rule: percent(50), productCost: 300 })).toBe(400);
  });
});
