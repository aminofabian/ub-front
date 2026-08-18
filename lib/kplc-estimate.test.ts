import { describe, expect, test } from "bun:test";

import {
  estimateKplcLive,
  formatKplcClock,
  kplcHourShare,
  resolveKplcEstimate,
} from "./kplc-estimate";

const NAIROBI = "Africa/Nairobi";

function nairobiIso(y: number, m: number, d: number, h: number, min = 0): string {
  return new Date(Date.UTC(y, m - 1, d, h - 3, min, 0)).toISOString();
}

function slip(iso: string, kwh: number) {
  return { purchasedAt: iso, units: kwh };
}

describe("kplcHourShare", () => {
  test("sums to a full day and evenings are heavier", () => {
    let sum = 0;
    for (let hour = 0; hour < 24; hour++) sum += kplcHourShare(hour);
    expect(sum).toBeCloseTo(1, 9);
    expect(kplcHourShare(19)).toBeGreaterThan(kplcHourShare(3));
  });
});

describe("estimateKplcLive", () => {
  test("times the current slip from how earlier cycles lasted", () => {
    const tokens = [
      slip(nairobiIso(2026, 8, 16, 23, 26), 10.7),
      slip(nairobiIso(2026, 8, 12, 15, 26), 17.7),
      slip(nairobiIso(2026, 8, 11, 19, 11), 3.6),
      slip(nairobiIso(2026, 8, 7, 12, 10), 17.8),
    ];
    const now = new Date(nairobiIso(2026, 8, 17, 14, 40)).getTime();
    const got = estimateKplcLive(tokens, now);
    expect(got).toBeTruthy();
    expect(got!.alreadyEmpty).toBe(false);
    expect(got!.dailyUseUnits).toBeGreaterThan(3.5);
    expect(got!.dailyUseUnits).toBeLessThan(4.6);
    expect(got!.remainingUnits).toBeGreaterThan(6);
    expect(got!.remainingUnits).toBeLessThan(10.5);
    expect(got!.sampleIntervals).toBe(2);
    expect(got!.emptyAt!.getTime()).toBeGreaterThan(now);
    expect(got!.emptyAt!.getTime()).toBeLessThan(new Date(nairobiIso(2026, 8, 21, 0)).getTime());
  });

  test("carries leftover when you buy before the meter is empty", () => {
    const tokens = [
      slip(nairobiIso(2026, 8, 1, 8), 20),
      slip(nairobiIso(2026, 8, 6, 8), 20),
      slip(nairobiIso(2026, 8, 7, 8), 20),
      slip(nairobiIso(2026, 8, 8, 8), 20),
    ];
    const now = new Date(nairobiIso(2026, 8, 8, 20)).getTime();
    const got = estimateKplcLive(tokens, now)!;
    expect(got.alreadyEmpty).toBe(false);
    expect(got.dailyUseUnits).toBeGreaterThan(3.5);
    expect(got.dailyUseUnits).toBeLessThan(4.5);
    expect(got.carryInUnits).toBeGreaterThan(10);
    expect(got.remainingUnits).toBeGreaterThan(30);
    expect(got.emptyAt!.getTime()).toBeGreaterThan(new Date(nairobiIso(2026, 8, 14, 0)).getTime());
    expect(got.sampleIntervals).toBe(1);
  });

  test("empty clock leans evening when a partial day is left", () => {
    const buy = nairobiIso(2026, 8, 18, 7);
    const previous = nairobiIso(2026, 8, 14, 7);
    const got = estimateKplcLive([slip(previous, 16), slip(buy, 3)], new Date(buy).getTime())!;
    expect(got.dailyUseUnits).toBeGreaterThan(3.5);
    expect(got.dailyUseUnits).toBeLessThan(4.5);
    const clock = formatKplcClock(got.emptyAt!);
    expect(clock).toMatch(/18th Aug/);
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: NAIROBI,
        hour: "numeric",
        hourCycle: "h23",
      }).formatToParts(got.emptyAt!).find((p) => p.type === "hour")?.value,
    );
    expect(hour).toBeGreaterThanOrEqual(16);
  });

  test("empty clock stays put if you refresh an hour later", () => {
    const tokens = [slip(nairobiIso(2026, 8, 10, 7), 16), slip(nairobiIso(2026, 8, 14, 7), 16)];
    const first = estimateKplcLive(tokens, new Date(nairobiIso(2026, 8, 15, 10)).getTime())!;
    const second = estimateKplcLive(tokens, new Date(nairobiIso(2026, 8, 15, 11)).getTime())!;
    const driftMin = Math.abs(first.emptyAt!.getTime() - second.emptyAt!.getTime()) / 60_000;
    expect(driftMin).toBeLessThan(25);
  });

  test("needs two dated purchases", () => {
    expect(estimateKplcLive([slip("2026-08-16T20:26:00Z", 10.7)])).toBeNull();
  });

  test("falls back to the API snapshot when slips are missing", () => {
    const now = new Date(nairobiIso(2026, 8, 17, 14, 40)).getTime();
    const got = resolveKplcEstimate(
      [],
      { dailyUseUnits: 4, lastPurchaseUnits: 10.7, sampleIntervals: 2 },
      slip(nairobiIso(2026, 8, 16, 23, 26), 10.7),
      now,
    );
    expect(got).toBeTruthy();
    expect(got!.remainingUnits).toBeGreaterThan(6);
    expect(got!.emptyAt!.getTime()).toBeGreaterThan(now);
  });
});
