import { describe, expect, test } from "bun:test";

import { readableInkOn } from "./color-contrast";

describe("readableInkOn", () => {
  test("uses white ink on deep colours", () => {
    expect(readableInkOn("#1d4b3b")).toBe("#ffffff");
    expect(readableInkOn("#28a745")).toBe("#ffffff");
  });

  test("uses dark ink on light merchant colours", () => {
    expect(readableInkOn("#f5e6c8")).toBe("#15231f");
    expect(readableInkOn("#fffdf8")).toBe("#15231f");
  });

  test("falls back to white for invalid input", () => {
    expect(readableInkOn("not-a-colour")).toBe("#ffffff");
    expect(readableInkOn(null)).toBe("#ffffff");
  });
});
