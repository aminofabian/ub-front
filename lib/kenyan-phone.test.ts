import { describe, expect, it } from "vitest";

import {
  looksLikeKenyanMobilePath,
  toKenyanLocal07,
} from "@/lib/kenyan-phone";

describe("kenyan-phone", () => {
  it("detects Kenyan mobile path segments", () => {
    expect(looksLikeKenyanMobilePath("0714282874")).toBe(true);
    expect(looksLikeKenyanMobilePath("254714282874")).toBe(true);
    expect(looksLikeKenyanMobilePath("714282874")).toBe(true);
    expect(looksLikeKenyanMobilePath("sugar-2kg")).toBe(false);
    expect(looksLikeKenyanMobilePath("SKU-001")).toBe(false);
  });

  it("normalizes to local 07 form", () => {
    expect(toKenyanLocal07("254714282874")).toBe("0714282874");
    expect(toKenyanLocal07("0714282874")).toBe("0714282874");
    expect(toKenyanLocal07("714282874")).toBe("0714282874");
  });
});
