import { describe, expect, test } from "bun:test";

import { pickSuggestedOnboardingPack } from "./onboarding-suggested-pack";
import type { GlobalProductPackRecord } from "./api";

function pack(
  partial: Partial<GlobalProductPackRecord> & Pick<GlobalProductPackRecord, "id" | "name">,
): GlobalProductPackRecord {
  return {
    code: partial.code ?? partial.id,
    description: null,
    storeKitId: null,
    productCount: 10,
    sortOrder: 0,
    ...partial,
  };
}

describe("pickSuggestedOnboardingPack", () => {
  test("returns null when no ready packs", () => {
    expect(
      pickSuggestedOnboardingPack(
        [pack({ id: "a", name: "Empty", productCount: 0 })],
        ["mini-mart"],
      ),
    ).toBeNull();
  });

  test("prefers a pack matching store type", () => {
    const packs = [
      pack({ id: "g", name: "Grocery", storeKitId: "full-grocery", sortOrder: 1 }),
      pack({ id: "m", name: "Mini", storeKitId: "mini-mart", sortOrder: 2 }),
    ];
    expect(pickSuggestedOnboardingPack(packs, ["mini-mart"])?.id).toBe("m");
  });

  test("falls back to first ready pack by sort order", () => {
    const packs = [
      pack({ id: "b", name: "B", sortOrder: 2 }),
      pack({ id: "a", name: "A", sortOrder: 1 }),
    ];
    expect(pickSuggestedOnboardingPack(packs, ["cosmetics"])?.id).toBe("a");
  });
});
