import { describe, expect, it } from "vitest";

import {
  composeOptionLabel,
  readyGroupOptions,
  stripFamilyPrefixFromInput,
  type GroupOptionRow,
} from "./CreateGroupOptionsPad";

function row(
  partial: Partial<GroupOptionRow> & { label: string },
): GroupOptionRow {
  return {
    key: "k1",
    barcode: "",
    buyingPrice: "",
    unitPrice: "100",
    stock: "1",
    imageFile: null,
    imagePreview: null,
    ...partial,
  };
}

describe("composeOptionLabel", () => {
  it("prepends the family name to the size or flavour", () => {
    expect(composeOptionLabel("Kabras Sugar", "1kg")).toBe("Kabras Sugar 1kg");
  });

  it("does not double the family name when already typed", () => {
    expect(composeOptionLabel("Kabras Sugar", "Kabras Sugar 1kg")).toBe(
      "Kabras Sugar 1kg",
    );
  });

  it("returns empty when the option suffix is blank", () => {
    expect(composeOptionLabel("Kabras Sugar", " ")).toBe("");
  });
});

describe("stripFamilyPrefixFromInput", () => {
  it("drops a re-typed family prefix while typing", () => {
    expect(stripFamilyPrefixFromInput("Kabras Sugar 1kg", "Kabras Sugar")).toBe(
      "1kg",
    );
  });

  it("leaves a plain size alone", () => {
    expect(stripFamilyPrefixFromInput("1kg", "Kabras Sugar")).toBe("1kg");
  });
});

describe("readyGroupOptions", () => {
  it("stores the composed family + option label", () => {
    const ready = readyGroupOptions(
      [row({ label: "1kg", unitPrice: "250" })],
      "Kabras Sugar",
    );
    expect(ready).toHaveLength(1);
    expect(ready[0].label).toBe("Kabras Sugar 1kg");
  });
});
