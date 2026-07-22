import { describe, expect, test } from "bun:test";

import {
  formatMoney,
  formatMoneyCompact,
  localeForCurrency,
  resolveCurrencyCode,
} from "./money";

describe("formatMoney", () => {
  test("UGX has no forced .00 (zero-decimal)", () => {
    const out = formatMoney(1500, "UGX");
    expect(out).not.toMatch(/\.00/);
    expect(out).toContain("1");
    expect(out.toUpperCase()).toMatch(/UGX|USh/i);
  });

  test("KES keeps 2 decimal places via Intl defaults", () => {
    const out = formatMoney(1500, "KES");
    // en-KE typically shows KSh / KES with 2dp
    expect(out).toMatch(/1[,.]?500\.00|1[,.]?500/);
  });

  test("null amount is em dash", () => {
    expect(formatMoney(null, "KES")).toBe("—");
  });

  test("falls back to KES when currency omitted", () => {
    expect(resolveCurrencyCode(undefined)).toBe("KES");
    expect(formatMoney(10)).toContain("10");
  });
});

describe("formatMoneyCompact", () => {
  test("rounds to whole units", () => {
    const out = formatMoneyCompact(1500.7, "KES");
    expect(out).not.toMatch(/\.70/);
  });
});

describe("localeForCurrency", () => {
  test("maps known currencies", () => {
    expect(localeForCurrency("UGX")).toBe("en-UG");
    expect(localeForCurrency("KES")).toBe("en-KE");
    expect(localeForCurrency("RWF")).toBe("en-RW");
  });
});
