import { describe, expect, test } from "bun:test";

import {
  matchesSearchableSelectQuery,
  shouldOfferCreate,
} from "./searchable-select-create";

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
    expect(shouldOfferCreate(" dairy ", options)).toBe(false);
  });

  test("does not offer create for an empty query", () => {
    expect(shouldOfferCreate("", options)).toBe(false);
    expect(shouldOfferCreate(" ", options)).toBe(false);
  });

  test("offers create for a partial match that is a different name", () => {
    expect(shouldOfferCreate("Dair", options)).toBe(true);
  });
});

describe("matchesSearchableSelectQuery", () => {
  const option = {
    label: "Afia Apple 300ml",
    hint: "follows stock",
    search: "6161100123456",
  };

  test("matches name fragments", () => {
    expect(matchesSearchableSelectQuery(option, "afia")).toBe(true);
  });

  test("matches hint text", () => {
    expect(matchesSearchableSelectQuery(option, "follows")).toBe(true);
  });

  test("matches barcode via search field", () => {
    expect(matchesSearchableSelectQuery(option, "6161100123456")).toBe(true);
    expect(matchesSearchableSelectQuery(option, "123456")).toBe(true);
  });

  test("rejects unrelated queries", () => {
    expect(matchesSearchableSelectQuery(option, "indomie")).toBe(false);
  });
});
