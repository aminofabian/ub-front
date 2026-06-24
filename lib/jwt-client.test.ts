import { describe, expect, it } from "bun:test";

import {
  businessIdFromAccessToken,
  parseAccessTokenClaims,
} from "@/lib/jwt-client";

function b64urlJson(value: unknown): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

describe("jwt-client", () => {
  it("parses business_id and exp from access token payload", () => {
    const token = `header.${b64urlJson({
      exp: 1_700_000_000,
      business_id: "550e8400-e29b-41d4-a716-446655440000",
    })}.sig`;
    expect(parseAccessTokenClaims(token)).toEqual({
      exp: 1_700_000_000,
      businessId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(businessIdFromAccessToken(token)).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("returns null for invalid tokens", () => {
    expect(parseAccessTokenClaims("")).toBeNull();
    expect(parseAccessTokenClaims("not-a-jwt")).toBeNull();
    expect(businessIdFromAccessToken(undefined)).toBeNull();
  });
});
