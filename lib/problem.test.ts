import { describe, expect, it } from "bun:test";

import { isUnmappedTenantHostProblem } from "@/lib/problem";

describe("isUnmappedTenantHostProblem", () => {
  it("matches tenant-not-found problem type", () => {
    expect(
      isUnmappedTenantHostProblem({
        type: "urn:problem:tenant-not-found",
        title: "Tenant not found",
        status: 404,
        detail: "No active tenant mapping found for host: kiosk.zelisline.com",
      }),
    ).toBe(true);
  });

  it("matches tenant-not-found title and unmapped host detail", () => {
    expect(
      isUnmappedTenantHostProblem({
        title: "Tenant not found",
        status: 404,
        detail: "No active tenant mapping found for host: kiosk.zelisline.com",
      }),
    ).toBe(true);
  });

  it("ignores unrelated 404 problems", () => {
    expect(
      isUnmappedTenantHostProblem({
        title: "Not Found",
        status: 404,
        detail: "Item not found",
      }),
    ).toBe(false);
  });
});
