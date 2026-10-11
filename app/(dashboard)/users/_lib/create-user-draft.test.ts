import { describe, expect, it } from "bun:test";

import {
  buildCreateUserPayload,
  DEFAULT_USER_DRAFT,
  type UserDraft,
} from "./create-user-draft";

function draft(overrides: Partial<UserDraft> = {}): UserDraft {
  return {
    ...DEFAULT_USER_DRAFT,
    name: "Fabian Amino",
    email: "demo@gmail.com",
    roleId: "22222222-0000-0000-0000-000000000002",
    branchId: "ee188f14-5a38-4889-83cf-bbeac2614b03",
    joinPayMode: "full",
    ...overrides,
  };
}

describe("buildCreateUserPayload", () => {
  it("creates an active user with the password you set", () => {
    const result = buildCreateUserPayload(
      draft({
        credentialMethod: "password",
        password: "correct-horse",
        passwordConfirm: "correct-horse",
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toEqual({
      name: "Fabian Amino",
      email: "demo@gmail.com",
      roleId: "22222222-0000-0000-0000-000000000002",
      branchId: "ee188f14-5a38-4889-83cf-bbeac2614b03",
      joinPayMode: "full",
      password: "correct-horse",
      status: "active",
    });
    expect(result.payload.sendInvite).toBeUndefined();
  });

  it("rejects a short password and a mismatch", () => {
    expect(
      buildCreateUserPayload(
        draft({ password: "short", passwordConfirm: "short" }),
      ),
    ).toEqual({
      ok: false,
      error: "Password must be at least 8 characters.",
    });
    expect(
      buildCreateUserPayload(
        draft({ password: "correct-horse", passwordConfirm: "other-horse" }),
      ),
    ).toEqual({ ok: false, error: "Passwords do not match." });
  });

  it("keeps email invite as an optional path", () => {
    const result = buildCreateUserPayload(
      draft({ credentialMethod: "invite" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.sendInvite).toBe(true);
    expect(result.payload.status).toBe("invited");
    expect(result.payload.password).toBeUndefined();
  });
});
