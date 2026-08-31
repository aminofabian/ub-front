import { describe, expect, test } from "bun:test";

import { shouldOfferCreate } from "./searchable-select-create";

describe("shouldOfferCreate", () => {
  const options = [
    { label: "Dairy" },
    { label: "Bread" },
    { label: "Fresh milk" },
  ];

  test("offers create for a new name", () => {
    expect(shouldOfferCreate("Snacks", options)).toBe(true);
  });

  test("does not offer create for an exact match", () => {
    expect(shouldOfferCreate("Dairy", options)).toBe(false);
    expect(shouldOfferCreate("  dairy  ", options)).toBe(false);
  });

  test("does not offer create for an empty query", () => {
    expect(shouldOfferCreate("", options)).toBe(false);
    expect(shouldOfferCreate("   ", options)).toBe(false);
  });

  test("offers create for a partial match that is a different name", () => {
    expect(shouldOfferCreate("Dair", options)).toBe(true);
  });
});
