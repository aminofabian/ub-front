import { describe, expect, it } from "vitest";

import {
  COMILMART_GOLD,
  COMILMART_NAVY,
  comilmartPaletteVars,
} from "@/components/storefront/templates/store/comilmart-palette";

describe("comilmartPaletteVars", () => {
  it("keeps signature navy and gold chrome regardless of merchant brand", () => {
    const vars = comilmartPaletteVars("#0f766e", "#ce8509") as Record<
      string,
      string
    >;
    expect(vars["--cm-navy"]).toBe(COMILMART_NAVY);
    expect(vars["--cm-gold"]).toBe(COMILMART_GOLD);
    expect(vars["--primary"]).toBe(COMILMART_NAVY);
    expect(vars["--storefront-accent"]).toBe(COMILMART_GOLD);
    expect(vars["--cm-brand"]).toBe("#0f766e");
    expect(vars["--cm-brand-soft"]).toBe("#ce8509");
  });

  it("falls back brand tokens to theme defaults when colors are invalid", () => {
    const vars = comilmartPaletteVars("not-a-color", "") as Record<
      string,
      string
    >;
    expect(vars["--cm-brand"]).toBe(COMILMART_NAVY);
    expect(vars["--cm-brand-soft"]).toBe(COMILMART_GOLD);
  });
});
