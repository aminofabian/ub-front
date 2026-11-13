import { describe, expect, test } from "bun:test";

import { nairobiToday, previewCommission } from "./service-business-api";

describe("previewCommission", () => {
  test("percent of the price in whole shillings, half up", () => {
    expect(previewCommission(300, "PERCENT", 40)).toBe(120);
    expect(previewCommission(333, "PERCENT", 40)).toBe(133);
    expect(previewCommission(5, "PERCENT", 10)).toBe(1);
    expect(previewCommission(4, "PERCENT", 10)).toBe(0);
  });

  test("fixed amount is capped at the price", () => {
    expect(previewCommission(1500, "FIXED", 200)).toBe(200);
    expect(previewCommission(100, "FIXED", 500)).toBe(100);
  });

  test("no plan, no price or a bad rate earns nothing", () => {
    expect(previewCommission(300, null, 40)).toBe(0);
    expect(previewCommission(300, "PERCENT", null)).toBe(0);
    expect(previewCommission(0, "PERCENT", 40)).toBe(0);
    expect(previewCommission(300, "PERCENT", -5)).toBe(0);
  });
});

describe("nairobiToday", () => {
  test("uses the Nairobi calendar day, not UTC", () => {
    // 22:30 UTC on 13 Nov is 01:30 on 14 Nov in Nairobi (UTC+3).
    expect(nairobiToday(new Date("2026-11-13T22:30:00Z"))).toBe("2026-11-14");
    expect(nairobiToday(new Date("2026-11-13T20:59:00Z"))).toBe("2026-11-13");
  });
});
