import { describe, expect, it } from "bun:test";

import { STORE_TYPE_OPTIONS } from "@/lib/onboarding-questionnaire";
import { resolveShopMark, shopMarkCaption, shopMarkColors } from "@/lib/shop-mark";

describe("resolveShopMark", () => {
  it("gives every shop format its own emblem", () => {
    const kinds = STORE_TYPE_OPTIONS.map(
      (option) => resolveShopMark([option.value]).kind,
    );
    const drawn = kinds.filter((kind) => kind !== "lettermark");
    expect(new Set(drawn).size).toBe(drawn.length);
    expect(resolveShopMark(["other"]).kind).toBe("lettermark");
  });

  it("uses the first chosen format", () => {
    expect(resolveShopMark(["cafe", "bar"]).kind).toBe("cafe");
    expect(resolveShopMark(["bar", "cafe"]).label).toBe("Bar");
  });

  it("falls back to a name seal", () => {
    expect(resolveShopMark([]).kind).toBe("lettermark");
    expect(resolveShopMark(["unknown"]).kind).toBe("lettermark");
    expect(resolveShopMark(null).label).toBe("Name");
  });
});

describe("shopMarkCaption", () => {
  it("names the trade on the setup screen", () => {
    expect(shopMarkCaption(["butchery"])).toBe(
      "Butchery mark from your shop name — upload anytime to replace",
    );
    expect(shopMarkCaption([])).toBe(
      "Name mark from your shop name — upload anytime to replace",
    );
  });
});

describe("shopMarkColors", () => {
  it("puts dark ink on a light plate", () => {
    expect(shopMarkColors("#F9A825", "#C47E00", false).ink).toBe("#111827");
  });

  it("puts light ink on a dark plate", () => {
    expect(shopMarkColors("#1565C0", "#0D47A1", false).ink).toBe("#FFFFFF");
  });
});
