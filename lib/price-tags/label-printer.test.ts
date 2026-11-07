import { describe, expect, it } from "vitest";

import { rollMismatchWarning, taughtRollOf } from "@/lib/price-tags/label-printer";
import { layoutForRoll, resolveSheet } from "@/lib/price-tags/layout";
import { DEFAULT_LAYOUT } from "@/lib/price-tags/templates";

const oneInch = resolveSheet(layoutForRoll(DEFAULT_LAYOUT, { widthMm: 25.4, heightMm: 25.4, across: 2, gapMm: 2.5, edgeMm: 2.5 }));
const thirtyTwo = resolveSheet(layoutForRoll(DEFAULT_LAYOUT, { widthMm: 32, heightMm: 32, across: 2, gapMm: 2, edgeMm: 2 }));

describe("printing a roll the printer was not taught", () => {
  it("warns when the label size differs from the taught roll", () => {
    const settings = { queueName: "B410", flip: false, taughtRoll: taughtRollOf(oneInch) };
    expect(rollMismatchWarning(settings, oneInch)).toBeNull();
    expect(rollMismatchWarning(settings, thirtyTwo)).toContain("25.4 × 25.4 mm, 2 across");
    expect(rollMismatchWarning(settings, thirtyTwo)).toContain("32 × 32 mm, 2 across");
  });

  it("stays quiet until a roll has been taught", () => {
    expect(rollMismatchWarning({ queueName: "B410", flip: false, taughtRoll: null }, thirtyTwo)).toBeNull();
  });
});
