import { describe, expect, test } from "bun:test";

import {
  pickSuggestedOnboardingPack,
  scopePacksForStoreTypes,
} from "./onboarding-suggested-pack";
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

  test("matches mixed-shop packs", () => {
    const packs = [
      pack({ id: "m", name: "Mini", storeKitId: "mini-mart", sortOrder: 1 }),
      pack({ id: "x", name: "Mixed", storeKitId: "mixed-shop", sortOrder: 2 }),
    ];
    expect(pickSuggestedOnboardingPack(packs, ["mixed-shop"])?.id).toBe("x");
  });

  test("returns null for non catalogue-eligible shop types", () => {
    const packs = [
      pack({ id: "a", name: "A", sortOrder: 1 }),
      pack({ id: "m", name: "Mini", storeKitId: "mini-mart", sortOrder: 2 }),
    ];
    expect(pickSuggestedOnboardingPack(packs, ["cosmetics"])).toBeNull();
    expect(pickSuggestedOnboardingPack(packs, ["butchery"])).toBeNull();
    expect(pickSuggestedOnboardingPack(packs, ["other"])).toBeNull();
  });

  test("prefers pharmacy pack and never falls back to mini-mart", () => {
    const packs = [
      pack({ id: "m", name: "Mini", storeKitId: "mini-mart", sortOrder: 1 }),
      pack({
        id: "p",
        name: "Pharmacy",
        storeKitId: "pharmacy",
        sortOrder: 3,
        productCount: 50,
      }),
    ];
    expect(pickSuggestedOnboardingPack(packs, ["pharmacy"])?.id).toBe("p");
  });

  test("pharmacy with no pharmacy pack returns null", () => {
    const packs = [
      pack({ id: "m", name: "Mini", storeKitId: "mini-mart", sortOrder: 1 }),
    ];
    expect(pickSuggestedOnboardingPack(packs, ["pharmacy"])).toBeNull();
  });

  test("never falls back to another vertical's pack (mini-mart never gets pharmacy)", () => {
    const packs = [
      pack({
        id: "p",
        name: "Pharmacy / Chemist Starter",
        storeKitId: "pharmacy",
        productCount: 5402,
        sortOrder: 3,
      }),
    ];
    expect(pickSuggestedOnboardingPack(packs, ["mini-mart"])).toBeNull();
    expect(pickSuggestedOnboardingPack(packs, ["mixed-shop"])).toBeNull();
  });

  test("eligible when mini-mart is among multiple types", () => {
    const packs = [
      pack({ id: "m", name: "Mini", storeKitId: "mini-mart", sortOrder: 1 }),
    ];
    expect(
      pickSuggestedOnboardingPack(packs, ["butchery", "mini-mart"])?.id,
    ).toBe("m");
  });
});

describe("scopePacksForStoreTypes", () => {
  const packs = [
    pack({ id: "mini", name: "Mini Mart Starter", storeKitId: "mini-mart" }),
    pack({ id: "bev", name: "Beverages Pack", storeKitId: "mini-mart" }),
    pack({ id: "grocery", name: "Grocery Basics", storeKitId: "full-grocery" }),
    pack({ id: "pharm", name: "Pharmacy Starter", storeKitId: "pharmacy" }),
    pack({ id: "cosm", name: "Cosmetics Starter", storeKitId: "cosmetics" }),
  ];

  test("a pharmacy sees only its own starter, never mini-mart", () => {
    expect(scopePacksForStoreTypes(packs, ["pharmacy"]).map((p) => p.id)).toEqual([
      "pharm",
    ]);
  });

  test("a mini-mart sees mini-mart packs, never pharmacy", () => {
    expect(scopePacksForStoreTypes(packs, ["mini-mart"]).map((p) => p.id)).toEqual([
      "mini",
      "bev",
    ]);
  });

  test("full-grocery matches its exact pack", () => {
    expect(
      scopePacksForStoreTypes(packs, ["full-grocery"]).map((p) => p.id),
    ).toEqual(["grocery"]);
  });

  test("mixed-shop uses the grocery fallback", () => {
    expect(scopePacksForStoreTypes(packs, ["mixed-shop"]).map((p) => p.id)).toEqual([
      "mini",
      "bev",
    ]);
  });

  test("unknown shop formats hide specialized verticals", () => {
    expect(scopePacksForStoreTypes(packs, []).map((p) => p.id)).toEqual([
      "mini",
      "bev",
      "grocery",
    ]);
  });

  test("a format with no pack of its own sees none", () => {
    expect(scopePacksForStoreTypes(packs, ["butchery"])).toEqual([]);
  });
});
