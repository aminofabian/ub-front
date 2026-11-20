import { describe, expect, it } from "vitest";

import { settleSplitTender } from "@/lib/split-tender";

describe("settleSplitTender", () => {
  it("gives back the notes that exceed the cash share", () => {
    const settled = settleSplitTender({
      total: 1000,
      wallet: 0,
      cash: 1000,
      mpesa: 400,
    });

    expect(settled.cashApplied).toBe(600);
    expect(settled.change).toBe(400);
    expect(settled.tab).toBe(0);
    expect(settled.overBy).toBe(0);
  });

  it("keeps an exact cash share as no change", () => {
    const settled = settleSplitTender({
      total: 850,
      wallet: 50,
      cash: 300,
      mpesa: 500,
    });

    expect(settled.cashApplied).toBe(300);
    expect(settled.change).toBe(0);
    expect(settled.tab).toBe(0);
  });

  it("leaves a short cash tender on the tab", () => {
    const settled = settleSplitTender({
      total: 1000,
      wallet: 0,
      cash: 200,
      mpesa: 400,
    });

    expect(settled.cashApplied).toBe(200);
    expect(settled.change).toBe(0);
    expect(settled.tab).toBe(400);
  });

  it("does not treat an M-Pesa overpay as cash change", () => {
    const settled = settleSplitTender({
      total: 1000,
      wallet: 200,
      cash: 500,
      mpesa: 900,
    });

    expect(settled.change).toBe(0);
    expect(settled.cashApplied).toBe(0);
    expect(settled.overBy).toBe(600);
  });

  it("does not call spare cash change when the bill is already covered", () => {
    const settled = settleSplitTender({
      total: 400,
      wallet: 0,
      cash: 200,
      mpesa: 400,
    });

    expect(settled.change).toBe(0);
    expect(settled.overBy).toBe(200);
  });
});
