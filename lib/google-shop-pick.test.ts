import { describe, expect, it } from "bun:test";

import {
  googleShopPickErrorMessage,
  staffShopsFromPayload,
} from "@/lib/google-shop-pick";

describe("staffShopsFromPayload", () => {
  it("keeps staff shops and drops shopper doors", () => {
    const rows = staffShopsFromPayload({
      email: "owner@example.com",
      destinations: [
        {
          slug: "alpha-mart",
          name: "Alpha Mart",
          primaryHost: "alpha.kiosk.ke",
          door: "STAFF",
        },
        {
          slug: "alpha-mart",
          name: "Alpha Mart",
          door: "SHOPPER",
        },
        {
          slug: "ghost",
          name: "Ghost",
          door: "STAFF_UNVERIFIED",
        },
      ],
    });

    expect(rows.map((row) => row.slug)).toEqual(["alpha-mart"]);
  });
});

describe("googleShopPickErrorMessage", () => {
  it("turns an expired pick into a retry", () => {
    expect(googleShopPickErrorMessage("expired_state")).toBe(
      "That Google sign-in expired. Try again.",
    );
  });

  it("rejects a shop the Google account is not on", () => {
    expect(googleShopPickErrorMessage("unknown_shop")).toBe(
      "That shop is not linked to this Google account.",
    );
  });
});
