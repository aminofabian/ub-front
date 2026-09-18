import { describe, expect, test } from "bun:test";

import {
  APPLE_PAY_LOGO_SRC,
  GOOGLE_PAY_LOGO_SRC,
  resolvePaymentBrandLogo,
} from "./payment-brand-logo";

describe("resolvePaymentBrandLogo", () => {
  test("prefers the API logoUrl", () => {
    expect(
      resolvePaymentBrandLogo({
        gatewayType: "APPLE_PAY",
        displayName: "Apple Pay",
        logoUrl: "https://cdn.example/apple.png",
      }),
    ).toEqual({ src: "https://cdn.example/apple.png", alt: "Apple Pay" });
  });

  test("maps Apple Pay type and name to the local mark", () => {
    expect(resolvePaymentBrandLogo({ gatewayType: "APPLE_PAY" })).toEqual({
      src: APPLE_PAY_LOGO_SRC,
      alt: "Apple Pay",
      crop: "mark",
    });
    expect(resolvePaymentBrandLogo({ displayName: "Apple Pay" })?.src).toBe(
      APPLE_PAY_LOGO_SRC,
    );
  });

  test("maps Google Pay type, name, and gpay", () => {
    expect(resolvePaymentBrandLogo({ gatewayType: "GOOGLE_PAY" })).toEqual({
      src: GOOGLE_PAY_LOGO_SRC,
      alt: "Google Pay",
      crop: "mark",
    });
    expect(resolvePaymentBrandLogo({ displayName: "Google Pay" })?.src).toBe(
      GOOGLE_PAY_LOGO_SRC,
    );
    expect(resolvePaymentBrandLogo({ gatewayType: "GPAY" })?.src).toBe(
      GOOGLE_PAY_LOGO_SRC,
    );
  });

  test("does not treat Paystack or Apple as wallet brands", () => {
    expect(resolvePaymentBrandLogo({ gatewayType: "PAYSTACK" })).toBeNull();
    expect(resolvePaymentBrandLogo({ displayName: "Apple store credit" })).toBeNull();
  });
});
