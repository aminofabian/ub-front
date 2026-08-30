import { describe, expect, it } from "bun:test";

import { STORAGE_KEYS } from "@/lib/config";
import { buildSessionFinalizeHtml } from "@/lib/login-session.server";

function fakeAccessJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${payload}.sig`;
}

describe("buildSessionFinalizeHtml", () => {
  it("persists non-secret session claims so the first paint looks signed in", () => {
    const accessToken = fakeAccessJwt({
      exp: 1_800_000_000,
      business_id: "biz-1",
      sub: "user-1",
    });
    const html = buildSessionFinalizeHtml({
      accessToken,
      tenantId: "biz-1",
      tenantHost: "demo.kiosk.ke",
      nextPath: "/overview",
    });
    expect(html).toContain(STORAGE_KEYS.sessionClaims);
    expect(html).toContain("biz-1");
    expect(html).toContain("user-1");
    expect(html).not.toContain(accessToken);
  });
});
