import { describe, expect, it } from "vitest";

import {
  allocateRenamedSkuAvoiding,
  suggestRenamedSku,
} from "./global-catalog-sku-conflict";

describe("suggestRenamedSku", () => {
  it("appends numeric suffix", () => {
    expect(suggestRenamedSku("BC-MILK-1L")).toBe("BC-MILK-1L-2");
    expect(suggestRenamedSku("BC-MILK-1L-2", 3)).toBe("BC-MILK-1L-3");
  });
});

describe("allocateRenamedSkuAvoiding", () => {
  it("avoids taken skus in a batch", () => {
    const taken = new Set(["BC-MILK-1L", "BC-MILK-1L-2"]);
    expect(allocateRenamedSkuAvoiding("BC-MILK-1L", taken)).toBe("BC-MILK-1L-3");
    expect(allocateRenamedSkuAvoiding("BC-MILK-1L", taken)).toBe("BC-MILK-1L-4");
  });
});
