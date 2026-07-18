import { describe, expect, it } from "bun:test";

import { buildDailyRevenueSeries } from "./build-daily-revenue-series";

describe("buildDailyRevenueSeries", () => {
  it("fills every calendar day in the range with zeros when empty", () => {
    const series = buildDailyRevenueSeries([], "2026-07-12", "2026-07-18");
    expect(series).toHaveLength(7);
    expect(series.map((p) => p.day)).toEqual([
      "2026-07-12",
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
    ]);
    expect(series.every((p) => p.value === 0)).toBe(true);
  });

  it("sums branch rows for the same day and keeps empty days as gaps", () => {
    const series = buildDailyRevenueSeries(
      [
        { day: "2026-07-12", revenue: 100 },
        { day: "2026-07-12", revenue: 50 },
        { day: "2026-07-14", revenue: "25.5" },
      ],
      "2026-07-12",
      "2026-07-14",
    );

    expect(series.map((p) => p.value)).toEqual([150, 0, 25.5]);
    expect(series[0]?.label).toMatch(/12/);
  });

  it("returns an empty series for an inverted range", () => {
    expect(
      buildDailyRevenueSeries([{ day: "2026-07-12", revenue: 10 }], "2026-07-18", "2026-07-12"),
    ).toEqual([]);
  });
});
