import { describe, expect, it } from "bun:test";

import { APP_ROUTES } from "@/lib/config";
import {
  getBusinessStoreTypes,
  isButcheryOnlyBusiness,
} from "@/lib/business-store-type";
import { resolveButcheryOnlyRedirect } from "@/lib/butcher-only-access";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";

describe("business store types", () => {
  it("reads multi-select profile store types", () => {
    expect(
      getBusinessStoreTypes({
        profile: { storeTypes: ["mini-mart", "butchery"] },
      }),
    ).toEqual(["mini-mart", "butchery"]);
  });

  it("detects butchery-only tenants", () => {
    expect(
      isButcheryOnlyBusiness({
        profile: { storeTypes: ["butchery"] },
      }),
    ).toBe(true);
    expect(
      isButcheryOnlyBusiness({
        profile: { storeTypes: ["butchery", "mini-mart"] },
      }),
    ).toBe(false);
  });

  it("falls back to onboarding answers", () => {
    expect(
      getBusinessStoreTypes({
        onboarding: { answers: { storeTypes: ["butchery"] } },
      }),
    ).toEqual(["butchery"]);
  });
});

describe("butchery-only redirects", () => {
  const butcherOnly = { profile: { storeTypes: ["butchery"] } };

  it("keeps butcher workspace routes", () => {
    expect(
      resolveButcheryOnlyRedirect(APP_ROUTES.butcherProducts, butcherOnly),
    ).toBeNull();
  });

  it("redirects overview to counter", () => {
    expect(resolveButcheryOnlyRedirect(APP_ROUTES.overview, butcherOnly)).toBe(
      APP_ROUTES.butcher,
    );
  });

  it("redirects dashboard products to butcher products", () => {
    expect(resolveButcheryOnlyRedirect(APP_ROUTES.products, butcherOnly)).toBe(
      APP_ROUTES.butcherProducts,
    );
  });

  it("redirects dashboard suppliers to butcher suppliers", () => {
    expect(resolveButcheryOnlyRedirect(APP_ROUTES.suppliers, butcherOnly)).toBe(
      APP_ROUTES.butcherSuppliers,
    );
  });
});

describe("resolvePostAuthDestination butchery-only", () => {
  it("sends owners of butchery-only tenants to /butcher", () => {
    expect(
      resolvePostAuthDestination(
        { role: { key: "owner" } },
        null,
        { profile: { storeTypes: ["butchery"] } },
      ),
    ).toBe(APP_ROUTES.butcher);
  });
});
