import { describe, expect, it } from "bun:test";

import {
  isItemNotFoundProblem,
  isSessionRelatedProblem,
  isTenantContextMissingProblem,
  isUnmappedTenantHostProblem,
} from "@/lib/problem";

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

describe("isSessionRelatedProblem", () => {
  it("treats authenticated 401 as session failure", () => {
    expect(
      isSessionRelatedProblem(401, {
        title: "Session is no longer active",
        status: 401,
        type: "urn:problem:unauthorized",
      }),
    ).toBe(true);
  });

  it("ignores 401 on public login calls", () => {
    expect(
      isSessionRelatedProblem(
        401,
        { title: "Incorrect email or password.", status: 401 },
        { requiresAuth: false },
      ),
    ).toBe(false);
  });

  it("matches token_expired and invalid access token signals", () => {
    expect(
      isSessionRelatedProblem(403, {
        code: "token_expired",
        title: "Invalid or expired access token",
      }),
    ).toBe(true);
  });

  it("matches revoked-session and refresh-token titles", () => {
    expect(
      isSessionRelatedProblem(401, {
        title: "Invalid or expired token",
        status: 401,
      }),
    ).toBe(true);
  });

  it("matches tenant token mismatch forbidden", () => {
    expect(
      isSessionRelatedProblem(403, {
        title: "Token tenant does not match resolved host tenant",
        status: 403,
        type: "urn:problem:forbidden",
      }),
    ).toBe(true);
  });

  it("ignores generic permission-denied 403", () => {
    expect(
      isSessionRelatedProblem(403, {
        title: "Forbidden",
        status: 403,
        type: "urn:problem:permission-denied",
      }),
    ).toBe(false);
  });

  it("ignores bare 403 with no problem body", () => {
    expect(isSessionRelatedProblem(403, {})).toBe(false);
  });

  it("ignores 403 on public calls", () => {
    expect(
      isSessionRelatedProblem(
        403,
        {
          title: "Forbidden",
          status: 403,
          type: "urn:problem:permission-denied",
        },
        { requiresAuth: false },
      ),
    ).toBe(false);
  });

  // Missing tenant context on authenticated calls means stored tenant routing
  // was lost while tokens remain — sign out instead of surfacing a toast.
  // Public/unauthenticated calls still treat it as a configuration error.
  it("treats missing tenant context on authenticated calls as session failure", () => {
    expect(
      isSessionRelatedProblem(400, {
        title: "Bad Request",
        status: 400,
        detail:
          "Tenant context missing. Provide mapped Host header or X-Tenant-Id.",
      }),
    ).toBe(true);
  });

  it("ignores missing tenant context on public calls", () => {
    expect(
      isSessionRelatedProblem(
        400,
        {
          title: "Bad Request",
          status: 400,
          detail:
            "Tenant context missing. Provide mapped Host header or X-Tenant-Id.",
        },
        { requiresAuth: false },
      ),
    ).toBe(false);
  });

  it("ignores unmapped tenant host 404 (routing problem, not auth)", () => {
    expect(
      isSessionRelatedProblem(404, {
        type: "urn:problem:tenant-not-found",
        title: "Tenant not found",
        status: 404,
        detail: "No active tenant mapping found for host: kiosk.zelisline.com",
      }),
    ).toBe(false);
  });
});

describe("isTenantContextMissingProblem", () => {
  it("matches TenantRequestIds 400 detail", () => {
    expect(
      isTenantContextMissingProblem({
        title: "Bad Request",
        status: 400,
        detail:
          "Tenant context missing. Provide mapped Host header or X-Tenant-Id.",
      }),
    ).toBe(true);
  });

  it("ignores unrelated 400 problems", () => {
    expect(
      isTenantContextMissingProblem({
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
