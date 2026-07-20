import { describe, expect, it } from "bun:test";

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_LEGACY_PATH,
  ACCESS_TOKEN_COOKIE_PATH,
  accessTokenCookieClearOptions,
  accessTokenCookieSetOptions,
  accessTokenMaxAgeSec,
  applyAccessTokenCookie,
  clearAccessTokenCookies,
  isAccessTokenClearPath,
  isAccessTokenMintPath,
  readAccessTokenFromCookieHeader,
  serializeAccessTokenCookie,
} from "@/lib/access-token-cookie";

function makeJwt(expSecondsFromNow: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
    "base64url",
  );
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
      business_id: "biz-1",
    }),
  ).toString("base64url");
  return `${header}.${payload}.sig`;
}

describe("access-token-cookie", () => {
  it("reads ub.access from a Cookie header", () => {
    const token = "aa.bb.cc";
    expect(
      readAccessTokenFromCookieHeader(
        `foo=1; ${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; bar=2`,
      ),
    ).toBe(token);
    expect(readAccessTokenFromCookieHeader("")).toBeNull();
  });

  it("derives max-age from JWT exp", () => {
    const token = makeJwt(120);
    const maxAge = accessTokenMaxAgeSec(token);
    expect(maxAge).toBeGreaterThan(100);
    expect(maxAge).toBeLessThanOrEqual(120);
  });

  it("builds set/clear cookie options on /api", () => {
    const token = makeJwt(600);
    const set = accessTokenCookieSetOptions(token, { secure: true });
    expect(set.name).toBe(ACCESS_TOKEN_COOKIE);
    expect(set.path).toBe(ACCESS_TOKEN_COOKIE_PATH);
    expect(set.path).toBe("/api");
    expect(set.httpOnly).toBe(true);
    expect(set.sameSite).toBe("lax");
    expect(set.secure).toBe(true);
    expect(set.value).toBe(token);

    const clear = accessTokenCookieClearOptions({ secure: false });
    expect(clear.maxAge).toBe(0);
    expect(clear.path).toBe(ACCESS_TOKEN_COOKIE_PATH);
  });

  it("applyAccessTokenCookie sets /api via cookies API and clears legacy via header", () => {
    const token = makeJwt(600);
    const setCalls: Array<{ path: string; value: string }> = [];
    const appended: string[] = [];
    applyAccessTokenCookie(
      {
        cookies: {
          set: (opts) => {
            setCalls.push({ path: opts.path, value: opts.value });
          },
        },
        headers: {
          append: (_name, value) => {
            appended.push(value);
          },
        },
      },
      token,
      { secure: true },
    );
    expect(setCalls).toHaveLength(1);
    expect(setCalls[0]?.path).toBe("/api");
    expect(setCalls[0]?.value).toBe(token);
    expect(appended).toHaveLength(1);
    expect(appended[0]).toContain(`Path=${ACCESS_TOKEN_COOKIE_LEGACY_PATH}`);
    expect(appended[0]).toContain("Max-Age=0");
  });

  it("clearAccessTokenCookies clears current and legacy paths", () => {
    const setCalls: string[] = [];
    const appended: string[] = [];
    clearAccessTokenCookies(
      {
        cookies: {
          set: (opts) => {
            setCalls.push(opts.path);
          },
        },
        headers: {
          append: (_name, value) => {
            appended.push(value);
          },
        },
      },
      { secure: false },
    );
    expect(setCalls).toEqual(["/api"]);
    expect(appended[0]).toContain(`Path=${ACCESS_TOKEN_COOKIE_LEGACY_PATH}`);
  });

  it("serializeAccessTokenCookie encodes value", () => {
    const line = serializeAccessTokenCookie(
      accessTokenCookieSetOptions("a.b.c", { secure: false }),
    );
    expect(line).toContain(`${ACCESS_TOKEN_COOKIE}=a.b.c`);
    expect(line).toContain("Path=/api");
    expect(line).toContain("HttpOnly");
  });

  it("classifies mint and clear auth paths", () => {
    expect(isAccessTokenMintPath("/api/v1/auth/login-pin")).toBe(true);
    expect(isAccessTokenMintPath("/api/v1/auth/refresh")).toBe(true);
    expect(isAccessTokenMintPath("/api/v1/sales")).toBe(false);
    expect(isAccessTokenClearPath("/api/v1/auth/logout")).toBe(true);
    expect(isAccessTokenClearPath("/api/v1/auth/clear-session-cookie")).toBe(
      true,
    );
  });
});
