import { describe, expect, it } from "bun:test";

import { buildOrderTrackingUrl } from "@/lib/whatsapp-order";

describe("buildOrderTrackingUrl", () => {
  it("builds the code URL when no token is present", () => {
    expect(buildOrderTrackingUrl("https://acme.kiosk.ke", "ABCD1234", null)).toBe(
      "https://acme.kiosk.ke/shop/o/ABCD1234",
    );
    expect(buildOrderTrackingUrl("https://acme.kiosk.ke", "ABCD1234", "")).toBe(
      "https://acme.kiosk.ke/shop/o/ABCD1234",
    );
  });

  it("appends the single-use receipt token as t=", () => {
    expect(buildOrderTrackingUrl("https://acme.kiosk.ke", "ABCD1234", "TOK123")).toBe(
      "https://acme.kiosk.ke/shop/o/ABCD1234?t=TOK123",
    );
  });

  it("URL-encodes token characters", () => {
    expect(buildOrderTrackingUrl("https://acme.kiosk.ke", "ABCD1234", "A B+C")).toBe(
      "https://acme.kiosk.ke/shop/o/ABCD1234?t=A%20B%2BC",
    );
  });
});
