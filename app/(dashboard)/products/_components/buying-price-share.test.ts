import { describe, expect, it } from "bun:test";

import {
  buyingFollowsShare,
  buyingPriceFromSelling,
  parseMarkupPct,
  resolveMarkupPct,
} from "./buying-price-share";

describe("buyingPriceFromSelling", () => {
  it("treats 25% markup as a selling price of 125% of cost", () => {
    expect(buyingPriceFromSelling("125", 25)).toBe("100");
    expect(buyingPriceFromSelling("250", 25)).toBe("200");
  });

  it("uses the same formula for a 20% markup", () => {
    expect(buyingPriceFromSelling("120", 20)).toBe("100");
    expect(buyingPriceFromSelling("250", 20)).toBe("208.33");
  });

  it("stays blank when the selling price or the markup is missing", () => {
    expect(buyingPriceFromSelling("", 20)).toBe("");
    expect(buyingPriceFromSelling("0", 20)).toBe("");
    expect(buyingPriceFromSelling("250", null)).toBe("");
  });
});

describe("buyingFollowsShare", () => {
  it("treats an empty buying price as still following the markup", () => {
    expect(buyingFollowsShare("", "125", 25)).toBe(true);
  });

  it("keeps a buying price the clerk typed", () => {
    expect(buyingFollowsShare("40", "125", 25)).toBe(false);
  });

  it("recognises the cost after the selling price changes", () => {
    expect(buyingFollowsShare("100", "125", 25)).toBe(true);
    expect(buyingFollowsShare("100", "120", 20)).toBe(true);
  });
});

describe("parseMarkupPct", () => {
  it("accepts a normal markup, including one above 100", () => {
    expect(parseMarkupPct("20")).toBe(20);
    expect(parseMarkupPct("25")).toBe(25);
    expect(parseMarkupPct("0")).toBe(0);
    expect(parseMarkupPct("150")).toBe(150);
  });

  it("rejects a blank or negative markup", () => {
    expect(parseMarkupPct("")).toBeNull();
    expect(parseMarkupPct("-1")).toBeNull();
  });
});

describe("resolveMarkupPct", () => {
  it("stays empty when no shelf has a markup", () => {
    expect(resolveMarkupPct(null, null, null)).toBeNull();
    expect(resolveMarkupPct("", "", "")).toBeNull();
  });

  it("uses the department markup when the category has none", () => {
    expect(resolveMarkupPct(null, 20, null)).toBe(20);
  });

  it("lets the category markup win over the department", () => {
    expect(resolveMarkupPct(null, 20, "25")).toBe(25);
  });

  it("lets the supplier markup override the category and the department", () => {
    expect(resolveMarkupPct(15, 20, 25)).toBe(15);
  });
});
