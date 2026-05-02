import { describe, expect, it } from "bun:test";

import { decodeAuthHandoffPayload, encodeAuthHandoffPayload } from "./auth-handoff";

describe("auth-handoff", () => {
  it("roundtrips payload", () => {
    const payload = {
      accessToken: "a.b.c",
      refreshToken: "d.e.f",
      tenantId: "550e8400-e29b-41d4-a716-446655440000",
      nextPath: "/business",
    };
    const enc = encodeAuthHandoffPayload(payload);
    expect(decodeAuthHandoffPayload(enc)).toEqual(payload);
  });

  it("rejects garbage", () => {
    expect(decodeAuthHandoffPayload("")).toBeNull();
    expect(decodeAuthHandoffPayload("!!!")).toBeNull();
  });
});
