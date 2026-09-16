import { describe, expect, it } from "bun:test";

import { parseSignInDestinations } from "@/lib/api";
import {
  buildStaffDestinationVerifyUrl,
  resolveApexStaffTenant,
} from "@/lib/staff-tenant-resolve";

describe("parseSignInDestinations unverified doors", () => {
  it("keeps STAFF_UNVERIFIED so apex can route INVITED owners", () => {
    const rows = parseSignInDestinations([
      {
        slug: "ghost-shop",
        name: "Ghost Shop",
        primaryHost: "ghost-shop.kiosk.ke",
        door: "STAFF_UNVERIFIED",
        hint: "Verify your email before signing in",
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.door).toBe("STAFF_UNVERIFIED");
    expect(rows[0]?.slug).toBe("ghost-shop");
  });
});

describe("buildStaffDestinationVerifyUrl", () => {
  it("forwards to verify-email on the shop host", () => {
    const url = buildStaffDestinationVerifyUrl(
      {
        slug: "ghost-shop",
        name: "Ghost Shop",
        primaryHost: "ghost-shop.kiosk.ke",
        door: "STAFF_UNVERIFIED",
      },
      "owner@example.com",
    );
    expect(url).toContain("/verify-email");
    expect(url).toContain("email=owner%40example.com");
    expect(url).toContain("ghost-shop");
  });
});
