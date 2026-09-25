import { describe, expect, test } from "bun:test";

import {
  adoptOpeningUnitCost,
  adoptShelfMoney,
} from "./global-catalog-adopt-money";

describe("global-catalog-adopt-money", () => {
  test("omits buying/selling below 0.01", () => {
    expect(adoptShelfMoney(0)).toBeUndefined();
    expect(adoptShelfMoney(0.009)).toBeUndefined();
    expect(adoptShelfMoney(0.01)).toBe(0.01);
    expect(adoptShelfMoney(12.5)).toBe(12.5);
    expect(adoptShelfMoney(null)).toBeUndefined();
  });

  test("omits opening unit cost below 0.0001", () => {
    expect(adoptOpeningUnitCost(0)).toBeUndefined();
    expect(adoptOpeningUnitCost(0.00009)).toBeUndefined();
    expect(adoptOpeningUnitCost(0.0001)).toBe(0.0001);
    expect(adoptOpeningUnitCost(0.8)).toBe(0.8);
  });
});
