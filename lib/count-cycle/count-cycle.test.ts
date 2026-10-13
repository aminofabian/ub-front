import { describe, expect, test } from "bun:test";

import type { CountCycleBatchLine, CountCycleRecord } from "@/lib/api";

import { buildDayTiles } from "./build-day-tiles";
import { cycleDayTileInput } from "./cycle-day-tile-input";
import { filterBatchLines } from "./filter-batch-lines";
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

describe("buildDayTiles", () => {
  const today = new Date("2026-10-14T09:00:00Z");

  test("finished batches first, then today's partial batch, then days ahead", () => {
    const tiles = buildDayTiles({
      doneDates: [new Date("2026-10-12T09:00:00Z"), new Date("2026-10-13T09:00:00Z")],
      remainingDays: 3,
      firstOpenDay: today,
      currentFill: 0.4,
    });
    expect(tiles.map((t) => t.state)).toEqual([
      "done",
      "done",
      "current",
      "upcoming",
      "upcoming",
    ]);
    expect(tiles[2]?.fill).toBe(0.4);
    expect(tiles[4]?.date.toISOString().slice(0, 10)).toBe("2026-10-16");
  });

  test("no current tile once today's batch is finished", () => {
    const tiles = buildDayTiles({
      doneDates: [today],
      remainingDays: 2,
      firstOpenDay: new Date("2026-10-15T09:00:00Z"),
      currentFill: null,
    });
    expect(tiles.map((t) => t.state)).toEqual(["done", "upcoming", "upcoming"]);
  });

  test("fill is clamped to a share", () => {
    const [tile] = buildDayTiles({
      doneDates: [],
      remainingDays: 1,
      firstOpenDay: today,
      currentFill: 3,
    });
    expect(tile?.fill).toBe(1);
  });
});

describe("cycleDayTileInput", () => {
  const now = new Date("2026-10-14T09:00:00Z");
  const base: CountCycleRecord = {
    cycleId: "c1",
    branchId: "b1",
    status: "active",
    batchSize: 100,
    totalItems: 300,
    countedItems: 100,
    remainingItems: 200,
    batchesDone: 1,
    daysRemaining: 2,
    projectedFinishDate: "2026-10-16",
    countedToday: false,
    startedAt: "2026-10-13T06:00:00Z",
    completedAt: null,
    activeBatch: null,
    awaitingApplyCount: 0,
    batches: [
      {
        sessionId: "s1",
        batchNumber: 1,
        status: "closed",
        sessionDate: "2026-10-13",
        totalCount: 100,
        countedCount: 100,
        awaitingApplyCount: 0,
        closedAt: "2026-10-13T15:00:00Z",
      },
    ],
  };

  test("today is open with an empty tile before the batch starts", () => {
    const input = cycleDayTileInput(base, now);
    expect(input.doneDates).toHaveLength(1);
    expect(input.firstOpenDay).toEqual(now);
    expect(input.currentFill).toBe(0);
  });

  test("an open batch fills today's tile", () => {
    const input = cycleDayTileInput(
      {
        ...base,
        activeBatch: { sessionId: "s2", batchNumber: 2, totalCount: 100, countedCount: 25 },
      },
      now,
    );
    expect(input.currentFill).toBe(0.25);
  });

  test("once today's batch is finished the next open day is tomorrow", () => {
    const input = cycleDayTileInput({ ...base, countedToday: true }, now);
    expect(input.currentFill).toBeNull();
    expect(input.firstOpenDay.toISOString().slice(0, 10)).toBe("2026-10-15");
  });
});

describe("filterBatchLines", () => {
  const lines = [
    line("a", { itemName: "Sugar 2kg", countedQty: 4 }),
    line("b", { itemName: "Salt 1kg", barcode: "6161000" }),
    line("c", { itemName: "Sugar 1kg" }),
  ];

  test("to-count hides counted lines", () => {
    expect(filterBatchLines(lines, "todo", "").map((l) => l.lineId)).toEqual([
      "b",
      "c",
    ]);
  });

  test("counted shows only counted lines", () => {
    expect(filterBatchLines(lines, "counted", "").map((l) => l.lineId)).toEqual([
      "a",
    ]);
  });

  test("search matches name or barcode, case-insensitive", () => {
    expect(filterBatchLines(lines, "all", " SUGAR ").map((l) => l.lineId)).toEqual([
      "a",
      "c",
    ]);
    expect(filterBatchLines(lines, "all", "6161").map((l) => l.lineId)).toEqual([
      "b",
    ]);
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
