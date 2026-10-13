import { describe, expect, test } from "bun:test";

import type { CountCycleBatchLine } from "@/lib/api";

import { groupBatchLines } from "./group-batch-lines";
import { parseCountInput } from "./parse-count-input";
import { projectCountPlan } from "./project-count-plan";
import { rankReviewLines } from "./rank-review-lines";

function line(
  lineId: string,
  overrides: Partial<CountCycleBatchLine> = {},
): CountCycleBatchLine {
  return {
    lineId,
    itemId: `item-${lineId}`,
    itemName: `Product ${lineId}`,
    itemSku: null,
    barcode: null,
    categoryName: null,
    unitType: null,
    imageUrl: null,
    aisle: null,
    countedQty: null,
    systemQty: null,
    status: "pending",
    ...overrides,
  };
}

describe("projectCountPlan", () => {
  const today = new Date("2026-10-14T09:00:00Z");

  test("rounds partial batches up to a whole day", () => {
    const plan = projectCountPlan(1240, 100, today);
    expect(plan.days).toBe(13);
    expect(plan.finishDate.toISOString().slice(0, 10)).toBe("2026-10-26");
  });

  test("finishes today when one batch covers everything", () => {
    const plan = projectCountPlan(80, 100, today);
    expect(plan.days).toBe(1);
    expect(plan.finishDate.toISOString().slice(0, 10)).toBe("2026-10-14");
  });

  test("an empty catalog needs no days", () => {
    expect(projectCountPlan(0, 100, today).days).toBe(0);
  });
});

describe("groupBatchLines", () => {
  test("keeps order and starts a new shelf whenever the category changes", () => {
    const shelves = groupBatchLines([
      line("1", { categoryName: "Dairy" }),
      line("2", { categoryName: "Dairy" }),
      line("3", { categoryName: "Soap" }),
      line("4", { categoryName: null }),
    ]);
    expect(shelves.map((s) => [s.category, s.lines.length])).toEqual([
      ["Dairy", 2],
      ["Soap", 1],
      ["Other products", 1],
    ]);
  });
});

describe("rankReviewLines", () => {
  test("drops uncounted lines and puts the biggest gap first", () => {
    const ranked = rankReviewLines([
      line("match", { countedQty: 5, systemQty: 5 }),
      line("short", { countedQty: 2, systemQty: 10 }),
      line("uncounted", { systemQty: 4 }),
      line("over", { countedQty: "13", systemQty: "10" }),
    ]);
    expect(ranked.map((l) => [l.lineId, l.variance])).toEqual([
      ["short", -8],
      ["over", 3],
      ["match", 0],
    ]);
  });

  test("variance is unknown when system stock is hidden", () => {
    const [ranked] = rankReviewLines([line("blind", { countedQty: 3 })]);
    expect(ranked?.variance).toBeNull();
  });
});

describe("parseCountInput", () => {
  test("reads whole and decimal counts, including a comma decimal", () => {
    expect(parseCountInput("12")).toBe(12);
    expect(parseCountInput(" 2,5 ")).toBe(2.5);
    expect(parseCountInput("0")).toBe(0);
  });

  test("blank, negative and junk are not counts", () => {
    expect(parseCountInput("")).toBeNull();
    expect(parseCountInput("-1")).toBeNull();
    expect(parseCountInput("abc")).toBeNull();
  });
});
