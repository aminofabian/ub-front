import { describe, expect, it } from "bun:test";

import { isItemNotFoundProblem, isUnmappedTenantHostProblem } from "@/lib/problem";

describe("isItemNotFoundProblem", () => {
  it("matches pricing/catalog item missing detail", () => {
    expect(
      isItemNotFoundProblem({
        type: "urn:problem:bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Item not found",
      }),
    ).toBe(true);
  });

  it("ignores unrelated problems", () => {
    expect(
      isItemNotFoundProblem({
        title: "Bad Request",
        status: 400,
        detail: "Branch not found",
      }),
    ).toBe(false);
  });
});

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
