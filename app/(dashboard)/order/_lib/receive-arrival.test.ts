import { describe, expect, test } from "bun:test";

import {
  ARRIVAL_AS_ORDERED,
  ARRIVAL_DAMAGED,
  ARRIVAL_MISSING,
  ARRIVAL_SHORT,
  PUT_AWAY_STOCK,
  PUT_AWAY_STORE,
  arrivalPassComplete,
  arrivalStatusLabel,
  filterSupplierCatalog,
  nextArrival,
  planPutAway,
  retargetArrival,
  tallyArrival,
} from "./receive-arrival";

const LINES = Array.from({ length: 13 }, (_, index) => ({
  itemName: `Item ${index + 1}`,
  sku: `SKU-${index + 1}`,
  barcode: index === 3 ? "123456" : null,
  supplierSku: null,
}));

describe("supplier catalogue on receive", () => {
  test("returns every link, including ones past the old dozen", () => {
    expect(filterSupplierCatalog(LINES, "").length).toBe(13);
  });

  test("filters by name, sku, or barcode", () => {
    expect(filterSupplierCatalog(LINES, "sku-2").map((link) => link.itemName)).toEqual([
      "Item 2",
    ]);
    expect(filterSupplierCatalog(LINES, "123456")).toHaveLength(1);
  });
});

describe("arrival decisions", () => {
  test("pressing the same control clears it", () => {
    const once = nextArrival({}, "a", ARRIVAL_AS_ORDERED);
    expect(once.a).toBe(ARRIVAL_AS_ORDERED);
    expect(nextArrival(once, "a", ARRIVAL_AS_ORDERED).a).toBeUndefined();
  });

  test("the pass is complete only when every open line has a decision", () => {
    expect(arrivalPassComplete([], { a: ARRIVAL_AS_ORDERED })).toBe(false);
    expect(arrivalPassComplete(["a", "b"], { a: ARRIVAL_MISSING })).toBe(false);
    expect(
      arrivalPassComplete(["a", "b"], { a: ARRIVAL_AS_ORDERED, b: ARRIVAL_MISSING }),
    ).toBe(true);
  });

  test("editing the count retargets as-ordered and short", () => {
    const asOrdered = { a: ARRIVAL_AS_ORDERED as const };
    expect(retargetArrival(asOrdered, "a", 4, 12).a).toBe(ARRIVAL_SHORT);
    expect(retargetArrival(asOrdered, "a", 0, 12).a).toBe(ARRIVAL_MISSING);
    expect(retargetArrival({ a: ARRIVAL_SHORT }, "a", 12, 12).a).toBe(ARRIVAL_AS_ORDERED);
    expect(retargetArrival({ a: ARRIVAL_DAMAGED }, "a", 1, 12).a).toBe(ARRIVAL_DAMAGED);
  });

  test("status is words, with the short count", () => {
    expect(arrivalStatusLabel(ARRIVAL_AS_ORDERED, 12, 12)).toBe("As ordered");
    expect(arrivalStatusLabel(ARRIVAL_MISSING, 0, 12)).toBe("Didn't come");
    expect(arrivalStatusLabel(ARRIVAL_SHORT, 4, 12)).toBe("Short · 4 of 12");
    expect(arrivalStatusLabel(ARRIVAL_DAMAGED, 2, 12)).toBe("Damaged · 2");
  });
});

describe("put away", () => {
  test("missing and damaged stay off both destinations", () => {
    const plan = planPutAway(
      ["ok", "short", "gone", "hurt"],
      {
        ok: ARRIVAL_AS_ORDERED,
        short: ARRIVAL_SHORT,
        gone: ARRIVAL_MISSING,
        hurt: ARRIVAL_DAMAGED,
      },
      { ok: 10, short: 4, gone: 0, hurt: 2 },
      { short: PUT_AWAY_STORE },
    );
    expect(plan.stockLineIds).toEqual(["ok"]);
    expect(plan.storeLines).toEqual([{ id: "short", qty: 4 }]);
  });

  test("a line is stock or the store room, and a zero count does not move", () => {
    const plan = planPutAway(
      ["a", "b"],
      { a: ARRIVAL_AS_ORDERED, b: ARRIVAL_SHORT },
      { a: 3, b: 0 },
      { a: PUT_AWAY_STOCK },
      PUT_AWAY_STORE,
    );
    expect(plan.stockLineIds).toEqual(["a"]);
    expect(plan.storeLines).toEqual([]);
  });

  test("tallies the dock", () => {
    expect(
      tallyArrival(["a", "b", "c"], { a: ARRIVAL_AS_ORDERED, b: ARRIVAL_MISSING }),
    ).toEqual({ asOrdered: 1, short: 0, missing: 1, damaged: 0, undecided: 1 });
  });
});
