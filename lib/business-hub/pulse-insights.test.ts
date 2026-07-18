import { describe, expect, it } from "bun:test";

import {
  averageTicket,
  buildChartCaption,
  buildPulseHeadline,
  chartWindowStats,
  marginPct,
} from "./pulse-insights";

describe("chartWindowStats", () => {
  it("finds total, average, best day, and active days", () => {
    const stats = chartWindowStats([
      { day: "2026-07-12", value: 0, label: "12 Jul" },
      { day: "2026-07-13", value: 100, label: "13 Jul" },
      { day: "2026-07-14", value: 300, label: "14 Jul" },
    ]);
    expect(stats.total).toBe(400);
    expect(stats.average).toBeCloseTo(400 / 3);
    expect(stats.best?.day).toBe("2026-07-14");
    expect(stats.activeDays).toBe(2);
  });
});

describe("buildPulseHeadline", () => {
  it("explains an empty till", () => {
    expect(
      buildPulseHeadline({
        period: "today",
        revenue: 0,
        prevRevenue: 0,
        orders: 0,
        chartPoints: [],
        salesEmpty: true,
      }),
    ).toMatch(/Quiet/);
  });

  it("combines trend and order count", () => {
    const line = buildPulseHeadline({
      period: "today",
      revenue: 200,
      prevRevenue: 100,
      orders: 4,
      chartPoints: [
        { day: "2026-07-17", value: 50, label: "17 Jul" },
        { day: "2026-07-18", value: 200, label: "18 Jul" },
      ],
      salesEmpty: false,
    });
    expect(line).toContain("+100.0%");
    expect(line).toContain("4 sales");
  });
});

describe("buildChartCaption", () => {
  it("summarizes a live window", () => {
    const caption = buildChartCaption({
      period: "week",
      points: [
        { day: "2026-07-12", value: 100, label: "12 Jul" },
        { day: "2026-07-13", value: 0, label: "13 Jul" },
      ],
    });
    expect(caption).toContain("Window");
    expect(caption).toContain("best 12 Jul");
  });
});

describe("averageTicket / marginPct", () => {
  it("computes ticket and margin safely", () => {
    expect(averageTicket(1000, 4)).toBe(250);
    expect(averageTicket(1000, 0)).toBeNull();
    expect(marginPct(200, 50)).toBe(25);
    expect(marginPct(200, 50, "30")).toBe(30);
  });
});
