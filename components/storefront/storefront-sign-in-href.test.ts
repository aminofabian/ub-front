import { describe, expect, it } from "bun:test";

import { APP_ROUTES } from "@/lib/config";
import {
  buildStorefrontSignInHref,
  signInPhaseForDoor,
} from "@/lib/storefront-sign-in-href";

/**
 * The storefront header renders two doors. They used to build an identical URL,
 * so a shopper who tapped "Sign up" got the sign-in form (F7).
 */
function paramsOf(href: string): URLSearchParams {
  return new URLSearchParams(href.split("?")[1] ?? "");
}

describe("buildStorefrontSignInHref", () => {
  it("marks the signup door so the sheet opens on the create-account form", () => {
    const params = paramsOf(buildStorefrontSignInHref({ signup: true }));

    expect(params.get("signin")).toBe("1");
    expect(params.get("signup")).toBe("1");
  });

  it("does not mark the signin door as signup", () => {
    const params = paramsOf(buildStorefrontSignInHref({}));

    expect(params.get("signin")).toBe("1");
    expect(params.get("signup")).toBeNull();
  });

  it("keeps the two doors distinguishable at the same path", () => {
    const signIn = buildStorefrontSignInHref({
      path: APP_ROUTES.shop,
      next: APP_ROUTES.shopAccount,
    });
    const signUp = buildStorefrontSignInHref({
      path: APP_ROUTES.shop,
      next: APP_ROUTES.shopAccount,
      signup: true,
    });

    expect(signUp).not.toBe(signIn);
  });

  it("still carries the allowlisted next and prefilled identity", () => {
    const params = paramsOf(
      buildStorefrontSignInHref({
        signup: true,
        next: APP_ROUTES.shopAccount,
        email: "Shopper@Example.com",
      }),
    );

    expect(params.get("next")).toBe(APP_ROUTES.shopAccount);
    expect(params.get("email")).toBe("shopper@example.com");
    expect(params.get("signup")).toBe("1");
  });

  it("drops a non-shop next even on the signup door", () => {
    const params = paramsOf(
      buildStorefrontSignInHref({ signup: true, next: "/business" }),
    );

    expect(params.get("next")).toBeNull();
    expect(params.get("signup")).toBe("1");
  });

  it("keeps the staff door on the sign-in phase", () => {
    // `?signup=1&door=staff` must not open the create-account form: staff signup
    // is its own page, and the sheet's signup phase registers a buyer account.
    expect(signInPhaseForDoor("signup", "staff")).toBe("credentials");
    expect(signInPhaseForDoor("signup", "shopper")).toBe("signup");
    expect(signInPhaseForDoor("credentials", "shopper")).toBe("credentials");
    expect(signInPhaseForDoor(null, null)).toBe("credentials");
    expect(signInPhaseForDoor("signup", null)).toBe("signup");
  });
});
