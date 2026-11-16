import { describe, expect, test } from "bun:test";

import { equalShares, splitRemainder } from "./restaurant-cart";

describe("equalShares", () => {
  test("an even total divides into equal shares", () => {
    expect(equalShares(1000, 4)).toEqual([250, 250, 250, 250]);
    expect(equalShares(60, 3)).toEqual([20, 20, 20]);
  });

  test("shares always add up to the total, to the cent, with the odd cents first", () => {
    const shares = equalShares(100, 3);
    expect(shares).toEqual([33.34, 33.33, 33.33]);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });

  test("a single payer gets the whole amount; a bad part count is treated as one", () => {
    expect(equalShares(777.5, 1)).toEqual([777.5]);
    expect(equalShares(500, 0)).toEqual([500]);
    expect(equalShares(500, -3)).toEqual([500]);
  });

  test("works on amounts with cents", () => {
    const shares = equalShares(99.99, 2);
    expect(shares).toEqual([50, 49.99]);
    expect(shares[0] + shares[1]).toBeCloseTo(99.99, 5);
  });
});

describe("splitRemainder", () => {
  test("tracks what is left and when the bill is covered", () => {
    expect(splitRemainder(1000, [])).toEqual({ paid: 0, left: 1000, settled: false });
    expect(splitRemainder(1000, [250, 250])).toEqual({ paid: 500, left: 500, settled: false });
    expect(splitRemainder(1000, [250, 250, 250, 250])).toEqual({ paid: 1000, left: 0, settled: true });
  });

  test("custom shares that do not add up are not settled", () => {
    expect(splitRemainder(100, [30, 30, 30]).settled).toBe(false);
    expect(splitRemainder(100, [30, 30, 40]).settled).toBe(true);
  });

  test("overpayment shows a negative amount left", () => {
    expect(splitRemainder(100, [60, 60]).left).toBe(-20);
  });

  test("odd-cent equal shares settle exactly", () => {
    expect(splitRemainder(100, equalShares(100, 3)).settled).toBe(true);
  });
});
