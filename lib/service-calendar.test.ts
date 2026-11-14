import { describe, expect, test } from "bun:test";

import { columnOf, hoursToShow, placeEntries, timeAtFraction, weekOf, type CalendarEntry } from "./service-calendar";

const DAY = new Date("2026-11-16T00:00:00+03:00").getTime();
const at = (time: string) => new Date(`2026-11-16T${time}:00+03:00`).toISOString();
const entry = (start: string, end: string, extra: Partial<CalendarEntry> = {}): CalendarEntry => ({
  kind: "BOOKED",
  ticketId: "t",
  ticketNumber: 1,
  title: "Haircut",
  customerName: "Kevin",
  staffProfileId: "mike",
  resourceId: "chair1",
  start: at(start),
  end: at(end),
  ...extra,
});

describe("placeEntries", () => {
  const start = DAY + 8 * 3600000;
  const end = DAY + 18 * 3600000;

  test("an entry sits where its time is", () => {
    const [placed] = placeEntries([entry("10:00", "10:30")], start, end);
    expect(placed!.top).toBeCloseTo(0.2, 5);
    expect(placed!.height).toBeCloseTo(0.05, 5);
    expect(placed!.lanes).toBe(1);
  });

  test("two that overlap go side by side; back-to-back ones do not", () => {
    const placed = placeEntries([entry("10:00", "11:00"), entry("10:30", "11:30"), entry("11:30", "12:00")], start, end);
    expect(placed.map((p) => [p.lane, p.lanes])).toEqual([
      [0, 2],
      [1, 2],
      [0, 1],
    ]);
  });

  test("a third fits back into a lane that has emptied", () => {
    const placed = placeEntries([entry("10:00", "10:30"), entry("10:15", "11:00"), entry("10:30", "11:00")], start, end);
    expect(placed.map((p) => p.lane)).toEqual([0, 1, 0]);
    expect(placed.every((p) => p.lanes === 2)).toBe(true);
  });

  test("entries are clipped to the shown hours and those outside are dropped", () => {
    const placed = placeEntries([entry("07:00", "09:00"), entry("19:00", "20:00")], start, end);
    expect(placed).toHaveLength(1);
    expect(placed[0]!.top).toBe(0);
    expect(placed[0]!.height).toBeCloseTo(0.1, 5);
  });
});

describe("calendar helpers", () => {
  test("the shown hours widen to fit an early or late entry", () => {
    expect(hoursToShow([entry("10:00", "10:30")], DAY)).toEqual({ firstHour: 7, lastHour: 20 });
    expect(hoursToShow([entry("05:30", "06:00"), entry("21:00", "22:15")], DAY)).toEqual({ firstHour: 5, lastHour: 23 });
  });

  test("a week runs Monday to Sunday", () => {
    expect(weekOf("2026-11-18")).toEqual([
      "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22",
    ]);
    expect(weekOf("2026-11-22")[0]).toBe("2026-11-16");
    expect(weekOf("2026-11-16")[0]).toBe("2026-11-16");
  });

  test("a tap becomes a quarter-hour time", () => {
    expect(timeAtFraction(0, 7, 20)).toBe("07:00");
    expect(timeAtFraction(0.5, 8, 18)).toBe("13:00");
    expect(timeAtFraction(0.26, 8, 18)).toBe("10:30");
    expect(timeAtFraction(1, 7, 24)).toBe("23:45");
  });

  test("people and places are separate groupings of the same entries", () => {
    const e = entry("10:00", "10:30");
    expect(columnOf(e, "people")).toBe("mike");
    expect(columnOf(e, "places")).toBe("chair1");
    expect(columnOf({ ...e, resourceId: null }, "places")).toBeNull();
  });
});
