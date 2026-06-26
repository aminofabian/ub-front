import { describe, expect, it } from "vitest";

import { suggestRenamedSku } from "./global-catalog-sku-conflict";

describe("suggestRenamedSku", () => {
  it("appends numeric suffix", () => {
    expect(suggestRenamedSku("BC-MILK-1L")).toBe("BC-MILK-1L-2");
    expect(suggestRenamedSku("BC-MILK-1L-2", 3)).toBe("BC-MILK-1L-3");
  });
});
