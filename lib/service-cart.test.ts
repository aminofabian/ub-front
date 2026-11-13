import { describe, expect, test } from "bun:test";

import {
  buildServiceSalePayload,
  cleanMoneyText,
  parseMoney,
  serviceCartProblem,
  serviceCartTotals,
  type ServiceCartLine,
} from "./service-cart";

const line = (over: Partial<ServiceCartLine> = {}): ServiceCartLine => ({
  key: "k1",
  serviceId: "svc-haircut",
  name: "Haircut",
  performerId: "john",
  performerName: "John",
  quantity: 1,
  unitPrice: 300,
  priceIsVariable: false,
  ...over,
});

describe("serviceCartTotals", () => {
  test("tips sit on top of the total and are not part of it", () => {
    const totals = serviceCartTotals([line(), line({ key: "k2", name: "Beard trim", unitPrice: 150 })], {
      john: 50,
    });
    expect(totals).toEqual({ total: 450, tips: 50, toPay: 500 });
  });

  test("a tip for someone who is not on the sale is ignored", () => {
    expect(serviceCartTotals([line()], { peter: 100, john: 0 })).toEqual({ total: 300, tips: 0, toPay: 300 });
  });

  test("quantity multiplies the price and cents do not drift", () => {
    expect(serviceCartTotals([line({ quantity: 3, unitPrice: 33.33 })], {}).total).toBe(99.99);
  });
});

describe("serviceCartProblem", () => {
  test("an empty cart, a missing price and a bad quantity each block payment", () => {
    expect(serviceCartProblem([])).toBe("Add a service first");
    expect(serviceCartProblem([line({ name: "Braids", unitPrice: 0, priceIsVariable: true })])).toBe(
      "Enter the price for Braids",
    );
    expect(serviceCartProblem([line({ quantity: 0 })])).toBe("Check the quantity for Haircut");
    expect(serviceCartProblem([line()])).toBeNull();
  });
});

describe("money typing", () => {
  test("typing 150.50 a key at a time keeps the decimal point", () => {
    let text = "";
    for (const key of "150.50") text = cleanMoneyText(text + key);
    expect(text).toBe("150.50");
    expect(parseMoney(text)).toBe(150.5);
  });

  test("stray characters, a second dot and extra decimals are dropped", () => {
    expect(cleanMoneyText("1.2.3")).toBe("1.23");
    expect(cleanMoneyText("KSh 300/=")).toBe("300");
    expect(cleanMoneyText("12.3456")).toBe("12.34");
  });

  test("an unfinished amount is not a number yet", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney(".")).toBeNull();
    expect(parseMoney("150.")).toBe(150);
    expect(parseMoney("0.5")).toBe(0.5);
  });
});

describe("buildServiceSalePayload", () => {
  const soldAt = new Date("2026-11-13T15:00:00Z");

  test("a cash sale with a tip pays total plus tip and records the cash handed over", () => {
    const payload = buildServiceSalePayload({
      branchId: "b1",
      lines: [line()],
      tips: { john: 50 },
      method: "cash",
      cashReceived: 500,
      soldAt,
    });
    expect(payload.lines).toEqual([
      { kind: "SERVICE", serviceId: "svc-haircut", performerStaffProfileId: "john", quantity: 1, unitPrice: 300 },
    ]);
    expect(payload.payments).toEqual([{ method: "cash", amount: 350 }]);
    expect(payload.tips).toEqual([{ staffProfileId: "john", amount: 50 }]);
    expect(payload.cashReceived).toBe(500);
    expect(payload.clientSoldAt).toBe("2026-11-13T15:00:00.000Z");
  });

  test("cash that does not cover the amount is not sent as received", () => {
    const payload = buildServiceSalePayload({
      branchId: "b1",
      lines: [line()],
      tips: {},
      method: "cash",
      cashReceived: 200,
      soldAt,
    });
    expect(payload.cashReceived).toBeUndefined();
    expect(payload.tips).toBeUndefined();
  });

  test("an M-Pesa code is upper-cased; no code sends no reference", () => {
    const withCode = buildServiceSalePayload({
      branchId: "b1",
      lines: [line()],
      tips: {},
      method: "mpesa_manual",
      reference: " qk12abc ",
      cashReceived: 999,
      soldAt,
    });
    expect(withCode.payments).toEqual([{ method: "mpesa_manual", amount: 300, reference: "QK12ABC" }]);
    expect(withCode.cashReceived).toBeUndefined();
    const noCode = buildServiceSalePayload({
      branchId: "b1",
      lines: [line()],
      tips: {},
      method: "mpesa_manual",
      soldAt,
    });
    expect(noCode.payments).toEqual([{ method: "mpesa_manual", amount: 300 }]);
  });
});
