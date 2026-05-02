import { describe, expect, it } from "bun:test";

import { buildRequestHeaders, shouldAttemptRefresh } from "@/lib/api";

describe("api client helpers", () => {
  it("adds Idempotency-Key for mutating methods", () => {
    const headers = buildRequestHeaders(
      true,
      "token",
      "POST",
      () => "idempotency-key-1",
    ) as Record<string, string>;

    expect(headers["Idempotency-Key"]).toBe("idempotency-key-1");
    expect(headers.Authorization).toBe("Bearer token");
  });

  it("does not add Idempotency-Key for GET", () => {
    const headers = buildRequestHeaders(
      true,
      "token",
      "GET",
      () => "idempotency-key-2",
    ) as Record<string, string>;

    expect(headers["Idempotency-Key"]).toBeUndefined();
  });

  it("refreshes only for token_expired problem code", () => {
    expect(shouldAttemptRefresh("token_expired")).toBe(true);
    expect(shouldAttemptRefresh("permission_denied")).toBe(false);
    expect(shouldAttemptRefresh(undefined)).toBe(false);
  });

  it("adds X-Tenant-Host when session storage has host", () => {
    const headers = buildRequestHeaders(
      true,
      "token",
      "GET",
      () => "idempotency-key-3",
      () => "tenant.example.com",
    ) as Record<string, string>;

    expect(headers["X-Tenant-Host"]).toBe("tenant.example.com");
  });

  it("does not add X-Tenant-Host when tenant host is missing", () => {
    const headers = buildRequestHeaders(
      true,
      "token",
      "GET",
      () => "idempotency-key-4",
      () => null,
    ) as Record<string, string>;

    expect(headers["X-Tenant-Host"]).toBeUndefined();
  });

  it("adds X-Tenant-Id when tenant id reader returns value", () => {
    const headers = buildRequestHeaders(
      true,
      "token",
      "GET",
      () => "idempotency-key-5",
      () => null,
      () => "550e8400-e29b-41d4-a716-446655440000",
    ) as Record<string, string>;

    expect(headers["X-Tenant-Id"]).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("does not add X-Tenant-Id when tenant id reader returns null", () => {
    const headers = buildRequestHeaders(
      true,
      "token",
      "GET",
      () => "idempotency-key-6",
      () => null,
      () => null,
    ) as Record<string, string>;

    expect(headers["X-Tenant-Id"]).toBeUndefined();
  });
});
