import { describe, expect, test } from "bun:test";

import {
  parseProductDossierSlug,
  productDossierPath,
} from "./product-dossier-url";

describe("productDossierPath", () => {
  test("embeds a readable handle and the item id", () => {
    const id = "a1b2c3d4-e5f6-4789-8abc-def012345678";
    expect(productDossierPath({ id, name: "Brookside Milk 500ml" })).toBe(
      `/products/p/${encodeURIComponent(`brookside-milk-500ml--${id}`)}`,
    );
  });
});

describe("parseProductDossierSlug", () => {
  const id = "a1b2c3d4-e5f6-4789-8abc-def012345678";

  test("reads a raw uuid", () => {
    expect(parseProductDossierSlug(id)).toBe(id);
  });

  test("reads handle--uuid", () => {
    expect(parseProductDossierSlug(`brookside-milk--${id}`)).toBe(id);
  });
});
