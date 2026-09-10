import { describe, expect, it } from "bun:test";

import {
  assignedSubdomainHost,
  shouldHandoffToAssignedSubdomain,
} from "@/lib/post-auth-navigation";

describe("assignedSubdomainHost", () => {
  it("uses kiosk.ke on the platform apex", () => {
    expect(assignedSubdomainHost("sunrise", "kiosk.ke")).toBe("sunrise.kiosk.ke");
    expect(assignedSubdomainHost("sunrise", "www.kiosk.ke")).toBe(
      "sunrise.kiosk.ke",
    );
  });

  it("does not nest under a tenant custom domain", () => {
    expect(assignedSubdomainHost("sunrise", "palmart.co.ke")).toBe(
      "sunrise.kiosk.ke",
    );
  });

  it("uses localhost in local dev", () => {
    expect(assignedSubdomainHost("sunrise", "localhost")).toBe(
      "sunrise.localhost",
    );
    expect(assignedSubdomainHost("sunrise", "sunrise.localhost")).toBe(
      "sunrise.localhost",
    );
  });
});

describe("shouldHandoffToAssignedSubdomain", () => {
  it("leaves kiosk.ke for the assigned shop after signup", () => {
    expect(
      shouldHandoffToAssignedSubdomain({
        currentHost: "kiosk.ke",
        slug: "sunrise",
        preferAssignedSubdomain: true,
      }),
    ).toBe(true);
  });

  it("leaves the apex even without the signup flag", () => {
    expect(
      shouldHandoffToAssignedSubdomain({
        currentHost: "kiosk.ke",
        slug: "sunrise",
      }),
    ).toBe(true);
  });

  it("stays on the assigned subdomain", () => {
    expect(
      shouldHandoffToAssignedSubdomain({
        currentHost: "sunrise.kiosk.ke",
        slug: "sunrise",
        preferAssignedSubdomain: true,
      }),
    ).toBe(false);
  });

  it("stays on a tenant custom domain at login", () => {
    expect(
      shouldHandoffToAssignedSubdomain({
        currentHost: "palmart.co.ke",
        slug: "palmart",
      }),
    ).toBe(false);
    expect(
      shouldHandoffToAssignedSubdomain({
        currentHost: "shop.mama-njeri.co.ke",
        slug: "mama-njeri",
      }),
    ).toBe(false);
  });

  it("leaves a custom domain after claiming a new shop there", () => {
    expect(
      shouldHandoffToAssignedSubdomain({
        currentHost: "palmart.co.ke",
        slug: "sunrise",
        preferAssignedSubdomain: true,
      }),
    ).toBe(true);
  });
});
