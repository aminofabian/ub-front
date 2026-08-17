import { describe, expect, it } from "vitest";

import {
  escapeHtml,
  formatLoyaltyMemberId,
  loyaltyCardAccountUrl,
  loyaltyCardBrandParts,
  loyaltyCardHandle,
  loyaltyCardTierLabel,
} from "@/lib/loyalty-card";

describe("loyalty-card", () => {
  it("formats a stable 12-digit member id from a uuid", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(formatLoyaltyMemberId(id)).toMatch(/^\d{4} \d{4} \d{4}$/);
    expect(formatLoyaltyMemberId(id)).toBe(formatLoyaltyMemberId(id));
  });

  it("splits Palmart branding and leaves other names whole", () => {
    expect(loyaltyCardBrandParts("Palmart")).toEqual({
      left: "palm",
      right: "art",
    });
    expect(loyaltyCardBrandParts("Safari Mart")).toEqual({
      left: "Safari Mart",
      right: null,
    });
  });

  it("maps points to a printed tier", () => {
    expect(loyaltyCardTierLabel(0)).toBe("MEMBER");
    expect(loyaltyCardTierLabel(150)).toBe("SILVER MEMBER");
    expect(loyaltyCardTierLabel(800)).toBe("GOLD MEMBER");
    expect(loyaltyCardTierLabel(2500)).toBe("PLATINUM MEMBER");
  });

  it("builds a tab URL from a Kenyan mobile", () => {
    expect(loyaltyCardAccountUrl("0714282874", "https://palmart.ke")).toBe(
      "https://palmart.ke/0714282874",
    );
    expect(loyaltyCardAccountUrl(null, "https://palmart.ke")).toBe(
      "https://palmart.ke/shop/account",
    );
  });

  it("turns a website into an @handle", () => {
    expect(loyaltyCardHandle("https://www.palmart.ke")).toBe("@palmart.ke");
    expect(loyaltyCardHandle(null)).toBe("@palmart.ke");
  });

  it("escapes markup in printed fields", () => {
    expect(escapeHtml(`<b>"x"</b>`)).toBe("&lt;b&gt;&quot;x&quot;&lt;/b&gt;");
  });
});
