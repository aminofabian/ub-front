import { describe, expect, test } from "bun:test";

import {
  STORE_TYPE_OPTIONS,
  storeTypeSectionLabels,
  storeTypesSectionLabels,
} from "./onboarding-questionnaire";

describe("vertical store types", () => {
  test("options include cosmetics, wines-spirits, and other", () => {
    const values = STORE_TYPE_OPTIONS.map((o) => o.value);
    expect(values).toContain("cosmetics");
    expect(values).toContain("wines-spirits");
    expect(values).toContain("other");
  });

  test("other has no starter departments", () => {
    expect(storeTypeSectionLabels("other")).toEqual([]);
  });

  test("cosmetics seeds beauty departments", () => {
    const sections = storeTypeSectionLabels("cosmetics");
    expect(sections).toContain("Skin care");
    expect(sections).toContain("Hair care");
  });

  test("wines-spirits seeds alcohol departments", () => {
    const sections = storeTypeSectionLabels("wines-spirits");
    expect(sections).toContain("Beer");
    expect(sections).toContain("Wine");
    expect(sections).toContain("Spirits");
  });

  test("multi-select merges without duplicates", () => {
    const merged = storeTypesSectionLabels(["cosmetics", "wines-spirits"]);
    expect(merged.filter((s) => s === "Snacks").length).toBeLessThanOrEqual(1);
    expect(merged).toContain("Skin care");
    expect(merged).toContain("Beer");
  });
});
