import { describe, expect, test } from "bun:test";

import {
  addDays,
  addMonths,
  bookingCalendarFile,
  clockLabel,
  groupByPartOfDay,
  monthGrid,
  upcomingDays,
  weekdayKey,
} from "./public-booking";
import { amountStillDue, packageSessionValue, type CustomerPackage } from "./service-business-api";

describe("upcomingDays", () => {
  test("starts today in the shop's timezone, not the browser's", () => {
    // 22:30 UTC on the 13th is already the 14th in Nairobi.
    const days = upcomingDays("Africa/Nairobi", 3, new Date("2026-11-13T22:30:00Z"));
    expect(days).toEqual(["2026-11-14", "2026-11-15", "2026-11-16"]);
  });

  test("crosses a month end", () => {
    expect(upcomingDays("Africa/Nairobi", 2, new Date("2026-11-30T09:00:00Z"))).toEqual(["2026-11-30", "2026-12-01"]);
  });
});

describe("amountStillDue", () => {
  test("a deposit comes off the bill, a tip does not shrink", () => {
    expect(amountStillDue(300, 0, 100, 0)).toBe(200);
    expect(amountStillDue(300, 50, 100, 0)).toBe(250);
  });

  test("a deposit bigger than the bill leaves only the tip", () => {
    expect(amountStillDue(300, 0, 500, 0)).toBe(0);
    expect(amountStillDue(300, 20, 500, 0)).toBe(20);
  });

  test("a deposit and a package session together never go below zero", () => {
    expect(amountStillDue(300, 0, 100, 200)).toBe(0);
    expect(amountStillDue(300, 0, 100, 150)).toBe(50);
    expect(amountStillDue(300, 0, -5, -5)).toBe(300);
  });
});

describe("packageSessionValue", () => {
  const pkg = (remaining: number, valueRemaining: number): CustomerPackage => ({
    id: "p",
    customerId: "c",
    serviceId: "s",
    serviceName: "Haircut",
    sessionsTotal: 3,
    sessionsRemaining: remaining,
    pricePaid: 1000,
    valueRemaining,
    expiresAt: null,
    expired: false,
    soldAt: "2026-11-13T00:00:00Z",
  });

  test("rounds down, and the last session carries what is left", () => {
    expect(packageSessionValue(pkg(3, 1000))).toBe(333.33);
    expect(packageSessionValue(pkg(2, 666.67))).toBe(333.33);
    expect(packageSessionValue(pkg(1, 333.34))).toBe(333.34);
    expect(packageSessionValue(pkg(0, 0))).toBe(0);
  });
});

describe("booking calendar", () => {
  test("a month is drawn as six weeks from the Monday on or before the 1st", () => {
    // 1 November 2026 is a Sunday: the grid starts on Monday 26 October.
    const grid = monthGrid("2026-11");
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-10-26");
    expect(grid[6]).toBe("2026-11-01");
    expect(grid[41]).toBe("2026-12-06");
    // A month that starts on a Monday starts the grid.
    expect(monthGrid("2027-02")[0]).toBe("2027-02-01");
  });

  test("days and months step across year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
  });

  test("weekday keys match the shop's stored hours", () => {
    expect(weekdayKey("2026-11-14")).toBe("sat");
    expect(weekdayKey("2026-11-16")).toBe("mon");
  });

  test("times are grouped by the shop's clock, not the browser's", () => {
    // 08:30, 12:00 and 17:00 in Nairobi (UTC+3).
    const groups = groupByPartOfDay(["2026-11-16T05:30:00Z", "2026-11-16T09:00:00Z", "2026-11-16T14:00:00Z"], "Africa/Nairobi");
    expect(groups.map((g) => g.part)).toEqual(["Morning", "Afternoon", "Evening"]);
    expect(groupByPartOfDay([], "Africa/Nairobi")).toEqual([]);
  });

  test("opening hours read as a clock", () => {
    expect(clockLabel("08:00")).toBe("8:00 am");
    expect(clockLabel("12:30")).toBe("12:30 pm");
    expect(clockLabel("00:15")).toBe("12:15 am");
    expect(clockLabel("18:00")).toBe("6:00 pm");
  });

  test("the calendar file carries the booking and escapes its text", () => {
    const file = bookingCalendarFile({
      reference: "#12",
      serviceName: "Cut, wash; style",
      staffName: "John",
      start: "2026-11-16T07:00:00Z",
      end: "2026-11-16T07:30:00.000Z",
      branchName: "Main",
      businessName: "Hello Cut",
    });
    expect(file).toContain("DTSTART:20261116T070000Z");
    expect(file).toContain("DTEND:20261116T073000Z");
    expect(file).toContain("SUMMARY:Cut\\, wash\\; style at Hello Cut");
    expect(file.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});
