import { describe, expect, it } from "bun:test";

import { isSessionlessMagicLinkPath } from "@/lib/backend-proxy";

describe("isSessionlessMagicLinkPath", () => {
  it("covers till trust and drawout approval links", () => {
    expect(isSessionlessMagicLinkPath("/api/v1/public/tills/review")).toBe(true);
    expect(isSessionlessMagicLinkPath("/api/v1/public/tills/approve")).toBe(true);
    expect(isSessionlessMagicLinkPath("/api/v1/public/tills/dismiss")).toBe(true);
    expect(
      isSessionlessMagicLinkPath("/api/v1/public/tills/review?token=abc"),
    ).toBe(true);
    expect(isSessionlessMagicLinkPath("/api/v1/public/drawouts/review")).toBe(
      true,
    );
    expect(isSessionlessMagicLinkPath("/api/v1/public/drawouts/approve")).toBe(
      true,
    );
    expect(isSessionlessMagicLinkPath("/api/v1/public/drawouts/reject")).toBe(
      true,
    );
  });

  it("leaves ordinary API calls on the session", () => {
    expect(isSessionlessMagicLinkPath("/api/v1/tills/devices")).toBe(false);
    expect(isSessionlessMagicLinkPath("/api/v1/public/shops/search")).toBe(
      false,
    );
    expect(isSessionlessMagicLinkPath("/api/v1/me")).toBe(false);
  });
});
