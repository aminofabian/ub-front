import { describe, expect, test } from "bun:test";

import { allocateTip, tipLeftToAllocate } from "./tip-allocation";

const mike = { staffProfileId: "mike", work: 200 };
const lenah = { staffProfileId: "lenah", work: 100 };
const sum = (shares: { amount: number }[]) => Math.round(shares.reduce((s, x) => s + x.amount * 100, 0)) / 100;

describe("allocateTip", () => {
  test("a tip for Mike goes to Mike alone", () => {
    expect(allocateTip(100, [mike, lenah], "ONE", { oneId: "mike" })).toEqual([{ staffProfileId: "mike", amount: 100 }]);
  });

  test("an unassigned tip is split equally", () => {
    expect(allocateTip(100, [mike, lenah], "EQUAL")).toEqual([
      { staffProfileId: "mike", amount: 50 },
      { staffProfileId: "lenah", amount: 50 },
    ]);
  });

  test("by work done: the haircut was twice the grooming", () => {
    const shares = allocateTip(90, [mike, lenah], "BY_WORK");
    expect(shares).toEqual([
      { staffProfileId: "mike", amount: 60 },
      { staffProfileId: "lenah", amount: 30 },
    ]);
  });

  test("70 and 30 typed by hand", () => {
    const shares = allocateTip(100, [mike, lenah], "MANUAL", { manual: { mike: 70, lenah: 30 } });
    expect(shares).toEqual([
      { staffProfileId: "mike", amount: 70 },
      { staffProfileId: "lenah", amount: 30 },
    ]);
    expect(tipLeftToAllocate(100, shares)).toBe(0);
  });

  test("a manual split that does not add up says by how much", () => {
    expect(tipLeftToAllocate(100, allocateTip(100, [mike, lenah], "MANUAL", { manual: { mike: 70 } }))).toBe(30);
    expect(tipLeftToAllocate(100, allocateTip(100, [mike, lenah], "MANUAL", { manual: { mike: 70, lenah: 50 } }))).toBe(-20);
  });

  test("every automatic split adds up to exactly the tip, odd cents included", () => {
    const three = [mike, lenah, { staffProfileId: "peter", work: 50 }];
    for (const tip of [100, 50, 10, 1, 0.05, 33.33, 99.99]) {
      expect(sum(allocateTip(tip, three, "EQUAL"))).toBe(tip);
      expect(sum(allocateTip(tip, three, "BY_WORK"))).toBe(tip);
    }
    expect(allocateTip(100, three, "EQUAL").map((s) => s.amount)).toEqual([33.34, 33.33, 33.33]);
  });

  test("no tip, or nobody to give it to, is nothing", () => {
    expect(allocateTip(0, [mike], "EQUAL")).toEqual([]);
    expect(allocateTip(100, [], "EQUAL")).toEqual([]);
  });

  test("by work with no prices falls back to equal", () => {
    expect(sum(allocateTip(100, [{ staffProfileId: "a", work: 0 }, { staffProfileId: "b", work: 0 }], "BY_WORK"))).toBe(100);
  });
});
