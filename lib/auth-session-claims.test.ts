import { describe, expect, it } from "bun:test";

import {
  claimsFromAccessToken,
  redactAccessTokenFromAuthJson,
} from "@/lib/auth-session-claims";

function makeJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
    "base64url",
  );
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${payload}.sig`;
}

describe("auth-session-claims", () => {
  it("parses exp and business_id from a JWT", () => {
    const token = makeJwt({
      exp: 1_700_000_000,
      business_id: "biz-1",
      sub: "user-1",
    });
    expect(claimsFromAccessToken(token)).toEqual({
      exp: 1_700_000_000,
      businessId: "biz-1",
      sub: "user-1",
    });
  });

  it("redacts access/refresh from auth JSON and adds session claims", () => {
    const token = makeJwt({
      exp: 1_700_000_000,
      business_id: "biz-1",
    });
    const { bodyText, accessToken } = redactAccessTokenFromAuthJson(
      JSON.stringify({ accessToken: token, refreshToken: "secret", ok: true }),
    );
    expect(accessToken).toBe(token);
    const parsed = JSON.parse(bodyText) as Record<string, unknown>;
    expect(parsed.accessToken).toBeUndefined();
    expect(parsed.refreshToken).toBeUndefined();
    expect(parsed.ok).toBe(true);
    expect(parsed.session).toEqual({
      exp: 1_700_000_000,
      businessId: "biz-1",
    });
  });
});
