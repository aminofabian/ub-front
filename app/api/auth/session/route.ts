import { NextRequest, NextResponse } from "next/server";

import { readAccessTokenFromCookieHeader } from "@/lib/access-token-cookie";
import { claimsFromAccessToken } from "@/lib/auth-session-claims";
import { getServerApiOrigin } from "@/lib/config";

/**
 * Gap G3: return non-secret session claims from httpOnly `ub.access`.
 * Never returns the raw JWT.
 *
 * The JWT is only checked cryptographically here; a revoked session row still
 * decodes. Validate against the backend before reporting claims so a dead
 * session cannot make heartbeat think it is alive and keep rescheduling
 * refreshes every few seconds.
 */
export async function GET(request: NextRequest) {
  const access = readAccessTokenFromCookieHeader(request.headers.get("cookie"));
  if (!access) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const session = claimsFromAccessToken(access);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const tenantId = session.businessId?.trim();
  const backendOrigin = getServerApiOrigin();
  if (tenantId && backendOrigin) {
    try {
      const check = await fetch(`${backendOrigin}/api/v1/me`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${access}`,
          "X-Tenant-Id": tenantId,
        },
      });
      if (!check.ok) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }
    } catch {
      // Backend unreachable — do not call the session dead from a network
      // blip; fall through with claims so normal refresh paths retry.
    }
  }
  return NextResponse.json({
    authenticated: true,
    session: {
      ...(session.exp != null ? { exp: session.exp } : {}),
      ...(session.businessId ? { businessId: session.businessId } : {}),
      ...(session.sub ? { sub: session.sub } : {}),
    },
  });
}
